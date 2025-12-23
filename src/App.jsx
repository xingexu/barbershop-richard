import React, { useEffect } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import BookingForm from "./components/BookingForm";
import VideoUpload from "./components/VideoUpload";
import WebcamPreview from "./components/WebcamPreview";
import SignupPage from "./components/SignupPage";
import NavBar from "./components/NavBar";
import AdminLoginPage from "./components/AdminLoginPage";
import AdminDashboard from "./components/AdminDashboard";
import "./booking.css";

function HomePage() {
  const location = useLocation();

  useEffect(() => {
    const id = location.state && location.state.scrollTo;
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location]);

  return (
    <>
      <NavBar />
      <main className="sharp-main">
        <section id="book" className="sharp-grid">
          <div className="sharp-card sharp-card-main">
            <BookingForm />
          </div>

          <div className="sharp-side-column">
            <div id="upload" className="sharp-card">
              <VideoUpload />
            </div>
            <div id="preview" className="sharp-card">
              <WebcamPreview />
            </div>
          </div>
        </section>
      </main>
      <footer className="sharp-footer">
        <span>© 2025 GlickardCutz · Richard</span>
        <span>Built in Waterloo colours</span>
      </footer>
    </>
  );
}

export default function App() {
  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 8,
          left: 8,
          zIndex: 9999,
          padding: "6px 10px",
          borderRadius: 8,
          background: "#ffe600",
          color: "#111",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          fontSize: 12,
        }}
      >
        Live build loaded
      </div>
      <div className="sharp-root gc-root">
        <div className="sharp-marble gc-marble">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </>
  );
}