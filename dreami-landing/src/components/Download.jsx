export default function Download() {
  return (
    <section id="download" className="download" aria-labelledby="download-heading">
      <div className="container">
        <div className="download-content">
          <h2 id="download-heading" className="download-title">
            Start exploring your dreams tonight.
          </h2>
          <p className="download-description">
            $0.99. No account. Your dreams stay on your phone — always.
          </p>

          <div className="download-buttons">
            <a
              href="https://apps.apple.com/us/app/ai-dreami/id6760162241"
              className="download-btn ios-btn"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download dreAmI on the App Store"
            >
              <img
                src="/download-ios.svg"
                alt="Download on the App Store"
                className="download-img"
              />
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=llc.lemang.dreami"
              className="download-btn android-btn"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Get dreAmI on Google Play"
            >
              <img
                src="/images/download-android.png"
                alt="Get it on Google Play"
                className="download-img"
              />
            </a>
          </div>

          <div className="download-info">
            <div className="info-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2" />
              </svg>
              <span>iOS &amp; Android</span>
            </div>
            <div className="info-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
              <span>~3.5 GB AI models</span>
            </div>
            <div className="info-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>$0.99 — no subscription</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
