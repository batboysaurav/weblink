import "./App.css";
import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import IntroAnimation from "./Components/IntroAnimation";
import {
  getTrendingMovies,
  getPopularMovies,
  getTopRatedMovies,
  getUpcomingMovies,
  getMoviesByGenre,
  searchMovies,
  getMovieDetails,
  getMovieVideos,
  getWatchProviders,
} from "./tmdb";

const IMG = "https://image.tmdb.org/t/p";
const WATCH_REGION = "IN";

const GENRE_NAMES = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance",
  878: "Sci-Fi", 10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
};

const ROWS = [
  { id: "trending", title: "Trending Now", load: getTrendingMovies },
  { id: "popular", title: "Popular Movies", load: getPopularMovies },
  { id: "top-rated", title: "Top Rated", load: getTopRatedMovies },
  { id: "upcoming", title: "Upcoming", load: getUpcomingMovies },
  { id: "action", title: "Action & Adventure", load: () => getMoviesByGenre("28|12") },
  { id: "thriller", title: "Thrillers", load: () => getMoviesByGenre("53") },
  { id: "scifi", title: "Sci-Fi", load: () => getMoviesByGenre("878") },
];

const yearOf = (movie) => movie.release_date?.slice(0, 4) || "TBA";
const ratingOf = (movie) => (movie.vote_average ? movie.vote_average.toFixed(1) : "NR");
const imageUrl = (path, size) => (path ? `${IMG}/${size}${path}` : null);
const genreNames = (movie) =>
  movie.genres?.map((g) => g.name) ??
  (movie.genre_ids || []).map((id) => GENRE_NAMES[id]).filter(Boolean);
const formatRuntime = (minutes) =>
  minutes ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : null;
