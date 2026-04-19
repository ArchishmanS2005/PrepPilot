import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

function LandingWrapper() {
  const [started, setStarted] = useState(false);

  if (!started) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>PrepPilot</h1>
          <p style={styles.subtitle}>
            Track your DSA progress with analysis, suggestions, and AI help.
          </p>
          <button style={styles.button} onClick={() => setStarted(true)}>
            Get Started
          </button>
        </div>
      </div>
    );
  }

  return <App />;
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
    padding: '20px'
  },
  card: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '36px 28px',
    maxWidth: '520px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 10px 30px rgba(2, 132, 199, 0.15)'
  },
  title: {
    margin: '0 0 10px',
    fontSize: '2rem',
    color: '#0f172a'
  },
  subtitle: {
    margin: '0 0 22px',
    fontSize: '1rem',
    color: '#475569',
    lineHeight: 1.6
  },
  button: {
    background: '#0284c7',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 22px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer'
  }
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <LandingWrapper />
  </React.StrictMode>
);

reportWebVitals();