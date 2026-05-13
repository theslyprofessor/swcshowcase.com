import { useEffect, useState } from "react";

const CONVEX_URL = "https://amiable-moose-236.convex.cloud";

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
      const { durationMin: _dm, durationSec: _ds, ...rest } = form;
      void _dm;
      void _ds;
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
      const args = {
        ...rest,
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
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center max-w-2xl mx-auto">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-3">Submission Received!</h2>
        <p className="text-muted-foreground mb-4">
          Thank you, {form.firstName}! Your submission for the Media Showcase has been received.
          We'll review it and get back to you.
        </p>

        {accountRequested && hasExistingAccount && (
          <div className="bg-secondary rounded-lg p-4 mt-4 text-left">
            <p className="text-sm text-secondary-foreground">
              <span className="font-medium">Welcome back!</span> We linked this submission to
              your existing midimaze account. Sign in at{" "}
              <a
                href="https://midimaze.com/login"
                className="text-primary hover:underline font-medium"
              >
                midimaze.com/login
              </a>{" "}
              to view, edit, and track your submission status.
            </p>
          </div>
        )}

        {accountRequested && !hasExistingAccount && (
          <div className="bg-secondary rounded-lg p-4 mt-4 text-left">
            <p className="text-sm text-secondary-foreground">
              <span className="font-medium">Account requested.</span> We'll send a sign-in link
              to <span className="font-mono">{form.email}</span> shortly. Once you create your
              midimaze account with this email, you'll be able to view, edit, and track your
              submission at <span className="font-medium">midimaze.com/events/media-showcase-2026/my-submission</span>.
            </p>
          </div>
        )}

        {!accountRequested && isSWCEmail && (
          <div className="bg-secondary rounded-lg p-4 mt-4">
            <p className="text-sm text-secondary-foreground">
              We noticed you're using an SWC email.{" "}
              <a
                href="https://midimaze.com"
                className="text-primary hover:underline font-medium"
              >
                Register on Midimaze
              </a>{" "}
              for student access to course materials and more.
            </p>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-border text-left space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            What happens next
          </p>
          <a
            href="https://midimaze.com/events/media-showcase-2026/my-submission"
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
            href="https://midimaze.com/events/media-showcase-2026/live-schedule"
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
            placeholder="e.g. RA&T 105, FTMA 111"
          />
          <p className="text-xs text-muted-foreground mt-1">
            What class(es) are you taking in FTMA or RA&amp;T?
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
          Contributors
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Who worked on this? List everyone who should be credited on the
          program. Role is optional (e.g. filmmaker, vocals, piano, mix).
          We'll prefill the first row with your name — edit if you want to
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
                placeholder="Role (optional)"
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

      {/* Title + Band/Group name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Title of Your Piece / Presentation
          </label>
          <input
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="What's the name of your piece?"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Band / Group Name <span className="text-muted-foreground">(optional)</span>
          </label>
          <input
            value={form.bandName}
            onChange={(e) => update("bandName", e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g. Suzie's Casket"
          />
          <p className="text-xs text-muted-foreground mt-1">
            If you're submitting on behalf of a band or group, put the group's
            name here. We'll list the group on the program — not you.
          </p>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Description <span className="text-muted-foreground">(internal — for us)</span> *
        </label>
        <textarea
          required
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={4}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          placeholder="Tell us about your work — what's it about, what inspired it, what should the audience know going in? Plain language is fine, no need to be polished."
        />
        <p className="text-xs text-muted-foreground mt-1">
          This is for the curator team's reference. For the audience-facing
          blurb, use Program Notes below.
        </p>
      </div>

      {/* Program Notes */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Program Notes <span className="text-muted-foreground">(shown to the audience)</span>
        </label>
        <textarea
          value={form.programNotes}
          onChange={(e) => update("programNotes", e.target.value)}
          rows={3}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          placeholder="A short blurb the audience reads under your title on the program — 1 to 3 short paragraphs. Concert-program style."
        />
        <p className="text-xs text-muted-foreground mt-1">
          Examples: a story behind the piece, what to listen for, a dedication.
          Skip if you'd rather we use your description.
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
            placeholder="e.g. Romance, Hip-hop, Film score, Drama, Indie rock"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Estimated Length</label>
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
            How long is your piece? (Best guess is fine.)
          </p>
        </div>
      </div>

      {/* Media Links */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Link to Your Work
        </label>
        <input
          value={form.mediaLinks}
          onChange={(e) => update("mediaLinks", e.target.value)}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="SoundCloud, YouTube, Google Drive link, etc."
        />
        <p className="text-xs text-muted-foreground mt-1">
          Share a link so we can preview your submission
        </p>
      </div>

      {/* Visual Media for audio-only submissions */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.04] p-4">
        <label className="block text-sm font-medium mb-1.5">
          Visual Component <span className="text-muted-foreground">(audio-only submissions)</span>
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          If your piece is <strong>audio only</strong> (no live performance, no film), please provide an image or visual to accompany it on the screen during your set. Options:
        </p>
        <ul className="text-xs text-muted-foreground mb-2 list-disc list-inside space-y-0.5">
          <li>Link to an image (album art, photo, etc.)</li>
          <li>Link to a visualizer video</li>
          <li>A visualizer baked into your audio file (just say so below)</li>
        </ul>
        <input
          value={form.visualMedia}
          onChange={(e) => update("visualMedia", e.target.value)}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Image URL, visualizer link, or 'baked into the audio file'"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Skip if you have a live performance or film component.
        </p>
      </div>

      {/* Equipment Needs */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Equipment Needs *
        </label>
        <textarea
          required
          value={form.equipmentNeeds}
          onChange={(e) => update("equipmentNeeds", e.target.value)}
          rows={2}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          placeholder="What equipment do you need for the event? Mics, DI boxes, monitors, etc. Write 'None' if you're self-contained."
        />
      </div>

      {/* Timing Preference */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Timing Preference *
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Would you prefer to present earlier or later? We can't guarantee your request, but we'll try to accommodate.
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

      {/* Account opt-in */}
      <label className="flex items-start gap-3 bg-secondary/40 rounded-lg p-4 border border-border cursor-pointer hover:bg-secondary/60 transition-colors">
        <input
          type="checkbox"
          checked={form.createAccount}
          onChange={(e) => update("createAccount", e.target.checked)}
          className="mt-1 accent-primary"
        />
        <span className="text-sm">
          <span className="font-medium text-foreground block mb-1">
            Create a free midimaze account so I can track and edit my submission
          </span>
          <span className="text-muted-foreground">
            We'll link this submission to your account and send you a sign-in link.
            You'll be able to update your description, swap your media link, and see your
            slot once we've finalized the run of show.
          </span>
        </span>
      </label>

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
