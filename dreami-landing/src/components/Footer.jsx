import { Wordmark, LeMaNgLabs } from './Wordmark';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src="/images/icon.png" alt="dreAmI" className="logo-img" />
              <Wordmark size="1.1rem" />
            </div>
            <p className="footer-description">
              A fully private AI dream journal. All processing happens on your iPhone.
              No cloud. No account. No tracking.
            </p>
            <div className="footer-lemang">
              <span className="footer-made-by">Made by </span>
              <LeMaNgLabs size="0.9rem" />
            </div>
          </div>

          <div className="footer-links">
            <div className="footer-column">
              <h4>App</h4>
              <a href="#features" onClick={(e) => { e.preventDefault(); document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' }); }}>Features</a>
              <a href="#privacy" onClick={(e) => { e.preventDefault(); document.querySelector('#privacy')?.scrollIntoView({ behavior: 'smooth' }); }}>Privacy</a>
              <a href="#faq" onClick={(e) => { e.preventDefault(); document.querySelector('#faq')?.scrollIntoView({ behavior: 'smooth' }); }}>FAQ</a>
              <a href="#download" onClick={(e) => { e.preventDefault(); document.querySelector('#download')?.scrollIntoView({ behavior: 'smooth' }); }}>Download</a>
            </div>

            <div className="footer-column">
              <h4>Support</h4>
              <a href="mailto:support@lemang.llc">Contact Us</a>
              <a href="#/privacy">Privacy Policy</a>
              <a href="#/terms">Terms of Service</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} LeMaNg LLC. All rights reserved.</p>
          <p className="footer-attribution">Built with Meta Llama 3.2.</p>
        </div>
      </div>
    </footer>
  );
}
