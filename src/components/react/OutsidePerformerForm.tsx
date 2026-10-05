import { useState } from "react";

const CONVEX_URL = "https://amiable-moose-236.convex.cloud";

interface OutsidePerformerFormProps {
  eventSlug: string;
  /** Deadline shown in the intro copy, e.g. "Friday, September 18". */
  deadline?: string;
}

interface Guest {
  key: number;
  actTitle: string;
  legalFirstName: string;
  legalLastName: string;
  email: string;
  phone: string;
  mailingStreet: string;
  mailingUnit: string;
  mailingCity: string;
  mailingState: string;
  mailingZip: string;
  scopeOfWork: string;
  role: string;
  notes: string;
}

let nextKey = 1;

function emptyGuest(): Guest {
  return {
    key: nextKey++,
    actTitle: "",
    legalFirstName: "",
    legalLastName: "",
    email: "",
    phone: "",
    mailingStreet: "",
    mailingUnit: "",
    mailingCity: "",
    mailingState: "CA",
    mailingZip: "",
    scopeOfWork: "",
    role: "",
    notes: "",
  };
}

const inputClass =
  "w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary";

export default function OutsidePerformerForm({
  eventSlug,
  deadline = "as soon as you know who they are",
}: OutsidePerformerFormProps) {
  const [submittedByName, setSubmittedByName] = useState("");
  const [submittedByEmail, setSubmittedByEmail] = useState("");
  const [guests, setGuests] = useState<Guest[]>([emptyGuest()]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState<string[]>([]);

  const updateGuest = (key: number, field: keyof Guest, value: string) =>
    setGuests((prev) =>
      prev.map((g) => (g.key === key ? { ...g, [field]: value } : g)),
    );

  const addGuest = () => setGuests((prev) => [...prev, emptyGuest()]);

  const removeGuest = (key: number) =>
    setGuests((prev) =>
      prev.length === 1 ? prev : prev.filter((g) => g.key !== key),
    );

  const submitOne = async (guest: Guest) => {
    // Optional fields must be omitted rather than sent empty: the Convex args
    // validator is strict and an empty string is not the same as absent.
    const args: Record<string, unknown> = {
      eventSlug,
      submittedByName: submittedByName.trim(),
      submittedByEmail: submittedByEmail.trim(),
      legalFirstName: guest.legalFirstName.trim(),
      legalLastName: guest.legalLastName.trim(),
      email: guest.email.trim(),
      phone: guest.phone.trim(),
      mailingStreet: guest.mailingStreet.trim(),
      mailingCity: guest.mailingCity.trim(),
      mailingState: guest.mailingState.trim(),
      mailingZip: guest.mailingZip.trim(),
      scopeOfWork: guest.scopeOfWork.trim(),
    };
    for (const field of ["actTitle", "mailingUnit", "role", "notes"] as const) {
      const val = guest[field].trim();
      if (val) args[field] = val;
    }

    const res = await fetch(`${CONVEX_URL}/api/mutation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "events:registerOutsidePerformer",
        args,
        format: "json",
      }),
    });
    return await res.json();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const thin = guests.find((g) => g.scopeOfWork.trim().length < 15);
    if (thin) {
      setError(
        `Scope of work for ${thin.legalFirstName || "one of the guests"} needs a bit more detail — one sentence describing what they will do.`,
      );
      return;
    }

    setSubmitting(true);
    const succeeded: string[] = [];
    const failed: string[] = [];

    try {
      // Sequential rather than parallel so a mid-list failure leaves a clear
      // boundary: everything before it is saved, everything after is not.
      for (const guest of guests) {
        const name =
          `${guest.legalFirstName} ${guest.legalLastName}`.trim() || "Unnamed";
        try {
          const data = await submitOne(guest);
          if (data.status === "error") {
            failed.push(`${name} (${data.errorMessage || "rejected"})`);
          } else {
            succeeded.push(name);
          }
        } catch {
          failed.push(`${name} (network error)`);
        }
      }

      if (succeeded.length > 0) {
        setRegistered((prev) => [...prev, ...succeeded]);
        // Drop the ones that saved; keep any that failed so they can be fixed.
        setGuests((prev) => {
          const keep = prev.filter((g) =>
            failed.some((f) =>
              f.startsWith(`${g.legalFirstName} ${g.legalLastName}`.trim()),
            ),
          );
          return keep.length > 0 ? keep : [emptyGuest()];
        });
      }

      if (failed.length > 0) {
        setError(
          `Could not register: ${failed.join(", ")}. Everything else was saved — fix these and submit again.`,
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const guestLabel = (index: number) =>
    guests.length === 1 ? "Guest performer" : `Guest performer ${index + 1}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {registered.length > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5">
          <p className="font-semibold text-emerald-300 mb-2">
            {registered.length === 1
              ? "Guest performer registered"
              : `${registered.length} guest performers registered`}
          </p>
          <ul className="text-sm text-emerald-200/90 space-y-1 mb-3">
            {registered.map((n, i) => (
              <li key={`${n}-${i}`}>• {n}</li>
            ))}
          </ul>
          <p className="text-sm text-emerald-200/80">
            A confirmation went to{" "}
            <span className="font-mono">{submittedByEmail}</span>. You can add
            more below if you need to.
          </p>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <p className="text-sm text-foreground leading-relaxed">
          Anyone performing who is <strong>not a currently enrolled SWC
          student</strong> has to be registered with the district before they can
          appear. The district sends each guest a release of liability waiver
          to sign, and needs five specific things to do that, which is what
          this form collects.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Fill in your details once, then add every guest in your act before
          submitting. Register them{" "}
          <strong className="text-foreground">{deadline}</strong>. The waiver
          goes to each guest directly. If your act is all SWC students, you do
          not need this form at all.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ---- Submitter: entered once ---- */}
        <fieldset className="space-y-4">
          <legend className="text-xs uppercase tracking-wider text-primary font-semibold mb-1">
            About you
          </legend>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Your name *</label>
              <input
                required
                value={submittedByName}
                onChange={(e) => setSubmittedByName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Your SWC email *</label>
              <input
                required
                type="email"
                value={submittedByEmail}
                onChange={(e) => setSubmittedByEmail(e.target.value)}
                className={inputClass}
                placeholder="yourname@student.swccd.edu"
              />
            </div>
          </div>
        </fieldset>

        {/* ---- One block per guest ---- */}
        {guests.map((guest, index) => (
          <fieldset
            key={guest.key}
            className="space-y-4 border border-border rounded-xl p-5 bg-secondary/20"
          >
            <div className="flex items-center justify-between">
              <legend className="text-xs uppercase tracking-wider text-primary font-semibold">
                {guestLabel(index)}
              </legend>
              {guests.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeGuest(guest.key)}
                  className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Legal first name *</label>
                <input
                  required
                  value={guest.legalFirstName}
                  onChange={(e) => updateGuest(guest.key, "legalFirstName", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Legal last name *</label>
                <input
                  required
                  value={guest.legalLastName}
                  onChange={(e) => updateGuest(guest.key, "legalLastName", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Use the name as it appears on their ID. The waiver has to match it.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Their email *</label>
                <input
                  required
                  type="email"
                  value={guest.email}
                  onChange={(e) => updateGuest(guest.key, "email", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Their phone *</label>
                <input
                  required
                  type="tel"
                  value={guest.phone}
                  onChange={(e) => updateGuest(guest.key, "phone", e.target.value)}
                  className={inputClass}
                  placeholder="(619) 555-0134"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  What do they play or do?
                </label>
                <input
                  value={guest.role}
                  onChange={(e) => updateGuest(guest.key, "role", e.target.value)}
                  className={inputClass}
                  placeholder="Bassist, guest vocalist, DP…"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Which piece or set?
                </label>
                <input
                  value={guest.actTitle}
                  onChange={(e) => updateGuest(guest.key, "actTitle", e.target.value)}
                  className={inputClass}
                  placeholder="Title of your submission"
                />
              </div>
            </div>

            {/* Mailing address */}
            <div className="pt-2">
              <p className="text-sm font-medium mb-1">Their mailing address *</p>
              <p className="text-xs text-muted-foreground mb-3">
                Required by the district for the waiver. Only faculty
                and the Performing Arts Coordinator can see it.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Street address *</label>
                  <input
                    required
                    value={guest.mailingStreet}
                    onChange={(e) => updateGuest(guest.key, "mailingStreet", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Apt / Unit</label>
                  <input
                    value={guest.mailingUnit}
                    onChange={(e) => updateGuest(guest.key, "mailingUnit", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1.5">City *</label>
                  <input
                    required
                    value={guest.mailingCity}
                    onChange={(e) => updateGuest(guest.key, "mailingCity", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">State *</label>
                  <input
                    required
                    value={guest.mailingState}
                    onChange={(e) => updateGuest(guest.key, "mailingState", e.target.value)}
                    className={inputClass}
                    maxLength={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">ZIP *</label>
                  <input
                    required
                    value={guest.mailingZip}
                    onChange={(e) => updateGuest(guest.key, "mailingZip", e.target.value)}
                    className={inputClass}
                    inputMode="numeric"
                  />
                </div>
              </div>
            </div>

            {/* Scope of work */}
            <div className="pt-2">
              <label className="block text-sm font-medium mb-1.5">
                What are they expected to do? *
              </label>
              <textarea
                required
                rows={3}
                value={guest.scopeOfWork}
                onChange={(e) => updateGuest(guest.key, "scopeOfWork", e.target.value)}
                className={`${inputClass} resize-y`}
                placeholder="Example: Perform bass guitar on two songs during the RA&T showcase, attend one rehearsal and the day-of soundcheck."
              />
              <p className="text-xs text-muted-foreground mt-1">
                One or two sentences. This goes to the district, so describe
                the actual responsibilities, including rehearsals and soundcheck.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Anything else we should know?
              </label>
              <textarea
                rows={2}
                value={guest.notes}
                onChange={(e) => updateGuest(guest.key, "notes", e.target.value)}
                className={`${inputClass} resize-y`}
                placeholder="Scheduling constraints, accessibility needs, prior SWC involvement…"
              />
            </div>
          </fieldset>
        ))}

        <button
          type="button"
          onClick={addGuest}
          className="w-full border-2 border-dashed border-border rounded-lg py-3 px-6 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
        >
          + Add another guest performer
        </button>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary text-primary-foreground font-semibold py-3 px-6 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? "Submitting…"
            : guests.length === 1
              ? "Register this guest performer"
              : `Register ${guests.length} guest performers`}
        </button>

        <p className="text-xs text-muted-foreground text-center">
          Questions? Email info@swcshowcase.com and it reaches Prof. Tiruviluamala.
        </p>
      </form>
    </div>
  );
}
