import { useState, useEffect } from 'react';
import './App.css';

import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Companies from './components/Companies';
import HowItWorks from './components/HowItWorks';
import About from './components/About';
import Contact from './components/Contact';
import AuthModal from './components/AuthModal';
import Footer from './components/Footer';
import Dashboard from './components/dashboard/Dashboard';
import Apply from './components/Apply';
import Interview from './components/Interview';
import { api } from './api';

function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="toast">
      <div className="toast-icon">✓</div>
      {message}
    </div>
  );
}

function App() {
  const currentPath = window.location.pathname;
  if (currentPath.startsWith('/apply/')) {
    const publicId = currentPath.split('/')[2];
    if (publicId) {
      return <Apply publicId={publicId} />;
    }
  }
  if (currentPath.startsWith('/interview/')) {
    const token = currentPath.split('/')[2];
    if (token) {
      return <Interview token={token} />;
    }
  }

  const [authMode, setAuthMode] = useState(null);
  const [toast, setToast] = useState(null);
  // Persist login across page refreshes
  const [user, setUser] = useState(() => localStorage.getItem('receasy_user') || null);
  const [page, setPage] = useState(() => localStorage.getItem('receasy_user') ? 'dashboard' : 'landing');

  const showToast = (msg) => setToast(msg);

  // Called by AuthModal on success — mode is 'signin' or 'signup'
  const handleAuthSuccess = (data, mode) => {
    if (mode === 'signup') {
      // Stay on landing, nudge the user to sign in
      showToast(`Account created, ${data.user_name}! Please sign in to access your dashboard.`);
      setAuthMode('signin');
    } else {
      // Sign-in: go to dashboard
      setUser(data.user_name);
      setPage('dashboard');
      setAuthMode(null);
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setPage('landing');
    showToast('You have been signed out.');
  };

  if (page === 'dashboard' && user) {
    return (
      <>
        <Dashboard user={user} onLogout={handleLogout} />
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar
        user={null}
        onSignIn={() => setAuthMode('signin')}
        onSignUp={() => setAuthMode('signup')}
        onLogout={handleLogout}
      />

      <Hero onGetStarted={() => setAuthMode('signup')} />
      <Features />
      <Companies />
      <HowItWorks />
      <About />
      <Contact onToast={showToast} />
      <Footer />

      {authMode && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onSwitch={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
          onToast={showToast}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

export default App;
