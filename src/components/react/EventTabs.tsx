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
  "Schedule": "📋",
  "Attend": "🎟️",
  "Performer Info": "🎸",
  "Volunteer": "🤝",
  "Food & Venue": "📍",
};

// ---------------------------------------------------------------------------
// Component — content on left, nav sidebar on right (mobile: hamburger drawer)
// ---------------------------------------------------------------------------

export default function EventTabs({ tabs }: EventTabsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const activeTab = tabs[activeIndex];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-tab]");
      if (target) {
        const idx = parseInt(target.getAttribute("data-tab") || "0", 10);
        if (idx >= 0 && idx < tabs.length) {
          setActiveIndex(idx);
          setMobileNavOpen(false);
        }
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [tabs.length]);

  if (!activeTab) return null;

  const navList = (
    <ul className="space-y-1">
      {tabs.map((tab, i) => {
        const isActive = i === activeIndex;
        const icon = tabIcons[tab.label] || "📄";
        return (
          <li key={tab.slug}>
            <button
              onClick={() => {
                setActiveIndex(i);
                setMobileNavOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left
                text-base font-medium transition-all
                ${isActive
                  ? "bg-primary/10 text-primary border-l-2 border-primary"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground border-l-2 border-transparent"
                }
              `}
            >
              <span className="text-xl">{icon}</span>
              <span>{tab.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="relative">
      {/* Mobile hamburger — fixed top-right on small screens */}
      <button
        onClick={() => setMobileNavOpen(true)}
        className="lg:hidden fixed top-3 right-3 z-40 bg-card border border-border rounded-lg p-2.5 shadow-lg"
        aria-label="Open event sections"
      >
        <svg className="h-6 w-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="w-72 max-w-[85vw] bg-card border-l border-border p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4 px-2">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Sections</span>
              <button
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close menu"
                className="text-muted-foreground hover:text-foreground"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {navList}
          </div>
        </div>
      )}

      {/* Desktop layout — content + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_240px] gap-10 min-h-[60vh]">
        <main className="order-2 lg:order-1">
          <div className="prose-event max-w-3xl">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <span className="text-3xl">{tabIcons[activeTab.label] || "📄"}</span>
              {activeTab.title}
            </h2>
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(activeTab.content) }} />
          </div>
        </main>
        <aside className="order-1 lg:order-2 hidden lg:block">
          <div className="sticky top-24">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-4">Sections</p>
            {navList}
          </div>
        </aside>
      </div>
    </div>
  );
}
