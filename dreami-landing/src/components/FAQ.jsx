import { useState } from 'react';

const faqs = [
  {
    q: 'What is dreAmI?',
    a: 'dreAmI is a private AI dream journal for iPhone. You speak your dream aloud after waking and the app transcribes it, generates an AI interpretation, and lets you chat with an AI dream guide — all running locally on your device with no internet required.',
  },
  {
    q: 'Does dreAmI use the cloud or send my data anywhere?',
    a: 'No. dreAmI runs three AI models entirely on your iPhone — Llama 3.2 for analysis and chat, Whisper for transcription, and Nomic Embed for semantic search. Your dreams, voice recordings, and conversations never leave your device.',
  },
  {
    q: 'What AI models does dreAmI use?',
    a: 'dreAmI uses Meta\'s Llama 3.2 1B Instruct for dream analysis and conversation, OpenAI\'s Whisper for voice-to-text transcription, and Nomic Embed for semantic dream search. All models run on-device via Apple\'s Neural Engine. Built with Meta Llama 3.2.',
  },
  {
    q: 'How much storage does dreAmI need?',
    a: 'The app itself is small, but the three AI models total approximately 3.5 GB and are downloaded once over Wi-Fi when you first launch the app. Your dream entries and recordings are stored separately and can be managed from the Settings screen.',
  },
  {
    q: 'What iPhone models are supported?',
    a: 'dreAmI requires iOS 16 or later. For the best performance with the on-device AI models, an iPhone with Apple\'s Neural Engine (iPhone XS or later) is recommended. The increased memory entitlement allows the LLM to run smoothly on supported hardware.',
  },
  {
    q: 'Is dreAmI available for Android or iPad?',
    a: 'dreAmI is currently iPhone-only. An Android version is coming soon. There are no plans for an iPad version at this time.',
  },
  {
    q: 'How does the voice conversation mode work?',
    a: 'Tap the headphones button to enter hands-free mode. dreAmI listens for your voice, automatically stops when you pause, transcribes what you said, generates a response, and speaks it back — creating a natural back-and-forth conversation about your dreams without touching your phone.',
  },
  {
    q: 'Can I edit my dream after transcription?',
    a: 'Yes. After transcription you are shown the full transcript and can edit any part of it before saving. You can also edit saved dreams at any time from the dream detail screen.',
  },
  {
    q: 'Who makes dreAmI?',
    a: 'dreAmI is made by LeMaNg LLC, an independent software studio. You can reach us at support@lemang.llc.',
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item${open ? ' faq-item-open' : ''}`}>
      <button
        className="faq-question"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>{q}</span>
        <span className="faq-chevron" aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && <p className="faq-answer">{a}</p>}
    </div>
  );
}

export default function FAQ() {
  return (
    <section id="faq" className="faq-section" aria-labelledby="faq-heading">
      <div className="container">
        <div className="section-header">
          <h2 id="faq-heading" className="section-title">Frequently asked questions</h2>
        </div>
        <div className="faq-list" role="list">
          {faqs.map((item) => (
            <FAQItem key={item.q} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}
