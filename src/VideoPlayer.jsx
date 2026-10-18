
import "./VideoPlayer.css";

export default function VideoPlayer({ movieId, title, onBack }) {
  const playerUrl = `https://vidy.st/movie/${movieId}?color=FFA500`;

  return (
    <section className="video-player-page">
      <button className="player-back-button" onClick={onBack}>
        ← Back to details
      </button>

      <h2>{title || "Now Playing"}</h2>

      <div className="video-player-frame">
        <iframe
          src={playerUrl}
          title={`Watch ${title || "movie"}`}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </section>
  );
}
