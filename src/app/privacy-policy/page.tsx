import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { COMPANY } from "@/lib/content/site";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Privacy policy",
  description:
    "How Tech Maths processes personal data: what we collect from quote requests, why we process it, how long we keep it, who it is shared with, and your rights under the GDPR.",
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      eyebrow="GDPR"
      title="Privacy policy"
      updated="2025-10-01"
      intro="This policy explains what personal data Tech Maths collects through this website, why we process it, how long we keep it and what rights you have. It is written to be readable, not to be impressive."
      sections={[
        {
          id: "controller",
          title: "Who is responsible",
          body: (
            <>
              <p>
                The data controller is {COMPANY.legalName}, {COMPANY.headquarters.address}. Questions about this
                policy or about your data can be sent to{" "}
                <a href={`mailto:${COMPANY.email}`} className="link-underline text-mist">
                  {COMPANY.email}
                </a>
                .
              </p>
              <p>
                Because we operate across the EU, the UK, the United States and India, transfers outside the EEA
                are made only under an adequacy decision or appropriate safeguards (standard contractual clauses
                where required).
              </p>
            </>
          ),
        },
        {
          id: "collected",
          title: "What we collect",
          body: (
            <>
              <p>Through the quote form and newsletter sign-up:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Name, work email address, company, telephone number (optional).</li>
                <li>Project details you provide: services required, country, site location, volumes, timeline.</li>
                <li>Your free-text message, if you write one.</li>
                <li>Consent flags for the privacy notice and optional marketing.</li>
                <li>
                  Technical signals used only for abuse prevention: a one-way hash of your IP address and the time
                  you started the form. We do not store the IP address itself.
                </li>
              </ul>
              <p>
                If you email or call us, we keep the correspondence. If you visit our sites, your employer&apos;s
                site rules apply and we hold only what your access process requires.
              </p>
            </>
          ),
        },
        {
          id: "purpose",
          title: "Why we process it, and the legal basis",
          body: (
            <>
              <ul className="list-disc space-y-3 pl-5">
                <li>
                  <strong className="text-mist">Preparing and sending a quote</strong> — necessary to take steps at
                  your request before entering a contract (Article 6(1)(b)).
                </li>
                <li>
                  <strong className="text-mist">Delivering a project</strong> — performance of the contract
                  (Article 6(1)(b)), including site inductions and access records.
                </li>
                <li>
                  <strong className="text-mist">Legal and tax obligations</strong> — invoicing and record keeping
                  (Article 6(1)(c)).
                </li>
                <li>
                  <strong className="text-mist">Field notes newsletter</strong> — only with your consent
                  (Article 6(1)(a)). Withdraw it any time using the link in any email.
                </li>
                <li>
                  <strong className="text-mist">Abuse prevention and basic analytics</strong> — consent for
                  analytics (Article 6(1)(a)); legitimate interest for form abuse scoring (Article 6(1)(f)).
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "retention",
          title: "How long we keep it",
          body: (
            <>
              <p>
                Quote requests that do not become projects are kept for 24 months, then deleted. Project records,
                including handover documentation, are kept for the warranty and statutory limitation period
                applicable in the country of delivery. Newsletter subscriptions are kept until you unsubscribe.
              </p>
              <p>
                Abuse scores and hashed identifiers are kept for 90 days, which is long enough to spot patterns
                and short enough not to be a shadow profile.
              </p>
            </>
          ),
        },
        {
          id: "sharing",
          title: "Who we share it with",
          body: (
            <>
              <p>
                We do not sell personal data and we do not share it with advertisers. We share it only with:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Our own engineers and delivery managers who need it to respond or deliver.</li>
                <li>Hosting and infrastructure providers operating under a data processing agreement.</li>
                <li>
                  A client or facility operator, where required for site access, inductions or security clearance.
                </li>
                <li>Authorities where we are legally obliged to.</li>
              </ul>
              <p>
                Analytics, if you consent, is first-party and cookie-free: page counts are stored in our own
                database and are not shared with a third-party analytics vendor.
              </p>
            </>
          ),
        },
        {
          id: "rights",
          title: "Your rights",
          body: (
            <>
              <p>
                You have the right to access, correct, delete, restrict or object to processing of your personal
                data, and to receive it in a portable format. You can withdraw consent at any time without
                affecting earlier processing.
              </p>
              <p>
                To exercise any of these rights, email{" "}
                <a href={`mailto:${COMPANY.email}`} className="link-underline text-mist">
                  {COMPANY.email}
                </a>
                . We respond within one month. You also have the right to complain to your supervisory authority
                — in Portugal, the Comissão Nacional de Protecção de Dados (CNPD).
              </p>
            </>
          ),
        },
        {
          id: "security",
          title: "How we protect it",
          body: (
            <p>
              Data is stored in a database we control, transmitted over TLS, and accessible only to staff who need
              it. Engineers on client sites are bound by confidentiality, and we handle media and assets under
              chain-of-custody records. No system is perfectly secure; if a breach affects your data, we will tell
              you and the relevant authority within the statutory deadline.
            </p>
          ),
        },
        {
          id: "changes",
          title: "Changes to this policy",
          body: (
            <p>
              If we change this policy in a way that affects how your data is used, we will update the date above
              and, where appropriate, notify you directly.
            </p>
          ),
        },
      ]}
    />
  );
}
