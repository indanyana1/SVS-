import React from 'react';
import { formatInBuyerCurrency, useBuyerCurrency } from '../lib/buyerCurrency';

/**
 * Legal pages for Biznisdil. These render proper Privacy, Terms,
 * Refund and Cookie policies with real content (rather than the
 * "Coming soon" placeholder).
 *
 * Pages are intentionally self-contained and styled with the existing
 * `--svs-*` CSS variables so they pick up dark mode automatically.
 *
 * NOTE: These templates cover common e-commerce obligations (GDPR,
 * POPIA, CCPA-style rights, refund cooling-off periods). They should
 * still be reviewed by your lawyer before final launch.
 */

const LAST_UPDATED = 'June 2026';
const CONTACT_EMAIL = 'support@biznisdil.com';
const COMPANY_NAME = 'Biznisdil';

const Section = ({ id, title, children }) => (
  <section id={id} className="mb-6 rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-5 shadow-sm sm:p-6">
    <h2 className="text-lg font-bold text-[var(--svs-primary)] sm:text-xl">{title}</h2>
    <div className="mt-3 space-y-3 text-sm leading-relaxed text-[var(--svs-text)] sm:text-[15px]">{children}</div>
  </section>
);

const ListBlock = ({ items }) => (
  <ul className="ml-5 list-disc space-y-1.5">
    {items.map((line, idx) => (
      <li key={idx}>{line}</li>
    ))}
  </ul>
);

const TocBlock = ({ items }) => (
  <nav aria-label="On this page" className="mb-6 rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-4 text-sm">
    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--svs-muted)]">On this page</p>
    <ol className="grid gap-1 sm:grid-cols-2">
      {items.map((it) => (
        <li key={it.id}>
          <a href={`#${it.id}`} className="text-[var(--svs-primary)] hover:underline">
            {it.title}
          </a>
        </li>
      ))}
    </ol>
  </nav>
);

const PageWrap = ({ title, subtitle, children }) => (
  <section className="bg-[var(--svs-bg)] px-4 py-8 text-[var(--svs-text)] sm:py-10">
    <div className="mx-auto w-full max-w-4xl">
      <header className="mb-6 rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-5 shadow-sm sm:p-6">
        <h1 className="text-2xl font-black text-[var(--svs-primary)] sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-[var(--svs-muted)] sm:text-[15px]">{subtitle}</p>
        <p className="mt-3 text-xs font-semibold text-[var(--svs-muted)]">Last updated: <span className="font-bold text-[var(--svs-text)]">{LAST_UPDATED}</span></p>
      </header>
      {children}
    </div>
  </section>
);

