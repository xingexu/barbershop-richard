import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "./NavBar";
import { apiFetch, ADMIN_TOKEN_KEY } from "../lib/api";

export default function AdminLoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiFetch("/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const token = data?.token || data?.adminToken || data?.jwt;
      if (!token) throw new Error("Login succeeded but no token was returned by the server.");

      localStorage.setItem(ADMIN_TOKEN_KEY, token);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <NavBar />
      <main className="sharp-main">
        <section className="sharp-grid" style={{ gridTemplateColumns: "1fr" }}>
          <div className="sharp-card sharp-card-main" style={{ maxWidth: 780, margin: "0 auto" }}>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>Admin Login</h2>
            <p style={{ opacity: 0.8, marginTop: 0 }}>
              This page is for you only. Log in to view bookings and manage availability.
            </p>

            {error ? <div className="sharp-alert sharp-alert-error">{error}</div> : null}

            <form onSubmit={onSubmit} className="sharp-form" style={{ marginTop: 0 }}>
              <div className="sharp-two-col">
                <div className="sharp-field">
                  <label htmlFor="adminEmail">Email</label>
                  <input
                    id="adminEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>

                <div className="sharp-field">
                  <label htmlFor="adminPassword">Password</label>
                  <input
                    id="adminPassword"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="sharp-primary-btn" style={{ width: "100%" }} disabled={loading}>
                {loading ? "Logging in…" : "Log in"}
              </button>

              <div style={{ marginTop: 10, opacity: 0.8, fontSize: 12 }}>
                Tip: once logged in, you’ll stay logged in on this device until you log out.
              </div>
            </form>
          </div>
        </section>
      </main>
    </>
  );
}
