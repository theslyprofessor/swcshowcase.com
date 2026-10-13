import { useEffect, useState } from "react";

const CONVEX_URL = "https://amiable-moose-236.convex.cloud";

export const PROGRAM_TRACKS = [
  {
    id: "rat" as const,
    shortName: "RA&T Showcase",
    fullName: "Recording Arts & Technology (RA&T)",
    date: "Monday, November 23, 2026",
    time: "5:30 PM",
    description: "Music productions, audio engineering, live performances, beats, band sets, and sound design.",
  },
  {
    id: "ftma" as const,
    shortName: "FTMA Showcase",
    fullName: "Film, Television & Media Arts (FTMA)",
    date: "Tuesday, November 24, 2026",
    time: "5:30 PM",
    description: "Short films, video productions, documentaries, animations, motion graphics, and media screenings.",
  },
  {
    id: "both" as const,
    shortName: "Both / Collaborative",
    fullName: "Cross-Program Collaboration",
    date: "Mon Nov 23 & Tue Nov 24",
    time: "Coordinated track",
    description: "Collaborative projects (e.g. film score + screening, multimedia live projects).",
  },
];

export type ProgramTrackId = (typeof PROGRAM_TRACKS)[number]["id"];

interface SubmissionFormProps {
  eventSlug: string;
}

