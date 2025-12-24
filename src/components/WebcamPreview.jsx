import React, { useRef, useState, useEffect } from "react";

export default function WebcamPreview() {
  const videoRef = useRef(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera not supported in this browser.");
      return;
    }

    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Try to play immediately
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.error("Play error:", playErr);
          // If play fails, wait for metadata
          videoRef.current.onloadedmetadata = async () => {
            try {
              await videoRef.current?.play();
            } catch (err) {
              console.error("Error playing video:", err);
              setCameraError("Error starting video playback.");
            }
          };
        }
      }
      setIsCameraOn(true);
      setCameraError(null);
    } catch (err) {
      console.error("Camera error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera permission denied. Please allow camera access and try again.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("No camera found. Please connect a camera and try again.");
      } else {
        setCameraError("Unable to access camera. Check browser permissions.");
      }
      setIsCameraOn(false);
    }
  }

  function stopCamera() {
    const video = videoRef.current;
    if (video && video.srcObject instanceof MediaStream) {
      video.srcObject.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    }
    setIsCameraOn(false);
    setCameraError(null);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <>
      <div className="sharp-card-header small">
        <h2>Live preview</h2>
        <p>Use your webcam to test angles and lighting.</p>
      </div>
      <div className="sharp-preview-box">
        <div className="sharp-preview-placeholder">
          <video
            ref={videoRef}
            className="sharp-webcam-video"
            autoPlay
            playsInline
            muted
          />
          {!isCameraOn && <span className="sharp-preview-text">Webcam preview</span>}
        </div>
        <button
          className="sharp-ghost-btn"
          onClick={isCameraOn ? stopCamera : startCamera}
        >
          {isCameraOn ? "Stop camera" : "Start camera"}
        </button>
        {cameraError && <div className="sharp-camera-error">{cameraError}</div>}
      </div>
    </>
  );
}
