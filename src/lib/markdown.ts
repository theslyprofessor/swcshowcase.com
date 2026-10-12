// ---------------------------------------------------------------------------
// Minimal Markdown → HTML (event content: headings, lists, links, tables).
// Shared by EventTabs.tsx (home page tabs) and rules.astro (standalone page)
// so both render vault articles identically inside .prose-event styling.
// ---------------------------------------------------------------------------

function parseCells(row: string): string[] {
  const trimmed = row.trim();
  return trimmed
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function isDelimiterRow(line: string | undefined): boolean {
  if (!line || !line.includes("-")) return false;
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return false;
  const cells = trimmed.replace(/^\|/, "").replace(/\|$/, "").split("|");
  if (cells.length === 0) return false;
  return cells.every((c) => /^\s*:?-+:?\s*$/.test(c));
}

function isTableRow(line: string | undefined): boolean {
  if (!line) return false;
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return false;
  if (
    trimmed.startsWith("<h") ||
    trimmed.startsWith("<hr") ||
    trimmed.startsWith("<img") ||
    trimmed.startsWith("<ul") ||
    trimmed.startsWith("<li")
  ) {
    return false;
  }
  return true;
}

function getAlignments(delimiterRow: string): ("left" | "center" | "right")[] {
  const cells = parseCells(delimiterRow);
  return cells.map((cell) => {
    const hasLeftColon = cell.startsWith(":");
    const hasRightColon = cell.endsWith(":");
    if (hasLeftColon && hasRightColon) return "center";
    if (hasRightColon) return "right";
    return "left";
  });
}

function getAlignClass(align?: "left" | "center" | "right"): string {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

export function renderMarkdown(md: string): string {
  let html = md
    .replace(/^---[\s\S]*?---\n*/m, "")
    .replace(/^# .+\n*/m, "");

  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");

  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Markdown images — ![alt](src) — render BEFORE link replacement so the
  // leading `!` doesn't get caught by the link regex.  Hide the broken-icon
  // entirely if the asset fails to load (no ugly placeholder square).
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="my-6 rounded-lg border border-border max-w-full h-auto" loading="lazy" onerror="this.style.display=\'none\'" />',
  );

  // Strip Obsidian-style wikilink images that vault-sync may pass through
  // un-translated (![[file.svg]]). They reference vault-relative paths the
  // public site can't resolve.
  html = html.replace(/!\[\[[^\]]+\]\]/g, "");

  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline font-medium">$1</a>',
  );

  html = html.replace(/^---$/gm, '<hr class="my-6 border-border" />');

  const lines = html.split("\n");
  const result: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Markdown table detection: current line has cells and next line is a delimiter row
    if (isTableRow(line) && isDelimiterRow(lines[i + 1])) {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }

      const headerCells = parseCells(line);
      const alignments = getAlignments(lines[i + 1]);

      const tableHtml: string[] = [
        '<div class="overflow-x-auto my-6 border border-border rounded-xl bg-card/40">',
        '  <table class="w-full text-left border-collapse text-sm sm:text-base">',
        '    <thead>',
        '      <tr class="border-b border-border bg-card/60">',
      ];

      for (let c = 0; c < headerCells.length; c++) {
        const alignClass = getAlignClass(alignments[c]);
        tableHtml.push(
          `        <th class="py-3 px-4 font-semibold text-foreground ${alignClass}">${headerCells[c]}</th>`,
        );
      }

      tableHtml.push(
        '      </tr>',
        '    </thead>',
        '    <tbody class="divide-y divide-border/60">',
      );

      let j = i + 2;
      while (j < lines.length && isTableRow(lines[j]) && !isDelimiterRow(lines[j])) {
        const rowCells = parseCells(lines[j]);
        tableHtml.push('      <tr class="hover:bg-muted/30 transition-colors">');
        for (let c = 0; c < headerCells.length; c++) {
          const cellContent = rowCells[c] ?? "";
          const alignClass = getAlignClass(alignments[c]);
          tableHtml.push(
            `        <td class="py-3 px-4 text-secondary-foreground ${alignClass}">${cellContent}</td>`,
          );
        }
        tableHtml.push('      </tr>');
        j++;
      }

      tableHtml.push('    </tbody>', '  </table>', '</div>');
      result.push(tableHtml.join("\n"));

      i = j - 1;
      continue;
    }

    const listMatch = line.match(/^- (.+)$/);
    if (listMatch) {
      if (!inList) {
        result.push('<ul class="space-y-3 my-4">');
        inList = true;
      }
      result.push(
        `<li class="flex items-start gap-3"><span class="text-primary mt-1 shrink-0 text-sm">▸</span><span class="text-secondary-foreground">${listMatch[1]}</span></li>`,
      );
    } else {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      const trimmed = line.trim();
      if (trimmed === "") {
        // skip
      } else if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<hr") ||
        trimmed.startsWith("<img")
      ) {
        result.push(trimmed);
      } else {
        result.push(`<p class="mb-4 text-muted-foreground leading-relaxed">${trimmed}</p>`);
      }
    }
  }
  if (inList) result.push("</ul>");

  return result.join("\n");
}