export default function SubmissionForm({ eventSlug }: SubmissionFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isSWCEmail, setIsSWCEmail] = useState(false);
  const [hasExistingAccount, setHasExistingAccount] = useState(false);
  const [accountRequested, setAccountRequested] = useState(false);
  const [programTrack, setProgramTrack] = useState<ProgramTrackId>("rat");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    classes: "",
    section: "",
    title: "",
    bandName: "",
    description: "",
    programNotes: "",
    genre: "",
    estimatedLength: "",
    durationMin: "",
    durationSec: "",
    mediaLinks: "",
    visualMedia: "",
    equipmentNeeds: "",
    timingPreference: "no_preference" as "earlier" | "later" | "no_preference",
    additionalNotes: "",
    parentalAdvisory: false,
    parentalAdvisoryNote: "",
    createAccount: false,
  });

  const [creators, setCreators] = useState<{ name: string; role: string }[]>([
    { name: "", role: "" },
  ]);
  // Mirror submitter name into creators[0] until the user manually edits
  // that first row. Lets the contributor list prefill naturally as the
  // submitter types their own name elsewhere in the form.
  const [autoMirrorFirstCreator, setAutoMirrorFirstCreator] = useState(true);

  useEffect(() => {
    if (!autoMirrorFirstCreator) return;
    const full = `${form.firstName} ${form.lastName}`.trim();
    setCreators((prev) => {
      if (prev.length === 0) return [{ name: full, role: "" }];
      if (prev[0].name === full) return prev;
      return [{ ...prev[0], name: full }, ...prev.slice(1)];
    });
  }, [form.firstName, form.lastName, autoMirrorFirstCreator]);

  const update = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      // Pack structured min/sec into a single estimatedMinutes number and a
      // matching display string. The Convex mutation accepts both — the
      // structured number wins downstream when upserting a cue.
      const mNum = parseInt(form.durationMin || "0", 10) || 0;
      const sNum = Math.min(59, Math.max(0, parseInt(form.durationSec || "0", 10) || 0));
      const estimatedMinutes =
        mNum + sNum / 60 > 0 ? mNum + sNum / 60 : undefined;
      const estimatedLength =
        estimatedMinutes !== undefined
          ? sNum === 0
            ? `${mNum} min`
            : `${mNum}:${sNum.toString().padStart(2, "0")}`
          : form.estimatedLength || undefined;

      // Don't ship the local-only fields to Convex; assemble exactly what
      // submitToEvent expects.
      const { durationMin: _dm, durationSec: _ds, createAccount: _ca, ...rest } = form;
      void _dm;
      void _ds;
      void _ca;
      const cleanedCreators = creators
        .map((c) => ({
          name: c.name.trim(),
          role: c.role.trim() || undefined,
        }))
        .filter((c) => c.name.length > 0);
      // If the submitter didn't add anyone, seed creators with their own
      // name so the program isn't blank. They can rename in the dashboard.
      const finalCreators =
        cleanedCreators.length > 0
          ? cleanedCreators
          : form.firstName.trim() || form.lastName.trim()
            ? [
                {
                  name: `${form.firstName} ${form.lastName}`.trim(),
                  role: undefined,
                },
              ]
            : undefined;
      const track =
        PROGRAM_TRACKS.find((t) => t.id === programTrack) ?? PROGRAM_TRACKS[0];
      const trackTag = `[${track.shortName}]`;
      const finalClasses = form.classes
        ? `${trackTag} ${form.classes}`.trim()
        : trackTag;

      const trackHeader = `Showcase Track: ${track.fullName} (${track.date})`;
      const finalAdditionalNotes = [
        trackHeader,
        form.additionalNotes.trim() ? form.additionalNotes.trim() : null,
      ]
        .filter(Boolean)
        .join("\n\n");

      const args = {
        ...rest,
        createAccount: true, // Seamlessly link to Midimaze without confusing pre-submission checkbox
        classes: finalClasses,
        additionalNotes: finalAdditionalNotes || undefined,
        eventSlug,
        estimatedLength,
        estimatedMinutes,
        creators: finalCreators,
      };

      const res = await fetch(`${CONVEX_URL}/api/mutation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "events:submitToEvent",
          args,
          format: "json",
        }),
      });

      const data = await res.json();

      if (data.status === "error") {
        setError(data.errorMessage || "Submission failed. Please try again.");
      } else {
        setSubmitted(true);
        setIsSWCEmail(data.value?.isSWCEmail ?? false);
        setHasExistingAccount(data.value?.hasExistingAccount ?? false);
        setAccountRequested(data.value?.requestedAccount ?? false);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    const selectedTrack =
      PROGRAM_TRACKS.find((t) => t.id === programTrack) ?? PROGRAM_TRACKS[0];

    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center max-w-2xl mx-auto">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-3">Submission Received!</h2>
        <p className="text-muted-foreground mb-4">
          Thank you, {form.firstName}! Your submission for the{" "}
          <strong className="text-foreground">{selectedTrack.fullName}</strong>{" "}
          ({selectedTrack.date}) has been received. We'll review it and get back
          to you.
        </p>

        {/* Clear prompt to log in or create Midimaze account using their SWC email */}
        <div className="bg-gradient-to-br from-primary/15 via-secondary/70 to-secondary/40 rounded-2xl border border-primary/30 p-6 my-6 text-left shadow-lg">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="text-3xl shrink-0 p-3 bg-primary/20 rounded-xl">
              🎓
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-foreground mb-1">
                {hasExistingAccount
                  ? "Welcome Back! Sign In with Your SWC Email"
                  : "Connect with Your SWC Student Account"}
              </h3>
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                Log in or create your free account using your student email (
                <span className="font-mono text-primary font-medium">{form.email}</span>).
                Connecting your account lets you manage your submission directly:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1.5 mb-5">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Live Status:</strong> Track review &amp; approval status in real time</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Edit Anytime:</strong> Update your description, credits, or swap your screener link</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Showtime Lineup:</strong> See your call time and confirmed slot in the live run of show</span>
                </li>
              </ul>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <a
                  href={`https://midimaze.com/login?email=${encodeURIComponent(form.email)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-all text-sm shadow-md"
                >
                  <span>{hasExistingAccount ? "Sign In to Midimaze →" : "Sign In / Create Account with SWC Email →"}</span>
                </a>
                <a
                  href="https://midimaze.com/events/media-showcase-fall-2026/my-submission"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-secondary border border-border font-medium px-4 py-2.5 rounded-lg hover:bg-secondary/80 transition-colors text-sm text-foreground"
                >
                  <span>Go to My Submission</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border text-left space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            What happens next
          </p>
          <a
            href="https://midimaze.com/events/media-showcase-fall-2026/my-submission"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-3 rounded-lg bg-secondary/40 border border-border hover:border-primary/40 transition-colors"
          >
            <span className="text-xl shrink-0">📝</span>
            <span className="flex-1">
              <span className="font-medium text-foreground block text-sm">
                Manage your submission
              </span>
              <span className="text-xs text-muted-foreground">
                Edit your description, swap your media link, or check your status anytime —
                sign in with the same email.
              </span>
            </span>
          </a>
          <a
            href="https://midimaze.com/events/media-showcase-fall-2026/live-schedule"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-3 rounded-lg bg-secondary/40 border border-border hover:border-primary/40 transition-colors"
          >
            <span className="text-xl shrink-0">📋</span>
            <span className="flex-1">
              <span className="font-medium text-foreground block text-sm">
                Live schedule
              </span>
              <span className="text-xs text-muted-foreground">
                See the run of show as it gets locked in. Updates in real time
                — bookmark this page for showtime.
              </span>
            </span>
          </a>
          <p className="text-xs text-muted-foreground pt-1">
            Questions? Email{" "}
            <a
              href="mailto:info@swcshowcase.com"
              className="text-primary hover:underline"
            >
              info@swcshowcase.com
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">First Name *</label>
          <input
            required
            value={form.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="First name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Last Name *</label>
          <input
            required
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Last name"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Student Email Address *
        </label>
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="yourname@student.swccd.edu"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Use your Southwestern College email if you have one
        </p>
      </div>

      {/* Program / Showcase Track Selection */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Showcase Program &amp; Track *
        </label>
        <p className="text-xs text-muted-foreground mb-3">
          Select which showcase track this piece is for (RA&amp;T, FTMA, or a joint collaboration):
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PROGRAM_TRACKS.map((track) => {
            const isSelected = programTrack === track.id;
            return (
              <label
                key={track.id}
                className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? "bg-primary/15 border-primary shadow-sm ring-1 ring-primary"
                    : "bg-secondary/40 border-border hover:bg-secondary/60 hover:border-border/80"
                }`}
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <input
                    type="radio"
                    name="programTrack"
                    value={track.id}
                    checked={isSelected}
                    onChange={() => setProgramTrack(track.id)}
                    className="accent-primary h-4 w-4"
                  />
                  <span className="font-semibold text-foreground text-sm">
                    {track.shortName}
                  </span>
                </div>
                <span className="text-xs font-semibold text-primary mb-1">
                  {track.date}
                </span>
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {track.description}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Classes + Section */}
      <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Course name &amp; number(s)
          </label>
          <input
            value={form.classes}
            onChange={(e) => update("classes", e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={
              programTrack === "rat"
                ? "e.g. RA&T 105, RA&T 120"
                : programTrack === "ftma"
                ? "e.g. FTMA 111, FTMA 160"
                : "e.g. RA&T 105, FTMA 111"
            }
          />
          <p className="text-xs text-muted-foreground mt-1">
            {programTrack === "rat"
              ? "What RA&T class(es) are you taking this semester?"
              : programTrack === "ftma"
              ? "What FTMA class(es) are you taking this semester?"
              : "What RA&T and/or FTMA class(es) are you taking?"}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Section(s)
          </label>
          <input
            value={form.section}
            onChange={(e) => update("section", e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g. 01, 03"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Section number from your registration.
          </p>
        </div>
      </div>

      {/* Contributors — moved to the top of the substantive content so the
          submitter sees right away that this is a credits-driven form.
          First row auto-mirrors firstName/lastName above until manually edited. */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          {programTrack === "rat"
            ? "Musicians, Performers & Audio Crew"
            : programTrack === "ftma"
            ? "Film Credits & Key Creative Crew"
            : "Contributors & Creative Credits"}
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          {programTrack === "rat"
            ? "Who worked on this piece? List everyone who should be credited on the concert program. Role is optional (e.g. vocals, guitar, mix, producer)."
            : programTrack === "ftma"
            ? "Who worked on this film? List all key crew and cast for the screening guide. Role is optional (e.g. Director, DP / Cinematographer, Editor, Writer, Lead Actor, Sound Designer)."
            : "List everyone who should be credited on the program. Role is optional (e.g. Director, Composer, Sound Designer, Editor, Performer)."}
          {" "}We'll prefill the first row with your name — edit if you want to
          credit yourself differently or add others.
        </p>
        <div className="space-y-2">
          {creators.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={c.name}
                onChange={(e) => {
                  // User manually edited the first-row name; stop mirroring
                  // from firstName/lastName so we don't fight them.
                  if (i === 0) setAutoMirrorFirstCreator(false);
                  const next = [...creators];
                  next[i] = { ...next[i], name: e.target.value };
                  setCreators(next);
                }}
                placeholder={i === 0 ? "Your name (auto-filled from above)" : "Name"}
                className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                value={c.role}
                onChange={(e) => {
                  const next = [...creators];
                  next[i] = { ...next[i], role: e.target.value };
                  setCreators(next);
                }}
                placeholder={
                  programTrack === "rat"
                    ? "Role (e.g. Vocals, Guitar, Mix, Producer)"
                    : programTrack === "ftma"
                    ? "Role (e.g. Director, DP, Editor, Actor, Writer)"
                    : "Role (e.g. Director, Composer, Sound, Editor)"
                }
                className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => {
                  if (i === 0) setAutoMirrorFirstCreator(false);
                  const next = creators.filter((_, j) => j !== i);
                  setCreators(next.length > 0 ? next : [{ name: "", role: "" }]);
                }}
                aria-label="Remove"
                className="px-2 py-2 text-muted-foreground hover:text-destructive"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setCreators([...creators, { name: "", role: "" }])
            }
            className="text-sm px-3 py-1.5 rounded-lg bg-secondary border border-border hover:bg-secondary/80"
          >
            + Add contributor
          </button>
        </div>
      </div>

      {/* Title + Band/Group/Team name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">
            {programTrack === "rat"
              ? "Title of Your Song / Track / Live Piece *"
              : programTrack === "ftma"
              ? "Title of Your Film / Project *"
              : "Title of Your Piece / Presentation *"}
          </label>
          <input
            required
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={
              programTrack === "rat"
                ? "e.g. Midnight Reverie, Beat Set #3"
                : programTrack === "ftma"
                ? "e.g. Echoes of Chula Vista, The Final Cut"
                : "What's the name of your piece?"
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">
            {programTrack === "rat"
              ? "Band / Artist / Group Name"
              : programTrack === "ftma"
              ? "Production Company / Film Team Name"
              : "Band / Group / Team Name"}{" "}
            <span className="text-muted-foreground">(optional)</span>
          </label>
          <input
            value={form.bandName}
            onChange={(e) => update("bandName", e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={
              programTrack === "rat"
                ? "e.g. Suzie's Casket, The Jazz Quartet"
                : programTrack === "ftma"
                ? "e.g. Room 84 Films, CineSWC"
                : "e.g. Collective / Team Name"
            }
          />
          <p className="text-xs text-muted-foreground mt-1">
            {programTrack === "rat"
              ? "If you perform under a stage name, alias, or as a band, put it here. We'll list the group on the program."
              : programTrack === "ftma"
              ? "If this project was produced by a student crew or production team, list it here for screening program credits."
              : "If submitting on behalf of a band, group, or crew, put the name here."}
          </p>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          {programTrack === "rat"
            ? "Description of Your Music / Set (internal — for curators) *"
            : programTrack === "ftma"
            ? "Film Synopsis & Story (internal — for curators) *"
            : "Project Description (internal — for curators) *"}
        </label>
        <textarea
          required
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={4}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          placeholder={
            programTrack === "rat"
              ? "Tell us about your audio piece or performance — what genre, instrumentation, concept, or inspiration? Plain language is fine, no need to be polished."
              : programTrack === "ftma"
              ? "What is the story or logline of your film? What was the concept, inspiration, or class prompt? What should curators know going in?"
              : "Tell us about your work — what's it about, what inspired it, and what should curators know going in?"
          }
        />
        <p className="text-xs text-muted-foreground mt-1">
          This is for the curator team's reference. For the audience-facing
          blurb, use Program Notes below.
        </p>
      </div>

      {/* Program Notes */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          {programTrack === "rat"
            ? "Concert Program Notes (shown to the audience)"
            : programTrack === "ftma"
            ? "Screening Guide Synopsis (shown to the audience)"
            : "Program Notes (shown to the audience)"}
        </label>
        <textarea
          value={form.programNotes}
          onChange={(e) => update("programNotes", e.target.value)}
          rows={3}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          placeholder={
            programTrack === "rat"
              ? "A short blurb the audience reads under your title on the program — 1 to 3 short paragraphs. Concert-program style."
              : programTrack === "ftma"
              ? "A short logline or synopsis that appears in the screening guide under your film title (1 to 2 short paragraphs)."
              : "A short blurb the audience reads under your title on the program."
          }
        />
        <p className="text-xs text-muted-foreground mt-1">
          {programTrack === "rat"
            ? "Examples: stories behind the track, what to listen for, a dedication. Skip if you'd rather we use your description."
            : programTrack === "ftma"
            ? "Audience screening guide blurb: logline, brief synopsis, or filmmaker note. Skip if you'd rather we use your description."
            : "A short blurb explaining your collaborative work for the audience program guide."}
        </p>
      </div>

      {/* Genre + Length */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Genre</label>
          <input
            value={form.genre}
            onChange={(e) => update("genre", e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={
              programTrack === "rat"
                ? "e.g. Hip-hop, Jazz, Electronic, Indie Rock, Ambient, R&B, Film Score"
                : programTrack === "ftma"
                ? "e.g. Narrative Short, Documentary, Music Video, Animation, Experimental"
                : "e.g. Film with Live Score, Multimedia Installation, Music Video"
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">
            {programTrack === "ftma" ? "Total Runtime (TRT)" : "Estimated Length"}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={120}
              value={form.durationMin}
              onChange={(e) => update("durationMin", e.target.value)}
              className="w-24 bg-secondary border border-border rounded-lg px-3 py-2.5 text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="0"
            />
            <span className="text-sm text-muted-foreground">min</span>
            <span className="text-muted-foreground">:</span>
            <input
              type="number"
              min={0}
              max={59}
              value={form.durationSec}
              onChange={(e) => update("durationSec", e.target.value)}
              className="w-24 bg-secondary border border-border rounded-lg px-3 py-2.5 text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="0"
            />
            <span className="text-sm text-muted-foreground">sec</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {programTrack === "rat"
              ? "How long is your track or live set? (Best guess is fine.)"
              : programTrack === "ftma"
              ? "Total runtime (TRT) of your short film or video cut. (Best guess is fine.)"
              : "How long is your piece? (Best guess is fine.)"}
          </p>
        </div>
      </div>

      {/* Media Links */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          {programTrack === "rat"
            ? "Link to Audio / Demo / Set Preview"
            : programTrack === "ftma"
            ? "Link to Film Screener / Video Preview"
            : "Link to Project Preview (Video & Audio)"}
        </label>
        <input
          value={form.mediaLinks}
          onChange={(e) => update("mediaLinks", e.target.value)}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder={
            programTrack === "rat"
              ? "SoundCloud, Google Drive, unlisted YouTube, Dropbox, etc."
              : programTrack === "ftma"
              ? "Google Drive, Vimeo (with password if private), unlisted YouTube"
              : "Google Drive, Vimeo, or YouTube link"
          }
        />
        <p className="text-xs text-muted-foreground mt-1">
          {programTrack === "rat"
            ? "Share an audio stream or cloud link so we can preview your music"
            : programTrack === "ftma"
            ? "Share a link so the film curation team can preview your cut (works-in-progress welcome!)"
            : "Share a link so we can preview your collaborative submission"}
        </p>
      </div>

      {/* Visual Component for RA&T vs Delivery Specs for FTMA */}
      {programTrack === "rat" && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.04] p-4">
          <label className="block text-sm font-medium mb-1.5">
            Visual Component <span className="text-muted-foreground">(audio-only submissions)</span>
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            If your piece is <strong>audio only</strong> (no live performance on stage), please provide an image or visual to accompany it on the cinema screen during your set:
          </p>
          <ul className="text-xs text-muted-foreground mb-2 list-disc list-inside space-y-0.5">
            <li>Link to an image (album art, high-res photo, artwork)</li>
            <li>Link to a visualizer video</li>
            <li>A visualizer baked into your audio file (just write "baked in" below)</li>
          </ul>
          <input
            value={form.visualMedia}
            onChange={(e) => update("visualMedia", e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Image URL, visualizer link, or 'baked into the audio file'"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Skip if you have a live performance on stage.
          </p>
        </div>
      )}

      {programTrack === "ftma" && (
        <div className="rounded-lg border border-primary/30 bg-primary/[0.04] p-4">
          <label className="block text-sm font-medium mb-1.5">
            Screening Format &amp; Delivery Specs <span className="text-muted-foreground">(Tuesday Cinema Night)</span>
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Tuesday films screen on the main PAC cinema projection. What is your current export status and format?
          </p>
          <ul className="text-xs text-muted-foreground mb-2 list-disc list-inside space-y-0.5">
            <li>Work-in-progress cut (final export ready by November 20)</li>
            <li>Final master ready (1080p or 4K, ProRes / MP4, stereo or 5.1 audio)</li>
          </ul>
          <input
            value={form.visualMedia}
            onChange={(e) => update("visualMedia", e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g. 1080p 24fps stereo MP4, or 'Rough cut - final export by Nov 20'"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Helps projectionists verify aspect ratio and playback requirements in advance.
          </p>
        </div>
      )}

      {programTrack === "both" && (
        <div className="rounded-lg border border-primary/30 bg-primary/[0.04] p-4">
          <label className="block text-sm font-medium mb-1.5">
            Visual &amp; Projection Setup
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Describe how the visual/film component will be screened alongside the audio:
          </p>
          <input
            value={form.visualMedia}
            onChange={(e) => update("visualMedia", e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g. Cinema projection video synced with live musicians on stage"
          />
        </div>
      )}

      {/* Equipment Needs */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          {programTrack === "rat"
            ? "Live Performance & Stage Equipment Needs *"
            : programTrack === "ftma"
            ? "Screening Presentation & Filmmaker Q&A Needs *"
            : "Stage & AV Equipment Needs *"}
        </label>
        <textarea
          required
          value={form.equipmentNeeds}
          onChange={(e) => update("equipmentNeeds", e.target.value)}
          rows={2}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          placeholder={
            programTrack === "rat"
              ? "What equipment do you need on stage? Mics, DI boxes, monitors, keyboard stand, etc. Write 'None / Playback only' if your track is just being played back through the PA."
              : programTrack === "ftma"
              ? "For Tuesday's screening: will the director or crew do a brief live intro or Q&A on stage? How many stage mics will you need? Write 'None' if standard screening only with no live intro."
              : "Specify stage mics, instruments, audio inputs, and any special projection/playback equipment."
          }
        />
      </div>

      {/* Timing Preference */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Timing Preference *
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          {programTrack === "rat"
            ? "Would you prefer to perform earlier or later on Monday night (Nov 23)? We can't guarantee your request, but we'll try to accommodate."
            : programTrack === "ftma"
            ? "Would you prefer your screening slot earlier or later on Tuesday night (Nov 24)? We can't guarantee your request, but we'll try to accommodate."
            : "Would you prefer to present earlier or later in the evening? We can't guarantee your request, but we'll try to accommodate."}
        </p>
        <div className="flex gap-4">
          {[
            { value: "earlier", label: "Earlier" },
            { value: "later", label: "Later" },
            { value: "no_preference", label: "No Preference" },
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="timingPreference"
                value={opt.value}
                checked={form.timingPreference === opt.value}
                onChange={(e) => update("timingPreference", e.target.value)}
                className="accent-primary"
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Additional Notes */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Anything else you'd like to share?
        </label>
        <textarea
          value={form.additionalNotes}
          onChange={(e) => update("additionalNotes", e.target.value)}
          rows={2}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          placeholder="Optional"
        />
      </div>

      {/* Parental advisory self-declaration */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.04] p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.parentalAdvisory}
            onChange={(e) => update("parentalAdvisory", e.target.checked)}
            className="mt-1 accent-amber-500"
          />
          <span className="text-sm">
            <span className="font-medium text-foreground block mb-1">
              My work contains explicit or mature content (strong language,
              mature themes) and needs a parental advisory.
            </span>
            <span className="text-muted-foreground">
              This is a family-friendly audience. Flagging your work lets us
              place it appropriately and give the audience a heads-up.
            </span>
          </span>
        </label>
        {form.parentalAdvisory && (
          <div className="mt-3">
            <label className="block text-sm font-medium mb-1.5">
              Briefly, what should we flag?{" "}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              value={form.parentalAdvisoryNote}
              onChange={(e) => update("parentalAdvisoryNote", e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. explicit lyrics, mature themes"
            />
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-primary text-primary-foreground font-semibold py-3 px-6 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Submitting..." : "Submit Your Work"}
      </button>
    </form>
  );
}