// ─────────────────────────────────────────────────────────────────────
//  Terms of Service
// ─────────────────────────────────────────────────────────────────────
export const TermsOfServicePage = () => {
  // Re-render when the buyer's selected currency changes so the liability
  // cap below is shown and converted in their chosen currency.
  useBuyerCurrency();
  const liabilityCap = formatInBuyerCurrency(1000, 'ZAR', { decimals: 0 });
  const toc = [
    { id: 'terms-acceptance', title: '1. Acceptance of terms' },
    { id: 'terms-account', title: '2. Your account' },
    { id: 'terms-using', title: '3. Using the marketplace' },
    { id: 'terms-buyers', title: '4. Buyers' },
    { id: 'terms-sellers', title: '5. Sellers' },
    { id: 'terms-payments', title: '6. Payments & fees' },
    { id: 'terms-prohibited', title: '7. Prohibited items & conduct' },
    { id: 'terms-ip', title: '8. Intellectual property' },
    { id: 'terms-liability', title: '9. Liability & disclaimers' },
    { id: 'terms-termination', title: '10. Suspension & termination' },
    { id: 'terms-disputes', title: '11. Disputes & governing law' },
    { id: 'terms-changes', title: '12. Changes to these terms' },
    { id: 'terms-contact', title: '13. Contact' },
  ];
  return (
    <PageWrap
      title="Terms of Service"
      subtitle={`Please read these terms carefully. By using ${COMPANY_NAME} you agree to be bound by them.`}
    >
      <TocBlock items={toc} />

      <Section id="terms-acceptance" title="1. Acceptance of terms">
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) form a binding agreement between you and {COMPANY_NAME} (&ldquo;we&rdquo;,
          &ldquo;us&rdquo;, &ldquo;our&rdquo;). By accessing or using the {COMPANY_NAME} website, mobile app, APIs or any
          related service (collectively, the &ldquo;Platform&rdquo;) you confirm that you have read, understood and
          accepted these Terms together with our Privacy Policy, Refund Policy and Cookie Policy.
        </p>
        <p>
          If you have any questions or concerns about any part of these Terms, we&rsquo;re happy to help &mdash; just
          email us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-[var(--svs-primary)] hover:underline">
            {CONTACT_EMAIL}
          </a>{' '}
          or{' '}
          <a href="/support/chat" className="font-semibold text-[var(--svs-primary)] hover:underline">
            chat with the Biznisdil Agent
          </a>{' '}
          and we&rsquo;ll gladly walk you through them.
        </p>
      </Section>

      <Section id="terms-account" title="2. Your account">
        <ListBlock
          items={[
            'You must be at least 18 years old (or the age of majority in your jurisdiction) to create an account.',
            'You agree to provide accurate, current and complete information and to keep it up to date.',
            'You are responsible for keeping your password secret and for all activity that happens under your account.',
            'Notify us immediately at ' + CONTACT_EMAIL + ' if you suspect your account has been compromised.',
            'We may refuse, suspend or terminate any account at our discretion, including for breach of these Terms.',
          ]}
        />
      </Section>

      <Section id="terms-using" title="3. Using the marketplace">
        <p>
          {COMPANY_NAME} is a marketplace that connects buyers and sellers across multiple categories (electronics,
          groceries, fast food, fashion, property, livestock, tickets, beverages, home-care services and more). We
          provide the technology and tools — we are not a party to the transaction between buyer and seller unless
          we expressly say so.
        </p>
      </Section>

      <Section id="terms-buyers" title="4. Buyers">
        <ListBlock
          items={[
            'You agree to pay the listed price plus any applicable taxes, shipping and fees at checkout.',
            'Title and risk of loss pass to you on delivery, unless specified otherwise by the seller.',
            'You are responsible for inspecting goods on receipt and raising any issues within the timeframes set in our Refund Policy.',
            'Service bookings (e.g. home-care, property visits) are subject to the provider\u2019s availability and cancellation policy.',
          ]}
        />
      </Section>

      <Section id="terms-sellers" title="5. Sellers">
        <ListBlock
          items={[
            'You may only list items you own or are authorised to sell.',
            'Listings must be accurate, lawful, and free of misleading claims, infringing content, or counterfeit goods.',
            'You agree to fulfil confirmed orders promptly and to communicate with buyers via the in-app chat.',
            'You are solely responsible for tax, licensing, customs and any regulatory obligations relating to your sales.',
            'We may delist content or restrict your account if listings violate these Terms or applicable law.',
          ]}
        />
      </Section>

      <Section id="terms-payments" title="6. Payments & fees">
        <p>
          Payments are processed securely through trusted, PCI-DSS compliant third-party payment providers. We never
          store your full card details. {COMPANY_NAME} charges a small transaction fee &mdash; typically between 1 and
          10 cents per item listed and purchased &mdash; together with any applicable service, listing or commission
          fees. All applicable fees are shown clearly before you complete a transaction. Payouts to sellers are made
          on the schedule set out in your seller dashboard, subject to verification and anti-fraud checks.
        </p>
      </Section>

      <Section id="terms-prohibited" title="7. Prohibited items & conduct">
        <ListBlock
          items={[
            'No illegal, stolen, counterfeit, hazardous, or recalled goods.',
            'No weapons, explosives, regulated drugs, or controlled substances outside your licence.',
            'No human remains, live animals outside the Livestock category guidelines, or endangered species.',
            'No harassment, hate speech, fraud, scams, fake reviews, or manipulation of search rankings.',
            'No scraping, reverse engineering, bypassing security controls, or interfering with the Platform.',
          ]}
        />
      </Section>

      <Section id="terms-ip" title="8. Intellectual property">
        <p>
          The Platform, including all software, designs, text, graphics, logos, and trademarks, is owned by
          {' '}{COMPANY_NAME} or its licensors. You retain ownership of content you upload (listings, photos, reviews),
          but grant us a worldwide, royalty-free licence to host, display, reproduce, translate and distribute that
          content for the purpose of operating and promoting the Platform.
        </p>
      </Section>

      <Section id="terms-liability" title="9. Liability & disclaimers">
        <p>
          The Platform is provided &ldquo;as is&rdquo; without warranties of any kind, whether express or implied. To
          the maximum extent permitted by law, {COMPANY_NAME} will not be liable for any indirect, incidental,
          special or consequential damages, loss of profit, data loss, or business interruption arising from your use
          of the Platform.
        </p>
        <p>
          Our total aggregate liability for any claim relating to the Platform will not exceed the greater of (a) the
          amount you paid us in the 12 months before the claim, or (b) {liabilityCap}.
        </p>
      </Section>

      <Section id="terms-termination" title="10. Suspension & termination">
        <p>
          We may suspend or terminate your access to the Platform at any time, with or without notice, if we
          reasonably believe you have breached these Terms, posed a security risk, or engaged in unlawful activity.
          You may stop using the Platform at any time. Termination does not affect outstanding orders or accrued
          obligations.
        </p>
      </Section>

      <Section id="terms-disputes" title="11. Disputes & governing law">
        <p>
          These Terms are governed by the laws of South Africa. Any dispute arising out of or in connection with the
          Platform will first be addressed through our in-app dispute process. If unresolved, the courts of South
          Africa have exclusive jurisdiction, unless a mandatory consumer law in your country requires otherwise.
        </p>
      </Section>

      <Section id="terms-changes" title="12. Changes to these terms">
        <p>
          We may update these Terms from time to time. Material changes will be notified by email or by an in-app
          notice. Continued use of the Platform after the effective date constitutes acceptance of the new Terms.
        </p>
      </Section>

      <Section id="terms-contact" title="13. Contact">
        <p>
          Questions about these Terms? Email us at <a className="text-[var(--svs-primary)] underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or <a className="font-semibold text-[var(--svs-primary)] underline" href="/support/chat">chat with the Biznisdil Agent</a>.
        </p>
      </Section>
    </PageWrap>
  );
};

