export const SITE = {
  legalName: 'Purinton Analytics, LLC',
  brand: 'Purinton Analytics',
  domain: 'https://purintonanalytics.com',
  tagline: 'Nationwide Vocational Expert, Life Care Planning, and Economic Damages Services',
  principal: 'Jason C. Purinton',
  principalCreds: 'LPC, CRC, CVE, CLCP, ABVE/F, IPEC',
  phoneDisplay: '(877) 882-9778',
  phoneE164: '+18778829778',
  email: 'jason@pa-expert.com', // LAUNCH-CHECKLIST item 3: may change with domain
  city: 'Kansas City',
  region: 'MO',
  country: 'US',
  founded: '2018',
  neutralityStatement:
    'Purinton Analytics accepts engagements from both plaintiff and defense counsel and provides objective, methodology-driven opinions regardless of retaining party.',
  description50:
    'Purinton Analytics is a national forensic damages and rehabilitation consulting firm providing coordinated vocational evaluation, life care planning, and forensic economic analysis for plaintiff and defense counsel in litigation across the United States.',
  description150:
    'Purinton Analytics, LLC is a national forensic damages and rehabilitation consulting firm based in Kansas City, Missouri, serving plaintiff and defense counsel in all 50 states. The firm coordinates three distinct disciplines within clearly separated expert roles: vocational evaluation and expert testimony, life care planning for catastrophic injury, and forensic economic damages analysis. Vocational and life care planning opinions are provided by principal Jason C. Purinton, LPC, CRC, CVE, CLCP, ABVE/F, IPEC, who has completed more than 3,000 disability-related vocational evaluations and serves as President of the Board of Directors of the American Rehabilitation Economics Association and as a Fellow and Board member of the American Board of Vocational Experts. Economic analyses are performed and signed by independent economist partners coordinated by the firm. Every engagement begins with a documented conflict check. Evaluations, depositions, and trial testimony are available remotely and in person nationwide.',
  stats: [
    { value: '3,000+', label: 'disability-related vocational evaluations' }, // gated: LAUNCH-CHECKLIST item 2
    { value: '50', label: 'states available for engagement' },
    { value: '3', label: 'coordinated forensic disciplines' },
    { value: '2018', label: 'serving litigators since' },
  ],
  sameAs: [
    'https://www.linkedin.com/in/pa-expert',
    'https://www.linkedin.com/company/purintonanalytics',
    'https://www.facebook.com/Purinton.Analytics',
    'https://x.com/PurintonExpert',
  ],
  web3formsKey: '9a52d3b9-a7cb-4f4f-8479-f0d330f3a6ce',
  /** IndexNow verification key; must match the public/<key>.txt key file (enforced by test). */
  indexNowKey: 'a7c1e59f30b64d2fb8e4906cd15a2f77',
  robots: { allowGPTBot: false, allowClaudeBot: false },
  offices: [
    { slug: 'kansas-city', city: 'Kansas City', region: 'MO', regionFull: 'Missouri', primary: true },
    { slug: 'st-louis', city: 'St. Louis', region: 'MO', regionFull: 'Missouri' },
    { slug: 'denver', city: 'Denver', region: 'CO', regionFull: 'Colorado' },
    { slug: 'chicago', city: 'Chicago', region: 'IL', regionFull: 'Illinois' },
  ], // all by appointment; NO street addresses (accuracy guardrail)
} as const;
