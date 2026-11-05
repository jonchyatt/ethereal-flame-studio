export function ProgramCards() {
  return (
    <div className="two-grid">
      <article className="card program-card">
        <div className="card-content">
          <p className="eyebrow">In preparation</p>
          <h2>Advanced hypnosis sessions</h2>
          <p>Sessions are being recorded.</p>
          <a
            className="text-link program-explore"
            href="/programs/advanced-hypnosis-sessions"
          >
            Explore the program →
          </a>
        </div>
      </article>
      <article className="card program-card">
        <div className="card-content">
          <p className="eyebrow">A belief you choose</p>
          <h2>Belief Lock-In</h2>
          <p>
            A guided process for exploring and strengthening a belief you
            choose.
          </p>
          <img
            className="program-art"
            src="/brand/carving/05.png"
            alt="The original carved mark; decorative art, not a program preview"
            width="2048"
            height="1026"
          />
          <p className="status">Not for sale yet; get told when it opens</p>
          <p>
            Leave your email on the program page and you will be told when it
            opens, or try a free appreciation moment now.
          </p>
          <a className="button" href="/programs/belief-lock-in">
            Explore the program →
          </a>
        </div>
      </article>
    </div>
  );
}
