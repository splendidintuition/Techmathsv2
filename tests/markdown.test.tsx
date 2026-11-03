import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "@/components/markdown";
import { listInsights } from "@/lib/queries";

const render = (md: string) => renderToStaticMarkup(<Markdown source={md} />);

describe("Markdown renderer", () => {
  it("renders headings, paragraphs, lists and blockquotes", () => {
    const html = render(
      [
        "## A heading",
        "",
        "A paragraph with **bold** and `code`.",
        "",
        "- first item",
        "- second item",
        "",
        "1. numbered one",
        "2. numbered two",
        "",
        "> a quoted line",
        "",
        "### Sub heading",
      ].join("\n")
    );
    expect(html).toContain("<h2>A heading</h2>");
    expect(html).toContain("<h3>Sub heading</h3>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toMatch(/<code[^>]*>code<\/code>/);
    expect(html).toContain("<li>first item</li>");
    expect(html).toContain("<ol>");
    expect(html).toContain("<blockquote>a quoted line</blockquote>");
  });

  it("wraps consecutive lines into a single paragraph", () => {
    const html = render("line one\nline two\n\nnext paragraph");
    expect(html.match(/<p>/g)).toHaveLength(2);
    expect(html).toContain("line one line two");
  });

  it("never injects raw HTML — markup is escaped as text", () => {
    const html = render("<script>alert(1)</script> and <img src=x onerror=alert(1)>");
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("onerror=alert(1)>\"");
  });

  it("returns no elements for empty input", () => {
    expect(render("")).toBe('<div class="tm-prose"></div>');
  });

  it("renders every published Insight without throwing", () => {
    const insights = listInsights();
    expect(insights.length).toBeGreaterThan(0);
    for (const i of insights) {
      const html = render(i.body);
      expect(html).toContain("tm-prose");
      // every article body uses at least one level-2 heading
      expect(html).toContain("<h2>");
    }
  });
});
