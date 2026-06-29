// ---------------------------------------------------------------------------
// Minimal Markdown → HTML (event content is simple: headings, lists, links).
// Shared by EventTabs.tsx (home page tabs) and rules.astro (standalone page)
// so both render vault articles identically inside .prose-event styling.
// ---------------------------------------------------------------------------

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

  for (const line of lines) {
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
