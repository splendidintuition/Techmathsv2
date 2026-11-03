import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { IconArrow, IconClock, IconDoc, IconDownload } from "@/components/icons";
import { Reveal } from "@/components/motion";
import { Btn, Pill } from "@/components/ui";
import { getInsight, listInsights } from "@/lib/queries";
import { absoluteUrl, breadcrumbLd, buildMetadata, jsonLd } from "@/lib/seo";

export function generateStaticParams() {
  return listInsights().map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = getInsight(slug);
  if (!article) return { title: "Article not found" };
  return buildMetadata({
    title: article.seoTitle ?? article.title,
    description: article.excerpt,
    path: `/insights/${article.slug}`,
    type: "article",
    publishedTime: article.publishedOn,
    keywords: article.tags,
  });
}

/** Pulls `## ` headings out of the Markdown body to build a table of contents. */
function headings(body: string): string[] {
  return body
    .split("\n")
    .filter((l) => l.startsWith("## "))
    .map((l) => l.slice(3).trim());
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export default async function InsightPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const insight = getInsight(slug);
  if (!insight) notFound();

  const toc = headings(insight.body);
  const others = listInsights().filter((i) => i.slug !== insight.slug).slice(0, 3);
  const wordCount = insight.body.split(/\s+/).length;

  return (
    <>
      {jsonLd(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Insights", path: "/insights" },
          { name: insight.title, path: `/insights/${insight.slug}` },
        ])
      )}
      {jsonLd({
        "@type": "Article",
        headline: insight.title,
        description: insight.excerpt,
        datePublished: insight.publishedOn,
        dateModified: insight.publishedOn,
        url: absoluteUrl(`/insights/${insight.slug}`),
        author: { "@type": "Person", name: insight.author },
        publisher: { "@type": "Organization", name: "Tech Maths" },
        keywords: insight.tags.join(", "),
        wordCount,
        articleSection: insight.category,
      })}

      <section className="relative overflow-hidden border-b border-[color:var(--tm-line)]">
        <div className="grid-field grid-fade pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="shell relative py-16 sm:py-20">
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex flex-wrap items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-mute">
              <li>
                <Link href="/" className="hover:text-accent">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/insights" className="hover:text-accent">
                  Insights
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-accent">{insight.category}</li>
            </ol>
          </nav>

          <Reveal>
            <div className="flex flex-wrap items-center gap-2.5">
              <Pill tone="accent">{insight.kind}</Pill>
              <Pill>{insight.category}</Pill>
              <Pill>
                <IconClock className="h-3 w-3" />
                {insight.readMinutes} min read
              </Pill>
            </div>
          </Reveal>

          <h1 className="mt-8 max-w-4xl text-[clamp(2rem,5vw,3.4rem)]">{insight.title}</h1>

          <Reveal delay={140}>
            <p className="mt-6 max-w-2xl text-[1.05rem] leading-relaxed text-mute">{insight.excerpt}</p>
          </Reveal>

          <Reveal delay={220}>
            <div className="mt-9 flex flex-wrap items-center gap-5 border-t border-[color:var(--tm-line)] pt-6">
              <p className="text-[0.86rem] text-mist">{insight.author}</p>
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-mute">
                Published {insight.publishedOn}
              </p>
              {insight.download && (
                <a
                  href={`/api/download/${insight.slug}`}
                  className="ml-auto inline-flex items-center gap-2 rounded-full border border-[color:var(--tm-line)] px-4 py-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-mute transition-colors hover:border-accent hover:text-accent"
                >
                  <IconDownload className="h-3.5 w-3.5" />
                  Download .md
                </a>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="shell py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[220px_1fr] lg:gap-16">
          {toc.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-[112px]">
                <p className="eyebrow mb-4">On this page</p>
                <ul className="space-y-2.5 border-l border-[color:var(--tm-line)]">
                  {toc.map((h) => (
                    <li key={h}>
                      <a
                        href={`#${slugify(h)}`}
                        className="-ml-px block border-l border-transparent pl-4 text-[0.82rem] leading-snug text-mute transition-colors hover:border-accent hover:text-mist"
                      >
                        {h}
                      </a>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Btn href="/contact" size="sm" variant="outline">
                    Ask a question
                  </Btn>
                </div>
              </div>
            </aside>
          )}

          <article className="max-w-3xl">
            <Markdown source={insight.body} />

            <div className="mt-14 flex flex-wrap gap-2 border-t border-[color:var(--tm-line)] pt-8">
              {insight.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-[color:var(--tm-line)] px-3 py-1 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-mute"
                >
                  {t}
                </span>
              ))}
            </div>

            <div className="mt-10 rounded-2xl border border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)] p-7">
              <p className="text-[0.98rem] text-mist">Need this applied to your site?</p>
              <p className="mt-2 text-[0.88rem] leading-relaxed text-mute">
                Our engineers run these checks as standard on every delivery. Send us the scope and we will tell
                you what we would look at first.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Btn href="/contact" size="sm" arrow>
                  Request a quote
                </Btn>
                <Btn href="/services" size="sm" variant="ghost">
                  Service catalogue
                </Btn>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="border-t border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)] py-20">
        <div className="shell">
          <div className="flex items-end justify-between gap-5">
            <h2 className="text-[1.6rem]">Keep reading</h2>
            <Link
              href="/insights"
              className="group inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-mute transition-colors hover:text-accent"
            >
              <IconDoc className="h-3.5 w-3.5" />
              All insights
              <IconArrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <ul className="mt-10 grid gap-4 lg:grid-cols-3">
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/insights/${o.slug}`} className="card-surface group flex h-full flex-col gap-4 p-6 hover:border-accent/45">
                  <span className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-accent">{o.kind}</span>
                  <h3 className="text-[1.05rem] leading-snug">{o.title}</h3>
                  <p className="text-[0.84rem] leading-relaxed text-mute">{o.excerpt}</p>
                  <span className="mt-auto pt-2 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-mute group-hover:text-accent">
                    {o.readMinutes} min read
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
