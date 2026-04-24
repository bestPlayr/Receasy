import { useState, useEffect } from 'react';
import { Briefcase, Menu, X } from 'lucide-react';

export default function Navbar({ onSignIn, onSignUp }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <>
      <nav className={`navbar${scrolled ? ' scrolled' : ''}`}>
        <div className="navbar-logo">
          <div className="navbar-logo-icon">
            <Briefcase size={18} />
          </div>
          RecEasy
        </div>

        <ul className="navbar-links">
          <li><a href="#features" onClick={e => { e.preventDefault(); scrollTo('features'); }}>Features</a></li>
          <li><a href="#how-it-works" onClick={e => { e.preventDefault(); scrollTo('how-it-works'); }}>How It Works</a></li>
          <li><a href="#about" onClick={e => { e.preventDefault(); scrollTo('about'); }}>About Us</a></li>
          <li><a href="#companies" onClick={e => { e.preventDefault(); scrollTo('companies'); }}>Companies</a></li>
          <li><a href="#contact" onClick={e => { e.preventDefault(); scrollTo('contact'); }}>Contact</a></li>
        </ul>

        <div className="navbar-actions">
          <button className="btn-signin" onClick={onSignIn}>Sign In</button>
          <button className="btn-signup" onClick={onSignUp}>Get Started</button>
          <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div style={{
          position: 'fixed', top: 70, left: 0, right: 0, zIndex: 999,
          background: 'white', borderBottom: '1px solid var(--blue-100)',
          padding: '16px 5%', display: 'flex', flexDirection: 'column', gap: 14,
          boxShadow: '0 8px 30px rgba(14,165,233,0.1)'
        }}>
          {['features', 'how-it-works', 'about', 'companies', 'contact'].map(id => (
            <a key={id} href={`#${id}`}
              onClick={e => { e.preventDefault(); scrollTo(id); }}
              style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--gray-700)', textTransform: 'capitalize' }}>
              {id.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </a>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button className="btn-signin" style={{ flex: 1 }} onClick={() => { onSignIn(); setMenuOpen(false); }}>Sign In</button>
            <button className="btn-signup" style={{ flex: 1 }} onClick={() => { onSignUp(); setMenuOpen(false); }}>Get Started</button>
          </div>
        </div>
      )}
    </>
  );
}
