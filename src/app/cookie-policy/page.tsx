import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Cookie policy",
  description:
    "What Tech Maths stores in your browser: two localStorage keys for theme and motion preference, a consent record, and a cookie-free first-party page counter. No advertising or third-party trackers.",
  path: "/cookie-policy",
});

export default function CookiePolicyPage() {
  return (
    <LegalPage
      eyebrow="Cookies & local storage"
      title="Cookie policy"
      updated="2025-10-01"
      intro="We use no advertising cookies and no third-party trackers. This page lists exactly what is stored in your browser and why, so you can check it against your own developer tools."
      sections={[
        {
          id: "summary",
          title: "In one paragraph",
          body: (
            <p>
              This site sets no advertising cookies. It stores three small values in your browser&apos;s local
              storage — your colour theme, your motion preference and your consent choice — plus an optional
              first-party page counter that records page paths only. Nothing is shared with an advertising or
              data-broker network, and nothing follows you to another website.
            </p>
          ),
        },
        {
          id: "what",
          title: "What is stored",
          body: (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-[0.86rem]">
                  <thead>
                    <tr className="border-b border-[color:var(--tm-line)]">
                      {["Name", "Type", "Purpose", "Duration"].map((h) => (
                        <th key={h} className="py-3 pr-4 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-mute">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["tm-theme", "localStorage", "Remembers dark or light mode.", "Until you change it"],
                      ["tm-motion", "localStorage", "Remembers whether you turned animation off.", "Until you change it"],
                      ["tm-consent-v1", "localStorage", "Records your consent choice so we do not ask again.", "Until you clear it"],
                      ["pageview records", "Our server", "Counts page views if you consented. Path and referrer only.", "90 days"],
                    ].map((row) => (
                      <tr key={row[0]} className="border-b border-[color:var(--tm-line)]">
                        <td className="py-3 pr-4 font-mono text-[0.78rem] text-accent">{row[0]}</td>
                        <td className="py-3 pr-4 text-mute">{row[1]}</td>
                        <td className="py-3 pr-4 text-mute">{row[2]}</td>
                        <td className="py-3 text-mute">{row[3]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                Strictly necessary storage (theme, motion, consent) is used because the site cannot remember your
                preferences without it. Analytics storage is only used after you accept.
              </p>
            </>
          ),
        },
        {
          id: "analytics",
          title: "How analytics works here",
          body: (
            <>
              <p>
                If you consent, each page view sends a small request to our own server recording the page path,
                the referrer and an approximate country. There is no unique visitor identifier, no cookie is read
                or written, and no fingerprinting is attempted. The result is a count of pages, not a picture of
                you.
              </p>
              <p>
                We may also load a privacy-friendly analytics provider (such as Plausible) if configured. It is
                only loaded after consent, and it operates in cookieless mode.
              </p>
            </>
          ),
        },
        {
          id: "control",
          title: "How to control it",
          body: (
            <>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-mist">Change your mind:</strong> reopen the consent banner at any time
                  via the footer, or clear <span className="font-mono text-mist">tm-consent-v1</span> in your
                  browser storage.
                </li>
                <li>
                  <strong className="text-mist">Turn off animation:</strong> use the &ldquo;Motion&rdquo; control
                  in the footer. We also honour your operating system&apos;s reduced-motion setting automatically.
                </li>
                <li>
                  <strong className="text-mist">Block storage entirely:</strong> your browser&apos;s private mode
                  or site-data settings will remove these values. The site remains fully usable; it will simply
                  not remember your preferences.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "third-parties",
          title: "Third parties",
          body: (
            <p>
              Fonts are self-hosted, so no request goes to a font CDN. There are no embedded social widgets,
              advertising pixels or chat scripts. External links (for example WhatsApp or LinkedIn in the footer)
              only send data to those services once you click them, and their own policies then apply.
            </p>
          ),
        },
      ]}
    />
  );
}
