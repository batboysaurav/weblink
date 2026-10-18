const BASE = "/api/tmdb";

async function request(path, params = {}, signal) {
  const url = new URL(BASE, window.location.origin);

  url.searchParams.set("endpoint", path.replace(/^\/+/, ""));

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`TMDB request failed: ${response.status}`);
  }

  return response.json();
}

export async function getTrendingMovies() {
  return (await request("trending/movie/week")).results;
}

export async function getPopularMovies() {
  return (await request("movie/popular")).results;
}

export async function getTopRatedMovies() {
  return (await request("movie/top_rated")).results;
}

export async function getUpcomingMovies() {
  return (await request("movie/upcoming")).results;
}

// genreIds: "28|12" means Action OR Adventure
export async function getMoviesByGenre(genreIds) {
  return (
    await request("discover/movie", {
      with_genres: genreIds,
      sort_by: "popularity.desc",
      include_adult: "false",
    })
  ).results;
}

export async function searchMovies(query, signal) {
  return (
    await request(
      "search/movie",
      { query, include_adult: "false" },
      signal
    )
  ).results;
}

export function getMovieDetails(movieId, signal) {
  return request(`movie/${movieId}`, {}, signal);
}

export async function getMovieVideos(movieId) {
  return (await request(`movie/${movieId}/videos`)).results;
}

// Legal streaming availability per country
export async function getWatchProviders(movieId, signal) {
  return (
    await request(`movie/${movieId}/watch/providers`, {}, signal)
  ).results;
}