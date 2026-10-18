import React from "react";
import './WatchMovie.css'
export default function WatchMovie()  {
  

const handlePlayMovie = () => {
  const movieId = movie.id;
  const playerUrl =
    `https://vidy.st/movie/${movieId}?color=FFA500`;

  window.open(playerUrl, "_blank", "noopener,noreferrer");
};


  return (
    
<div className="movie-action-buttons">
  <button
    className="watch-trailer-button"
    onClick={handleWatchTrailer}
  >
    ▶ Watch Trailer
  </button>

  <button
    className="play-movie-button"
    onClick={handlePlayMovie}
  >
    ▶ Play Movie
  </button>
</div>

  );
}