// ─────────────────────────────────────────────────────────────────────
//  Privacy Policy
// ─────────────────────────────────────────────────────────────────────
export const PrivacyPolicyPage = () => {
  const toc = [
    { id: 'privacy-overview', title: '1. Overview' },
    { id: 'privacy-data', title: '2. Data we collect' },
    { id: 'privacy-use', title: '3. How we use your data' },
    { id: 'privacy-share', title: '4. When we share data' },
    { id: 'privacy-storage', title: '5. Storage & security' },
    { id: 'privacy-rights', title: '6. Your rights' },
    { id: 'privacy-cookies', title: '7. Cookies & tracking' },
    { id: 'privacy-children', title: '8. Children' },
    { id: 'privacy-intl', title: '9. International transfers' },
    { id: 'privacy-changes', title: '10. Changes & contact' },
  ];
  return (
    <PageWrap
      title="Privacy Policy"
      subtitle={`How ${COMPANY_NAME} collects, uses, stores and protects your personal information.`}
    >
      <TocBlock items={toc} />

      <Section id="privacy-overview" title="1. Overview">
        <p>
          {COMPANY_NAME} respects your privacy. This policy explains what personal information we collect when you use
          the Platform, why we collect it, who we share it with, and the rights you have over it. We aim to comply
          with the EU&rsquo;s GDPR, South Africa&rsquo;s POPIA, and other applicable data-protection laws.
        </p>
      </Section>

      <Section id="privacy-data" title="2. Data we collect">
        <p><strong>You give us:</strong></p>
        <ListBlock
          items={[
            'Account details (name, email, password, profile photo, role: buyer/seller).',
            'Listings, messages, photos, voice notes and videos you upload.',
            'Shipping addresses, billing details, and bank/payout information (sellers).',
            'Identity verification documents where required by law (e.g. age-restricted listings).',
          ]}
        />
        <p><strong>We collect automatically:</strong></p>
        <ListBlock
          items={[
            'Device information (browser, OS, IP address, device type).',
            'Usage data (pages visited, items viewed, search queries, clicks, session duration).',
            'Location (city/region) inferred from IP, or precise location if you grant permission.',
            'Cookies and similar technologies (see our Cookie Policy).',
          ]}
        />
        <p><strong>From third parties:</strong></p>
        <ListBlock
          items={[
            'Payment processors confirm whether a payment succeeded (we never receive your full card).',
            'Address autocomplete & geocoding providers return suggestions when you type an address.',
            'AI services (Anthropic Claude, Groq) process media you choose to send so we can describe or transcribe it.',
          ]}
        />
      </Section>

      <Section id="privacy-use" title="3. How we use your data">
        <ListBlock
          items={[
            'Operate the marketplace: matching buyers with sellers, processing orders, delivering messages.',
            'Process payments, refunds and seller payouts.',
            'Personalise your experience (recommended products, recently viewed, search ranking).',
            'Communicate with you about your account, orders, security, and (with consent) promotions.',
            'Detect and prevent fraud, abuse, and illegal activity.',
            'Comply with legal, regulatory and tax obligations.',
            'Improve our services through analytics, surveys, and A/B testing.',
          ]}
        />
      </Section>

      <Section id="privacy-share" title="4. When we share data">
        <ListBlock
          items={[
            'With sellers, so they can fulfil your orders (name, delivery address, contact details).',
            'With secure third-party payment processors to charge your card or pay out earnings.',
            'With shipping carriers and home-care providers to deliver goods or services.',
            'With service providers (cloud hosting, email, analytics, AI APIs) who act on our behalf under contract.',
            'With authorities if required by law, court order, or to protect rights, property or safety.',
            'In a merger, acquisition, or asset sale, with appropriate confidentiality protections.',
          ]}
        />
        <p>We never sell your personal information.</p>
      </Section>

      <Section id="privacy-storage" title="5. Storage & security">
        <p>
          Data is stored on managed cloud infrastructure with industry-standard encryption in transit (TLS) and at
          rest. We retain personal data only as long as needed for the purpose collected, to comply with law, or to
          resolve disputes. Account data is typically deleted within 30 days of account closure, except where we are
          legally required to keep it for longer (e.g. tax records).
        </p>
      </Section>

      <Section id="privacy-rights" title="6. Your rights">
        <p>Depending on your jurisdiction, you may have the right to:</p>
        <ListBlock
          items={[
            'Access — request a copy of the personal data we hold about you.',
            'Correct — fix inaccurate or incomplete information.',
            'Delete — request erasure of your personal data ("right to be forgotten").',
            'Restrict or object — limit how we process your data.',
            'Portability — receive your data in a portable format.',
            'Withdraw consent — for marketing and optional features at any time.',
            'Lodge a complaint with a supervisory authority.',
          ]}
        />
        <p>
          Email <a className="text-[var(--svs-primary)] underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> to exercise any of these rights. We respond within 30 days.
        </p>
      </Section>

      <Section id="privacy-cookies" title="7. Cookies & tracking">
        <p>
          We use a small set of cookies for authentication, session continuity, language preference, theme, and
          aggregated analytics. See our Cookie Policy for details and how to manage your preferences.
        </p>
      </Section>

      <Section id="privacy-children" title="8. Children">
        <p>
          The Platform is not intended for users under 18. We do not knowingly collect personal data from children. If
          you believe a child has provided us with personal data, please email us so we can remove it.
        </p>
      </Section>

      <Section id="privacy-intl" title="9. International transfers">
        <p>
          Our infrastructure may process data in countries other than your own. Where this happens we use lawful
          transfer mechanisms (standard contractual clauses, adequacy decisions, or your explicit consent) and apply
          appropriate safeguards.
        </p>
      </Section>

      <Section id="privacy-changes" title="10. Changes & contact">
        <p>
          We may update this policy from time to time. Material changes will be notified by email or in-app banner.
          Contact us at <a className="text-[var(--svs-primary)] underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with any privacy question.
        </p>
      </Section>
    </PageWrap>
  );
};

