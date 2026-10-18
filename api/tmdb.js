const BASE = "https://api.themoviedb.org/3";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.TMDB_ACCESS_TOKEN;

  if (!token) {
    return res.status(500).json({ error: "TMDB server configuration missing" });
  }

  const endpoint = req.query.endpoint;

  // Allow only the TMDB endpoints used by 100RAB.
  const allowed =
    endpoint === "trending/movie/week" ||
    ["movie/popular", "movie/top_rated", "movie/upcoming",
      "discover/movie", "search/movie"].includes(endpoint) ||
    /^movie\/\d+(\/videos|\/watch\/providers)?$/.test(endpoint || "");

  if (!allowed) {
    return res.status(400).json({ error: "Unsupported TMDB endpoint" });
  }

  const url = new URL(`${BASE}/${endpoint}`);

  for (const [key, value] of Object.entries(req.query)) {
    if (key !== "endpoint" && typeof value === "string") {
      url.searchParams.set(key, value);
    }
  }

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        accept: "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("TMDB API error:", response.status);
      return res.status(response.status).json({
        error: "TMDB request failed",
      });
    }

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json(data);
  } catch (error) {
    console.error("TMDB proxy error:", error.message);
    return res.status(502).json({ error: "TMDB service unavailable" });
  }
}