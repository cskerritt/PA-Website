# PA-Website

The national website for Purinton Analytics, LLC: a forensic damages and
rehabilitation consulting firm providing coordinated vocational evaluation,
life care planning, and forensic economic analysis for plaintiff and defense
counsel. Attorney-referral funnel (`/refer-a-case/`), ~46 static pages, full
JSON-LD, and AI-crawler configuration.

- Design spec: `docs/superpowers/specs/2026-08-31-pa-website-design.md`
- Build plan: `docs/superpowers/plans/2026-08-31-pa-website-build.md`
- Content standards for agents and editors: `CLAUDE.md`
- Launch gates: `LAUNCH-CHECKLIST.md` (nothing goes to DNS before those clear)

## Stack

- **Astro 5**, fully static output (`trailingSlash: 'always'`, directory
  format). No client framework; vanilla JS for the mobile nav and the
  Web3Forms submissions only (`public/scripts/form.js`).
- **`src/config/site.ts`** is the controlled entity record: canonical domain,
  phone, email, verified stats, neutrality statement, robots flags, offices.
  Visible content and JSON-LD both render from it, so they cannot drift.
- **Content collections** (`src/content/{services,matters,resources,locations}`)
  with a zod schema enforcing the 13-point page template.
- **vitest** suites crawl `dist/` and enforce the site-wide invariants
  (H1/title/canonical uniqueness, JSON-LD validity, link integrity, banned
  strings, neutrality-statement coverage, stat single-sourcing, noindex
  policy).
- **Caddy + Docker** for serving; **Railway** for hosting.

## Commands

```bash
npm install
npm run dev        # local dev server
npm run check      # astro build && vitest run  <- the way to verify changes
npm run build      # build dist/
npm test           # run vitest against the EXISTING dist/ (build first!)
```

The test suites read `dist/`; running `npm test` after editing content
without rebuilding tests stale output. Use `npm run check`.

## Docker (required before any push)

```bash
docker build -t pa-website .
docker run -d -p 8090:8090 -e PORT=8090 --name pa-web pa-website
curl -fsS localhost:8090/ | grep -q "Nationwide Vocational Expert"
curl -fsS localhost:8090/services/coordinated-damages-assessment/ >/dev/null
curl -fsS localhost:8090/robots.txt | grep -q OAI-SearchBot
curl -s -o /dev/null -w '%{http_code}' localhost:8090/nope | grep -q 404
docker rm -f pa-web
```

The image build runs `npm run build && npm test`, so a failing invariant
fails the image.

## Deploy notes

- New Railway service with `railway.json` (DOCKERFILE builder). Do **not**
  reuse the PA-Site service; do not deploy or touch DNS until Chris says so.
- The custom domain attaches only after purintonanalytics.com is registered
  (`LAUNCH-CHECKLIST.md` item 1) and the remaining gates clear.
- pa-expert.com redirect activation is documented in `docs/MIGRATION.md` and
  happens at DNS cutover, on the old host.
