import { describe, it, expect } from 'vitest';
import type { HTMLElement } from 'node-html-parser';
import { SITE } from '../src/config/site';
import { distFile, parseDist, jsonld } from './helpers';

const REFER = 'refer-a-case';
const THANKS = 'refer-a-case/thanks';
const CONTACT = 'contact';

/** All pages this task owns (404 is a bare file, not a directory index). */
const OWNED_PAGES = [
  REFER,
  THANKS,
  CONTACT,
  'about',
  'privacy',
  'accessibility',
  'disclaimer',
  '404.html',
];

/** The 14 plan-mandated referral field names, exactly. */
const REFER_FIELDS = [
  'attorney_name',
  'firm',
  'email',
  'phone',
  'side',
  'service_requested',
  'case_type',
  'jurisdiction_venue',
  'caption_parties',
  'disclosure_deadline',
  'depo_trial_date',
  'summary',
  'referral_source',
  'urgency',
];

const REFER_REQUIRED = [
  'attorney_name',
  'firm',
  'email',
  'side',
  'service_requested',
  'case_type',
  'jurisdiction_venue',
  'summary',
];

/** Astro escapes entities in rendered text; normalize for comparisons. */
function norm(s: string): string {
  return s
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

/** <main> text with all script bodies (JSON-LD included) removed. */
function mainText(path: string): string {
  const main = parseDist(path).querySelector('main');
  if (!main) throw new Error(`no <main> in ${path}`);
  main.querySelectorAll('script').forEach((s: HTMLElement) => s.remove());
  return norm(main.text);
}

function referForm(): HTMLElement {
  const form = parseDist(REFER).querySelector('form[data-pa-form="refer"]');
  if (!form) throw new Error('refer form not found');
  return form;
}

function hasAriaHiddenAncestor(el: HTMLElement): boolean {
  let cur = el.parentNode as HTMLElement | null;
  while (cur) {
    if (cur.getAttribute && cur.getAttribute('aria-hidden') === 'true') return true;
    cur = cur.parentNode as HTMLElement | null;
  }
  return false;
}

describe('refer-a-case conflict check form', () => {
  it('page renders with one H1 and the neutrality statement', () => {
    const doc = parseDist(REFER);
    expect(doc.querySelectorAll('h1').length).toBe(1);
    expect(mainText(REFER)).toContain(SITE.neutralityStatement);
  });

  it('contains all 14 plan-mandated field names inside the form', () => {
    const form = referForm();
    for (const name of REFER_FIELDS) {
      const field = form.querySelector(`[name="${name}"]`);
      expect(field, `missing field ${name}`).toBeTruthy();
    }
  });

  it('marks exactly the plan-required fields as required', () => {
    const form = referForm();
    for (const name of REFER_FIELDS) {
      const field = form.querySelector(`[name="${name}"]`)!;
      if (REFER_REQUIRED.includes(name)) {
        expect(field.hasAttribute('required'), `${name} should be required`).toBe(true);
      } else {
        expect(field.hasAttribute('required'), `${name} should be optional`).toBe(false);
      }
    }
  });

  it('side is a select with Plaintiff/Defense/Insurer/Employer/Neutral options', () => {
    const side = referForm().querySelector('select[name="side"]');
    expect(side).toBeTruthy();
    const values = side!.querySelectorAll('option').map((o) => o.getAttribute('value'));
    for (const v of ['Plaintiff', 'Defense', 'Insurer', 'Employer', 'Neutral']) {
      expect(values).toContain(v);
    }
  });

  it('urgency is a select with standard/rush/rebuttal values for ?urgency= preselect', () => {
    const urgency = referForm().querySelector('select[name="urgency"]');
    expect(urgency).toBeTruthy();
    const values = urgency!.querySelectorAll('option').map((o) => o.getAttribute('value'));
    expect(values).toContain('standard');
    expect(values).toContain('rush');
    expect(values).toContain('rebuttal');
  });

  it('shows the sensitive-data warning', () => {
    expect(mainText(REFER)).toMatch(
      /do not (submit|include).*(medical records|confidential)/i,
    );
  });

  it('has an autofill-safe honeypot named contact_preference', () => {
    const hp = referForm().querySelector('input[name="contact_preference"]');
    expect(hp).toBeTruthy();
    expect(hp!.getAttribute('type')).toBe('text');
    expect(hp!.getAttribute('tabindex')).toBe('-1');
    expect(hp!.getAttribute('autocomplete')).toBe('off');
    expect(hp!.hasAttribute('required')).toBe(false);
    expect(hasAriaHiddenAncestor(hp!), 'honeypot must sit in an aria-hidden wrapper').toBe(
      true,
    );
  });

  it('carries a hidden form_started timestamp input for the time gate', () => {
    const started = referForm().querySelector('input[name="form_started"]');
    expect(started).toBeTruthy();
    expect(started!.getAttribute('type')).toBe('hidden');
  });

  it('is wired to Web3Forms with the entity access key and structured subject seed', () => {
    const form = referForm();
    expect(form.getAttribute('action')).toBe('https://api.web3forms.com/submit');
    expect(form.getAttribute('method')?.toUpperCase()).toBe('POST');
    const key = form.querySelector('input[name="access_key"]');
    expect(key?.getAttribute('value')).toBe(SITE.web3formsKey);
    const subject = form.querySelector('input[name="subject"]');
    expect(subject?.getAttribute('value')).toMatch(/^\[Conflict Check\]/);
    const redirect = form.querySelector('input[name="redirect"]');
    expect(redirect?.getAttribute('value')).toBe(`${SITE.domain}/refer-a-case/thanks/`);
    expect(form.querySelector('[name="botcheck"]')).toBeFalsy();
  });

  it('gives every visible field an accessible label', () => {
    const doc = parseDist(REFER);
    for (const name of REFER_FIELDS) {
      const field = doc.querySelector(`form [name="${name}"]`)!;
      const id = field.getAttribute('id');
      expect(id, `${name} needs an id for its label`).toBeTruthy();
      const label = doc.querySelector(`label[for="${id}"]`);
      expect(label, `missing label for ${name}`).toBeTruthy();
      expect(norm(label!.text).trim().length).toBeGreaterThan(2);
    }
  });

  it('gives required fields aria-describedby error slots that exist in the page', () => {
    const doc = parseDist(REFER);
    for (const name of REFER_REQUIRED) {
      const field = doc.querySelector(`form [name="${name}"]`)!;
      const describedBy = field.getAttribute('aria-describedby') ?? '';
      const errorId = `${field.getAttribute('id')}-error`;
      expect(describedBy.split(/\s+/), `${name} must reference its error slot`).toContain(
        errorId,
      );
      expect(doc.querySelector(`[id="${errorId}"]`), `error slot ${errorId}`).toBeTruthy();
    }
  });

  it('loads the shared form script', () => {
    const html = distFile(REFER);
    expect(html).toContain('/scripts/form.js');
  });
});

describe('form.js behavior contract', () => {
  const js = distFile('scripts/form.js');

  it('ships to dist and posts to Web3Forms', () => {
    expect(js).toContain('https://api.web3forms.com/submit');
  });

  it('builds the structured conflict-check subject with optional deadline', () => {
    expect(js).toContain("'[Conflict Check] '");
    expect(js).toContain("' · deadline '");
    expect(js).toContain("'[CV and Fee Request] '");
    expect(js).toContain("'[General Inquiry] '");
  });

  it('implements the 3-second time gate and honeypot check without silent drops', () => {
    expect(js).toContain('MIN_ELAPSED_MS = 3000');
    expect(js).toContain('form_started');
    expect(js).toContain('contact_preference');
    // Both gates surface a visible status message rather than dropping silently.
    expect(js).toContain('showStatus');
  });

  it('reads the ?urgency= query parameter for preselection', () => {
    expect(js).toContain("get('urgency')");
    expect(js).toContain('urgencySelect');
  });

  it('strips client-only tokens from the submitted payload and never sets botcheck', () => {
    expect(js).toContain('delete data.contact_preference');
    expect(js).toContain('delete data.form_started');
    expect(js).toContain('delete data.redirect');
    expect(js).not.toContain("data.botcheck = ");
  });
});

describe('thanks page', () => {
  it('states the response expectation and the urgent phone number', () => {
    const text = mainText(THANKS);
    expect(text).toContain('During business hours we typically respond the same day');
    expect(text).toContain(SITE.phoneDisplay);
    const tel = parseDist(THANKS).querySelector(`a[href="tel:${SITE.phoneE164}"]`);
    expect(tel).toBeTruthy();
  });

  it('explains what happens next: conflict review, secure upload link, records checklist', () => {
    const text = mainText(THANKS);
    expect(text).toContain('Conflict review');
    expect(text).toContain('secure upload link');
    expect(text.toLowerCase()).toContain('records checklist');
  });

  it('has one H1', () => {
    expect(parseDist(THANKS).querySelectorAll('h1').length).toBe(1);
  });
});

describe('contact page', () => {
  it('has the #cv-fee anchor target with a mini-form of name, email, firm', () => {
    const doc = parseDist(CONTACT);
    const section = doc.querySelector('[id="cv-fee"]');
    expect(section).toBeTruthy();
    const form = section!.querySelector('form[data-pa-form="cv-fee"]');
    expect(form).toBeTruthy();
    for (const name of ['name', 'email', 'firm']) {
      const field = form!.querySelector(`[name="${name}"]`);
      expect(field, `cv-fee missing ${name}`).toBeTruthy();
      expect(field!.hasAttribute('required')).toBe(true);
      const label = doc.querySelector(`label[for="${field!.getAttribute('id')}"]`);
      expect(label, `cv-fee label for ${name}`).toBeTruthy();
    }
    const subject = form!.querySelector('input[name="subject"]');
    expect(subject?.getAttribute('value')).toMatch(/^\[CV and Fee Request\]/);
  });

  it('has a general inquiry form with name, email, message', () => {
    const form = parseDist(CONTACT).querySelector('form[data-pa-form="general"]');
    expect(form).toBeTruthy();
    for (const name of ['name', 'email', 'message']) {
      expect(form!.querySelector(`[name="${name}"]`), `general missing ${name}`).toBeTruthy();
    }
    const subject = form!.querySelector('input[name="subject"]');
    expect(subject?.getAttribute('value')).toMatch(/^\[General Inquiry\]/);
  });

  it('both forms carry the access key, honeypot, and timestamp token', () => {
    const doc = parseDist(CONTACT);
    const forms = doc.querySelectorAll('form[data-pa-form]');
    expect(forms.length).toBe(2);
    for (const form of forms) {
      expect(form.querySelector('input[name="access_key"]')?.getAttribute('value')).toBe(
        SITE.web3formsKey,
      );
      const hp = form.querySelector('input[name="contact_preference"]');
      expect(hp).toBeTruthy();
      expect(hasAriaHiddenAncestor(hp!)).toBe(true);
      expect(form.querySelector('input[name="form_started"]')).toBeTruthy();
    }
  });

  it('links the rush/rebuttal path with the urgency preset and a mailto for speaking inquiries', () => {
    const hrefs = parseDist(CONTACT)
      .querySelectorAll('a')
      .map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/refer-a-case/?urgency=rush');
    expect(hrefs).toContain(`mailto:${SITE.email}`);
  });

  it('emits ContactPage JSON-LD from the entity record', () => {
    const blocks = jsonld(CONTACT);
    const contact = blocks.find((b) => b['@type'] === 'ContactPage');
    expect(contact).toBeTruthy();
    expect(JSON.stringify(contact)).toContain(SITE.phoneE164);
  });

  it('mirrors the sensitive-data instruction', () => {
    expect(mainText(CONTACT)).toMatch(
      /do not (submit|include).*(medical records|confidential)/i,
    );
  });
});

describe('about and policy pages', () => {
  it('about covers founding, economist-partner boundary, and links the expert profile', () => {
    const text = mainText('about');
    expect(text).toContain('2018');
    expect(text).toContain('independent economist partners');
    const hrefs = parseDist('about')
      .querySelectorAll('a')
      .map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/experts/jason-purinton/');
  });

  it('privacy mirrors the no-sensitive-data instruction', () => {
    expect(mainText('privacy')).toMatch(
      /do not (submit|include).*(medical records|confidential)/i,
    );
  });

  it('accessibility states the WCAG 2.2 AA target', () => {
    expect(mainText('accessibility')).toContain('2.2');
    expect(mainText('accessibility')).toContain('AA');
  });

  it('disclaimer disclaims legal advice and pre-engagement relationships', () => {
    const text = mainText('disclaimer');
    expect(text).toMatch(/no legal advice|not legal advice|is not legal advice/i);
    expect(text.toLowerCase()).toContain('conflict check');
    expect(text.toLowerCase()).toContain('does not create an engagement');
  });

  it('each policy page and about renders exactly one H1 with a meta description', () => {
    for (const page of ['about', 'privacy', 'accessibility', 'disclaimer']) {
      const doc = parseDist(page);
      expect(doc.querySelectorAll('h1').length, page).toBe(1);
      expect(
        doc.querySelector('meta[name="description"]')?.getAttribute('content')?.length ?? 0,
        page,
      ).toBeGreaterThan(50);
    }
  });
});

describe('404 page', () => {
  it('builds to 404.html with one H1 and recovery links', () => {
    const doc = parseDist('404.html');
    expect(doc.querySelectorAll('h1').length).toBe(1);
    const hrefs = doc.querySelectorAll('main a').map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/services/');
    expect(hrefs).toContain('/refer-a-case/');
  });
});

describe('site-wide form and content constraints on owned pages', () => {
  it('no type="file" input appears on any page', () => {
    for (const page of OWNED_PAGES) {
      const files = parseDist(page)
        .querySelectorAll('input')
        .filter((i) => i.getAttribute('type') === 'file');
      expect(files.length, `${page} must not contain file inputs`).toBe(0);
    }
  });

  it('no em dashes and no banned CTA phrasing anywhere', () => {
    for (const page of OWNED_PAGES) {
      const html = distFile(page);
      expect(html.includes('—'), `${page} contains an em dash`).toBe(false);
      expect(html.includes('Schedule a Consultation'), `${page} banned CTA`).toBe(false);
      expect(html.includes('231 S. Bemiston'), `${page} banned address`).toBe(false);
    }
  });
});