// ─────────────────────────────────────────────────────────────────────
//  Refund Policy
// ─────────────────────────────────────────────────────────────────────
export const RefundPolicyPage = () => {
  const toc = [
    { id: 'refund-summary', title: 'Summary' },
    { id: 'refund-window', title: '1. Refund window' },
    { id: 'refund-eligible', title: '2. Eligible items' },
    { id: 'refund-process', title: '3. How to request a refund' },
    { id: 'refund-shipping', title: '4. Return shipping' },
    { id: 'refund-services', title: '5. Services & bookings' },
    { id: 'refund-tickets', title: '6. Tickets & events' },
    { id: 'refund-property', title: '7. Property bookings' },
    { id: 'refund-disputes', title: '8. Disputes' },
  ];
  return (
    <PageWrap
      title="Refund & Return Policy"
      subtitle={`How returns, refunds and disputes work on ${COMPANY_NAME}.`}
    >
      <TocBlock items={toc} />

      <Section id="refund-summary" title="Summary">
        <ListBlock
          items={[
            'Most physical goods can be returned within 7 days of delivery if they are unused, in original packaging, and not on the non-returnable list.',
            'Food, beverages, perishables, intimate items, customised goods, and digital codes are not refundable once delivered or revealed.',
            'Refunds are issued to the original payment method, usually within 5–10 business days after the seller approves the return.',
            'Damaged or incorrect items: report within 48 hours of delivery with photos for a full refund or replacement.',
          ]}
        />
      </Section>

      <Section id="refund-window" title="1. Refund window">
        <p>
          You may request a refund or return within <strong>7 days of receiving the item</strong> (or 24 hours for
          perishables that arrive defective). After this window sellers may decline the request unless the item is
          covered by an extended warranty or a statutory consumer right.
        </p>
      </Section>

      <Section id="refund-eligible" title="2. Eligible items">
        <p><strong>Generally returnable:</strong> electronics, fashion, home-care goods, stationery, mobility & vehicles (within 24 hours), construction tools.</p>
        <p><strong>Generally not returnable:</strong></p>
        <ListBlock
          items={[
            'Fresh food, fast food, groceries, beverages and liquor once delivered intact.',
            'Traditional medicines, herbs, supplements, and wellness products with broken seals.',
            'Personal care, intimate products, swimwear with hygiene strips removed.',
            'Customised, monogrammed or made-to-order items.',
            'Downloadable codes, digital vouchers once revealed.',
            'Live animals in the Livestock category (subject to provider rules).',
          ]}
        />
      </Section>

      <Section id="refund-process" title="3. How to request a refund">
        <ol className="ml-5 list-decimal space-y-1.5">
          <li>Open the order from <em>My Orders</em> in your account.</li>
          <li>Tap <strong>Return</strong>, <strong>Exchange</strong>, or <strong>Cancel</strong> and choose a reason.</li>
          <li>Upload clear photos if the item is damaged, incorrect or incomplete.</li>
          <li>The seller has 3 business days to accept or counter-offer. You can escalate to {COMPANY_NAME} support if there is no response.</li>
          <li>Once approved, ship the item back (where applicable) and your refund is released to the original payment method.</li>
        </ol>
      </Section>

      <Section id="refund-shipping" title="4. Return shipping">
        <p>
          If the return is due to an error or fault on the seller&rsquo;s side, the seller covers return shipping. If
          you simply changed your mind, you cover the return shipping unless the seller offers free returns. Items
          must arrive back in original condition; restocking fees may apply to opened electronics.
        </p>
      </Section>

      <Section id="refund-services" title="5. Services & bookings (home-care, wellness)">
        <p>
          You may cancel a service booking free of charge up to 24 hours before the scheduled start time. Cancellations
          within 24 hours may incur up to 50% of the booking fee at the provider&rsquo;s discretion. If the provider
          fails to show up or delivers a service that is materially different from what was advertised, you are
          entitled to a full refund.
        </p>
      </Section>

      <Section id="refund-tickets" title="6. Tickets & events">
        <p>
          Event and movie tickets are non-refundable unless the event is cancelled, postponed beyond 6 months, or the
          organiser&rsquo;s terms expressly permit a refund. In that case the refund is processed by the event
          organiser through {COMPANY_NAME}.
        </p>
      </Section>

      <Section id="refund-property" title="7. Property bookings & visits">
        <p>
          Property visit fees are refundable up to 12 hours before the scheduled visit. Reservation deposits on rental
          or sale listings are handled per the landlord/seller&rsquo;s posted terms shown at the time of booking.
        </p>
      </Section>

      <Section id="refund-disputes" title="8. Disputes">
        <p>
          If you and the seller cannot agree, open a dispute in the order details or the &ldquo;Let&rsquo;s Talk
          Business&rdquo; chat. {COMPANY_NAME} support will review the evidence from both sides and issue a binding
          decision within 7 business days. Where we hold the funds in escrow, we release them according to that
          decision.
        </p>
      </Section>
    </PageWrap>
  );
};

