const ALLOWED_ORIGIN = process.env.APP_ORIGIN;

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const origin = req.headers.origin;

  if (ALLOWED_ORIGIN && origin && origin !== ALLOWED_ORIGIN) {
    return res.status(403).json({ error: "Origin not allowed" });
  }

  const movieId = Number(req.query.movieId);

  if (!Number.isSafeInteger(movieId) || movieId <= 0) {
    return res.status(400).json({ error: "Invalid movie ID" });
  }

  // Generate the playback URL on the server, not in React.
  const playbackUrl = `https://vidy.st/movie/${movieId}?color=FFA500&autoplay=true`;

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ playbackUrl });
}