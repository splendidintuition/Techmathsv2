import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrow, IconCheck, IconClock, IconPin, IconUsers, ServiceIcon } from "@/components/icons";
import { Magnetic, Reveal } from "@/components/motion";
import { Btn, PlaceholderTag, Pill } from "@/components/ui";
import { listProjects, getProject, listServices, serviceTitleMap } from "@/lib/queries";
import { breadcrumbLd, buildMetadata, jsonLd } from "@/lib/seo";

export function generateStaticParams() {
  return listProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p) return { title: "Project not found" };
  return buildMetadata({
    title: p.title,
    description: p.summary,
    path: `/projects/${p.slug}`,
    type: "article",
    keywords: [p.country, p.region, ...p.industries, "data center case study"],
  });
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const services = listServices();
  const bySlug = new Map(services.map((s) => [s.slug, s]));
  const serviceTitles = serviceTitleMap();
  const others = listProjects().filter((p) => p.slug !== project.slug).slice(0, 3);

  return (
    <>
      {jsonLd(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Projects", path: "/projects" },
          { name: project.title, path: `/projects/${project.slug}` },
        ])
      )}
      {jsonLd({
        "@type": "Article",
        headline: project.title,
        description: project.summary,
        datePublished: `${project.year}-01-01`,
        author: { "@type": "Organization", name: "Tech Maths" },
        about: project.services.map((s) => serviceTitles[s] ?? s),
      })}

      <section className="relative overflow-hidden border-b border-[color:var(--tm-line)]">
        <div className="grid-field grid-fade pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="shell relative py-20 sm:py-24">
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex flex-wrap items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-mute">
              <li>
                <Link href="/" className="hover:text-accent">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/projects" className="hover:text-accent">
                  Projects
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-accent">{project.country}</li>
            </ol>
          </nav>

          <Reveal>
            <div className="flex flex-wrap items-center gap-2.5">
              <Pill tone="accent">
                <IconPin className="h-3 w-3" />
                {project.region}
              </Pill>
              <Pill>{project.year}</Pill>
              {project.isPlaceholder && <PlaceholderTag />}
            </div>
          </Reveal>

          <h1 className="mt-8 max-w-4xl text-[clamp(2rem,5.2vw,3.6rem)]">{project.title}</h1>

          <Reveal delay={140}>
            <p className="mt-7 max-w-2xl text-[1.05rem] leading-relaxed text-mute">{project.summary}</p>
          </Reveal>

          <Reveal delay={240}>
            <dl className="mt-12 grid max-w-4xl grid-cols-2 gap-x-8 gap-y-6 border-t border-[color:var(--tm-line)] pt-8 sm:grid-cols-4">
              {[
                { icon: IconClock, v: project.duration, l: "duration" },
                { icon: IconUsers, v: String(project.teamSize), l: "engineers on site" },
                { icon: IconPin, v: project.country, l: "country" },
                { icon: IconCheck, v: String(project.metrics.length), l: "measured outcomes" },
              ].map(({ icon: Icon, v, l }) => (
                <div key={l}>
                  <Icon className="h-4 w-4 text-accent" />
                  <dt className="sr-only">{l}</dt>
                  <dd className="mt-2.5 font-display text-[1.35rem] leading-none">{v}</dd>
                  <dd className="mt-1.5 text-[0.76rem] text-mute">{l}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* Metrics band */}
      <section className="border-b border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)]">
        <div className="shell grid gap-px py-12 sm:grid-cols-2 lg:grid-cols-4">
          {project.metrics.map((m, i) => (
            <Reveal key={m.label} delay={i * 70} className="px-2 py-4 text-center sm:px-6">
              <p className="font-display text-[clamp(1.8rem,3.6vw,2.6rem)] leading-none text-accent">{m.value}</p>
              <p className="mt-3 text-[0.82rem] leading-snug text-mute">{m.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Challenge / scope / result */}
      <section className="shell py-20">
        <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div className="space-y-14">
            <div>
              <h2 className="text-[1.6rem]">The challenge</h2>
              <p className="mt-5 text-[0.98rem] leading-relaxed text-mute">{project.challenge}</p>
            </div>
            <div>
              <h2 className="text-[1.6rem]">The result</h2>
              <p className="mt-5 text-[0.98rem] leading-relaxed text-mute">{project.result}</p>
              <blockquote className="mt-8 border-l-2 border-accent pl-5 font-display text-[1.15rem] leading-relaxed text-mist">
                “{project.quote}”
                <footer className="mt-3 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-mute">
                  {project.client}
                </footer>
              </blockquote>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card-surface p-7">
              <h2 className="text-[1.05rem]">Scope delivered</h2>
              <ul className="mt-5 space-y-3">
                {project.scope.map((s) => (
                  <li key={s} className="flex gap-3 text-[0.9rem] leading-relaxed text-mist/90">
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card-surface p-7">
              <h2 className="text-[1.05rem]">Services used</h2>
              <ul className="mt-5 grid gap-2.5">
                {project.services.map((slug) => {
                  const s = bySlug.get(slug);
                  if (!s) return null;
                  return (
                    <li key={slug}>
                      <Link
                        href={`/services/${slug}`}
                        className="group flex items-center gap-3 rounded-xl border border-[color:var(--tm-line)] px-4 py-3 transition-colors hover:border-accent/45"
                      >
                        <ServiceIcon name={s.icon} className="h-4.5 w-4.5 text-mute group-hover:text-accent" />
                        <span className="text-[0.88rem] text-mist">{s.title}</span>
                        <IconArrow className="ml-auto h-3.5 w-3.5 text-mute transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-mute">
                Sectors: {project.industries.join(" · ")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* More work */}
      <section className="border-t border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)] py-20">
        <div className="shell">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-[1.6rem]">More delivery work</h2>
            <Btn href="/projects" variant="outline" size="sm" arrow>
              All projects
            </Btn>
          </div>
          <ul className="mt-10 grid gap-4 lg:grid-cols-3">
            {others.map((p) => (
              <li key={p.slug}>
                <Link href={`/projects/${p.slug}`} className="card-surface group flex h-full flex-col gap-4 p-6 hover:border-accent/45">
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-mute">
                    {p.region} · {p.year}
                  </p>
                  <h3 className="text-[1.05rem] leading-snug">{p.title}</h3>
                  <p className="text-[0.84rem] leading-relaxed text-mute">{p.summary}</p>
                  <span className="mt-auto inline-flex items-center gap-2 pt-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-mute group-hover:text-accent">
                    Read case
                    <IconArrow className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-14 flex flex-wrap items-center gap-3">
            <Magnetic>
              <Btn href="/contact" size="lg" arrow>
                Discuss a similar project
              </Btn>
            </Magnetic>
            <Btn href="/coverage" variant="ghost" size="lg">
              Check coverage for your site
            </Btn>
          </div>
        </div>
      </section>
    </>
  );
}
