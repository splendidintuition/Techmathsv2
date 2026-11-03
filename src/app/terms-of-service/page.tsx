import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { COMPANY } from "@/lib/content/site";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Terms of service",
  description:
    "Terms governing use of the Tech Maths website: acceptable use, intellectual property, accuracy of technical content, limitation of liability, and the relationship between this website and a signed delivery contract.",
  path: "/terms-of-service",
});

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms of service"
      updated="2025-10-01"
      intro="These terms govern your use of this website. They do not govern delivery work: any project is performed under a separate signed agreement, which takes precedence over anything written here."
      sections={[
        {
          id: "scope",
          title: "Scope of these terms",
          body: (
            <p>
              By using this website you accept these terms. If you are using it on behalf of a company, you
              confirm you are authorised to accept them for that company. Where a signed services agreement exists
              between you and {COMPANY.legalName}, that agreement governs the work and prevails over these terms.
            </p>
          ),
        },
        {
          id: "use",
          title: "Acceptable use",
          body: (
            <>
              <p>You agree not to:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Use the site for anything unlawful, or to transmit malware.</li>
                <li>
                  Submit false or misleading information through the quote form, or submit requests on behalf of
                  someone without their authority.
                </li>
                <li>
                  Attempt to disrupt, probe or gain unauthorised access to the site or its systems. Responsible
                  security disclosures are welcome — email them to{" "}
                  <a href={`mailto:${COMPANY.email}`} className="link-underline text-mist">
                    {COMPANY.email}
                  </a>
                  .
                </li>
                <li>Scrape content at scale or republish it as your own.</li>
              </ul>
            </>
          ),
        },
        {
          id: "quotes",
          title: "Quotes and estimates",
          body: (
            <p>
              Any pricing, mobilisation time or duration given through this website or in response to a form is an
              estimate based on the information supplied. It is not an offer capable of acceptance and becomes
              binding only when set out in a written proposal or contract accepted by both parties. Mobilisation
              times are typical, not guaranteed, and depend on site access, inductions and travel.
            </p>
          ),
        },
        {
          id: "content",
          title: "Technical content and accuracy",
          body: (
            <>
              <p>
                Articles, checklists and guides on this site reflect general engineering practice and our own
                method. They are provided for information and are not a substitute for advice specific to your
                site, equipment or regulatory position. Always verify against your own design documents, vendor
                guidance and applicable law before acting.
              </p>
              <p>
                Standards referenced (for example TIA, ISO/IEC, EN, ASHRAE, NIST SP 800-88) belong to their
                respective bodies. References indicate the practice we work to, not a certification claim unless
                expressly stated with evidence.
              </p>
              <p>
                Case studies, client references, testimonials, team profiles and headline figures published on this
                site are illustrative until real, permissioned references are supplied, and are marked as such on
                the page where they appear.
              </p>
            </>
          ),
        },
        {
          id: "ip",
          title: "Intellectual property",
          body: (
            <p>
              The design, text, illustrations and code of this website are owned by {COMPANY.legalName} or used
              with permission. You may quote short extracts with attribution and a link. You may not reproduce
              substantial parts, reuse the visual identity, or imply endorsement without written permission.
              Documents we produce for you under a project agreement are yours to use for your operations, as set
              out in that agreement.
            </p>
          ),
        },
        {
          id: "liability",
          title: "Limitation of liability",
          body: (
            <p>
              The website is provided &ldquo;as is&rdquo;. To the extent permitted by law, we are not liable for
              indirect or consequential loss arising from use of the site, and nothing here limits liability for
              death or personal injury caused by negligence, fraud, or any other liability that cannot lawfully be
              limited. Liability arising from delivery work is governed by the applicable services agreement and
              our insurance arrangements.
            </p>
          ),
        },
        {
          id: "law",
          title: "Governing law",
          body: (
            <p>
              These terms are governed by the law of Portugal, and the courts of Lisbon have jurisdiction, without
              affecting any mandatory consumer protections in your country of residence.
            </p>
          ),
        },
        {
          id: "contact",
          title: "Questions",
          body: (
            <p>
              Contact{" "}
              <a href={`mailto:${COMPANY.email}`} className="link-underline text-mist">
                {COMPANY.email}
              </a>{" "}
              or {COMPANY.phone}.
            </p>
          ),
        },
      ]}
    />
  );
}
