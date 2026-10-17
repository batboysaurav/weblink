import "./App.css";
import { useState, useEffect } from "react";
import { getPopularMovies, getMovieDetails } from "./tmdb";

const GENRES = {
  "Sci-Fi": 878,
  Thriller: 53,
  Action: 28,
  Adventure: 12,
};

const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

function MovieDetails({ movie, loading, onClose }) {
  const hours = Math.floor(movie.runtime / 60);
  const minutes = movie.runtime % 60;

  return (
    <div className="details-overlay">
      <div className="details-panel">
        <button className="back-button" onClick={onClose}>
          ← Back
        </button>

        <div className="details-content">
          <div className="details-poster">
            {movie.poster_path ? (
              <img
                src={`${IMAGE_BASE}${movie.poster_path}`}
                alt={`${movie.title} poster`}
              />
            ) : (
              <span>{movie.title.charAt(0)}</span>
            )}
          </div>

          <div className="details-info">
            <h2>{movie.title}</h2>

            <p className="details-meta">
              {movie.release_date || "Release date unknown"}
              {" · "}
              {movie.vote_average?.toFixed(1) ?? "N/A"} TMDB
              {movie.runtime ? ` · ${hours}h ${minutes}m` : ""}
            </p>

            {loading ? (
              <p className="empty-message">Loading details...</p>
            ) : (
              <div className="details-genres">
                {movie.genres?.map((genre) => (
                  <span key={genre.id}>{genre.name}</span>
                ))}
              </div>
            )}

            <p className="details-overview">
              {movie.overview || "No overview available."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MovieCard({ movie, isAdded, onToggle, onOpen}) {
  return (
    <article
  className="movie-card"
  onClick={() => onOpen(movie)}
  role="button"
  tabIndex={0}
  onKeyDown={(event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(movie);
    }
  }}
>
      <div className="movie-poster">
        {movie.poster_path ? (
          <img
            src={`${IMAGE_BASE}${movie.poster_path}`}
            alt={`${movie.title} poster`}
          />
        ) : (
          <span>{movie.title.charAt(0)}</span>
        )}
      </div>

      <h3>{movie.title}</h3>
      <p>
        {movie.release_date?.slice(0, 4) || "Year unknown"}
        {" · "}
        {movie.vote_average?.toFixed(1) ?? "N/A"} IMDB
      </p>

      <button
  className="list-button"
  onClick={(event) => {
    event.stopPropagation();
    onToggle(movie);
  }}
>
  {isAdded ? "✓ Added to My List" : "+ Add to My List"}
</button>
    </article>
  );
}

function App() {


  const [selectedMovie, setSelectedMovie] = useState(null);
const [detailsLoading, setDetailsLoading] = useState(false);

  const [tmdbMovies, setTmdbMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [search, setSearch] = useState("");
  const [myList, setMyList] = useState(() => {
    try {
      const saved = localStorage.getItem("webline-my-list");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    async function loadMovies() {
      try {
        const results = await getPopularMovies();
        setTmdbMovies(results);
      } catch (err) {
        console.error("Could not load movies:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadMovies();
  }, []);

  useEffect(() => {
    localStorage.setItem("webline-my-list", JSON.stringify(myList));
  }, [myList]);

  function toggleMyList(movie) {
    setMyList((current) =>
      current.some((item) => item.id === movie.id)
        ? current.filter((item) => item.id !== movie.id)
        : [...current, movie],
    );
  }

  function closeMovieDetails() {
  setSelectedMovie(null);
}

  async function openMovieDetails(movie) {
  setSelectedMovie(movie);
  setDetailsLoading(true);
     console.log("openMovieDetails called:", movie.title);

  try {
    const details = await getMovieDetails(movie.id);
    setSelectedMovie((current) =>
  current && current.id === details.id ? details : current,
);
  } catch (error) {
    console.error("Could not load movie details:", error);
  } finally {
    setDetailsLoading(false);
  }
}

  const filteredMovies = tmdbMovies.filter((movie) => {
    const matchesSearch = movie.title
      .toLowerCase()
      .includes(search.trim().toLowerCase());

    const matchesGenre =
      selectedGenre === "All" ||
      movie.genre_ids?.includes(GENRES[selectedGenre]);

    return matchesSearch && matchesGenre;
  });

  return (
    <div className="app">
      <nav className="navbar">
        <input
          className="search-input"
          type="search"
          placeholder="Search movies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search movies"
        />
        <a className="brand" href="#home">
          100RAB
        </a>
        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#movies">Movies</a>
          <a href="#my-list">My List ({myList.length})</a>
        </div>
        <span className="profile">W</span>
      </nav>

      <main>
        <section className="hero" id="home">
          <p className="eyebrow">YOUR NEXT OBSESSION STARTS HERE</p>
          <h1>Stories worth staying up for.</h1>
          <p className="hero-description">
            Discover your next favourite movie, all in one place.
          </p>
          <a className="hero-button" href="#movies">
            Explore movies →
          </a>
        </section>

        <section className="catalog" id="movies">
          <div className="section-heading">
            <div>
              <p className="eyebrow">HANDPICKED FOR YOU</p>
              <h2>Popular picks</h2>
            </div>
            <span className="catalog-count">{filteredMovies.length} titles</span>
          </div>

          <div className="genre-filters">
            {["All", ...Object.keys(GENRES)].map((genre) => (
              <button
                key={genre}
                className={`genre-button ${selectedGenre === genre ? "active" : ""}`}
                onClick={() => setSelectedGenre(genre)}
              >
                {genre}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="empty-message">Loading movies...</p>
          ) : error ? (
            <p className="empty-message">
              Could not load movies ({error}). Check your TMDB token in .env.
            </p>
          ) : filteredMovies.length > 0 ? (
            <div className="movie-grid">
              {filteredMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  isAdded={myList.some((item) => item.id === movie.id)}
                  onToggle={toggleMyList}
                  onOpen={openMovieDetails}
                  
                />
              ))}
            </div>
          ) : (
            <p className="empty-message">
              No movies found. Try another title or genre.
            </p>
          )}
        </section>

        <section className="catalog" id="my-list">
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR PERSONAL COLLECTION</p>
              <h2>My List</h2>
            </div>
            <span className="catalog-count">{myList.length} titles</span>
          </div>

          {myList.length === 0 ? (
            <p className="empty-message">
              Your list is empty. Add a movie you want to watch!
            </p>
          ) : (
            <div className="movie-grid">
              {myList.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  isAdded
                  onToggle={toggleMyList}
                  onOpen={openMovieDetails}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        100RAB · A cinematic discovery experience build by Saurav 
      </footer>

      {selectedMovie && (
  <MovieDetails
    movie={selectedMovie}
    loading={detailsLoading}
    onClose={closeMovieDetails}
  />
)}
    </div>
  );
}

export default App;
