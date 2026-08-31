/*
 * Purinton Analytics form handler (vanilla JS, no dependencies).
 *
 * Progressive enhancement over plain Web3Forms HTML posts:
 *  - accessible client-side validation (errors land in aria-describedby slots)
 *  - a spam gate combining a time-on-page token (>= 3 seconds) with an
 *    off-screen honeypot named "contact_preference". The honeypot is designed
 *    to be autofill-safe (tabindex="-1", autocomplete="off", aria-hidden
 *    wrapper, non-autofillable name), and neither gate ever fails silently:
 *    a blocked submission always shows a visible message with a phone
 *    fallback, so a real referral is never dropped without notice.
 *  - structured email subjects per form type
 *  - fetch submission with a success redirect or an inline confirmation
 *  - ?urgency= query preselection on the referral form (e.g. ?urgency=rush)
 */
(function () {
  'use strict';

  var ENDPOINT = 'https://api.web3forms.com/submit';
  var MIN_ELAPSED_MS = 3000;
  // Requires a top-level domain of two or more characters (truncated-TLD
  // addresses such as name@firm.c bounce and strand the inquiry).
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var forms = Array.prototype.slice.call(
    document.querySelectorAll('form[data-pa-form]')
  );
  if (!forms.length) return;

  var urgencyParam = null;
  try {
    urgencyParam = new URLSearchParams(window.location.search).get('urgency');
  } catch (e) {
    /* URLSearchParams unavailable: skip preselection, form still works */
  }

  forms.forEach(function (form) {
    // JS is running, so take validation over from the browser; without JS the
    // form keeps native validation and posts directly to Web3Forms.
    form.setAttribute('novalidate', '');

    var started = form.querySelector('input[name="form_started"]');
    if (started) started.value = String(Date.now());

    // /refer-a-case/?urgency=rush (or rebuttal, or standard) preselects the
    // urgency flag when the value matches an existing option.
    if (urgencyParam) {
      var urgencySelect = form.querySelector('select[name="urgency"]');
      if (urgencySelect) {
        for (var i = 0; i < urgencySelect.options.length; i++) {
          if (urgencySelect.options[i].value === urgencyParam) {
            urgencySelect.value = urgencyParam;
            break;
          }
        }
      }
    }

    // Clear a field's error as soon as the visitor fixes it.
    var clearOnFix = function (event) {
      var field = event.target;
      if (!field || !field.getAttribute) return;
      if (field.getAttribute('aria-invalid') !== 'true') return;
      var value = (field.value || '').trim();
      if (value === '') return;
      if (field.type === 'email' && !EMAIL_RE.test(value)) return;
      field.removeAttribute('aria-invalid');
      var slot = errorSlot(field);
      if (slot) {
        slot.hidden = true;
        slot.textContent = '';
      }
    };
    form.addEventListener('input', clearOnFix);
    form.addEventListener('change', clearOnFix);

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      submitForm(form);
    });
  });

  function statusEl(form) {
    return form.querySelector('[data-status]');
  }

  function showStatus(form, message, isError) {
    var el = statusEl(form);
    if (!el) return;
    el.hidden = false;
    el.textContent = message;
    if (el.classList) {
      el.classList.toggle('form-status-error', Boolean(isError));
    }
  }

  function errorSlot(field) {
    if (!field.id) return null;
    return document.getElementById(field.id + '-error');
  }

  function clearErrors(form) {
    Array.prototype.forEach.call(form.elements, function (field) {
      if (!field.name) return;
      field.removeAttribute('aria-invalid');
      var slot = errorSlot(field);
      if (slot) {
        slot.hidden = true;
        slot.textContent = '';
      }
    });
    var el = statusEl(form);
    if (el) {
      el.hidden = true;
      el.textContent = '';
    }
  }

  function markInvalid(field, message) {
    field.setAttribute('aria-invalid', 'true');
    var slot = errorSlot(field);
    if (slot) {
      slot.textContent = message;
      slot.hidden = false;
    }
  }

  function validate(form) {
    var firstInvalid = null;
    Array.prototype.forEach.call(form.elements, function (field) {
      if (!field.name || field.disabled) return;
      if (field.name === 'contact_preference') return; // honeypot: never validated
      var value = (field.value || '').trim();
      var message = null;
      if (field.hasAttribute('required') && value === '') {
        message =
          field.getAttribute('data-error-required') || 'This field is required.';
      } else if (field.type === 'email' && value !== '' && !EMAIL_RE.test(value)) {
        message = 'Enter a valid email address, for example name@firm.com.';
      }
      if (message) {
        markInvalid(field, message);
        if (!firstInvalid) firstInvalid = field;
      }
    });
    if (firstInvalid) {
      showStatus(form, 'Please correct the highlighted fields and submit again.', true);
      firstInvalid.focus();
      return false;
    }
    return true;
  }

  function subjectFor(form, get) {
    var kind = form.getAttribute('data-pa-form');
    if (kind === 'refer') {
      var subject =
        '[Conflict Check] ' +
        get('side') +
        ' · ' +
        get('case_type') +
        ' · ' +
        get('jurisdiction_venue');
      if (get('disclosure_deadline')) {
        subject += ' · deadline ' + get('disclosure_deadline');
      }
      return subject;
    }
    if (kind === 'cv-fee') {
      return '[CV and Fee Request] ' + (get('firm') || get('name') || 'Website request');
    }
    return '[General Inquiry] ' + (get('name') || 'Website contact form');
  }

  function submitForm(form) {
    clearErrors(form);
    if (!validate(form)) return;

    // Spam gate. Both checks fail loudly with a readable message so that a
    // real submission (for example one caught by aggressive browser
    // autofill) is never quarantined silently.
    var honeypot = form.querySelector('input[name="contact_preference"]');
    if (honeypot && honeypot.value !== '') {
      showStatus(
        form,
        form.getAttribute('data-error-fallback') ||
          'This form could not be submitted. Please contact the firm by phone.',
        true
      );
      return;
    }
    var started = form.querySelector('input[name="form_started"]');
    if (started && started.value) {
      var elapsed = Date.now() - Number(started.value);
      if (elapsed >= 0 && elapsed < MIN_ELAPSED_MS) {
        showStatus(
          form,
          'Please take a moment to review your entries, then submit again.',
          true
        );
        return;
      }
    }

    var data = {};
    var formData = new FormData(form);
    formData.forEach(function (value, key) {
      if (typeof value !== 'string') return; // defensive: no file fields exist
      var trimmed = value.trim();
      if (trimmed !== '') data[key] = trimmed;
    });

    // Client-only tokens and the no-JS redirect never reach the email payload.
    delete data.contact_preference;
    delete data.form_started;
    delete data.redirect;
    delete data.botcheck;

    var get = function (key) {
      return data[key] || '';
    };
    data.subject = subjectFor(form, get);
    data.from_name = get('attorney_name') || get('name') || 'Purinton Analytics website';

    var button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    showStatus(form, 'Sending your request...', false);

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (result) {
        if (!result || result.success !== true) {
          throw new Error('submission rejected');
        }
        var successPath = form.getAttribute('data-success');
        if (successPath) {
          window.location.href = successPath;
          return;
        }
        form.reset();
        if (started) started.value = String(Date.now());
        showStatus(
          form,
          form.getAttribute('data-success-message') ||
            'Thank you. Your message has been sent.',
          false
        );
        if (button) button.disabled = false;
      })
      .catch(function () {
        showStatus(
          form,
          form.getAttribute('data-error-fallback') ||
            'Your request could not be sent. Please use the phone number at the top of the page.',
          true
        );
        if (button) button.disabled = false;
      });
  }
})();
