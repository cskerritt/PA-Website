# pa-expert.com to purintonanalytics.com Migration (301 Map)

Status: **DRAFT - not wired**. Per the design spec, redirects activate at DNS
cutover only (strategy plan section 2 migration requirements). Nothing in this
document is deployed; the new site carries no redirect logic today.

## Procedure (run at cutover time)

1. **Inventory the old URLs.** Fetch `https://pa-expert.com/sitemap.xml` from
   the live site and `sitemap.xml` from the PA-Site repo
   (`~/Documents/New project/PA-Site`). Union the two URL sets; the live
   sitemap wins on disagreements. Add any non-sitemap URLs with impressions in
   Search Console (Performance report, last 12 months).
2. **Map every old URL to its nearest new route** using the skeleton below.
   Every old URL gets exactly one 301 target on
   `https://purintonanalytics.com`; use `/` only when nothing closer exists.
   No redirect chains: point at the final canonical URL (trailing slash
   included).
3. **Serve the redirects from the pa-expert.com host** (301, not 302). With
   Caddy that is a `redir` block per mapping, or an imported map file; keep
   pa-expert.com serving redirects for at least 12 months.
4. **Verify**: crawl the old URL inventory and assert every response is a
   single 301 hop to a 200 page on the new domain.
5. **Search Console**: submit the new sitemap on the new property and file a
   Change of Address from the pa-expert.com property (Launch Checklist
   item 7).

## 301 table skeleton

Obvious section-level mappings are filled; complete the per-URL rows from the
step 1 inventory before cutover.

| Old URL (pa-expert.com) | New URL (purintonanalytics.com) | Notes |
|---|---|---|
| `/` | `/` | |
| `/about/` | `/about/` | |
| `/contact/` | `/contact/` | |
| `/services/` | `/services/` | |
| `/services/<slug>/` | nearest of the 7 service pages | e.g. vocational pages map to `/services/vocational-expert-witness/`, LCP pages to `/services/life-care-planning/`, economic pages to `/services/forensic-economic-damages/` |
| `/practice-areas/<slug>/` | nearest matter page under `/matters/` | e.g. `/practice-areas/personal-injury/` maps to `/matters/personal-injury/` |
| `/offices/<slug>/` | `/locations/<slug>/` | kansas-city, st-louis, denver, chicago; anything else maps to `/locations/nationwide/` |
| `/credentials/`, `/cv/` | `/experts/jason-purinton/` | |
| resource/article pages | nearest page under `/resources/` | fall back to `/resources/` |
| anything else | `/` | last resort only; prefer a closer target |

## Out of scope here

- The old PA-Site Railway service keeps serving pa-expert.com until cutover.
- No redirects are added to this repo's Caddyfile; the redirect host is the
  old domain, not the new site.
