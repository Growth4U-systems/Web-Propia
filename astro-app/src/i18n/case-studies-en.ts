import type { CaseStudy } from '../lib/firebase-fetch';

// English overrides for case studies, keyed by slug.
// Pages merge these on top of the Spanish Firestore data: { ...caseFromFirebase, ...overrides[slug] }.
// Fields not present in the override fall back to Spanish.
type CaseOverride = Partial<
  Pick<
    CaseStudy,
    | 'statLabel'
    | 'highlight'
    | 'summary'
    | 'challenge'
    | 'solution'
    | 'results'
    | 'testimonial'
    | 'testimonialRole'
    | 'content'
    | 'stat'
  >
>;

export const caseStudiesEN: Record<string, CaseOverride> = {
  bnext: {
    statLabel: 'users in less than 30 months',
    highlight: 'From 0 to 500,000 users with a CAC of €12.50 — a quarter of what N26 was paying',
    summary:
      'How a Spanish fintech with no brand or budget grew faster than Revolut and N26 by building a delegated-trust system with 300+ affiliates and 50M+ visits/month.',
    challenge:
      'A saturated market: BBVA, CaixaBank and Santander were already improving their digital products. ING was positioned as the "no-fee bank". Revolut and N26 had international traction. Spanish banking inertia ran deep — people use 1-2 banks max and perceive that "all banks are the same". The market response was clear: "Revolut already exists, N26 already exists, ING already exists… why do I need another one?"',
    solution:
      'Instead of competing head-on, we designed the Trust Engine: a system where each piece reinforces the others. First we identified underserved niches (travelers, families with kids). Then we built a trust fortress with systematic reviews, comparison content on third-party blogs, and SEO. Finally we activated 300+ niche affiliates with an instant €10 incentive and perfect per-partner attribution. Paid media came 18 months later, once the fortress was already in place.',
    results: [
      '0 → 500,000 users in less than 30 months',
      'Blended CAC of €12.50 — vs €50 at N26',
      '70% conversion to card activation',
      'Speed to 300K: Bnext 17 months vs Revolut 24 vs N26 58',
      '+400% YoY net revenue (Oct 2018 → Oct 2019)',
      '4.4 stars on App Store, Play Store and Trustpilot',
      'Positive K-Factor: every 2 users brought 1 new one',
      '300+ affiliates with 50M+ visits/month',
      '~€86M post-money valuation (Crowdcube, Oct 2019)',
    ],
    testimonial:
      "Traditional marketing simply doesn't work the same way in fintech. While an e-commerce business validates its promise by shipping a package, we had to earn people's trust with their money. The Trust Engine wasn't just a marketing strategy — it was the only real way to grow.",
    testimonialRole: 'Head of Growth, Bnext',
    content: `## The context: Spain, 2017

BBVA, CaixaBank and Santander had already improved their digital products. ING had a strong brand as the "no-fee bank". Revolut and N26 were arriving with traction, brand and a consolidated product.

Spanish banking inertia was a wall: people use 1-2 banks max. The perception was that all banks are the same.

### Competitive map

| Player | Strength | Exploitable weakness |
|--------|----------|----------------------|
| **Traditional banks** (BBVA, CaixaBank, Santander) | Trust, infrastructure, salary direct deposit | Hidden fees, slow digital product, zero innovation in niches |
| **ING** | "No-fee bank" perception, strong brand | Did charge hidden FX fees (but nobody knew) |
| **Revolut** | Strong product, global brand, early adopters | No Spanish support, perception of being a foreign company |
| **N26** | Design, UX, premium brand | No local closeness or Spanish-language support |

## Waterholes: listening before executing

Before launching a single campaign, we went where users spoke without filters: Reddit, Forocoches, Rankia, travel blogs. Two pain points emerged:

1. **ATM withdrawals were expensive** — annoying, but few people did it often. Low cost for us, high perceived value.
2. **Invisible foreign-exchange fees** — when paying in foreign currency, banks charged a fee that most users had no idea existed.

**The differentiating message:** "Your bank is charging you and you don't know it. We aren't."

## Niche + Positioning + Incentive

We didn't compete head-on. We found the gap nobody was filling.

### The 3 hero niches

**Travelers (main niche)** — Hidden FX fees of 1.5%-3% on every international transaction. People believed ING charged nothing. Once they discovered the truth, Bnext became the obvious answer.

**Families with kids** — There were no cards for minors in Spain. Bnext's nameless card: parents add money, kids spend, full control in the app.

**Digital users** — No-fee ATMs for occasional use.

### A documented system of 8+ niches

| Niche | Main problem | GTM |
|-------|--------------|-----|
| Frequent travelers | Hidden FX fees | Travel blogs, Molaviajar, GuíaLowCost |
| Backpackers | Pay anywhere with no surprises | Specialized travel blogs |
| Erasmus students | Don't want to open an account in another country | Erasmus forums, universities |
| University students | Debts among friends, cash | University ambassadors |
| Foreigners in Spain | Requirements to open a bank account | Expat communities |
| Startup employees | Different experience | Startup events, meetups |
| Parents with kids 12+ | Giving allowance with no control | Schools, social media |
| Couples | Joint account requires going in person | Social media |

### The incentive that changed everything: €10 instantly

Sign-up + activation = **€10 instantly**. Not after a month. Instantly. With a €25 minimum top-up to activate (smart friction that filters real users).

**Result: 70% conversion to card activation.**

### The anecdote that changed everything

A travel blogger asked something simple: "Can I offer an incentive to my readers? €10 is enough." We launched it. **200 users with activated cards in a single weekend.** We didn't have a marketing problem. We had a trust problem. People needed someone they already trusted to say "this is safe".

### Initial budget (March 2018)

- **€52,500/month** — €45,000 partnerships (€15/activation) + €7,500 Facebook retargeting
- First-jump total: **€174,000** for 13,000 activations at an average **CAC of €13.38**
- N26 was paying €50 per customer. Bnext did it at a quarter of that.

## Trust Fortress

Before generating demand, we made sure that when someone investigated us, what they found played in our favor.

| Your site (what you control) | Your reputation (what others say) |
|------------------------------|-----------------------------------|
| Niche landing pages | Articles in media |
| Habit-specific messaging | Reviews (Trustpilot, App Stores) |
| Incentive | Rankings and comparisons |
| App + notifications | SEO + GEO |

### Systematic reviews (double trigger)

**Trigger 1 — Post-support:** Every ticket resolution generated a review request on App Store, Play Store or Trustpilot.

**Trigger 2 — Post-transaction:** After completing X transactions, automatic invite to leave a review.

**Result: 4.4 stars on App Store, Play Store and Trustpilot.**

### Delegated trust: the real engine

Comparison content lived on third-party blogs and websites, not on ours. When people read on an independent travel blog that "ING charges you a hidden 1.5% on FX and Bnext charges you nothing", the reaction was immediate: **"This must be true."**

### Partner economics

- **€5 to the partner** per activated user
- **€10 to the user** as Bnext's incentive
- **Total controlled CAC: €15 per active customer**

## Awareness — Creators + Paid

### Counterintuitive decision

While every bank went to financial media, we went to **travel and parenting bloggers**. Because that's where our audience was.

A network of **300+ affiliates** with **50M+ visits/month**. Each partner with a custom landing page and a unique code for perfect attribution.

### Burst vs Slow Burn

| | Burst (Creators) | Slow Burn (Media/SEO) |
|--|---------------------|--------------------------|
| How they work | Video/post, peak 48-72h, drop | Evergreen article, steady traffic for months/years |
| What they need | New campaigns, exclusive promos | Updated content, fresh screenshots |
| Key metric | Activations per campaign | Sustained monthly activations |

### The record campaign: April 2019 (+125% acquisition)

Simultaneous multi-channel orchestration — from 16,000 to 39,520 sign-ups in a single month:

- **María Pombo:** +1,500 customers. Reach: 1.9M people. Value: €70,000
- **Affiliates** (Chollometro, Forocoches, Molaviajar): +5,000 customers
- **Email Marketing:** campaign to 150,000+ people
- **Paid Media:** budget increased to amplify

### Paid on top of a trust foundation

Paid started in mid-2019, after 18 months of building trust. It worked because: user sees ad → investigates → finds positive reviews and comparisons → converts. **Without the fortress, paid is burnt money.**

## Flywheel — Measure, Optimize, Scale

### Time evolution

**2018: 0 to 100K** — Almost exclusively partners + third-party content.

**2019: 100K to 300K** — Three engines in parallel:
1. **Referral** (€10+€10): K-Factor where every 2 users brought 1 new one
2. **Organic (layering):** All accumulated content compounding
3. **Paid:** On top of a solid trust foundation

### COVID resilience (2020)

MAUs dropped 33.2% (175K → 120K) but the Trust Engine base held:
- **BChallenge:** 10% reactivation of churned users (4,000 of 40,000)
- **Premium Launch:** 1,205 subscriptions in 7 days
- Visible recovery in May: +7% toward 130K MAUs

## The lesson

Bnext didn't win by competing head-on against Revolut, N26 or the banks. It won by finding niches nobody was serving, positioning itself with an incentive impossible to ignore, and letting third parties build the trust.

We didn't build campaigns. We built a system where every piece reinforced the others: the niche defined the message, the message attracted the right partner, the partner generated trust, trust activated the user, the user left reviews and referred others.

**That's the Trust Engine.**

## Consolidated metrics

| Metric | Value |
|---------|-------|
| Total users | 0 → 500,000 in less than 30 months |
| Blended CAC | €12.50–€13.30 |
| TAC (Total Acquisition Cost) | €21.31 |
| 6-month retention | 55% |
| Card activation conversion | 70% |
| K-Factor | Every 2 users → 1 new |
| Speed to 300K | Bnext 17 months vs Revolut 24 vs N26 58 |
| Revenue YoY | +400% (Oct 2018 → Oct 2019) |
| Ratings | 4.4 on App Store, Play Store and Trustpilot |
| Affiliate network | 300+ sites, 50M+ visits/month |
| Acquisition peak | +125% (April 2019, María Pombo + multichannel) |
| Valuation | ~€86M post-money (Crowdcube, Oct 2019) |
`,
  },

  criptan: {
    statLabel: 'deposit volume in 12 months',
    highlight: 'Solving trust to unlock growth',
    summary:
      'From €75K/quarter underutilized to +160% in deposits, +55% in average deposit and 1-2 month payback by applying the Trust Engine.',
    challenge:
      'A high-yield product perceived as "too good to be true". A total trust barrier, paid with no attribution, influencers with no measurement system.',
    solution:
      'Trust Engine: business model transparency, systematic reviews (from 70 to 300+ on Trustpilot), CEO as the public face, and traditional investment creators (not crypto) as the main channel.',
    results: [
      '+160% in deposit volume',
      '+55% in average deposit per user (from €3,396 to €5,269)',
      '+51% in activation rate',
      'Payback period reduced from 3-5 months to 1-2 months',
      '+324 new Trustpilot reviews (from 3-star to 4+ stars)',
      '+68% in First Deposits',
    ],
    testimonial: 'The key wasn\'t a magic channel. It was a system where every piece reinforced the others.',
    testimonialRole: 'CEO & Co-Founder, Growth4U',
    content: `## The starting point

When we started working with Criptan, the situation was the following:

- **Underutilized budget:** They had €75,000 per quarter for marketing, but never spent it because they weren't sure what was working and what wasn't.
- **Paid with no real visibility:** They were running paid campaigns that brought in new customers, but couldn't be sure of attribution. All the traffic went to mobile and they had no control or traceability there.
- **Influencers with no system:** They had worked with influencers in the past and believed it was working, but had no clear way to measure it.
- **The big challenge — the trust barrier:** Their product offered very high yields on user savings, generated safely. But when you tell someone "you're going to earn 10% on your savings", the first thing they think is that it's a scam. The core problem was: **how do you overcome that distrust barrier?**

## Key results

| Metric | Before | After | Change |
|---------|--------|-------|--------|
| Deposit volume | Baseline | +160% | **+160%** |
| Average deposit per user | €3,396 | €5,269 | **+55%** |
| Activation rate | Baseline | +51% | **+51%** |
| Payback Period | 3-5 months | 1-2 months | **Reduced 60%** |
| Trustpilot reviews | 70 (3-star) | 300+ (4+ stars) | **+324 reviews** |
| Sign-ups | Baseline | +11% | **+11%** |
| First Deposits | Baseline | +68% | **+68%** |

## What we did — The Trust Engine applied step by step

### Phase 0 — Find the gap

Before touching a single campaign, we needed to understand **who the real customer was**. And what we discovered changed the whole strategy.

**The "crypto bro" wasn't our customer.** The typical crypto profile — the one looking for quick wins — wasn't investing here. This platform only offered Bitcoin, Ethereum, USDC and EuroC. Too "boring" for that profile.

**Our real customer was conservative.** People who had never invested in crypto. People who already had their money in euro deposits or money-market funds and simply wanted to **get a higher yield on their savings**.

**Push vs. Pull analysis:**

| Force | Description |
|--------|-------------|
| **Push** (in favor) | Yield much more attractive than traditional banks |
| **Pull** (against) | Total distrust — new, unknown platform, and on top of that it talks about "crypto" |

The **push** was strong, but the distrust **pull** cancelled it out. Without solving that, no channel was going to work.

### Phase 1 — The Trust Fortress

With the gap identified, the goal was clear: **control what users find when they investigate us.**

#### 1. Business model transparency

The first thing was to **put a face on the company.** We created content that clearly explained:

- What the business model was
- What exactly they did with customer funds
- How those funds were invested and how the yield materialized
- What risk standards were applied

The goal was that **whoever was going to talk about the company would actually read it** — and feel confident they weren't recommending a scam.

#### 2. Reviews — from 70 reviews (3-star) to 300+ reviews (4+ stars)

The starting situation was concerning: about 70 Trustpilot reviews with an average score of 3.

**What we did:**

- We identified the thousands of customers who were **delighted** with the product
- We systematically asked them to leave reviews, both on Trustpilot and the App Store
- Result: we went from **70 to over 300 reviews** and from a 3-star score to **above 4**

#### 3. Positioning the CEO and investors

We positioned **Jorge, founding CEO and main shareholder**, as the public face of the company. We also communicated who the other shareholders and investors were that had backed the company.

### Phase 2 — Qualified Demand: Creators and Affiliates

With the trust fortress in place, it was time to generate attention — **traffic that already came with borrowed trust.**

#### Channel selection: traditional investment, not crypto

Instead of going to crypto YouTubers (the "obvious" channel), **we went to traditional investment media**: channels that talked about deposits, funds, savings, yield. That's where our real audience was.

#### The winning format: podcasts

The best-performing format was the **podcast**. Content creators interviewed Jorge, who told the company's story, how the model worked and why it was safe.

All traffic was directed to an **offer with a 20% extra yield** — valid only if they activated within the **first 7 days**, generating real urgency.

### Phase 3 — The Flywheel in action

With every piece connected, the system started feeding itself:

1. **Podcasts and creators** generated awareness among the right audience
2. **Users investigated** and found positive reviews, transparency content and Jorge as the public face
3. **The incentive offer** drove conversion within the first 7 days
4. **We measured everything** and reinvested in what was working

Each turn of the flywheel was more efficient than the previous one.

> **The key wasn't a magic channel. It was a system where every piece reinforced the others.**
`,
  },

  gocardless: {
    stat: '€10K',
    statLabel: 'MRR achieved',
    highlight: 'in 6 months from launch',
    summary:
      'Launch from scratch in Spain and Portugal reaching €10K MRR quickly.',
    challenge:
      'GoCardless needed to build a B2B demand engine from scratch in Spain and Portugal: no brand recognition, a technical product hard to explain, competition from entrenched traditional solutions, and no budget for mass campaigns.',
    solution:
      'A strategy focused on relevant content, smart partnerships with platforms that already had the customer, and a sales process focused on qualified ICPs.',
    results: [
      'MRR achieved: €10,000/month',
      'Time to reach it: 6 months',
      'Ad spend: minimal',
      'Markets launched: Spain + Portugal',
      'Main strategy: Content + Partnerships + ICP focus',
    ],
    testimonial:
      "We had no brand, no customers, no dazzling budget. The challenge was to build a B2B demand engine from scratch, in a market that didn't yet fully understand the product.",
    testimonialRole: 'Growth Lead, GoCardless Iberia',
    content: `## The challenge of a B2B market launch from scratch

### Initial context

**Company:** GoCardless (UK → Spain and Portugal)
**Sector:** B2B Fintech / Recurring payments
**Period:** 6 months

### The problem

GoCardless needed to build a **B2B demand engine from scratch**:

- No brand recognition in the Iberian market
- A technical product (direct debit) hard to explain
- Competition from entrenched traditional solutions
- No budget for mass campaigns

---

## Our approach: strategic focus, no fireworks

### Phase 1: Market analysis and real-friction detection

We identified the ICPs with the most pain and the highest capacity for fast decisions.

### Phase 2: An irresistible B2B promise

We said: **"Your customers pay you on time, every time."**

### Phase 3: A relevant content strategy

We created content that answered the market's real questions.

### Phase 4: Smart partnerships

We partnered with billing platforms and consultancies that already had the customer's trust.

### Phase 5: Sales process focused on qualified ICPs

Lead scoring based on real intent signals and demos personalized by vertical.

---

## Key learnings

1. **No tricks. No fireworks. Just focus.**
2. **In B2B, the promise must speak to outcomes, not features.**
3. **Smart partnerships accelerate time-to-market.**
4. **Relevant content positions and qualifies.**
5. **Focusing on ICPs with higher willingness to pay shortens the sales cycle.**
`,
  },

  bit2me: {
    statLabel: 'CAC + 7x users in 15 months',
    highlight:
      'From €250K/month in paid with no return to a trust system that 7x\'d users and reduced CAC by 70%',
    summary:
      'How we transformed Bit2Me from burning €250,000/month in paid to a sustainable growth system: -70% CAC, 2x LTV, 7x users and €686K in revenue from a single monthly cohort.',
    challenge:
      'Bit2Me was stuck in a bear market with €250,000/month in paid spend that produced low-quality users. Only 200 sign-ups per week and ~€4M in transaction volume. No attribution system, no review management, outdated content. Market perception was "Bit2Me is expensive" and trust had been destroyed by the FTX collapse and token losses.',
    solution:
      'We applied the Trust Engine: first we audited and discovered the "Bit2Me is expensive" narrative was false (competitors hid Lite-version fees). We identified the hidden strength: regulation by the Bank of Spain and tax reporting to the Spanish tax authority. We positioned "Safe and legal crypto in Spain" across two niches (migrators from unregulated exchanges + new investors). We built a trust fortress with systematic reviews, comparative SEO/GEO and delegated PR. Paid went from being the engine to being an amplifier on top of a trust foundation.',
    results: [
      '-70% CAC with sustainable growth',
      '7x users/month: from 889 (Jan 2023) to 6,174 (Mar 2024)',
      '2x LTV (customer lifetime value)',
      'Weekly sign-ups: from ~200 to 1,500-2,000 (8-10x)',
      'Transaction volume: from ~€4M to €15-20M/week (4-5x)',
      'Global Activation Rate: from 14.4% to 24.4% (+69%)',
      'Peak cohort revenue: €686K in Dec 2023 (+254%)',
      'Peak ARPU: €265 — comparable to Coinbase ($305)',
      'Referral Rate: 8.5% with viral coefficient of 0.30',
    ],
    testimonial:
      'Bit2Me didn\'t need more budget. It needed a clear message, real positioning, and a system that built trust on a permanent basis. The Trust Engine turned what the market saw as weaknesses into the exact reasons why choosing Bit2Me was the smartest decision.',
    testimonialRole: 'Growth Consultant, Bit2Me',
    content: `## The context: bear market and trust crisis

Bit2Me was stuck in a bear market, unable to grow without burning money. The FTX collapse had destroyed trust in the crypto market.

- Peak paid spend: **€250,000/month** → low-quality users
- Weekly sign-ups: **~200/week**
- Transaction volume: **~€4M/week**
- No attribution system, no reviews, outdated content
- Market perception: *"Bit2Me is expensive"* (forums, Reddit, comparisons)
- Trust crisis from the token and the FTX effect

## Diagnosis: the false fee narrative

Before acting, we audited everything. We discovered that the market's perception was false and that Bit2Me had a hidden strength.

### Audit

- Out-of-control paid spend with no clear return
- Abandoned reviews on Trustpilot, App Store and Play Store with negative ratings about the token
- Outdated website content

### Waterholes: what the market was saying

The dominant narrative was *"Bit2Me is expensive"*. It was repeated in forums, Reddit and comparisons. Trust had been eroded by the token and the FTX effect.

### Hidden strengths

- Platform **100% regulated** in Spain, with a Bank of Spain license
- **Reported to the Spanish tax authority** → what looked like a weakness was a strength
- Proof of reserves, no history of hacks
- Lite-version fees **actually cheaper** than the competition

### The fee lie

Binance, Coinbase and Kraken advertise their **PRO** version fees (0.1%), but **90% of users** use the **Lite** version with much higher fees. Hidden costs (spread) were not disclosed.

**Action:** We created comparative articles with real Lite-version fees + hidden costs.

## Niche + Positioning: "Safe and legal crypto in Spain"

### The 3-circles intersection (Place to Win)

1. **Real pain** (Waterholes): fear of hacks, problems with the tax authority, hidden fees
2. **Where competitors fail**: not regulated in Spain, no proof of reserves, hidden spreads
3. **Bit2Me strength**: regulation, transparency, tax compliance

**→ GAP = "Safe and legal crypto in Spain"**

### Independent regulatory report

We created an independent report evaluating exchanges' security and regulation: regulatory compliance, hack history, proof of reserves, legal protection. Bit2Me well positioned; the big competitors, not. It was used as a centerpiece for owned content and for creators.

### 2 priority niches

| Niche | Profile | Key message |
|-------|---------|-------------|
| **Migrators** | Users with crypto on unregulated exchanges, growing fiscal risk | "Your exchange doesn't report to the tax authority. The problem isn't theirs — it's yours." |
| **New investors** | Want crypto for the first time, looking for safety and legality | "Invest in crypto safely, legally and with no hidden fees." |

### Activation incentive

**€15 for every €100 of first investment.** Predictive trigger: users who invest €100 → significantly higher LTV. It wasn't a cost, it was an **accelerator tied to retention.**

### Perfect attribution

Every partner with a unique landing page + a code in the user's profile. Full architecture: Landings → Referrals → Growth Book → Strapi → Promotions → Wallet → Backend.

## Trust Fortress

We built a fortress so that when someone googled Bit2Me, they found trust signals everywhere.

### 1. Systematic reviews

Reviews on Trustpilot, App Store and Play Store had been abandoned with negative ratings. We implemented an automated flow: moments of satisfaction → review request. Scores started rising consistently.

### 2. SEO + GEO (Search dominance)

- Comparative articles: real Lite fees vs. competitors
- Positioning for key searches: *"Bit2Me reviews"*, *"best exchange Spain"*, *"Is Bit2Me safe?"*
- Content designed for Google **and** AI engines (GEO)

### 3. PR and delegated trust

- Independent regulatory report placed in third-party media
- Mass update of existing reviews with real data and honest comparisons
- Content in external media → **delegated trust** (others saying you're good)

## Awareness — Creators + Paid as amplifier

### Content creators

Selection by **purchase intent in comments**, not vanity metrics. Niche creators: investment bloggers, personal finance, taxation. Brief framework (not a script): key message + comparison data + regulatory report + creative freedom.

### Paid on top of a trust foundation

Paid stopped being the engine and became an amplifier. **Paid works because the fortress was already built:** user sees ad → investigates → finds reviews + comparisons + positive articles → converts.

### Referral system

- **Referral Rate:** 8.5% of active users refer
- **Viral Coefficient:** 0.30 (every 3.3 users bring 1 new)
- **Incentive:** €15+€15 (referrer + referred) for first investment of €100+

## Flywheel — Measure, Optimize, Scale

### Operational dashboard

- CAC / ARPU / ROAS by channel and partner in real time
- Spain funnel Nov 2023: 49,804 visits → 3,582 sign-ups (7.2%) → 1,750 activations (48.8%)
- Revenue impact: each **+1% activation = +€10,000/month** (Spain only)

### Cohort evolution

| Cohort | New users | Revenue | ARPU |
|---------|-----------|---------|------|
| Jan 2023 | 889 | €194,008 | €218 |
| Jul 2023 | 1,040 | €275,985 | **€265** (peak) |
| Nov 2023 | 2,044 | €431,504 | €211 |
| Dec 2023 | 3,649 | **€686,078** (revenue peak) | €188 |
| Mar 2024 | **6,174** (user peak) | €615,526 | €100 |

From 889 users/month (Jan 2023) to 6,174 (Mar 2024) = **7x in 15 months**. Revenue peak in Dec 2023 with €686K from a single cohort.

### Paid Media — CAC evolution

- **Android CAC:** €148, dropping **32% per month**
- **iOS vs Android ARPU:** iOS **€87** vs Android **€66** → iOS **32% more valuable**

## Headline results

| Metric | Before | After | Change |
|---------|--------|-------|--------|
| Weekly sign-ups | ~200 | 1,500–2,000 | **8-10x** |
| Weekly transaction volume | ~€4M | €15–20M | **4-5x** |
| CAC | Unsustainable (€250K/month paid) | Controlled | **-70%** |
| LTV | Barely covered spend | Doubled | **2x** |
| Global Activation Rate | 14.4% | 24.4% | **+69%** |
| Spain Activation Rate | 43.2% | 48.8% | **+13%** |
| New users/month | 889 | 6,174 | **7x** |
| Peak cohort revenue | €194K (Jan 2023) | €686K (Dec 2023) | **+254%** |
| Peak ARPU | €218 | €265 (Jul 2023) | Comparable to Coinbase ($305) |

## The lesson

Bit2Me didn't need more budget. It needed **a clear message, real positioning, and a system that built trust on a permanent basis.**

The Trust Engine turned what the market saw as weaknesses — reporting to the tax authority, being a Spanish platform, not being "the biggest" — into the **exact reasons why choosing Bit2Me was the smartest decision.**

We didn't build campaigns. **We built a trust asset that keeps generating growth.**
`,
  },
};
