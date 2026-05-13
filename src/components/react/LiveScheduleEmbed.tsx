/**
 * Live schedule embed — read-only audience program.
 *
 * Drops onto the Program tab of swcshowcase.com and fetches the same
 * payload that midimaze.com/events/<slug>/live-schedule reads from
 * Convex (`events:getPublicSchedule`). Single-source-of-truth: as the
 * curator advances cues on midimaze.com/admin/events, this page reflects
 * the new state on the next poll.
 *
 * Why not iframe midimaze.com's live-schedule? Because the styling on
 * that page is dark-stage-monitor (small fonts, dense rows for crew
 * heads-up) while swcshowcase.com is audience-facing typography. Same
 * data, different render conventions.
 */
import { useEffect, useRef, useState } from "react";

const CONVEX_URL = "https://amiable-moose-236.convex.cloud";
// Poll cadence: 5s is the sweet spot for "feels live" without hammering
// Convex. Cues advance every ~3–8 min during a show, so 5s lag is barely
// perceptible. Bumped down from 15s on user feedback during dress run.
const POLL_INTERVAL_MS = 5_000;

type Creator = { name: string; role?: string };
type Cue = {
  order: number;
  type: string;
  title?: string;
  performer?: string;
  durationDisplay?: string;
  genreOrStyle?: string;
  format?: string;
  mediaCategory?: string;
  qaMinutes?: number;
  transitionMinutes?: number;
  programNotes?: string;
  startTime?: string;
  actualStartAt?: number;
  mediaLinks?: string;
  creators?: Creator[];
  submission?: { description?: string; status?: string } | null;
};
type Payload = {
  event: { name: string; date: number; venue: string };
  cues: Cue[];
};

const SHOW_START_MINUTES = 18 * 60; // 6:00 PM
const INTRO_MINUTES = 5;

const CATEGORY_LABEL: Record<string, string> = {
  film: "film / video",
  live: "live",
  "audio-visual": "audio + visual",
  "dj-electronic": "dj / electronic",
  spoken: "spoken word",
  other: "other",
};

function parseDurationMinutes(value: unknown): number {
  if (typeof value === "number" && isFinite(value)) return value;
  if (!value) return 0;
  const s = String(value).toLowerCase().trim();
  const range = s.match(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)/);
  if (range) return Math.max(parseFloat(range[1]), parseFloat(range[2]));
  const time = s.match(/^(\d+)[:.](\d{1,2})\s*$/);
  if (time) return parseFloat(time[1]) + parseFloat(time[2]) / 60;
  const num = s.match(/(\d+(?:\.\d+)?)/);
  return num ? parseFloat(num[1]) : 0;
}

function formatClockTime(minutes: number): string {
  const total = Math.round(minutes);
  const h24 = Math.floor(total / 60) % 24;
  const m = total % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

function normalizeDuration(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  const mm = s.match(/^(\d+)[:.](\d{1,2})$/);
  if (mm) return `${parseInt(mm[1], 10)}:${mm[2].padStart(2, "0")}`;
  const single = s.match(/^(\d+(?:\.\d+)?)$/);
  if (single) {
    const v = parseFloat(single[1]);
    if (!isNaN(v) && v > 0) return `${Math.round(v)} min`;
  }
  return s;
}

function lastFirst(name?: string): string {
  if (!name) return "TBA";
  const trimmed = name.trim();
  if (trimmed.includes(",")) return trimmed;
  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) return trimmed;
  return `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(" ")}`;
}

function defaultRoleForCategory(cat?: string): string | undefined {
  if (!cat) return undefined;
  const k = cat.toLowerCase();
  if (k === "film" || k === "video" || k === "film/video" || k === "film / video") {
    return "Filmmaker";
  }
  return undefined;
}

function resolveCredits(cue: Cue, categoryKey?: string): Creator[] {
  const dflt = defaultRoleForCategory(categoryKey);
  if (cue.creators?.length) {
    return cue.creators
      .filter((c) => c?.name?.trim())
      .map((c) => ({
        name: lastFirst(c.name),
        role: (c.role?.trim() || dflt) ?? undefined,
      }));
  }
  if (cue.performer?.trim()) {
    return [{ name: lastFirst(cue.performer), role: dflt }];
  }
  return [];
}

/** Infer category for legacy cues that didn't get an explicit mediaCategory. */
function inferCategory(c: Cue): string | undefined {
  if (c.mediaCategory) return c.mediaCategory;
  const blob = `${c.title ?? ""} ${c.format ?? ""} ${c.genreOrStyle ?? ""}`.toLowerCase();
  if (/film|movie|short|video/.test(blob)) return "film";
  if (/dj|electronic|techno|house/.test(blob)) return "dj-electronic";
  if (/visual|projection/.test(blob)) return "audio-visual";
  if (/spoken|talk|reading/.test(blob)) return "spoken";
  if (/live|band|piano|vocal|guitar/.test(blob)) return "live";
  return undefined;
}

