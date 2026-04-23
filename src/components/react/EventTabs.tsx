import { useState } from "react";

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

// ---------------------------------------------------------------------------
// Tab icons (mapped by label)
// ---------------------------------------------------------------------------

const tabIcons: Record<string, string> = {
  "Overview": "🎭",
  "Schedule": "📋",
  "Attend": "🎟️",
  "Performer Info": "🎸",
  "Volunteer": "🤝",
  "Food & Venue": "📍",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EventTabs({ tabs }: EventTabsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeTab = tabs[activeIndex];

  if (!activeTab) return null;

  return (
    <div className="min-h-[50vh]">
      {/* Tab Bar — horizontal scroll on mobile, clean row on desktop */}
      <div className="border-b border-border">
        <div className="flex overflow-x-auto scrollbar-hide -mb-px">
          {tabs.map((tab, i) => {
            const isActive = i === activeIndex;
            const icon = tabIcons[tab.label] || "📄";
            return (
              <button
                key={tab.slug}
                onClick={() => setActiveIndex(i)}
                className={`
                  flex items-center gap-2 px-5 py-3.5 text-sm font-medium
                  transition-all relative whitespace-nowrap shrink-0
                  ${isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                  }
                `}
              >
                <span className="text-base">{icon}</span>
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="py-8 max-w-3xl">
        <div
          className="prose-event"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(activeTab.content) }}
        />
      </div>
    </div>
  );
}
