export default function PrivacyPolicy() {
  return (
    <main className="legal-page" aria-labelledby="privacy-policy-heading">
      <div className="container">
        <div className="legal-content">
          <a href="#/" className="back-link">← Back to dreAmI</a>

          <h1 id="privacy-policy-heading">Privacy Policy</h1>

          <div className="last-updated">
            <strong>Last updated:</strong> March 5, 2026
          </div>

          <div className="legal-highlight">
            <p>
              <strong>The short version:</strong> dreAmI collects no personal data.
              All AI processing happens on your device. Nothing you record, write, or say
              ever leaves your device.
            </p>
          </div>

          <h2>1. Who we are</h2>
          <p>
            dreAmI is developed and published by LeMaNg LLC ("we", "us", "our").
            You can reach us at <a href="mailto:support@lemang.llc">support@lemang.llc</a>.
          </p>

          <h2>2. Information we collect</h2>
          <p>
            <strong>We collect no personal information.</strong> dreAmI does not collect,
            store, transmit, or share any data about you or your use of the app.
          </p>
          <p>
            Specifically, dreAmI does <strong>not</strong>:
          </p>
          <ul>
            <li>Require account creation or sign-in</li>
            <li>Collect your name, email address, or any contact information</li>
            <li>Record, transmit, or store your voice recordings on any server</li>
            <li>Send your dream transcripts or journal entries to any external service</li>
            <li>Use analytics SDKs, crash reporters, or advertising networks</li>
            <li>Track your location</li>
            <li>Use cookies or device identifiers for tracking purposes</li>
          </ul>

          <h2>3. Data stored on your device</h2>
          <p>
            All data created in dreAmI — including dream transcripts, AI-generated analyses,
            voice recordings, and chat history — is stored locally in a SQLite database on
            your device. This data is:
          </p>
          <ul>
            <li>Never transmitted to our servers or any third-party service</li>
            <li>Protected by the standard app sandboxing on your device</li>
            <li>Permanently deleted when you delete the app</li>
          </ul>
          <p>
            You can delete audio recordings at any time from Settings → Storage.
            Dream entries can be deleted individually from the dream detail screen.
          </p>

          <h2>4. AI models and on-device processing</h2>
          <p>
            dreAmI uses three AI models that run entirely on your device:
          </p>
          <ul>
            <li><strong>Llama 3.2 1B</strong> (Meta) — dream analysis and conversation</li>
            <li><strong>Whisper</strong> (OpenAI) — voice transcription</li>
            <li><strong>Nomic Embed</strong> (Nomic) — semantic search</li>
          </ul>
          <p>
            These models are downloaded to your device during onboarding and operate
            entirely offline. No prompts, transcripts, or responses are sent to Meta, OpenAI,
            Nomic, or any other party.
          </p>

          <h2>5. Microphone access</h2>
          <p>
            dreAmI requests microphone access to record your spoken dreams and voice inputs.
            Audio is processed immediately on-device by the Whisper model and is not stored
            as an audio file unless you choose to keep it. You can delete all saved audio
            files from Settings at any time.
          </p>

          <h2>6. Notification permissions</h2>
          <p>
            dreAmI optionally sends a daily local notification to remind you to record your
            dreams. This notification is scheduled and delivered entirely on your device by
            Android. No notification data is sent to our servers.
          </p>

          <h2>7. Third-party services</h2>
          <p>
            dreAmI does not integrate with any third-party analytics, advertising, or data
            collection services. The only network requests the app makes are the one-time
            downloads of the AI model files from our hosting infrastructure during onboarding.
          </p>

          <h2>8. Children's privacy</h2>
          <p>
            dreAmI does not collect any personal information from anyone, including children
            under the age of 13. The app is rated 4+ on the App Store.
          </p>

          <h2>9. Changes to this policy</h2>
          <p>
            If we ever change our privacy practices in a material way, we will update this
            policy and update the app. We will never introduce data collection without
            prominently disclosing it.
          </p>

          <h2>10. Contact</h2>
          <div className="contact-info">
            <h3>Questions about this policy?</h3>
            <p>Email us at <a href="mailto:support@lemang.llc">support@lemang.llc</a></p>
            <p>LeMaNg LLC</p>
          </div>
        </div>
      </div>
    </main>
  );
}
