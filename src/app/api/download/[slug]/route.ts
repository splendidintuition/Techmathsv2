import { NextResponse } from "next/server";
import { getInsight } from "@/lib/queries";
import { COMPANY } from "@/lib/content/site";

export const runtime = "nodejs";

/** GET /api/download/[slug] — serves an Insight as a Markdown file download. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const insight = getInsight(slug);
  if (!insight) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }

  const header = [
    `# ${insight.title}`,
    ``,
    `> ${insight.excerpt}`,
    ``,
    `- Author: ${insight.author}`,
    `- Published: ${insight.publishedOn}`,
    `- Category: ${insight.category}`,
    `- Reading time: ${insight.readMinutes} min`,
    `- Source: https://${COMPANY.domain}/insights/${insight.slug}`,
    ``,
    `---`,
    ``,
  ].join("\n");

  const body = `${header}${insight.body}\n\n---\n\n${COMPANY.name} — ${COMPANY.tagline}\n${COMPANY.email} · ${COMPANY.phone}\n`;

  return new NextResponse(body, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="${insight.slug}.md"`,
      "cache-control": "public, max-age=3600",
    },
  });
}
