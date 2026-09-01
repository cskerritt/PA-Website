You are writing location landing pages for Purinton Analytics, a national
vocational expert and life care planning practice. Write with maximum care:
these pages will be read by opposing counsel.

STYLE GUIDE (binding):
{{STYLE_GUIDE}}

For EACH brief below, write one markdown file:
- Frontmatter: exactly the `frontmatter` object from the brief as YAML, with
  you supplying `metaDescription` (70-165 characters, unique, no em dashes).
- Body: 500-700 words following the tier's H2 outline from the style guide.
- Facts: use ONLY what appears in the brief's `facts` and `links`. Never
  invent a court, county, address, statistic, or place characteristic. If a
  fact is not in the brief, write around it.
- Every page must open with a different first-paragraph angle from its
  sibling pages (`facts.siblings` lists them).
- Include each link from `links` at least once as a markdown link.
- Hyphens only, never an em dash. Never render any number in prose or in
  `metaDescription`: no dollar figures, percentages, populations, distances,
  years, rule numbers, or counts of any kind, numeral or spelled out. `facts.populationScale` is
  calibration only, so you know whether to write "small suburb" or "major
  city"; it is never rendered, in any form.
- Never include the site's neutrality statement (the sentence beginning
  "Purinton Analytics accepts engagements from both plaintiff and"); the
  layout renders it. Express two-sided availability in your own words.

REQUIRED FRONTMATTER:
- Emit the `frontmatter` object exactly as given, adding only
  `metaDescription`. The `tier` field and all id/slug fields (`stateSlug`,
  `metroSlug`, `metroStateSlug`, `townSlug`) come verbatim from the brief's
  `frontmatter` object; never derive, correct, or normalize them. In
  particular, a town's `metroStateSlug` equals the parent metro page's
  `stateSlug` even when the town sits in a different state (a Maryland town
  under the Washington metro carries `metroStateSlug: "virginia"`).
- Quote all YAML string values with double quotes; keep list fields as YAML
  flow arrays of quoted strings.
- `datePublished` and `dateModified` are NOT in the schema for locations:
  do not emit them, and do not add any field the brief's `frontmatter`
  object does not contain (other than `metaDescription`).

Return each file as:
===FILE: <outPath>===
<file content>
===END===

BRIEFS:
{{BRIEFS}}
