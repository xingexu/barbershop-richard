import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../services/authClient";
import "./../booking.css";

function NavBar() {
  return (
    <header className="sharp-nav gc-nav">
      <div className="sharp-logo gc-logo">
        <span className="sharp-logo-mark">G</span>
        <span className="sharp-logo-text gc-logo-text">GlickardCutz</span>
      </div>
      <nav className="sharp-nav-links gc-nav-links">
        <Link to="/#book" className="gc-nav-link">Book</Link>
        <Link to="/#upload" className="gc-nav-link">Upload</Link>
        <Link to="/#preview" className="gc-nav-link">Preview</Link>
        <Link to="/login" className="gc-nav-link">Login</Link>
      </nav>
    </header>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    // Client-side validation
    if (!email || !password) {
      setError("Please fill in all fields.");
      setLoading(false);
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    try {
      await login(email, password);
      setSuccess(true);
      
      // Show success and navigate
      setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <NavBar />
      <div style={{ 
        minHeight: "calc(100vh - 80px)", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        padding: "24px 16px"
      }}>
        <div className="sharp-card" style={{ maxWidth: "420px", width: "100%" }}>
          <div className="sharp-card-header">
            <h1>Log in to GlickardCutz</h1>
            <p>Welcome back. Sign in to continue.</p>
          </div>

          {error && <div className="sharp-alert sharp-alert-error">{error}</div>}
          {success && <div className="sharp-alert sharp-alert-success">Login successful! Redirecting...</div>}

          <form className="sharp-form" onSubmit={handleSubmit}>
            <div className="sharp-field">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="sharp-field">
              <label htmlFor="password">Password *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="sharp-primary-btn gc-primary-btn"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Continue"}
            </button>

            <p className="sharp-fine-print" style={{ textAlign: "center", marginTop: "16px" }}>
              Don't have an account?{" "}
              <Link to="/signup" style={{ color: "var(--uw-gold-primary)", textDecoration: "none" }}>
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </>
  );
}

