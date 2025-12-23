import React, { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export default function BookingForm() {
  const [barber, setBarber] = useState(null);
  const [services, setServices] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // --- Auth state ---
  const [me, setMe] = useState(null);
  const [authMode, setAuthMode] = useState("login"); // "login" | "signup"
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [form, setForm] = useState({
    serviceId: "",
    name: "",
    date: "",
    timeSlot: "",
    notes: "",
  });

  // Haircut intake (saved with appointment so you can see it in Admin)
  const [intake, setIntake] = useState({
    hairLength: "",
    fade: "",
    topStyle: "",
    lineUp: "",
    referenceUrl: "",
    extraDetails: "",
  });

  // Get today's date in YYYY-MM-DD format for min date validation
  const today = new Date().toISOString().split("T")[0];

  // Fetch barber and services on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [barberData, servicesData] = await Promise.all([
          apiFetch("/barber"),
          apiFetch("/services"),
        ]);
        setBarber(barberData);
        setServices(Array.isArray(servicesData) ? servicesData : []);
      } catch {
        setError("Failed to load barber and services. Please refresh the page.");
      }
    };

    fetchData();
  }, []);

  // Check if already logged in; if yes, auto-fill booking info
  useEffect(() => {

    const fetchMe = async () => {
      try {
        const user = await apiFetch("/auth/me");
        setMe(user);
        setForm((prev) => ({
          ...prev,
          name: user?.name || prev.name,
        }));
      } catch {
        // ignore if not logged in
      }
    };

    fetchMe();
  }, []);

  // Fetch available time slots when date and service are selected
  useEffect(() => {
    if (form.date && form.serviceId) {
      fetchAvailability();
    } else {
      setAvailableSlots([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.date, form.serviceId]);

  const fetchAvailability = async () => {
    if (!form.date || !form.serviceId) return;

    setLoading(true);
    setError("");
    try {
      const slots = await apiFetch(
        `/availability?date=${encodeURIComponent(form.date)}&serviceId=${encodeURIComponent(
          form.serviceId
        )}`
      );

      // Allow either [{startTime:...}] or ["ISO..."]
      const normalized = Array.isArray(slots)
        ? slots.map((s) =>
            typeof s === "string" ? { startTime: s } : { startTime: s?.startTime }
          )
        : [];

      setAvailableSlots(normalized.filter((s) => !!s.startTime));
    } catch {
      setError("Failed to load available time slots.");
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setError("");
    setSuccess("");

    // Reset time slot when date or service changes
    if (name === "date" || name === "serviceId") {
      setForm((prev) => ({ ...prev, timeSlot: "" }));
    }
  };

  const handleIntakeChange = (e) => {
    const { name, value } = e.target;
    setIntake((prev) => ({ ...prev, [name]: value }));
  };

  const isHaircutService = String(form.serviceId || "").startsWith("haircut");

  const formatTimeSlot = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // --- Auth handlers ---
  const handleAuthField = (e) => {
    const { name, value } = e.target;
    setAuthForm((prev) => ({ ...prev, [name]: value }));
    setAuthError("");
  };

  const applyUserToBookingForm = (user) => {
    setForm((prev) => ({
      ...prev,
      name: user?.name || prev.name,
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: authForm.email,
          password: authForm.password,
        }),
      });

      if (data?.token) localStorage.setItem("token", data.token);

      const user = await apiFetch("/auth/me");
      setMe(user);
      applyUserToBookingForm(user);

      setAuthForm({ name: "", email: "", phone: "", password: "" });
    } catch (err) {
      setAuthError(err?.message || "Login failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      const data = await apiFetch("/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          name: authForm.name,
          email: authForm.email,
          phone: authForm.phone || undefined,
          password: authForm.password,
        }),
      });

      if (data?.token) localStorage.setItem("token", data.token);

      const user = await apiFetch("/auth/me");
      setMe(user);
      applyUserToBookingForm(user);

      setAuthForm({ name: "", email: "", phone: "", password: "" });
    } catch (err) {
      setAuthError(err?.message || "Signup failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }

    localStorage.removeItem("token");
    setMe(null);
    setAuthMode("login");
    setAuthError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!form.timeSlot) {
      setError("Please select a time slot.");
      setLoading(false);
      return;
    }

    try {
      const cleanedIntake = isHaircutService
        ? Object.fromEntries(
            Object.entries(intake)
              .map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])
              .filter(([, v]) => v)
          )
        : null;

      await apiFetch("/appointments", {
        method: "POST",
        body: JSON.stringify({
          serviceId: form.serviceId,
          startTime: form.timeSlot,
          notes: form.notes || undefined,
          intake: cleanedIntake && Object.keys(cleanedIntake).length ? cleanedIntake : undefined,
        }),
      });

      setSuccess(
        `Booking confirmed! Your appointment with ${barber?.name || "Richard"} is scheduled.`
      );

      // Reset form (keep saved identity if logged in)
      setForm((prev) => ({
        serviceId: "",
        name: me ? prev.name : "",
        date: "",
        timeSlot: "",
        notes: "",
      }));

      setIntake({
        hairLength: "",
        fade: "",
        topStyle: "",
        lineUp: "",
        referenceUrl: "",
        extraDetails: "",
      });

      setAvailableSlots([]);

      // Refresh availability
      if (form.date && form.serviceId) {
        setTimeout(fetchAvailability, 1000);
      }
    } catch (err) {
      setError(err?.message || "Failed to book appointment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="sharp-card-header">
        <h1>Book with Richard</h1>
        <p>
          {barber?.bio ||
            "Precision cuts, clean fades, and a calm, one-on-one studio experience."}
        </p>
      </div>

      {error && <div className="sharp-alert sharp-alert-error">{error}</div>}
      {success && <div className="sharp-alert sharp-alert-success">{success}</div>}

      {/* AUTH BOX */}
      <div
        style={{
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 10,
          padding: 16,
          marginBottom: 16,
        }}
      >
        {me ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700 }}>Logged in as {me.name}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{me.email}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                Your info auto-fills the booking form.
              </div>
            </div>
            <button type="button" className="sharp-primary-btn" onClick={handleLogout}>
              Log out
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                className="sharp-primary-btn"
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                }}
                style={authMode === "login" ? {} : { opacity: 0.65 }}
              >
                Log in
              </button>

              <button
                type="button"
                className="sharp-primary-btn"
                onClick={() => {
                  setAuthMode("signup");
                  setAuthError("");
                }}
                style={authMode === "signup" ? {} : { opacity: 0.65 }}
              >
                Sign up
              </button>
            </div>

            {authError && (
              <div className="sharp-alert sharp-alert-error" style={{ marginBottom: 10 }}>
                {authError}
              </div>
            )}

            {authMode === "login" ? (
              <form onSubmit={handleLogin} className="sharp-form" style={{ marginTop: 0 }}>
                <div className="sharp-two-col">
                  <div className="sharp-field">
                    <label htmlFor="loginEmail">Email *</label>
                    <input
                      id="loginEmail"
                      name="email"
                      type="email"
                      value={authForm.email}
                      onChange={handleAuthField}
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                  <div className="sharp-field">
                    <label htmlFor="loginPassword">Password *</label>
                    <input
                      id="loginPassword"
                      name="password"
                      type="password"
                      value={authForm.password}
                      onChange={handleAuthField}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="sharp-primary-btn" disabled={authLoading}>
                  {authLoading ? "Logging in…" : "Log in"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="sharp-form" style={{ marginTop: 0 }}>
                <div className="sharp-field">
                  <label htmlFor="signupName">Full name *</label>
                  <input
                    id="signupName"
                    name="name"
                    type="text"
                    value={authForm.name}
                    onChange={handleAuthField}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="sharp-two-col">
                  <div className="sharp-field">
                    <label htmlFor="signupEmail">Email *</label>
                    <input
                      id="signupEmail"
                      name="email"
                      type="email"
                      value={authForm.email}
                      onChange={handleAuthField}
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                  <div className="sharp-field">
                    <label htmlFor="signupPhone">Phone</label>
                    <input
                      id="signupPhone"
                      name="phone"
                      type="tel"
                      value={authForm.phone}
                      onChange={handleAuthField}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <div className="sharp-field">
                  <label htmlFor="signupPassword">Password (min 6 chars) *</label>
                  <input
                    id="signupPassword"
                    name="password"
                    type="password"
                    value={authForm.password}
                    onChange={handleAuthField}
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                </div>

                <button type="submit" className="sharp-primary-btn" disabled={authLoading}>
                  {authLoading ? "Creating…" : "Create account"}
                </button>
              </form>
            )}

            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 10 }}>
              Make an account to auto-fill your details next time.
            </div>
          </>
        )}
      </div>

      {!me && (
        <div className="sharp-alert" style={{ marginBottom: 16 }}>
          Please <strong>log in</strong> or <strong>sign up</strong> to book an appointment.
        </div>
      )}

      {me && (
        <form className="sharp-form" onSubmit={handleSubmit}>
          <div className="sharp-field">
            <label htmlFor="serviceId">Select service *</label>
            <select
              id="serviceId"
              name="serviceId"
              value={form.serviceId}
              onChange={handleChange}
              required
            >
              <option value="">Choose a service…</option>
              {/* Keeping these IDs stable because your backend seeds them */}
              <option value="haircut">Haircut</option>
              <option value="beard-trim">Beard Trim</option>
              <option value="haircut-beard">Haircut + Beard Trim</option>
            </select>
          </div>

          <div className="sharp-two-col">
            <div className="sharp-field">
              <label htmlFor="date">Select date *</label>
              <input
                type="date"
                id="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                min={today}
                required
              />
              <span className="sharp-help">Future dates only</span>
            </div>

            {form.date && form.serviceId && (
              <div className="sharp-field">
                <label htmlFor="timeSlot">Time *</label>
                {loading ? (
                  <div className="sharp-loading-slots">Loading slots…</div>
                ) : availableSlots.length === 0 ? (
                  <div className="sharp-no-slots">No slots available</div>
                ) : (
                  <select
                    id="timeSlot"
                    name="timeSlot"
                    value={form.timeSlot}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select a slot…</option>
                    {availableSlots.map((slot, idx) => (
                      <option key={idx} value={slot.startTime}>
                        {formatTimeSlot(slot.startTime)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          <div className="sharp-field">
            <label htmlFor="name">Full name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="John Doe"
              required
              disabled={!!me}
            />
          </div>



          {isHaircutService && (
            <div
              style={{
                border: "1px solid rgba(234, 171, 0, 0.22)",
                borderRadius: 14,
                padding: 14,
                background: "rgba(0,0,0,0.25)",
              }}
            >
              <div className="sharp-card-header small" style={{ marginBottom: 10 }}>
                <h2 style={{ margin: 0 }}>Haircut questions</h2>
                <p style={{ margin: 0 }}>Quick details so Richard knows what you want before you show up.</p>
              </div>

              <div className="sharp-two-col">
                <div className="sharp-field">
                  <label htmlFor="hairLength">Current hair length</label>
                  <select id="hairLength" name="hairLength" value={intake.hairLength} onChange={handleIntakeChange}>
                    <option value="">Select…</option>
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="long">Long</option>
                  </select>
                </div>

                <div className="sharp-field">
                  <label htmlFor="fade">Fade</label>
                  <select id="fade" name="fade" value={intake.fade} onChange={handleIntakeChange}>
                    <option value="">Select…</option>
                    <option value="none">None</option>
                    <option value="low">Low</option>
                    <option value="mid">Mid</option>
                    <option value="high">High</option>
                    <option value="skin">Skin / bald</option>
                  </select>
                </div>
              </div>

              <div className="sharp-two-col">
                <div className="sharp-field">
                  <label htmlFor="topStyle">Top style</label>
                  <select id="topStyle" name="topStyle" value={intake.topStyle} onChange={handleIntakeChange}>
                    <option value="">Select…</option>
                    <option value="keep-length">Keep length</option>
                    <option value="shorter">Shorter</option>
                    <option value="texture">Texture / messy</option>
                    <option value="curly">Curly-friendly</option>
                    <option value="scissor">Scissor cut</option>
                  </select>
                </div>

                <div className="sharp-field">
                  <label htmlFor="lineUp">Line up</label>
                  <select id="lineUp" name="lineUp" value={intake.lineUp} onChange={handleIntakeChange}>
                    <option value="">Select…</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                    <option value="not-sure">Not sure</option>
                  </select>
                </div>
              </div>

              <div className="sharp-field">
                <label htmlFor="referenceUrl">Reference photo link (optional)</label>
                <input
                  id="referenceUrl"
                  name="referenceUrl"
                  type="url"
                  value={intake.referenceUrl}
                  onChange={handleIntakeChange}
                  placeholder="https://…"
                />
                <span className="sharp-help">Paste an Instagram / TikTok / Google image link if you have one.</span>
              </div>

              <div className="sharp-field">
                <label htmlFor="extraDetails">Anything else?</label>
                <textarea
                  id="extraDetails"
                  name="extraDetails"
                  value={intake.extraDetails}
                  onChange={handleIntakeChange}
                  placeholder="Low taper, keep curls on top, no razor on the sides, etc."
                  rows={3}
                />
              </div>
            </div>
          )}

          <div className="sharp-field">
            <label htmlFor="notes">Special requests</label>
            <textarea
              id="notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Skin fade, low taper, keep the curls on top…"
              rows={3}
            />
          </div>

          <button
            type="submit"
            className="sharp-primary-btn"
            disabled={loading || !form.timeSlot}
          >
            {loading ? "Booking…" : "Book appointment"}
          </button>

          <p className="sharp-fine-print">You’ll see a confirmation message after booking.</p>
        </form>
      )}
    </>
  );
}