// ─────────────────────────────────────────────────────────────────────
//  Cookie Policy
// ─────────────────────────────────────────────────────────────────────
export const CookiePolicyPage = () => {
  const toc = [
    { id: 'cookie-what', title: '1. What are cookies?' },
    { id: 'cookie-types', title: '2. Types we use' },
    { id: 'cookie-3p', title: '3. Third-party cookies' },
    { id: 'cookie-manage', title: '4. Managing cookies' },
    { id: 'cookie-changes', title: '5. Changes' },
  ];
  return (
    <PageWrap
      title="Cookie Policy"
      subtitle="How and why we use cookies and similar storage on your device."
    >
      <TocBlock items={toc} />

      <Section id="cookie-what" title="1. What are cookies?">
        <p>
          Cookies are small text files placed on your device by websites you visit. They remember preferences (such as
          language or theme), keep you signed in, and help us measure how the Platform is used.
        </p>
      </Section>

      <Section id="cookie-types" title="2. Types we use">
        <ListBlock
          items={[
            'Strictly necessary — keep you signed in, secure your session, remember your cart and language. These cannot be turned off.',
            'Functional — remember theme (light/dark), recent searches, recently viewed items, location preference.',
            'Analytics — aggregated, anonymised page-view and Core Web Vitals data so we can improve performance.',
            'Marketing — only when you opt in. We may use these to show relevant offers or measure campaign success.',
          ]}
        />
      </Section>

      <Section id="cookie-3p" title="3. Third-party cookies">
        <p>
          Some services we use (such as our payment processor or address autocomplete providers) may set their own
          cookies when their components load. We do not control these cookies — please see those providers&rsquo;
          privacy policies for details.
        </p>
      </Section>

      <Section id="cookie-manage" title="4. Managing cookies">
        <p>
          You can clear or block cookies in your browser settings at any time. Doing so may break parts of the
          Platform that rely on session cookies (for example, you may be signed out). On supported devices you can
          also revoke optional permissions through the consent banner the first time you visit.
        </p>
      </Section>

      <Section id="cookie-changes" title="5. Changes">
        <p>
          We may update this Cookie Policy from time to time. Material changes will be notified in-app. Questions?
          Email <a className="text-[var(--svs-primary)] underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </Section>
    </PageWrap>
  );
};

