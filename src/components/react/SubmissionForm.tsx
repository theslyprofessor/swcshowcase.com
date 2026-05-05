import { useState } from "react";

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
    title: "",
    description: "",
    genre: "",
    estimatedLength: "",
    mediaLinks: "",
    equipmentNeeds: "",
    timingPreference: "no_preference" as "earlier" | "later" | "no_preference",
    additionalNotes: "",
    createAccount: false,
  });

  const update = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${CONVEX_URL}/api/mutation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "events:submitToEvent",
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
              submission at <span className="font-medium">midimaze.com/showcase/my-submission</span>.
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

      {/* Classes */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          What class(es) are you taking in FTMA or RA&T?
        </label>
        <input
          value={form.classes}
          onChange={(e) => update("classes", e.target.value)}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="e.g. RA&T 105, FTMA 111"
        />
      </div>

      {/* Title */}
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

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Description *
        </label>
        <textarea
          required
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={4}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          placeholder="Tell us about your work — what's it about, what inspired it, what should the audience know going in? Plain language is fine, no need to be polished."
        />
      </div>

      {/* Genre + Length */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Genre / Format</label>
          <input
            value={form.genre}
            onChange={(e) => update("genre", e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g. Hip-hop beat set, Film score, Live band"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Estimated Length</label>
          <input
            value={form.estimatedLength}
            onChange={(e) => update("estimatedLength", e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g. 5 minutes, 10-15 minutes"
          />
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

      {/* Donation note */}
      <div className="bg-secondary/50 rounded-lg p-4 text-sm text-muted-foreground border border-border">
        <p className="font-medium text-foreground mb-1">Door admission</p>
        <p>
          Free for current Southwestern College students with Student ID.
          $10 suggested donation for general public at the door — supports
          the Recording Arts &amp; Technology trust account.
        </p>
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