const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Pick the best YouTube video: official trailer > any trailer > teaser
function pickTrailer(videos) {
  const youtube = videos.filter((video) => video.site === "YouTube");
  return (
    youtube.find((v) => v.type === "Trailer" && v.official) ||
    youtube.find((v) => v.type === "Trailer") ||
    youtube.find((v) => v.type === "Teaser") ||
    null
  );
}

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function useTrailer() {
  const [key, setKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const open = useCallback(async (movieId) => {
    setMessage("");
    setLoading(true);
    try {
      const trailer = pickTrailer(await getMovieVideos(movieId));
      if (trailer) setKey(trailer.key);
      else setMessage("No trailer available for this movie.");
    } catch (err) {
      console.error("Could not load trailer:", err);
      setMessage("Could not load the trailer. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const close = useCallback(() => setKey(null), []);
  const clear = useCallback(() => setMessage(""), []);
  return { key, loading, message, open, close, clear };
}

/* ---------- Trailer modal ---------- */

function TrailerModal({ videoKey, title, onClose }) {
  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="trailer-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={`${title} trailer`}>
      <div className="trailer-modal" onClick={(event) => event.stopPropagation()}>
        <button className="trailer-close" onClick={onClose} autoFocus>
          ✕ Close
        </button>
        <div className="trailer-frame">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoKey}?autoplay=1&rel=0`}
            title={`${title} trailer`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}

/* ---------- Movie card ---------- */

const MovieCard = memo(function MovieCard({ movie, isAdded, onToggle, onOpen }) {
  const poster = imageUrl(movie.poster_path, "w342");
  return (
    <article className="movie-card">
      <button
        type="button"
        className="card-open"
        onClick={() => onOpen(movie)}
        aria-label={`${movie.title}, open details`}
      >
        <span className="card-poster">
          {poster ? (
            <img src={poster} alt="" loading="lazy" />
          ) : (
            <span className="poster-fallback">{movie.title.charAt(0)}</span>
          )}
          <span className="card-rating">★ {ratingOf(movie)}</span>
        </span>
        <span className="card-title">{movie.title}</span>
        <span className="card-meta">{yearOf(movie)}</span>
      </button>
      <button
        type="button"
        className={`card-list ${isAdded ? "added" : ""}`}
        onClick={() => onToggle(movie)}
        aria-pressed={isAdded}
        aria-label={isAdded ? `Remove ${movie.title} from My List` : `Add ${movie.title} to My List`}
      >
        {isAdded ? "✓" : "+"}
      </button>
    </article>
  );
});

/* ---------- Horizontal row ---------- */

function MovieRow({ title, movies, error, myIds, onToggle, onOpen }) {
  const scroller = useRef(null);

  function scrollRow(direction) {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({
      left: direction * el.clientWidth * 0.85,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }

  return (
    <section className="row" aria-label={title}>
      <h2 className="row-title">{title}</h2>
      {error ? (
        <p className="empty-message row-pad">Could not load this row.</p>
      ) : (
        <div className="row-wrap">
          <button className="row-arrow left" onClick={() => scrollRow(-1)} aria-label={`Scroll ${title} left`}>
            ‹
          </button>
          <div className="row-scroller" ref={scroller}>
            {movies
              ? movies.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    isAdded={myIds.has(movie.id)}
                    onToggle={onToggle}
                    onOpen={onOpen}
                  />
                ))
              : Array.from({ length: 8 }, (_, i) => (
                  <div className="movie-card skeleton" key={i} aria-hidden="true" />
                ))}
          </div>
          <button className="row-arrow right" onClick={() => scrollRow(1)} aria-label={`Scroll ${title} right`}>
            ›
          </button>
        </div>
      )}
    </section>
  );
}

/* ---------- Hero ---------- */

function Hero({ movies, onOpen }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const trailer = useTrailer();
  const count = movies.length;

  useEffect(() => {
    if (count < 2 || paused || trailer.key || prefersReducedMotion()) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 9000);
    return () => clearInterval(id);
  }, [count, paused, trailer.key]);

  if (!count) return <section className="hero hero-skeleton" aria-hidden="true" />;

  const movie = movies[index % count];
  const genres = genreNames(movie).slice(0, 3);

  function go(delta) {
    setIndex((i) => (i + delta + count) % count);
    trailer.clear();
  }

  return (
    <section
      className="hero"
      aria-roledescription="carousel"
      aria-label="Featured movies"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <img
        key={movie.id}
        className="hero-bg"
        src={imageUrl(movie.backdrop_path, "w1280")}
        alt=""
      />
      <div className="hero-shade" />

      <div className="hero-content">
        <p className="eyebrow">FEATURED · TRENDING THIS WEEK</p>
        <h1>{movie.title}</h1>
        <p className="hero-meta">
          <span>{yearOf(movie)}</span>
          <span>★ {ratingOf(movie)}</span>
          {genres.map((g) => (
            <span key={g}>{g}</span>
          ))}
        </p>
        <p className="hero-overview">{movie.overview}</p>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={() => trailer.open(movie.id)} disabled={trailer.loading}>
            {trailer.loading ? "Loading..." : "▶ Watch Trailer"}
          </button>
          <button className="btn btn-ghost" onClick={() => onOpen(movie)}>
            ⓘ More Info
          </button>
        </div>
        {trailer.message && <p className="trailer-message">{trailer.message}</p>}
      </div>

      {count > 1 && (
        <div className="hero-controls">
          <button className="hero-arrow" onClick={() => go(-1)} aria-label="Previous featured movie">‹</button>
          <div className="hero-dots">
            {movies.map((m, i) => (
              <button
                key={m.id}
                className={`hero-dot ${i === index ? "active" : ""}`}
                onClick={() => { setIndex(i); trailer.clear(); }}
                aria-label={`Show ${m.title}`}
                aria-current={i === index}
              />
            ))}
          </div>
          <button className="hero-arrow" onClick={() => go(1)} aria-label="Next featured movie">›</button>
        </div>
      )}

      {trailer.key && (
        <TrailerModal videoKey={trailer.key} title={movie.title} onClose={trailer.close} />
      )}
    </section>
  );
}

/* ---------- Where to watch (legal streaming options via TMDB / JustWatch) ---------- */

function WhereToWatch({ providers }) {
  if (providers === null) {
    return <p className="empty-message">Checking where to watch...</p>;
  }

  const region = providers[WATCH_REGION] ? WATCH_REGION : providers.US ? "US" : null;
  const data = region ? providers[region] : null;
  const groups = [
    ["Stream", data?.flatrate],
    ["Rent", data?.rent],
    ["Buy", data?.buy],
  ].filter(([, list]) => list?.length);

  if (!data || !groups.length) {
    return <p className="empty-message">No streaming information available yet for this movie.</p>;
  }

  return (
    <div className="watch-providers">
      <p className="watch-region">Availability in {region}</p>
      {groups.map(([label, list]) => (
        <div className="provider-group" key={label}>
          <span className="provider-label">{label}</span>
          <div className="provider-list">
            {list.map((p) => (
              <span className="provider" key={p.provider_id} title={p.provider_name}>
                {p.logo_path && <img src={imageUrl(p.logo_path, "w92")} alt="" loading="lazy" />}
                {p.provider_name}
              </span>
            ))}
          </div>
        </div>
      ))}
      {data.link && (
        <a className="provider-link" href={data.link} target="_blank" rel="noopener noreferrer">
          See all options ↗
        </a>
      )}
      <p className="attribution">Streaming data by JustWatch</p>
    </div>
  );
}

/* ---------- Details page ---------- */

function MovieDetails({ movie: basic, isAdded, onToggle, onClose }) {
  const [movie, setMovie] = useState(basic);
  const [status, setStatus] = useState("loading");
  const [providers, setProviders] = useState(null);
  const trailer = useTrailer();
  const [showPlayer, setShowPlayer] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    setProviders(null);

    getMovieDetails(basic.id, controller.signal)
      .then((details) => { setMovie(details); setStatus("ready"); })
      .catch((err) => {
        if (err.name !== "AbortError") { console.error(err); setStatus("error"); }
      });

    getWatchProviders(basic.id, controller.signal)
      .then(setProviders)
      .catch((err) => {
        if (err.name !== "AbortError") setProviders({});
      });

    return () => controller.abort();
  }, [basic.id]);

  useEffect(() => {
    if (trailer.key) return;
    function handleKey(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, trailer.key]);

  const poster = imageUrl(movie.poster_path, "w500");
  const backdrop = imageUrl(movie.backdrop_path, "w1280");
  const genres = genreNames(movie);
  const runtime = formatRuntime(movie.runtime);

  return (
    <>
    <IntroAnimation />
    <div className="details">


      {backdrop && (
        <div className="details-backdrop">
          <img src={backdrop} alt="" />
        </div>
      )}

      <div className="details-body">
        <button className="btn btn-ghost back-button" onClick={onClose}>
          ← Back
        </button>

        <div className="details-content">
          <div className="details-poster">
            {poster ? <img src={poster} alt={`${movie.title} poster`} /> : <span>{movie.title.charAt(0)}</span>}
          </div>

          <div className="details-info">
            <h1>{movie.title}</h1>
            {movie.tagline && <p className="tagline">{movie.tagline}</p>}

            <p className="details-meta">
              <span>{yearOf(movie)}</span>
              {runtime && <span>{runtime}</span>}
              <span>★ {ratingOf(movie)} TMDB</span>
              {movie.vote_count > 0 && <span>{movie.vote_count.toLocaleString()} votes</span>}
            </p>

            {status === "loading" && <p className="empty-message">Loading details...</p>}
            {status === "error" && (
              <p className="trailer-message">Couldn’t load full details. Showing basic info.</p>
            )}

            {genres.length > 0 && (
              <div className="details-genres">
                {genres.map((g) => (
                  <span key={g}>{g}</span>
                ))}
              </div>
            )}

            <p className="details-overview">{movie.overview || "No overview available."}</p>
            <div className="details-actions">

                <button
                className="btn btn-primary"
                onClick={() => setShowPlayer(true)}
              >
                ▶ Play Movie 😂
              </button>

                <button className="btn btn-primary" onClick={() => trailer.open(movie.id)} disabled={trailer.loading}>
                  {trailer.loading ? "Loading trailer..." : "▶ Watch Trailer"}
                </button>

                <button className="btn btn-ghost" onClick={() => onToggle(basic)} aria-pressed={isAdded}>
                  {isAdded ? "✓ In My List" : "+ Add to My List"}
                </button>


{showPlayer && (
  <div className="trailer-backdrop player-fullscreen">
    <div className="trailer-modal player-modal">
      <button
        className="trailer-close"
        onClick={() => setShowPlayer(false)}
      >
        ✕ Close
      </button>

      <div className="trailer-frame player-frame">
        <iframe
          src={`https://vidy.st/movie/${movie.id}/`}
          title={`${movie.title} parody player`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  </div>
)}
</div>
            {trailer.message && <p className="trailer-message">{trailer.message}</p>}

            <dl className="details-facts">
              {movie.release_date && (<><dt>Release date</dt><dd>{movie.release_date}</dd></>)}
              {movie.status && (<><dt>Status</dt><dd>{movie.status}</dd></>)}
              {movie.original_language && (<><dt>Language</dt><dd>{movie.original_language.toUpperCase()}</dd></>)}
            </dl>

            <h2 className="details-subtitle">Where to watch</h2>
            <WhereToWatch providers={providers} />
          </div>
        </div>
      </div>

      {trailer.key && (
        <TrailerModal videoKey={trailer.key} title={movie.title} onClose={trailer.close} />
      )}
    </div></>
  );
}

/* ---------- Search results ---------- */

function SearchResults({ query, state, searching, myIds, onToggle, onOpen }) {
  return (
    <section className="catalog search-results" aria-live="polite">
      <div className="section-heading">
        <div>
          <p className="eyebrow">SEARCH</p>
          <h2>Results for “{query}”</h2>
        </div>
        {!searching && state.status === "done" && (
          <span className="catalog-count">{state.results.length} titles</span>
        )}
      </div>

      {searching ? (
        <div className="movie-grid">
          {Array.from({ length: 10 }, (_, i) => (
            <div className="movie-card skeleton" key={i} aria-hidden="true" />
          ))}
        </div>
      ) : state.status === "error" ? (
        <p className="empty-message">Search failed. Check your connection and try again.</p>
      ) : state.results.length === 0 ? (
        <p className="empty-message">No movies found for “{query}”. Try another title.</p>
      ) : (
        <div className="movie-grid">
          {state.results.map((movie) => (
            <MovieCard key={movie.id} movie={movie} isAdded={myIds.has(movie.id)} onToggle={onToggle} onOpen={onOpen} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- Navbar ---------- */

function Navbar({ query, onQuery, active, listCount, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const items = [
    ["home", "Home"],
    ["movies", "Movies"],
    ["my-list", `My List (${listCount})`],
  ];

  return (
    <header className="navbar">
      <button className="brand" onClick={() => onNavigate("home")} aria-label="100RAB home">
        <span className="brand-mark">1</span>
        <span className="brand-name">100RAB</span>
      </button>

      <nav className={`nav-links ${menuOpen ? "open" : ""}`} aria-label="Main">
        {items.map(([id, label]) => (
          <button
            key={id}
            className={`nav-link ${active === id ? "active" : ""}`}
            aria-current={active === id ? "page" : undefined}
            onClick={() => { setMenuOpen(false); onNavigate(id); }}
          >
            {label}
          </button>
        ))}
      </nav>

      <input
        className="search-input"
        type="search"
        placeholder="Search all movies..."
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onQuery("")}
        aria-label="Search movies"
      />

      <button
        className="menu-toggle"
        onClick={() => setMenuOpen((open) => !open)}
        aria-expanded={menuOpen}
        aria-label="Toggle menu"
      >
        ☰
      </button>
    </header>
  );
}

/* ---------- App ---------- */

function App() {
  const [rows, setRows] = useState({});
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [activeNav, setActiveNav] = useState("home");
  const [query, setQuery] = useState("");
  const [searchState, setSearchState] = useState({ status: "idle", results: [] });
  const [myList, setMyList] = useState(() => {
    try {
      const saved = localStorage.getItem("100RAB-my-list");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const debouncedQuery = useDebouncedValue(query.trim(), 400);
  const searchActive = query.trim().length > 0;
  const searching = searchActive && (query.trim() !== debouncedQuery || searchState.status === "loading");

  // Load every discovery row independently so one failure doesn't break the rest
  useEffect(() => {
    let cancelled = false;
    ROWS.forEach((row) => {
      row.load()
        .then((movies) => { if (!cancelled) setRows((r) => ({ ...r, [row.id]: { movies } })); })
        .catch((err) => {
          console.error(`Could not load ${row.title}:`, err);
          if (!cancelled) setRows((r) => ({ ...r, [row.id]: { error: true } }));
        });
    });
    return () => { cancelled = true; };
  }, []);

  // Debounced full-TMDB search; aborting the previous request prevents stale results
  useEffect(() => {
    if (!debouncedQuery) {
      setSearchState({ status: "idle", results: [] });
      return;
    }
    const controller = new AbortController();
    setSearchState((s) => ({ ...s, status: "loading" }));
    searchMovies(debouncedQuery, controller.signal)
      .then((results) => setSearchState({ status: "done", results }))
      .catch((err) => {
        if (err.name !== "AbortError") setSearchState({ status: "error", results: [] });
      });
    return () => controller.abort();
  }, [debouncedQuery]);

  useEffect(() => {
    localStorage.setItem("100RAB-my-list", JSON.stringify(myList));
  }, [myList]);

  const myIds = useMemo(() => new Set(myList.map((m) => m.id)), [myList]);

  const heroMovies = useMemo(
    () => (rows.trending?.movies || []).filter((m) => m.backdrop_path).slice(0, 6),
    [rows.trending],
  );

  const toggleMyList = useCallback((movie) => {
    setMyList((current) =>
      current.some((item) => item.id === movie.id)
        ? current.filter((item) => item.id !== movie.id)
        : [...current, movie],
    );
  }, []);

  const openMovie = useCallback((movie) => {
    window.scrollTo(0, 0);
    setSelectedMovie(movie);
  }, []);

  const closeMovie = useCallback(() => setSelectedMovie(null), []);

  function navigate(section) {
    setSelectedMovie(null);
    setQuery("");
    setActiveNav(section);
    requestAnimationFrame(() => {
      if (section === "home") {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
      } else {
        document.getElementById(section)?.scrollIntoView({
          behavior: prefersReducedMotion() ? "auto" : "smooth",
        });
      }
    });
  }

  let content;
  if (selectedMovie) {
    content = (
      <MovieDetails
        key={selectedMovie.id}
        movie={selectedMovie}
        isAdded={myIds.has(selectedMovie.id)}
        onToggle={toggleMyList}
        onClose={closeMovie}
      />

      
    );
  } else if (searchActive) {
    content = (
      <SearchResults
        query={query.trim()}
        state={searchState}
        searching={searching}
        myIds={myIds}
        onToggle={toggleMyList}
        onOpen={openMovie}
      />
    );
  } else {
    content = (
      <main>
        <Hero movies={heroMovies} onOpen={openMovie} />

        <div id="movies" className="rows">
          {ROWS.map((row) => (
            <MovieRow
              key={row.id}
              title={row.title}
              movies={rows[row.id]?.movies}
              error={rows[row.id]?.error}
              myIds={myIds}
              onToggle={toggleMyList}
              onOpen={openMovie}
            />
          ))}
        </div>

        <section className="catalog" id="my-list">
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR PERSONAL COLLECTION</p>
              <h2>My List</h2>
            </div>
            <span className="catalog-count">{myList.length} titles</span>
          </div>

          {myList.length === 0 ? (
            <div className="empty-list">
              <span className="empty-list-icon">+</span>
              <p>Your list is empty.</p>
              <p className="empty-message">Tap the + on any movie to save it here.</p>
            </div>
          ) : (
            <div className="movie-grid">
              {myList.map((movie) => (
                <MovieCard key={movie.id} movie={movie} isAdded onToggle={toggleMyList} onOpen={openMovie} />
              ))}
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    
    <div className="app">
      <Navbar
        query={query}
        onQuery={setQuery}
        active={selectedMovie || searchActive ? "" : activeNav}
        listCount={myList.length}
        onNavigate={navigate}
      />
      {content}
      <footer className="footer">
        100RAB · A cinematic discovery experience built by Saurav ·
      </footer>
    </div>
  );
}

export default App;
