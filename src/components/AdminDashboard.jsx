

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "./NavBar";
import { apiFetchAdmin, ADMIN_TOKEN_KEY } from "../lib/api";

function weekdayLabel(n) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][Number(n)] ?? String(n);
}

function minutesToHHMM(mins) {
  const m = Number(mins);
  if (!Number.isFinite(m)) return "";
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function hhmmToMinutes(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function formatIntake(intake) {
  if (!intake || typeof intake !== "object") return [];

  const labels = {
    hairLength: "Hair length",
    fade: "Fade",
    topStyle: "Top",
    lineUp: "Line up",
    referenceUrl: "Reference",
    extraDetails: "Extra",
  };

  const order = ["hairLength", "fade", "topStyle", "lineUp", "referenceUrl", "extraDetails"];

  const entries = [];
  for (const k of order) {
    const v = intake[k];
    if (v == null) continue;
    const s = String(v).trim();
    if (!s) continue;
    entries.push({ key: k, label: labels[k] || k, value: s });
  }

  // include any unknown keys (stable-ish order)
  for (const [k, v] of Object.entries(intake)) {
    if (order.includes(k)) continue;
    if (v == null) continue;
    const s = String(v).trim();
    if (!s) continue;
    entries.push({ key: k, label: labels[k] || k, value: s });
  }

  return entries;
}

function truncate(s, n = 120) {
  const str = String(s || "");
  if (str.length <= n) return str;
  return `${str.slice(0, n - 1)}…`;
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const token = localStorage.getItem(ADMIN_TOKEN_KEY);

  const [tab, setTab] = useState("bookings"); // bookings | windows | blocks

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [bookings, setBookings] = useState([]);
  const [windows, setWindows] = useState([]);
  const [blocks, setBlocks] = useState([]);

  // Add window form
  const [wWeekday, setWWeekday] = useState(1);
  const [wStart, setWStart] = useState("10:00");
  const [wEnd, setWEnd] = useState("19:00");

  // Add block form
  const [bStart, setBStart] = useState("");
  const [bEnd, setBEnd] = useState("");
  const [bReason, setBReason] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/admin/login", { replace: true });
    }
  }, [token, navigate]);

  async function refreshAll() {
    setError("");
    setLoading(true);
    try {
      const [b, w, bl] = await Promise.all([
        apiFetchAdmin("/admin/bookings"),
        apiFetchAdmin("/admin/availability/windows"),
        apiFetchAdmin("/admin/availability/blocks"),
      ]);
      setBookings(Array.isArray(b) ? b : b?.bookings || []);
      setWindows(Array.isArray(w) ? w : w?.windows || []);
      setBlocks(Array.isArray(bl) ? bl : bl?.blocks || []);
    } catch (e) {
      if (e?.status === 401 || e?.status === 403) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        navigate("/admin/login", { replace: true });
        return;
      }
      setError(e?.message || "Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function logout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    navigate("/admin/login", { replace: true });
  }

  async function addWindow(e) {
    e.preventDefault();
    setError("");

    const startMin = hhmmToMinutes(wStart);
    const endMin = hhmmToMinutes(wEnd);

    if (startMin == null || endMin == null) {
      setError("Please enter valid start/end times.");
      return;
    }
    if (endMin <= startMin) {
      setError("End time must be after start time.");
      return;
    }

    setLoading(true);
    try {
      await apiFetchAdmin("/admin/availability/windows", {
        method: "POST",
        body: JSON.stringify({ weekday: Number(wWeekday), startMin, endMin }),
      });
      await refreshAll();
    } catch (error_) {
      setError(error_?.message || "Failed to add availability window.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteWindow(id) {
    if (!id) return;
    setError("");
    setLoading(true);
    try {
      await apiFetchAdmin(`/admin/availability/windows/${id}`, { method: "DELETE" });
      await refreshAll();
    } catch (e) {
      setError(e?.message || "Failed to delete window.");
    } finally {
      setLoading(false);
    }
  }

  async function addBlock(e) {
    e.preventDefault();
    setError("");

    if (!bStart || !bEnd) {
      setError("Please enter start and end for the block.");
      return;
    }

    const startTime = new Date(bStart).toISOString();
    const endTime = new Date(bEnd).toISOString();

    if (new Date(endTime) <= new Date(startTime)) {
      setError("Block end must be after block start.");
      return;
    }

    setLoading(true);
    try {
      await apiFetchAdmin("/admin/availability/blocks", {
        method: "POST",
        body: JSON.stringify({ startTime, endTime, reason: bReason || null }),
      });
      setBStart("");
      setBEnd("");
      setBReason("");
      await refreshAll();
    } catch (error_) {
      setError(error_?.message || "Failed to add block.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteBlock(id) {
    if (!id) return;
    setError("");
    setLoading(true);
    try {
      await apiFetchAdmin(`/admin/availability/blocks/${id}`, { method: "DELETE" });
      await refreshAll();
    } catch (e) {
      setError(e?.message || "Failed to delete block.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <NavBar />
      <main className="sharp-main">
        <section className="sharp-grid" style={{ gridTemplateColumns: "1fr" }}>
          <div className="sharp-card sharp-card-main" style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <h2 style={{ margin: 0 }}>Admin Dashboard</h2>
                <div style={{ opacity: 0.8, marginTop: 4 }}>Bookings + availability controls</div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button className="sharp-btn" onClick={refreshAll} disabled={loading} type="button">
                  Refresh
                </button>
                <button className="sharp-btn" onClick={logout} type="button">
                  Log out
                </button>
              </div>
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                className={tab === "bookings" ? "sharp-btn sharp-btn-primary" : "sharp-btn"}
                onClick={() => setTab("bookings")}
                type="button"
              >
                Bookings
              </button>
              <button
                className={tab === "windows" ? "sharp-btn sharp-btn-primary" : "sharp-btn"}
                onClick={() => setTab("windows")}
                type="button"
              >
                Weekly availability
              </button>
              <button
                className={tab === "blocks" ? "sharp-btn sharp-btn-primary" : "sharp-btn"}
                onClick={() => setTab("blocks")}
                type="button"
              >
                Date blocks
              </button>
            </div>

            {error && (
              <div className="sharp-alert sharp-alert-error" style={{ marginTop: 12 }}>
                {error}
              </div>
            )}

            {loading && <div style={{ marginTop: 12, opacity: 0.8 }}>Loading...</div>}

            {tab === "bookings" && (
              <div style={{ marginTop: 14 }}>
                <h3 style={{ marginTop: 0 }}>Bookings</h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left" }}>
                        <th style={{ padding: "8px 6px" }}>Date</th>
                        <th style={{ padding: "8px 6px" }}>Time</th>
                        <th style={{ padding: "8px 6px" }}>Service</th>
                        <th style={{ padding: "8px 6px" }}>Name</th>
                        <th style={{ padding: "8px 6px" }}>Email</th>
                        <th style={{ padding: "8px 6px" }}>Phone</th>
                        <th style={{ padding: "8px 6px" }}>Notes</th>
                        <th style={{ padding: "8px 6px" }}>Haircut questions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.length === 0 ? (
                        <tr>
                          <td style={{ padding: 10, opacity: 0.8 }} colSpan={8}>
                            No bookings found.
                          </td>
                        </tr>
                      ) : (
                        bookings.map((a) => (
                          <tr key={a.id} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                            <td style={{ padding: "8px 6px" }}>{a.date || a.startTime?.slice(0, 10) || ""}</td>
                            <td style={{ padding: "8px 6px" }}>{a.timeSlot || a.startTime?.slice(11, 16) || ""}</td>
                            <td style={{ padding: "8px 6px" }}>{a.serviceName || a.service?.label || ""}</td>
                            <td style={{ padding: "8px 6px" }}>{a.customerName || a.name || a.customer?.name || ""}</td>
                            <td style={{ padding: "8px 6px" }}>{a.customerEmail || a.email || a.customer?.email || ""}</td>
                            <td style={{ padding: "8px 6px" }}>{a.customerPhone || a.phone || a.customer?.phone || ""}</td>
                            <td style={{ padding: "8px 6px", opacity: 0.9 }}>{a.notes || ""}</td>
                            <td style={{ padding: "8px 6px", opacity: 0.9 }}>
                              {a.intake ? (
                                <div
                                  style={{
                                    display: "grid",
                                    gap: 6,
                                    maxWidth: 360,
                                  }}
                                >
                                  {formatIntake(a.intake).map((it) => {
                                    const isUrl = it.key === "referenceUrl" && /^https?:\/\//i.test(it.value);
                                    return (
                                      <div
                                        key={it.key}
                                        style={{
                                          display: "grid",
                                          gridTemplateColumns: "110px 1fr",
                                          gap: 8,
                                          alignItems: "start",
                                        }}
                                      >
                                        <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 700 }}>
                                          {it.label}
                                        </div>
                                        <div style={{ fontSize: 12, opacity: 0.92, wordBreak: "break-word" }}>
                                          {isUrl ? (
                                            <a
                                              href={it.value}
                                              target="_blank"
                                              rel="noreferrer"
                                              style={{ color: "var(--uw-gold-primary)", textDecoration: "none" }}
                                            >
                                              Open link
                                            </a>
                                          ) : (
                                            truncate(it.value)
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span style={{ opacity: 0.7 }}>(none)</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === "windows" && (
              <div style={{ marginTop: 14 }}>
                <h3 style={{ marginTop: 0 }}>Weekly availability windows</h3>

                <form onSubmit={addWindow} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
                  <div className="sharp-field" style={{ minWidth: 160 }}>
                    <label htmlFor="adminWWeekday">Weekday</label>
                    <select id="adminWWeekday" value={wWeekday} onChange={(e) => setWWeekday(Number(e.target.value))}>
                      <option value={0}>Sun</option>
                      <option value={1}>Mon</option>
                      <option value={2}>Tue</option>
                      <option value={3}>Wed</option>
                      <option value={4}>Thu</option>
                      <option value={5}>Fri</option>
                      <option value={6}>Sat</option>
                    </select>
                  </div>

                  <div className="sharp-field" style={{ minWidth: 160 }}>
                    <label htmlFor="adminWStart">Start</label>
                    <input id="adminWStart" type="time" value={wStart} onChange={(e) => setWStart(e.target.value)} required />
                  </div>

                  <div className="sharp-field" style={{ minWidth: 160 }}>
                    <label htmlFor="adminWEnd">End</label>
                    <input id="adminWEnd" type="time" value={wEnd} onChange={(e) => setWEnd(e.target.value)} required />
                  </div>

                  <button className="sharp-btn sharp-btn-primary" type="submit" disabled={loading}>
                    Add window
                  </button>
                </form>

                <div style={{ marginTop: 14, overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left" }}>
                        <th style={{ padding: "8px 6px" }}>Weekday</th>
                        <th style={{ padding: "8px 6px" }}>Start</th>
                        <th style={{ padding: "8px 6px" }}>End</th>
                        <th style={{ padding: "8px 6px" }} />
                      </tr>
                    </thead>
                    <tbody>
                      {windows.length === 0 ? (
                        <tr>
                          <td style={{ padding: 10, opacity: 0.8 }} colSpan={4}>
                            No windows set.
                          </td>
                        </tr>
                      ) : (
                        windows
                          .slice()
                          .sort((a, b) => a.weekday - b.weekday || a.startMin - b.startMin)
                          .map((w) => (
                            <tr key={w.id} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                              <td style={{ padding: "8px 6px" }}>{weekdayLabel(w.weekday)}</td>
                              <td style={{ padding: "8px 6px" }}>{minutesToHHMM(w.startMin)}</td>
                              <td style={{ padding: "8px 6px" }}>{minutesToHHMM(w.endMin)}</td>
                              <td style={{ padding: "8px 6px" }}>
                                <button
                                  className="sharp-btn"
                                  type="button"
                                  onClick={() => deleteWindow(w.id)}
                                  disabled={loading}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === "blocks" && (
              <div style={{ marginTop: 14 }}>
                <h3 style={{ marginTop: 0 }}>Date blocks</h3>
                <p style={{ opacity: 0.8, marginTop: 0 }}>Use blocks for vacations, days off, or one-off blackout periods.</p>

                <form onSubmit={addBlock} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
                  <div className="sharp-field" style={{ minWidth: 230 }}>
                    <label htmlFor="adminBStart">Start</label>
                    <input id="adminBStart" type="datetime-local" value={bStart} onChange={(e) => setBStart(e.target.value)} required />
                  </div>

                  <div className="sharp-field" style={{ minWidth: 230 }}>
                    <label htmlFor="adminBEnd">End</label>
                    <input id="adminBEnd" type="datetime-local" value={bEnd} onChange={(e) => setBEnd(e.target.value)} required />
                  </div>

                  <div className="sharp-field" style={{ minWidth: 240 }}>
                    <label htmlFor="adminBReason">Reason (optional)</label>
                    <input id="adminBReason" value={bReason} onChange={(e) => setBReason(e.target.value)} placeholder="Vacation / appointment / etc." />
                  </div>

                  <button className="sharp-btn sharp-btn-primary" type="submit" disabled={loading}>
                    Add block
                  </button>
                </form>

                <div style={{ marginTop: 14, overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left" }}>
                        <th style={{ padding: "8px 6px" }}>Start</th>
                        <th style={{ padding: "8px 6px" }}>End</th>
                        <th style={{ padding: "8px 6px" }}>Reason</th>
                        <th style={{ padding: "8px 6px" }} />
                      </tr>
                    </thead>
                    <tbody>
                      {blocks.length === 0 ? (
                        <tr>
                          <td style={{ padding: 10, opacity: 0.8 }} colSpan={4}>
                            No blocks set.
                          </td>
                        </tr>
                      ) : (
                        blocks
                          .slice()
                          .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
                          .map((b) => (
                            <tr key={b.id} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                              <td style={{ padding: "8px 6px" }}>{String(b.startTime).replace("T", " ").slice(0, 16)}</td>
                              <td style={{ padding: "8px 6px" }}>{String(b.endTime).replace("T", " ").slice(0, 16)}</td>
                              <td style={{ padding: "8px 6px", opacity: 0.9 }}>{b.reason || ""}</td>
                              <td style={{ padding: "8px 6px" }}>
                                <button className="sharp-btn" type="button" onClick={() => deleteBlock(b.id)} disabled={loading}>
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}