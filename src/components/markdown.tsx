import type { ReactNode } from "react";

/**
 * Dependency-free Markdown renderer for Insights bodies.
 * Supports the subset the content actually uses: ## / ### headings, paragraphs,
 * ordered and unordered lists, blockquotes, **bold** and `code`.
 * Everything is rendered as React elements — no dangerouslySetInnerHTML.
 */

type Block =
  | { kind: "h2" | "h3"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "quote"; text: string };

function parseBlocks(md: string): Block[] {
  const lines = md.split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: string[] = [];
  let listKind: "ul" | "ol" | null = null;

  const flushPara = () => {
    if (para.length) {
      blocks.push({ kind: "p", text: para.join(" ") });
      para = [];
    }
  };
  const flushList = () => {
    if (list.length && listKind) {
      blocks.push({ kind: listKind, items: [...list] });
      list = [];
      listKind = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      flushList();
      continue;
    }
    if (line.startsWith("### ")) {
      flushPara();
      flushList();
      blocks.push({ kind: "h3", text: line.slice(4) });
    } else if (line.startsWith("## ")) {
      flushPara();
      flushList();
      blocks.push({ kind: "h2", text: line.slice(3) });
    } else if (line.startsWith("> ")) {
      flushPara();
      flushList();
      blocks.push({ kind: "quote", text: line.slice(2) });
    } else if (/^[-*]\s+/.test(line)) {
      flushPara();
      if (listKind !== "ul") flushList();
      listKind = "ul";
      list.push(line.replace(/^[-*]\s+/, ""));
    } else if (/^\d+\.\s+/.test(line)) {
      flushPara();
      if (listKind !== "ol") flushList();
      listKind = "ol";
      list.push(line.replace(/^\d+\.\s+/, ""));
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return blocks;
}

/** Splits **bold** and `code` into elements. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      out.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else {
      out.push(
        <code
          key={key++}
          className="rounded border border-[color:var(--tm-line)] bg-[color:var(--tm-panel)] px-1.5 py-0.5 font-mono text-[0.82em] text-accent"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const blocks = parseBlocks(source);
  return (
    <div className="tm-prose">
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "h2":
            return <h2 key={i}>{inline(b.text)}</h2>;
          case "h3":
            return <h3 key={i}>{inline(b.text)}</h3>;
          case "quote":
            return <blockquote key={i}>{inline(b.text)}</blockquote>;
          case "ul":
            return (
              <ul key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it)}</li>
                ))}
              </ol>
            );
          default:
            return <p key={i}>{inline(b.text)}</p>;
        }
      })}
    </div>
  );
}
