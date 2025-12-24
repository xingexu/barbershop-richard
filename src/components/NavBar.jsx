import React from "react";
import { Link } from "react-router-dom";

export default function NavBar() {
  return (
    <header className="sharp-nav gc-nav">
      <div className="sharp-logo gc-logo">
        <span className="sharp-logo-mark">G</span>
        <span className="sharp-logo-text gc-logo-text">GlickardCutz</span>
      </div>
      <nav className="sharp-nav-links gc-nav-links">
        <Link to="/" state={{ scrollTo: "book" }} className="gc-nav-link">
          Book
        </Link>
        <Link to="/" state={{ scrollTo: "upload" }} className="gc-nav-link">
          Upload
        </Link>
        <Link to="/" state={{ scrollTo: "preview" }} className="gc-nav-link">
          Preview
        </Link>
        <Link to="/admin/login" className="gc-nav-link" style={{ opacity: 0.65 }}>
          Admin
        </Link>
      </nav>
    </header>
  );
}