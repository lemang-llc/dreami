import { Wordmark } from './Wordmark';

const handleScroll = (e, targetId) => {
  e.preventDefault();
  const el = document.querySelector(targetId);
  if (el) {
    const navHeight = document.querySelector('.navbar').offsetHeight;
    window.scrollTo({ top: el.offsetTop - navHeight - 16, behavior: 'smooth' });
  }
};

export default function Hero() {
  return (
    <section className="hero" aria-label="Hero">
      <div className="container">
        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-wordmark">
              <Wordmark size="4rem" />
            </div>
            <h1 className="hero-title">Your dreams stay yours.</h1>
            <p className="hero-description">
              Speak your dream the moment you wake. dreAmI transcribes, interprets, and
              remembers — entirely on your device. No cloud. No account. No one reads
              your dreams but you.
            </p>
            <div className="hero-buttons">
              <a
                href="https://play.google.com/store/apps/details?id=llc.lemang.dreami"
                className="btn btn-primary"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Get dreAmI on Google Play"
              >
                Get it on Google Play
              </a>
              <a
                href="#features"
                className="btn btn-secondary"
                onClick={(e) => handleScroll(e, '#features')}
              >
                See how it works
              </a>
            </div>
            <div className="hero-badges">
              <span className="badge">Android</span>
              <span className="badge">$0.99</span>
              <span className="badge">On-device AI</span>
            </div>
          </div>

          <div className="hero-image" aria-hidden="true">
            <div className="phone-glow" />
            <div className="phone-mockup">
              <img
                src="/images/screenshot-hero.png"
                alt="dreAmI app showing the dream timeline and AI analysis"
                className="app-screenshot"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AppStoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}
