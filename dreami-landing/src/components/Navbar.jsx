import { useState, useEffect } from 'react';
import { Wordmark } from './Wordmark';

export default function Navbar({ legal }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e, targetId) => {
    e.preventDefault();
    setMobileOpen(false);
    const el = document.querySelector(targetId);
    if (el) {
      const navHeight = document.querySelector('.navbar').offsetHeight;
      window.scrollTo({ top: el.offsetTop - navHeight - 16, behavior: 'smooth' });
    }
  };

  return (
    <nav className={`navbar${scrolled ? ' navbar-scrolled' : ''}`}>
      <div className="container navbar-inner">
        <a href="#/" className="nav-brand">
          <img src="/images/icon.png" alt="dreAmI app icon" className="logo-img" />
          <Wordmark size="1.25rem" />
        </a>

        <button
          className="mobile-menu-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? '✕' : '☰'}
        </button>

        <div className={`nav-links${mobileOpen ? ' nav-links-open' : ''}`} role="navigation">
          {legal ? (
            <>
              <a href="#/" className="nav-link">Home</a>
              <a href="#download" className="nav-link cta-button">Download</a>
            </>
          ) : (
            <>
              <a href="#features" className="nav-link" onClick={(e) => handleNavClick(e, '#features')}>Features</a>
              <a href="#privacy" className="nav-link" onClick={(e) => handleNavClick(e, '#privacy')}>Privacy</a>
              <a href="#faq" className="nav-link" onClick={(e) => handleNavClick(e, '#faq')}>FAQ</a>
              <a href="#download" className="nav-link cta-button" onClick={(e) => handleNavClick(e, '#download')}>
                Download
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
