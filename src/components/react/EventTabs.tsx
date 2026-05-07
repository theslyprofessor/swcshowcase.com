import { useState, useEffect } from "react";

interface Tab {
  slug: string;
  label: string;
  title: string;
  content: string;
  order: number;
}

interface EventTabsProps {
  tabs: Tab[];
}

// ---------------------------------------------------------------------------
// Minimal Markdown → HTML (event content is simple: headings, lists, links)
// ---------------------------------------------------------------------------

function renderMarkdown(md: string): string {
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
  // leading `!` doesn't get caught by the link regex.
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="my-6 rounded-lg border border-border max-w-full h-auto" loading="lazy" />',
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

const tabIcons: Record<string, string> = {
  "Overview": "🎭",
  "Tickets": "🎟️",
  "Attend": "🎟️",
  "Schedule": "📋",
  "Performer Info": "🎸",
  "Volunteer": "🤝",
  "Food & Venue": "📍",
};

// ---------------------------------------------------------------------------
// Top horizontal section nav, right-aligned. Content below.
// Mobile: nav scrolls horizontally.
// ---------------------------------------------------------------------------

export default function EventTabs({ tabs }: EventTabsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeTab = tabs[activeIndex];

  // Sync active tab with section pills in the page header. Pills emit
  // [data-tab=N] clicks and #slug hash updates; we listen to both and
  // also write back to the pills' visual active state.
  const updateActive = (idx: number) => {
    setActiveIndex(idx);
    if (typeof document !== "undefined") {
      document.querySelectorAll<HTMLElement>("[data-section-pill]").forEach((el) => {
        const i = parseInt(el.getAttribute("data-tab") ?? "-1", 10);
        if (i === idx) {
          el.classList.add("text-primary", "border-primary");
          el.classList.remove("text-muted-foreground", "border-transparent");
        } else {
          el.classList.remove("text-primary", "border-primary");
          el.classList.add("text-muted-foreground", "border-transparent");
        }
      });

      // Hero only shows on Overview (first tab). Hide on every other tab so
      // subsequent tabs start fresh under the top bar; bump content padding
      // to fill the space the hero would have provided.
      const hero = document.getElementById("event-hero");
      const tabsSection = document.getElementById("tabs");
      if (hero) hero.style.display = idx === 0 ? "" : "none";
      if (tabsSection) tabsSection.style.paddingTop = idx === 0 ? "" : "5.5rem";
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-tab]");
      if (target) {
        const idx = parseInt(target.getAttribute("data-tab") || "0", 10);
        if (idx >= 0 && idx < tabs.length) {
          e.preventDefault();
          updateActive(idx);
          history.replaceState(null, "", `#${tabs[idx].slug}`);
        }
      }
    };
    document.addEventListener("click", handler);
    // Initial sync from URL hash
    if (typeof window !== "undefined" && window.location.hash) {
      const slug = window.location.hash.slice(1);
      const idx = tabs.findIndex((t) => t.slug === slug);
      if (idx >= 0) updateActive(idx);
    }
    return () => document.removeEventListener("click", handler);
  }, [tabs.length]);

  if (!activeTab) return null;

  // Hide the redundant H2 on the Overview tab — the hero already shows
  // "Media Showcase 2026". Other tabs keep their title since the hero is
  // hidden on those.
  const isOverview = activeIndex === 0;

  return (
    <div className="prose-event max-w-3xl">
      {!isOverview && (
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <span className="text-3xl">{tabIcons[activeTab.label] || "📄"}</span>
          {activeTab.title}
        </h2>
      )}
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(activeTab.content) }} />
    </div>
  );
}
