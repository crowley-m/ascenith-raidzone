import { Fragment, type ReactNode } from "react";

/**
 * Small, dependency-free Markdown renderer for staff-authored event briefs.
 * Supports: # ## ###, - / * / 1. lists, **bold**, `code`, --- rules, blank-line
 * paragraphs, and bare URLs. Output is React elements (no dangerouslySetInnerHTML).
 */
function inline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(https?:\/\/[^\s)]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] !== undefined) {
      nodes.push(<strong key={`${keyBase}-b${i}`}>{m[2]}</strong>);
    } else if (m[4] !== undefined) {
      nodes.push(<code key={`${keyBase}-c${i}`}>{m[4]}</code>);
    } else if (m[5] !== undefined) {
      nodes.push(
        <a key={`${keyBase}-a${i}`} href={m[5]} target="_blank" rel="noreferrer">
          {m[5].replace(/^https?:\/\//, "")}
        </a>,
      );
    }
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let k = 0;

  const flushPara = () => {
    if (para.length) {
      blocks.push(<p key={`p${k++}`}>{inline(para.join(" "), `p${k}`)}</p>);
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const items = list.items.map((it, idx) => (
        <li key={idx}>{inline(it, `li${k}-${idx}`)}</li>
      ));
      blocks.push(
        list.ordered ? (
          <ol key={`l${k++}`}>{items}</ol>
        ) : (
          <ul key={`l${k++}`}>{items}</ul>
        ),
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      flushPara();
      flushList();
      blocks.push(<hr key={`h${k++}`} />);
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flushPara();
      flushList();
      const lvl = h[1].length;
      const content = inline(h[2], `hd${k}`);
      blocks.push(
        lvl === 1 ? (
          <h2 key={`hd${k++}`}>{content}</h2>
        ) : lvl === 2 ? (
          <h3 key={`hd${k++}`}>{content}</h3>
        ) : (
          <h4 key={`hd${k++}`}>{content}</h4>
        ),
      );
      continue;
    }
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      flushPara();
      const ordered = !!ol;
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push((ul ? ul[1] : ol![1]).trim());
      continue;
    }
    flushList();
    para.push(line.trim());
  }
  flushPara();
  flushList();

  return <div className={className}>{blocks.map((b, i) => <Fragment key={i}>{b}</Fragment>)}</div>;
}
