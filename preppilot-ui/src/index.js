import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import LandingPage from './LandingPage';
import reportWebVitals from './reportWebVitals';

function RootView() {
  const [started, setStarted] = useState(false);

  if (!started) {
    return <LandingPage onGetStarted={() => setStarted(true)} />;
  }

  return <App />;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RootView />
  </React.StrictMode>
);

reportWebVitals();