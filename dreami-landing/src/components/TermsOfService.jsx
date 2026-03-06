export default function TermsOfService() {
  return (
    <main className="legal-page" aria-labelledby="terms-heading">
      <div className="container">
        <div className="legal-content">
          <a href="#/" className="back-link">← Back to dreAmI</a>

          <h1 id="terms-heading">Terms of Service</h1>

          <div className="last-updated">
            <strong>Last updated:</strong> March 5, 2026
          </div>

          <h2>1. Acceptance</h2>
          <p>
            By downloading or using dreAmI ("the App"), you agree to these Terms of Service.
            If you do not agree, do not use the App. These terms are between you and
            LeMaNg LLC ("we", "us").
          </p>

          <h2>2. License</h2>
          <p>
            We grant you a personal, non-exclusive, non-transferable, revocable license to
            use the App on any iPhone you own or control, subject to these terms and the
            App Store Terms of Service.
          </p>
          <p>You may not:</p>
          <ul>
            <li>Copy, modify, or distribute the App or its source code</li>
            <li>Reverse engineer or attempt to extract the source code</li>
            <li>Use the App for any commercial purpose</li>
            <li>Transfer your license to another person</li>
          </ul>

          <h2>3. AI-generated content</h2>
          <p>
            dreAmI uses on-device AI models to generate dream analyses, interpretations, and
            conversational responses. This content is generated automatically and:
          </p>
          <ul>
            <li>Is for personal reflection and entertainment purposes only</li>
            <li>Does not constitute medical, psychological, or therapeutic advice</li>
            <li>May be inaccurate, incomplete, or not applicable to your situation</li>
            <li>Should not be relied upon for any important decision</li>
          </ul>
          <p>
            If you have concerns about your mental health or wellbeing, please consult a
            qualified healthcare professional.
          </p>

          <h2>4. Your content</h2>
          <p>
            All dream entries, transcripts, and recordings you create in the App remain yours.
            We have no access to this content — it is stored locally on your device and
            never transmitted to us. You are responsible for maintaining backups of content
            you wish to preserve.
          </p>

          <h2>5. Third-party AI models</h2>
          <p>
            dreAmI incorporates AI models developed by third parties:
          </p>
          <ul>
            <li>Llama 3.2 by Meta Platforms, Inc. (Meta Llama 3.2 Community License)</li>
            <li>Whisper by OpenAI (MIT License)</li>
            <li>Nomic Embed by Nomic, Inc. (Apache License 2.0)</li>
          </ul>
          <p>
            Use of these models within the App is subject to their respective licenses.
            Built with Meta Llama 3.2.
          </p>

          <h2>6. Disclaimer of warranties</h2>
          <p>
            THE APP IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. WE DISCLAIM ALL
            WARRANTIES, EXPRESS OR IMPLIED, INCLUDING FITNESS FOR A PARTICULAR PURPOSE,
            MERCHANTABILITY, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE APP WILL
            BE ERROR-FREE OR UNINTERRUPTED.
          </p>

          <h2>7. Limitation of liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, LEMANG LABS LLC SHALL NOT BE LIABLE
            FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES
            ARISING FROM YOUR USE OF THE APP.
          </p>

          <h2>8. Changes to the App or terms</h2>
          <p>
            We may update the App or these terms at any time. Continued use of the App
            after a material change constitutes acceptance of the updated terms.
          </p>

          <h2>9. Governing law</h2>
          <p>
            These terms are governed by the laws of the United States. Any disputes shall
            be resolved in a court of competent jurisdiction.
          </p>

          <h2>10. Contact</h2>
          <div className="contact-info">
            <h3>Questions?</h3>
            <p>Email us at <a href="mailto:support@lemang.llc">support@lemang.llc</a></p>
            <p>LeMaNg LLC</p>
          </div>
        </div>
      </div>
    </main>
  );
}
