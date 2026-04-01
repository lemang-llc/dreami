const features = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="9" y="2" width="6" height="11" rx="3" />
        <path d="M5 10a7 7 0 0 0 14 0" />
        <line x1="12" y1="17" x2="12" y2="21" />
        <line x1="8" y1="21" x2="16" y2="21" />
      </svg>
    ),
    title: 'Voice Recording',
    description:
      'Tap Record and speak while your dream is still fresh. Whisper AI transcribes your words on-device with high accuracy. Review and edit before saving.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10Z" />
      </svg>
    ),
    title: 'AI Analysis',
    description:
      'Once saved, dreAmI generates a rich interpretation — themes, symbols, emotional tone — powered by Llama 3.2 running entirely on your device.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
        <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      </svg>
    ),
    title: 'Voice Conversations',
    description:
      'Switch to hands-free mode and dreAmI listens, responds, and speaks back automatically — a natural back-and-forth about your inner world.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <line x1="16.5" y1="16.5" x2="22" y2="22" strokeWidth="1.75" />
      </svg>
    ),
    title: 'Semantic Search',
    description:
      'Find any dream by keyword, or let semantic search surface dreams by theme or feeling — even when you can\'t remember the exact words you used.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: 'Dream Chat',
    description:
      'Ask anything about a dream or your full history. What does water mean? Are there recurring patterns? dreAmI understands your entire journal.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: 'Dream Timeline',
    description:
      'Browse your journal filtered by mood — vivid, peaceful, anxious, strange, dark, joyful — or narrow to the past week or month to spot patterns.',
  },
];

export default function Features() {
  return (
    <section id="features" className="features" aria-labelledby="features-heading">
      <div className="container">
        <div className="section-header">
          <h2 id="features-heading" className="section-title">Everything you need to understand your dreams</h2>
          <p className="section-description">
            Three on-device AI models work together to transcribe, analyse, and help you explore
            your dream world — with zero data leaving your device.
          </p>
        </div>
        <div className="features-grid">
          {features.map((f) => (
            <article className="feature-card" key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-description">{f.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
