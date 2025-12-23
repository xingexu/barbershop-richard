import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

export default function SignupPage() {
  const nav = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const data = await apiFetch("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, phone, password }),
      });

      localStorage.setItem("token", data.token);
      nav("/", { replace: true });
    } catch (err) {
      setError(err?.message || "Signup failed");
    }
  }

  return (
    <div
      className="sharp-card sharp-card-main"
      style={{ maxWidth: 520, margin: "40px auto" }}
    >
      <h2 style={{ marginTop: 0 }}>Sign up</h2>

      {error ? (
        <div style={{ marginBottom: 12, color: "#ffb4b4" }}>{error}</div>
      ) : null}

      <form onSubmit={onSubmit} className="sharp-form">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required />

        <label style={{ marginTop: 10 }}>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />

        <label style={{ marginTop: 10 }}>Phone (optional)</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} />

        <label style={{ marginTop: 10 }}>Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
        />

        <button className="gc-btn" type="submit" style={{ marginTop: 14 }}>
          Create account
        </button>
      </form>

      <p style={{ marginTop: 12 }}>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}