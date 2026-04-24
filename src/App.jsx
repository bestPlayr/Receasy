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
  const [authMode, setAuthMode] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => setToast(msg);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar
        onSignIn={() => setAuthMode('signin')}
        onSignUp={() => setAuthMode('signup')}
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
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

export default App;
