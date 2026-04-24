import { Briefcase, Globe, MessageCircle, Share2, AtSign } from 'lucide-react';

export default function Footer() {
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <div className="footer-logo">
            <div className="footer-logo-icon"><Briefcase size={16} /></div>
            RecEasy
          </div>
          <p>
            The AI-powered recruitment platform that helps companies of all sizes
            hire the right people faster and smarter.
          </p>
          <div className="footer-social">
            {[Globe, MessageCircle, Share2, AtSign].map((Icon, i) => (
              <button key={i} className="social-btn"><Icon size={15} /></button>
            ))}
          </div>
        </div>

        <div className="footer-col">
          <h4>Product</h4>
          <ul>
            <li><a href="#features" onClick={e => { e.preventDefault(); scrollTo('features'); }}>Features</a></li>
            <li><a href="#how-it-works" onClick={e => { e.preventDefault(); scrollTo('how-it-works'); }}>How It Works</a></li>
            <li><a href="#companies" onClick={e => { e.preventDefault(); scrollTo('companies'); }}>Companies</a></li>
            <li><a href="#">Pricing</a></li>
            <li><a href="#">Changelog</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Company</h4>
          <ul>
            <li><a href="#about" onClick={e => { e.preventDefault(); scrollTo('about'); }}>About Us</a></li>
            <li><a href="#">Blog</a></li>
            <li><a href="#">Careers</a></li>
            <li><a href="#">Press</a></li>
            <li><a href="#contact" onClick={e => { e.preventDefault(); scrollTo('contact'); }}>Contact</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Support</h4>
          <ul>
            <li><a href="#">Help Center</a></li>
            <li><a href="#">API Docs</a></li>
            <li><a href="#">Status</a></li>
            <li><a href="#">Community</a></li>
            <li><a href="#">Security</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 RecEasy, Inc. All rights reserved.</p>
        <div className="footer-bottom-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Cookie Policy</a>
        </div>
      </div>
    </footer>
  );
}
