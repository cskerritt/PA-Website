# Launch Checklist

Items requiring Jason/Chris confirmation before DNS cutover to
purintonanalytics.com. The site can run indefinitely on its Railway URL; none
of these gates block internal preview, all of them block the public launch.

Source of authority: `docs/superpowers/specs/2026-08-31-pa-website-design.md`
(section "Launch checklist"). Do not reorder item 1; it is first because
everything else depends on the domain existing.

## Gated items

1. [ ] **Register purintonanalytics.com** (unregistered as of 2026-08-31 - do
   this first). The canonical domain is already baked into every canonical
   URL, sitemap entry, and JSON-LD block via `SITE.domain`.

2. [ ] **Confirm the 3,000+ evaluations figure and every other displayed
   stat.** Stats render only from `SITE.stats` in `src/config/site.ts`. The
   evaluations figure also appears in prose; every location is listed here so
   one correction updates them together, and `tests/sitewide.test.ts`
   (suite 14) fails the build if any rendered copy disagrees with
   `SITE.stats[0]`:
   - `src/config/site.ts` - `SITE.stats[0]` (proof band) and
     `SITE.description150` (renders into `llms.txt`)
   - `src/content/services/vocational-expert-witness.md` (body prose)
   - `src/content/services/expert-testimony-litigation-consulting.md` (body prose)

3. [ ] **Confirm the email address on the new domain** (e.g.,
   jason@purintonanalytics.com) and update `SITE.email` plus the Web3Forms
   recipient for access key `9a52d3b9-a7cb-4f4f-8479-f0d330f3a6ce`.

4. [ ] **Confirm office-location classifications** (staffed vs by
   appointment). All four offices currently render as by appointment with no
   street addresses and no LocalBusiness schema; do not add a street address
   or local schema without a real, verified staffed address.

5. [ ] **Name or confirm anonymity of the independent economist partners.**
   All economic-services copy currently attributes signed analyses to
   unnamed independent economist partners coordinated by the firm.

6. [ ] **Approve the robots training-bot policy.** GPTBot and ClaudeBot are
   currently disallowed via `SITE.robots` flags (`allowGPTBot`,
   `allowClaudeBot`); search and answer-engine crawlers are allowed.

7. [ ] **Google Search Console + Bing Webmaster verification, sitemap
   submission, IndexNow activation, and Change of Address** (if migrating
   from pa-expert.com). The IndexNow key file is already served at
   `/a7c1e59f30b64d2fb8e4906cd15a2f77.txt`; submission is a post-launch
   operator task. Redirect activation lives in `docs/MIGRATION.md`.

8. [ ] **External profile alignment** (LinkedIn, SEAK, JurisPro, IARP, ABVE,
   AREA): same firm name, phone, and canonical URL everywhere.

## Locations rollout calendar

The locations expansion (state hubs, metro pages, town pages) ships as one PR
per wave, merged weekly. This runs independently of the DNS-cutover gates
above - waves can merge and be observed on the Railway preview URL before
purintonanalytics.com is registered.

Town inventory is 2,247 (Census incorporated places only, per the no-invented-
geography rule); the full site across all waves is approximately 2,920 pages
(46 core pages + 631 state/metro pages + 2,247 town pages).

| Wave | PR | States | Pages | Merge week |
| --- | --- | --- | --- | --- |
| Wave 0 | #1 (merged @baec82a) | 50 state hubs + 581 metro pages + geography layer + verifier | 631 | 2026-09-01 (merged) |
| Wave 1 | #2 | CA, TX | 248 | 2026-09-08 |
| Wave 2 | #3 | FL, NY, PA | 273 | 2026-09-15 |
| Wave 3 | #4 | GA, IL, OH | 243 | 2026-09-22 |
| Wave 4 | #5 | MI, MO, NJ, NC, WA | 296 | 2026-09-29 |
| Wave 5 | #6 | AL, CO, MA, WI | 253 | 2026-10-06 |
| Wave 6 | #7 | LA, MN, OR, SC, TN | 306 | 2026-10-13 |
| Wave 7 | #8 | AZ, AR, IN, IA, OK, UT, VA | 305 | 2026-10-20 |
| Wave 8 | #9 | Twenty remaining states | 323 | 2026-10-26 |

**Hold rule:** if Google Search Console shows suppression (Discovered/Crawled
- currently not indexed, or a manual action) on a merged wave's pages, hold
the next wave's merge until the cause is identified and addressed. The PR is
the gate - do not merge the next wave on schedule if the prior wave's
coverage looks wrong.

Post-merge checklist, per wave:

1. `npm run check` on `main` after the merge - must stay green.
2. Deploy.
3. Ping the sitemap in Google Search Console (and Bing Webmaster, once GSC
   verification from item 7 above is live).
4. Watch coverage for that wave's URLs over the following week; apply the
   hold rule above if suppression appears before merging the next wave.

## Pre-cutover technical notes

- **No-JS form fallback points at the canonical domain.** The hidden
  `redirect` inputs on `/refer-a-case/` and `/contact/` send JavaScript-less
  submitters to `https://purintonanalytics.com/...` after Web3Forms accepts
  the post. Until DNS resolves, a no-JS submission still delivers the email
  but the follow-up redirect dead-ends; JavaScript submissions are unaffected.
  This self-resolves at cutover; test no-JS submission afterward, not before.
- **Deliberately unindexed pages:** `/refer-a-case/thanks/` (form-success
  state) and the 404 page carry robots noindex and stay out of sitemap.xml.
  Do not "fix" their absence from the sitemap.
- **Local Docker verification before any push** (standing rule): see
  README.md for the build, run, and smoke-test commands.
