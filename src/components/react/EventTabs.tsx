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
      } else if (trimmed.startsWith("<h") || trimmed.startsWith("<hr")) {
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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-tab]");
      if (target) {
        const idx = parseInt(target.getAttribute("data-tab") || "0", 10);
        if (idx >= 0 && idx < tabs.length) {
          setActiveIndex(idx);
        }
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [tabs.length]);

  if (!activeTab) return null;

  return (
    <div>
      {/* Section sub-nav — fixed below the main header. Right-aligned on desktop. */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-end overflow-x-auto scrollbar-hide -mb-px">
            <nav className="flex gap-1 sm:gap-2">
              {tabs.map((tab, i) => {
                const isActive = i === activeIndex;
                const icon = tabIcons[tab.label] || "📄";
                return (
                  <button
                    key={tab.slug}
                    onClick={() => setActiveIndex(i)}
                    className={`
                      flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium
                      transition-all relative whitespace-nowrap shrink-0
                      ${isActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                      }
                    `}
                  >
                    <span className="text-base">{icon}</span>
                    <span>{tab.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Spacer to clear the fixed sub-nav */}
      <div className="h-12" />

      {/* Content */}
      <div className="prose-event max-w-3xl min-h-[50vh]">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <span className="text-3xl">{tabIcons[activeTab.label] || "📄"}</span>
          {activeTab.title}
        </h2>
        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(activeTab.content) }} />
      </div>
    </div>
  );
}
