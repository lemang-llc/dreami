export default function VideoSection() {
  return (
    <section className="video-section" aria-labelledby="video-heading">
      <div className="container">
        <div className="section-header">
          <h2 id="video-heading" className="section-title">See dreAmI in action</h2>
          <p className="section-description">
            Watch a full walkthrough of recording, transcription, AI analysis, and dream chat —
            all running privately on-device.
          </p>
        </div>
        <div className="video-wrapper">
          <iframe
            src="https://www.youtube.com/embed/j0eY9YM2Ps4"
            title="dreAmI demo video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}
