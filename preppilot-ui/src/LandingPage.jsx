import React from "react";
import "./LandingPage.css";

const LANDING_VIDEO_URL =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/liquid-metal-video_yX6NvjdW-6bLYorR3Ihmlwjivg3pjA978qrSKRU.mp4";

export default function LandingPage({ onGetStarted }) {
  return (
    <section className="landing-shell">
      <video
        className="landing-video"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      >
        <source src={LANDING_VIDEO_URL} type="video/mp4" />
      </video>

      <div className="landing-overlay" />

      <div className="landing-card">
        <p className="landing-kicker">PrepPilot</p>
        <h1 className="landing-title">Transform Your DSA Practice Into Daily Progress</h1>
        <p className="landing-subtitle">
          Track problems, discover weak topics, and get smart suggestions in one clean workspace.
        </p>

        <button type="button" className="landing-button" onClick={onGetStarted}>
          Get Started
        </button>
      </div>
    </section>
  );
}
