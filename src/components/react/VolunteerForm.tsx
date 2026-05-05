import { useState } from "react";

const CONVEX_URL = "https://amiable-moose-236.convex.cloud";

interface VolunteerFormProps {
  eventSlug: string;
}

const TIME_BLOCKS = [
  { value: "12-2pm", label: "12 – 2 PM (load-in / setup)" },
  { value: "2-4pm", label: "2 – 4 PM (setup / soundcheck)" },
  { value: "4-6pm", label: "4 – 6 PM (final prep / doors)" },
  { value: "6-8pm", label: "6 – 8 PM (show — first half)" },
  { value: "8-10pm", label: "8 – 10 PM (show — second half / strike)" },
];

const AREAS = [
  { value: "ushering", label: "Ushering / door (greet, wristbands, seating)" },
  { value: "stage_crew", label: "Stage crew (mic swaps, transitions)" },
  { value: "av_runner", label: "A/V runner (cables, batteries, gear shuttles)" },
  { value: "lobby", label: "Lobby (art install, concessions, signage)" },
  { value: "photo_video", label: "Photo / video documentation" },
  { value: "load_in", label: "Load-in / load-out muscle" },
  { value: "anywhere", label: "Anywhere you need me" },
];

export default function VolunteerForm({ eventSlug }: VolunteerFormProps) {
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
    availability: [] as string[],
    areasOfInterest: [] as string[],
    additionalNotes: "",
    createAccount: false,
  });

  const update = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggle = (field: "availability" | "areasOfInterest", value: string) =>
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    if (form.availability.length === 0) {
      setError("Pick at least one time block — even one hour helps.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`${CONVEX_URL}/api/mutation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "events:volunteerForEvent",
          args: { ...form, eventSlug },
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
        <div className="text-4xl mb-4">🙌</div>
        <h2 className="text-2xl font-bold mb-3">You're on the list!</h2>
        <p className="text-muted-foreground mb-4">
          Thanks, {form.firstName}. We'll email you with shift details and a
          briefing in advance of May 13. Day-of contact info will go out the
          week of the show.
        </p>

        {accountRequested && hasExistingAccount && (
          <div className="bg-secondary rounded-lg p-4 mt-4 text-left">
            <p className="text-sm text-secondary-foreground">
              <span className="font-medium">Welcome back!</span> We linked this
              sign-up to your existing midimaze account. Sign in at{" "}
              <a
                href="https://midimaze.com/login"
                className="text-primary hover:underline font-medium"
              >
                midimaze.com/login
              </a>{" "}
              to track your volunteer status.
            </p>
          </div>
        )}

        {accountRequested && !hasExistingAccount && (
          <div className="bg-secondary rounded-lg p-4 mt-4 text-left">
            <p className="text-sm text-secondary-foreground">
              <span className="font-medium">Account requested.</span> We'll send
              a sign-in link to <span className="font-mono">{form.email}</span>{" "}
              shortly. Once your midimaze account is set up you'll be able to
              track your volunteer shift, see other events, and access shared
              showcase resources.
            </p>
          </div>
        )}

        {!accountRequested && isSWCEmail && (
          <div className="bg-secondary rounded-lg p-4 mt-4">
            <p className="text-sm text-secondary-foreground">
              SWC student detected — you're eligible for the same
              behind-the-scenes credit and PA hours that we issue for our
              regular shows.
            </p>
          </div>
        )}
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
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Last Name *</label>
          <input
            required
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Email *</label>
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="yourname@student.swccd.edu"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Use your SWC email if you have one — it lets us link to existing student records.
        </p>
      </div>

      {/* Classes (optional) */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          What class(es) are you taking in FTMA or RA&T? (optional)
        </label>
        <input
          value={form.classes}
          onChange={(e) => update("classes", e.target.value)}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="e.g. RA&T 105, FTMA 111"
        />
      </div>

      {/* Availability */}
      <div>
        <label className="block text-sm font-medium mb-2">
          When can you be there? *
        </label>
        <p className="text-xs text-muted-foreground mb-3">
          We need help across the whole day — load-in starts at <strong className="text-foreground">12 PM</strong> and
          strike wraps around <strong className="text-foreground">10 PM</strong>. Pick every block that works for you. Even one hour helps.
        </p>
        <div className="space-y-2">
          {TIME_BLOCKS.map((block) => {
            const checked = form.availability.includes(block.value);
            return (
              <label
                key={block.value}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  checked
                    ? "bg-primary/10 border-primary/40"
                    : "bg-secondary/40 border-border hover:bg-secondary/60"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle("availability", block.value)}
                  className="accent-primary"
                />
                <span className="text-sm text-foreground">{block.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Areas of interest */}
      <div>
        <label className="block text-sm font-medium mb-2">
          What kind of work would you like to do?
        </label>
        <p className="text-xs text-muted-foreground mb-3">
          Pick what sounds good — we'll do our best to match. "Anywhere you need me"
          is a power move and very appreciated.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {AREAS.map((area) => {
            const checked = form.areasOfInterest.includes(area.value);
            return (
              <label
                key={area.value}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  checked
                    ? "bg-primary/10 border-primary/40"
                    : "bg-secondary/40 border-border hover:bg-secondary/60"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle("areasOfInterest", area.value)}
                  className="accent-primary"
                />
                <span className="text-sm text-foreground">{area.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Additional notes */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Anything else we should know?
        </label>
        <textarea
          value={form.additionalNotes}
          onChange={(e) => update("additionalNotes", e.target.value)}
          rows={3}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          placeholder="Allergies, accessibility needs, prior crew experience, friend you want to be paired with, etc."
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
            Associate this with a midimaze.com account
          </span>
          <span className="text-muted-foreground">
            Optional. We'll link this sign-up to your existing midimaze account
            (or send a sign-in link to create one) so you can track your shift
            and access showcase resources. Your sign-up still goes through
            either way.
          </span>
        </span>
      </label>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-primary text-primary-foreground font-semibold py-3 px-6 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Signing up…" : "Sign up to volunteer"}
      </button>

      <p className="text-xs text-muted-foreground text-center">
        Dress code is all black on event day. Volunteer briefing details
        come via email. Meals/snacks provided during your shift.
      </p>
    </form>
  );
}