// ─────────────────────────────────────────────────────────────────────
//  Seller Terms & Conditions
//  Read alongside the general Terms of Service (which still governs the
//  Platform as a whole) — this page spells out, specifically, what a
//  seller signs up for: the marketplace conduct rules, and exactly how
//  the platform fee and the first-100-sellers introductory promotion
//  work. Sellers must acknowledge this page before their onboarding
//  application can be submitted (see SellerOnboardingPage.jsx).
// ─────────────────────────────────────────────────────────────────────
export const SellerTermsPage = () => {
  const toc = [
    { id: 'seller-terms-acceptance', title: '1. Acceptance' },
    { id: 'seller-terms-eligibility', title: '2. Becoming a seller' },
    { id: 'seller-terms-conduct', title: '3. Listings & conduct' },
    { id: 'seller-terms-fees', title: '4. Seller platform fees' },
    { id: 'seller-terms-promo', title: '5. Introductory free-month offer' },
    { id: 'seller-terms-payouts', title: '6. Payouts' },
    { id: 'seller-terms-suspension', title: '7. Suspension & termination' },
    { id: 'seller-terms-changes', title: '8. Changes to these terms' },
    { id: 'seller-terms-contact', title: '9. Contact' },
  ];
  return (
    <PageWrap
      title="Seller Terms & Conditions"
      subtitle={`Please read this before you register as a ${COMPANY_NAME} seller. It explains your obligations as a seller and, specifically, how our platform fee and introductory offer work.`}
    >
      <TocBlock items={toc} />

      <Section id="seller-terms-acceptance" title="1. Acceptance">
        <p>
          These Seller Terms &amp; Conditions apply in addition to, not instead of, the general{' '}
          <a className="text-[var(--svs-primary)] underline" href="/terms">Terms of Service</a>. By submitting a
          seller application you confirm that you have read, understood and agreed to both.
        </p>
      </Section>

      <Section id="seller-terms-eligibility" title="2. Becoming a seller">
        <ListBlock
          items={[
            'You must complete seller verification (business details, identity document, and a live selfie) before your application is reviewed.',
            'Applications are reviewed by our team and may be approved, rejected, or sent back requesting changes.',
            'You must keep your business, contact and payout details accurate and up to date at all times.',
            'One seller account per person or business — duplicate accounts created to re-qualify for the introductory offer are not permitted (see Section 5).',
          ]}
        />
      </Section>

      <Section id="seller-terms-conduct" title="3. Listings & conduct">
        <ListBlock
          items={[
            'You may only list items you own or are authorised to sell, priced and described accurately.',
            'You agree to fulfil confirmed orders promptly and to keep buyers updated via the in-app chat and order status.',
            'You are solely responsible for tax, licensing, customs, and any regulatory obligations relating to your sales.',
            'We may delist listings or restrict your account if you violate these terms or applicable law.',
          ]}
        />
      </Section>

      <Section id="seller-terms-fees" title="4. Seller platform fees">
        <p>
          There is no monthly subscription or listing fee to sell on {COMPANY_NAME} — we only earn a fee when you make
          a sale.
        </p>
        <ListBlock
          items={[
            'A platform fee is charged as a percentage of the order amount on each completed order. The current rate is shown in your Seller Dashboard and Payouts page — as of this policy, the standard rate is 7%.',
            'The fee is calculated automatically and shown on every order alongside your payout, e.g. an order of R1,870.00 at 7% shows a R130.90 fee and a R1,739.10 payout.',
            'If we change the platform fee percentage, the new rate applies only to orders placed after the change. Orders already completed keep the fee rate that applied at the time — fees are never changed retroactively.',
            'A separate, unrelated buyer service fee (currently 3%) is charged to buyers at checkout and never affects your payout.',
          ]}
        />
      </Section>

      <Section id="seller-terms-promo" title="5. Introductory free-month offer">
        <p>
          As an introductory offer, a limited number of the first sellers to start selling on {COMPANY_NAME} (currently
          the first 100, shown in your Payouts page) pay a 0% platform fee for their first month of selling.
        </p>
        <ListBlock
          items={[
            'Your free period starts on the date of your first successful, completed sale — not the date you registered or were approved.',
            'It automatically expires exactly one month (the exact number of days is shown in your Payouts page) after that first sale.',
            'The offer is granted automatically if you qualify, and is shown in your Payouts page with its start and expiry date.',
            'Each seller may receive this offer once only. It cannot be re-triggered by creating a new account, listing under a different email, or any other method.',
            'Once your free period ends, the standard platform fee (Section 4) applies automatically to your future orders — no action is required from you.',
            'This offer may be changed, limited, or withdrawn for sellers who have not yet qualified at our discretion; it does not affect a free period already granted.',
          ]}
        />
      </Section>

      <Section id="seller-terms-payouts" title="6. Payouts">
        <p>
          Your payout for each order is the order amount minus the platform fee that applied to that order (or the
          full amount during an active free period). Payouts are requested from your Payouts page and disbursed to
          your registered bank account, subject to verification and anti-fraud checks.
        </p>
      </Section>

      <Section id="seller-terms-suspension" title="7. Suspension & termination">
        <p>
          We may suspend or terminate your seller account at any time, with or without notice, if we reasonably
          believe you have breached these terms, the general Terms of Service, or applicable law. Termination does
          not affect fees already charged or payouts already owed on completed orders.
        </p>
      </Section>

      <Section id="seller-terms-changes" title="8. Changes to these terms">
        <p>
          We may update these Seller Terms &amp; Conditions from time to time. Material changes — including changes to
          the platform fee or the introductory offer — will be notified by email or an in-app notice, and (per
          Section 4) never apply retroactively to orders you have already completed.
        </p>
      </Section>

      <Section id="seller-terms-contact" title="9. Contact">
        <p>
          Questions about selling on {COMPANY_NAME}? Email us at <a className="text-[var(--svs-primary)] underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or <a className="font-semibold text-[var(--svs-primary)] underline" href="/support/chat">chat with the Biznisdil Agent</a>.
        </p>
      </Section>
    </PageWrap>
  );
};
