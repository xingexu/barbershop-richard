import React, { useState } from "react";
import { API_BASE } from "../lib/api";

export default function VideoUpload() {
  const [video, setVideo] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null); // 'uploading', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState("");

  const handleVideoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Create preview
    setVideo(URL.createObjectURL(file));
    setUploadStatus("uploading");
    setErrorMessage("");

    // Create FormData and send to backend
    const formData = new FormData();
    formData.append("video", file);

    try {
        const token = localStorage.getItem("token");
        const url = `${String(API_BASE).replace(/\/+$/, "")}/reference-video`;

        const res = await fetch(url, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
        });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setUploadStatus("success");
    } catch (err) {
      setUploadStatus("error");
      setErrorMessage(err.message || "Failed to upload video. Please try again.");
    }
  };

  return (
    <>
      <div className="sharp-card-header small">
        <h2>Upload reference video</h2>
        <p>Show Richard the style you want before you arrive.</p>
      </div>
      <label className="sharp-dropzone">
        <input
          type="file"
          accept="video/*"
          hidden
          onChange={handleVideoChange}
          disabled={uploadStatus === "uploading"}
        />
        <span className="sharp-drop-main">
          {uploadStatus === "uploading"
            ? "Uploading…"
            : video
            ? "Video selected"
            : "Drop a video here"}
        </span>
        <span className="sharp-drop-sub">or click to browse files</span>
      </label>
      {uploadStatus && (
        <div className={`sharp-upload-status ${uploadStatus}`}>
          {uploadStatus === "uploading" && "Uploading…"}
          {uploadStatus === "success" && "Uploaded for Richard to review."}
          {uploadStatus === "error" && errorMessage}
        </div>
      )}
      {video && (
        <video
          src={video}
          controls
          style={{
            width: "100%",
            marginTop: "12px",
            borderRadius: "14px",
            border: "1px solid rgba(120, 120, 120, 0.4)",
          }}
        />
      )}
    </>
  );
}
