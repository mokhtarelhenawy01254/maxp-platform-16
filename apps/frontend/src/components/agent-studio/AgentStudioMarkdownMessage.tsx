import React, { useMemo } from "react";

interface AgentStudioMarkdownMessageProps {
  content: string;
  isUser?: boolean;
}

type Alignment = "left" | "center" | "right";

interface TableBlock {
  type: "table";
  headers: string[];
  alignments: Alignment[];
  rows: string[][];
}

interface CodeBlock {
  type: "code";
  code: string;
  language?: string;
}

interface HeadingBlock {
  type: "heading";
  level: number;
  text: string;
}

interface ListBlock {
  type: "list";
  items: string[];
  ordered: boolean;
}

interface QuoteBlock {
  type: "quote";
  text: string;
}

interface DividerBlock {
  type: "divider";
}

interface ParagraphBlock {
  type: "paragraph";
  text: string;
}

type MarkdownBlock =
  | TableBlock
  | CodeBlock
  | HeadingBlock
  | ListBlock
  | QuoteBlock
  | DividerBlock
  | ParagraphBlock;

// Decision / Status Badge Configurations (Marketing & Inventory)
const CHIP_MAP: Record<string, { label?: string; classes: string }> = {
  SCALE: { classes: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold" },
  مضاعفة: { classes: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold" },
  KILL: { classes: "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-bold" },
  إيقاف: { classes: "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-bold" },
  WATCH: { classes: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-bold" },
  مراقبة: { classes: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-bold" },
  // Inventory status chips
  IN_STOCK: { classes: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold" },
  متوفر: { classes: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold" },
  LOW_STOCK: { classes: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-bold" },
  "مخزون منخفض": { classes: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-bold" },
  OUT_OF_STOCK: { classes: "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-bold" },
  "نفذ المخزون": { classes: "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-bold" },
  REORDER: { classes: "bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-300 dark:border-sky-800 font-bold" },
  "إعادة طلب": { classes: "bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-300 dark:border-sky-800 font-bold" },
  PRICE_UPDATE: { classes: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 font-bold" },
  "تعديل السعر": { classes: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 font-bold" },
};

function splitTableRow(rowStr: string): string[] {
  let cleaned = rowStr.trim();
  if (cleaned.startsWith("|")) cleaned = cleaned.slice(1);
  if (cleaned.endsWith("|")) cleaned = cleaned.slice(0, -1);
  return cleaned.split("|").map((c) => c.trim());
}

function parseAlignment(cell: string): Alignment {
  const t = cell.trim();
  if (t.startsWith(":") && t.endsWith(":")) return "center";
  if (t.endsWith(":")) return "left";
  return "right";
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line);
}

function renderInline(text: string, isUser?: boolean): React.ReactNode {
  if (!text) return null;
  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("`") && token.endsWith("`")) {
      const codeText = token.slice(1, -1);
      // Check if code token is a known decision chip
      if (CHIP_MAP[codeText]) {
        const config = CHIP_MAP[codeText];
        parts.push(
          <span
            key={match.index}
            className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border shadow-2xs mx-1 ${config.classes}`}
          >
            <span>{codeText}</span>
          </span>
        );
      } else {
        parts.push(
          <code
            key={match.index}
            className={`px-1.5 py-0.5 rounded text-xs font-mono tabular-nums ${
              isUser
                ? "bg-indigo-700 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            }`}
          >
            {codeText}
          </code>
        );
      }
    } else if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(<strong key={match.index} className="font-bold">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(<em key={match.index} className="italic">{token.slice(1, -1)}</em>);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

export const AgentStudioMarkdownMessage: React.FC<AgentStudioMarkdownMessageProps> = ({
  content,
  isUser = false,
}) => {
  const blocks = useMemo<MarkdownBlock[]>(() => {
    if (!content) return [];
    const lines = content.split("\n");
    const result: MarkdownBlock[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // 1. Code block ```
      if (trimmed.startsWith("```")) {
        const lang = trimmed.slice(3).trim();
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith("```")) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing ```
        result.push({
          type: "code",
          language: lang,
          code: codeLines.join("\n"),
        });
        continue;
      }

      // 2. Table detection (| ... |)
      if (
        trimmed.startsWith("|") &&
        trimmed.endsWith("|") &&
        i + 1 < lines.length &&
        isTableSeparator(lines[i + 1])
      ) {
        const headers = splitTableRow(lines[i]);
        const sepRow = splitTableRow(lines[i + 1]);
        const alignments = sepRow.map(parseAlignment);
        const rows: string[][] = [];
        i += 2;

        while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
          rows.push(splitTableRow(lines[i]));
          i++;
        }

        result.push({
          type: "table",
          headers,
          alignments,
          rows,
        });
        continue;
      }

      // 3. Headings (#, ##, ###)
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        result.push({
          type: "heading",
          level: headingMatch[1].length,
          text: headingMatch[2],
        });
        i++;
        continue;
      }

      // 4. Divider (--- or ***)
      if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
        result.push({ type: "divider" });
        i++;
        continue;
      }

      // 5. Quote (> ...)
      if (trimmed.startsWith(">")) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith(">")) {
          quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
          i++;
        }
        result.push({
          type: "quote",
          text: quoteLines.join("\n"),
        });
        continue;
      }

      // 6. Lists (- , * , 1. )
      const isBullet = /^[-*•]\s+(.*)$/.test(trimmed);
      const isNumbered = /^\d+\.\s+(.*)$/.test(trimmed);
      if (isBullet || isNumbered) {
        const items: string[] = [];
        const isOrdered = isNumbered;

        while (i < lines.length) {
          const lTrimmed = lines[i].trim();
          const matchB = lTrimmed.match(/^[-*•]\s+(.*)$/);
          const matchN = lTrimmed.match(/^\d+\.\s+(.*)$/);
          if (isOrdered && matchN) {
            items.push(matchN[1]);
          } else if (!isOrdered && matchB) {
            items.push(matchB[1]);
          } else if (lTrimmed === "") {
            break;
          } else {
            break;
          }
          i++;
        }

        result.push({
          type: "list",
          ordered: isOrdered,
          items,
        });
        continue;
      }

      // 7. Regular paragraph
      if (trimmed.length > 0) {
        const pLines: string[] = [line];
        i++;
        while (
          i < lines.length &&
          lines[i].trim().length > 0 &&
          !lines[i].trim().startsWith("#") &&
          !lines[i].trim().startsWith("```") &&
          !lines[i].trim().startsWith(">") &&
          !lines[i].trim().startsWith("|") &&
          !/^[-*•]\s+/.test(lines[i].trim()) &&
          !/^\d+\.\s+/.test(lines[i].trim())
        ) {
          pLines.push(lines[i]);
          i++;
        }
        result.push({
          type: "paragraph",
          text: pLines.join("\n"),
        });
        continue;
      }

      i++;
    }

    return result;
  }, [content]);

  return (
    <div className={`space-y-2 text-xs leading-relaxed ${isUser ? "text-white" : "text-slate-800 dark:text-slate-100"}`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "heading": {
            const HeadingTag = `h${Math.min(block.level + 2, 6)}` as React.ElementType;
            return (
              <HeadingTag
                key={idx}
                className={`font-black tracking-tight mt-3 mb-1 text-slate-900 dark:text-white ${
                  block.level === 1 ? "text-sm" : block.level === 2 ? "text-xs font-black" : "text-xs font-bold"
                }`}
              >
                {renderInline(block.text, isUser)}
              </HeadingTag>
            );
          }

          case "paragraph":
            return (
              <p key={idx} className="whitespace-pre-line text-pretty">
                {renderInline(block.text, isUser)}
              </p>
            );

          case "quote":
            return (
              <blockquote
                key={idx}
                className="border-r-2 border-indigo-500 pr-3 py-1 bg-slate-50 dark:bg-slate-900/60 rounded-l text-slate-600 dark:text-slate-300 text-xs italic"
              >
                {renderInline(block.text, isUser)}
              </blockquote>
            );

          case "divider":
            return <hr key={idx} className="my-2 border-slate-200 dark:border-slate-800" />;

          case "list":
            return block.ordered ? (
              <ol key={idx} className="list-decimal list-inside space-y-1 pr-2">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx}>{renderInline(item, isUser)}</li>
                ))}
              </ol>
            ) : (
              <ul key={idx} className="list-disc list-inside space-y-1 pr-2">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx}>{renderInline(item, isUser)}</li>
                ))}
              </ul>
            );

          case "code":
            return (
              <div
                key={idx}
                className="my-2 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100"
              >
                {block.language && (
                  <div className="px-3 py-1 bg-slate-800/80 text-[10px] font-mono text-slate-400 border-b border-slate-800">
                    {block.language}
                  </div>
                )}
                <pre className="p-3 text-[11px] font-mono overflow-x-auto">
                  <code>{block.code}</code>
                </pre>
              </div>
            );

          case "table":
            return (
              <div
                key={idx}
                className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs"
              >
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 font-bold border-b border-slate-200 dark:border-slate-800">
                      {block.headers.map((h, hIdx) => (
                        <th key={hIdx} className="px-3 py-2 text-right">
                          {renderInline(h, isUser)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                    {block.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition tabular-nums"
                      >
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3 py-2 text-slate-700 dark:text-slate-300">
                            {renderInline(cell, isUser)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
};