async function fetchSchedule(eventSlug: string): Promise<Payload | null> {
  try {
    const res = await fetch(`${CONVEX_URL}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "events:getPublicSchedule",
        args: { eventSlug },
        format: "json",
      }),
    });
    const data = await res.json();
    if (data.status === "error") return null;
    return data.value as Payload;
  } catch {
    return null;
  }
}

interface Props {
  eventSlug: string;
}

export default function LiveScheduleEmbed({ eventSlug }: Props) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  // Refs for the scrollable container + each row so the current cue can be
  // snapped to the top of the visible area when it changes (mirrors the
  // behavior of midimaze.com/admin/events Program View).
  const listScrollRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<Record<number, HTMLLIElement | null>>({});

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const next = await fetchSchedule(eventSlug);
      if (!alive) return;
      setData(next);
      setLoading(false);
    };
    tick();
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [eventSlug]);

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground italic mt-4">
        Loading current program order…
      </p>
    );
  }
  if (!data || data.cues.length === 0) {
    return (
      <div className="mt-4 border border-dashed border-border rounded-lg p-6 text-center">
        <p className="text-sm text-foreground mb-1">
          The full set order will appear here as soon as it's locked in.
        </p>
        <p className="text-xs text-muted-foreground">
          Currently being finalized by the curators.
        </p>
      </div>
    );
  }

  // Reflow start times. If a cue has actualStartAt, anchor projection
  // from that moment. Otherwise stack on the scheduled show start.
  let cursor = SHOW_START_MINUTES + INTRO_MINUTES;
  const cuesWithStart = data.cues.map((c) => {
    const baseLen = parseDurationMinutes(c.durationDisplay);
    const qa = c.qaMinutes ?? 0;
    const trans = c.transitionMinutes ?? 0;
    let startAt: number;
    if (c.actualStartAt) {
      const d = new Date(c.actualStartAt);
      startAt = d.getHours() * 60 + d.getMinutes();
      cursor = startAt + baseLen + qa + trans;
    } else {
      startAt = cursor;
      cursor += baseLen + qa + trans;
    }
    return { ...c, _startAt: startAt };
  });

  // Find "now" cue — latest one with actualStartAt and no started successor.
  let nowOrder: number | null = null;
  for (let i = cuesWithStart.length - 1; i >= 0; i--) {
    if (
      cuesWithStart[i].actualStartAt &&
      !cuesWithStart[i + 1]?.actualStartAt
    ) {
      nowOrder = cuesWithStart[i].order;
      break;
    }
  }

  return (
    <div className="mt-6 not-prose">
      <p className="text-xs text-muted-foreground mb-4">
        Updates live as the show runs. Times reflect the projected schedule;
        actual times shift once cues are marked started by the stage manager.
      </p>
      <ScrollToNow
        listScrollRef={listScrollRef}
        rowRefs={rowRefs}
        nowOrder={nowOrder}
      />
      <div
        ref={listScrollRef}
        className="max-h-[calc(100vh-280px)] overflow-y-auto pr-2 scroll-smooth"
      >
      <ol className="space-y-6">
        {cuesWithStart.map((c) => {
          const catKey = inferCategory(c);
          const isNow = nowOrder === c.order;
          const isDone =
            c.actualStartAt && nowOrder !== null && c.order < nowOrder;
          const credits = resolveCredits(c, catKey);
          const presentationType = catKey ? CATEGORY_LABEL[catKey] : undefined;
          const genre = c.genreOrStyle;
          const cleanDuration = normalizeDuration(c.durationDisplay);
          return (
            <li
              key={c.order}
              ref={(el) => {
                rowRefs.current[c.order] = el;
              }}
              className={`grid grid-cols-[1fr_auto] gap-x-4 items-baseline ${
                isDone ? "opacity-40" : ""
              }`}
            >
              <div>
                <p className="text-lg text-foreground">
                  <span className={isNow ? "font-semibold" : ""}>
                    {c.title || "Untitled"}
                  </span>
                  {isNow && (
                    <span className="ml-2 text-xs uppercase tracking-wider text-primary align-middle">
                      now
                    </span>
                  )}
                </p>
                {credits.length > 0 && (
                  <ul className="text-sm text-foreground/90 mt-0.5 leading-snug">
                    {credits.map((cr, i) => (
                      <li key={i}>
                        {cr.name}
                        {cr.role && (
                          <span className="text-muted-foreground"> — {cr.role}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <dl className="text-sm text-muted-foreground leading-snug mt-1 space-y-0.5">
                  {genre && (
                    <div className="flex gap-1.5">
                      <dt className="text-muted-foreground/70">Genre:</dt>
                      <dd>{genre}</dd>
                    </div>
                  )}
                  {presentationType && (
                    <div className="flex gap-1.5">
                      <dt className="text-muted-foreground/70">Presentation Type:</dt>
                      <dd>{presentationType}</dd>
                    </div>
                  )}
                </dl>
                {c.programNotes && (
                  <p className="text-sm text-foreground/80 leading-snug mt-2 max-w-2xl whitespace-pre-wrap">
                    {c.programNotes}
                  </p>
                )}
              </div>
              <div className="text-right text-sm text-muted-foreground font-mono tabular-nums shrink-0">
                <div className="text-base text-foreground/80">
                  {formatClockTime(c._startAt)}
                </div>
                <div className="text-xs font-sans text-muted-foreground/80">
                  {cleanDuration ?? "—"}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      </div>
    </div>
  );
}

/** Companion effect: when the now-cue changes, scroll that row to the top
 * of the scroll container with smooth behavior. Past cues remain in the
 * DOM and scroll out above; the audience can scroll back if curious. */
function ScrollToNow({
  listScrollRef,
  rowRefs,
  nowOrder,
}: {
  listScrollRef: React.MutableRefObject<HTMLDivElement | null>;
  rowRefs: React.MutableRefObject<Record<number, HTMLLIElement | null>>;
  nowOrder: number | null;
}) {
  useEffect(() => {
    if (nowOrder === null) return;
    const row = rowRefs.current[nowOrder];
    const container = listScrollRef.current;
    if (!row || !container) return;
    const rowRect = row.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    container.scrollTo({
      top: container.scrollTop + (rowRect.top - containerRect.top) - 4,
      behavior: "smooth",
    });
  }, [nowOrder, listScrollRef, rowRefs]);
  return null;
}
