const pillars = [
  {
    label: 'No cloud',
    detail: 'All AI inference runs on your iPhone. Nothing is sent to a server.',
  },
  {
    label: 'No account',
    detail: 'No sign-up, no email, no password. Open the app and start.',
  },
  {
    label: 'No tracking',
    detail: 'No analytics, no crash reporters, no ad SDKs of any kind.',
  },
  {
    label: 'No subscription',
    detail: 'dreAmI is a one-time $0.99 purchase. No subscription, no hidden costs.',
  },
];

const models = [
  { name: 'Llama 3.2 1B', role: 'Dream analysis & conversation', by: 'Meta' },
  { name: 'Whisper', role: 'Voice transcription', by: 'OpenAI' },
  { name: 'Nomic Embed', role: 'Semantic search', by: 'Nomic' },
];

export default function PrivacySection() {
  return (
    <section id="privacy" className="privacy-section" aria-labelledby="privacy-heading">
      <div className="container">
        <div className="section-header">
          <h2 id="privacy-heading" className="section-title">Private by design — not by policy</h2>
          <p className="section-description">
            Most AI apps send your data to the cloud. dreAmI is architecturally
            incapable of doing that. The AI lives on your phone.
          </p>
        </div>

        <div className="privacy-pillars">
          {pillars.map((p) => (
            <div className="privacy-pillar" key={p.label}>
              <div className="pillar-check" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <strong className="pillar-label">{p.label}</strong>
                <span className="pillar-detail"> — {p.detail}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="models-card">
          <h3 className="models-title">Three AI models. All on your device.</h3>
          <div className="models-list">
            {models.map((m) => (
              <div className="model-row" key={m.name}>
                <div className="model-dot" aria-hidden="true" />
                <div className="model-info">
                  <span className="model-name">{m.name}</span>
                  <span className="model-role"> — {m.role}</span>
                </div>
                <span className="model-by">by {m.by}</span>
              </div>
            ))}
          </div>
          <p className="models-note">
            Models are downloaded once to your device (~3.5 GB) over Wi-Fi.
            No internet connection is required after setup.
            Built with Meta Llama 3.2.
          </p>
        </div>
      </div>
    </section>
  );
}
