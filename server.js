const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "videos.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const seedVideos = [
  { id: "demo-1", title: "The 10-minute reset: make your desk feel new", channel: "Tiny Habits", duration: 612, mood: "Chill", videoId: "dQw4w9WgXcQ", status: "saved" },
  { id: "demo-2", title: "Python debugging tricks I wish I knew sooner", channel: "Code Corner", duration: 845, mood: "Learn", videoId: "rfscVS0vtbw", status: "saved" },
  { id: "demo-3", title: "A calm piano playlist for studying", channel: "Quiet Keys", duration: 720, mood: "Music", videoId: "jfKfPfyJRdk", status: "saved" },
  { id: "demo-4", title: "How the internet actually works", channel: "Byte Sized", duration: 1010, mood: "Learn", videoId: "x3c1ih2NJEg", status: "saved" },
  { id: "demo-5", title: "A little café ambience for your break", channel: "Window Seat", duration: 540, mood: "Chill", videoId: "lTRiunKJttI", status: "saved" },
  { id: "demo-6", title: "JavaScript in 100 seconds", channel: "Fireship", duration: 130, mood: "Learn", videoId: "DHjqpvDnNGE", status: "saved" },
  { id: "demo-7", title: "Lo-fi beats to slow down to", channel: "Soft Focus", duration: 900, mood: "Music", videoId: "jfKfPfyJRdk", status: "saved" },
  { id: "demo-8", title: "Build better habits without burning out", channel: "Good Days", duration: 685, mood: "Chill", videoId: "Wcs2PFz5q6g", status: "saved" },
  { id: "demo-9", title: "Git and GitHub explained simply", channel: "Code Corner", duration: 1180, mood: "Learn", videoId: "RGOj5yH7evk", status: "saved" },
  { id: "demo-10", title: "A playlist for a rainy afternoon", channel: "Quiet Keys", duration: 660, mood: "Music", videoId: "5qap5aO4i9A", status: "saved" },
  { id: "demo-11", title: "Make your own tiny website", channel: "Frontend Friends", duration: 780, mood: "Learn", videoId: "Q8NPQ2RgWyg", status: "saved" },
  { id: "demo-12", title: "A 7-minute breathing break", channel: "Slow Morning", duration: 420, mood: "Chill", videoId: "inpok4MKVLM", status: "saved" },
  { id: "demo-13", title: "Why game design is more than graphics", channel: "Playful Pixels", duration: 930, mood: "Learn", videoId: "G8AT01f8X30", status: "saved" },
  { id: "demo-14", title: "Soft piano covers for quiet focus", channel: "Quiet Keys", duration: 840, mood: "Music", videoId: "4xDzrJKXOOY", status: "saved" },
  { id: "demo-15", title: "A tiny room makeover on a budget", channel: "Window Seat", duration: 735, mood: "Chill", videoId: "U9YKY7fdwyg", status: "saved" },
  { id: "demo-16", title: "APIs explained with a simple example", channel: "Byte Sized", duration: 560, mood: "Learn", videoId: "GZvSYJDk-us", status: "saved" },
  { id: "demo-17", title: "One song, one quiet moment", channel: "Soft Focus", duration: 240, mood: "Music", videoId: "hHW1oY26kxQ", status: "saved" },
  { id: "demo-18", title: "A wholesome corner of the internet", channel: "Good Days", duration: 480, mood: "Chill", videoId: "2OEL4P1Rz04", status: "saved" },
  { id: "demo-19", title: "CSS layout in 12 minutes", channel: "Frontend Friends", duration: 735, mood: "Learn", videoId: "1Rs2ND1ryYc", status: "saved" },
  { id: "demo-20", title: "Music for a tiny study sprint", channel: "Quiet Keys", duration: 600, mood: "Music", videoId: "DWcJFNfaw9c", status: "saved" }
];

function ensureData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(seedVideos, null, 2));
}
function readVideos() {
  ensureData();
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch { fs.writeFileSync(DATA_FILE, JSON.stringify(seedVideos, null, 2)); return [...seedVideos]; }
}
function writeVideos(videos) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(videos, null, 2));
}
function parseDuration(iso) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return m ? Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0) : 0;
}
function videoIdFromUrl(input) {
  try {
    const url = new URL(input);
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1);
    if (url.hostname.includes("youtube.com")) {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      const parts = url.pathname.split("/");
      if (["shorts", "embed", "live"].includes(parts[1])) return parts[2];
    }
  } catch {}
  return null;
}
function makeCombo(videos, targetSeconds, mood, shuffle) {
  const eligible = videos.filter(v => v.status !== "later" && v.duration <= targetSeconds &&
    (mood === "Any" || v.mood === mood));
  if (shuffle) eligible.sort(() => Math.random() - 0.5);
  else eligible.sort((a, b) => b.duration - a.duration);

  // Bounded subset-sum DP: prefer a close fit without exceeding available time.
  const target = Math.floor(targetSeconds);
  const best = Array(target + 1).fill(null);
  best[0] = [];
  for (const video of eligible) {
    for (let t = target; t >= video.duration; t--) {
      if (best[t] === null && best[t - video.duration] !== null) {
        best[t] = [...best[t - video.duration], video.id];
      }
    }
  }
  let used = target;
  while (used > 0 && best[used] === null) used--;
  let chosenIds = best[used] || [];
  if (shuffle && chosenIds.length) {
    // Shuffle may choose another equally valid set by shuffling input order above.
    chosenIds = [...chosenIds];
  }
  const chosen = chosenIds.map(id => videos.find(v => v.id === id)).filter(Boolean);
  return { videos: chosen, usedSeconds: chosen.reduce((sum, v) => sum + v.duration, 0), availableSeconds: targetSeconds };
}

app.get("/api/health", (_req, res) => res.json({ ok: true, youtubeApiConfigured: Boolean(process.env.YOUTUBE_API_KEY) }));

app.get("/api/videos", (req, res) => {
  const status = req.query.status || "saved";
  const videos = readVideos().filter(v => status === "all" || (status === "saved" ? v.status !== "later" : v.status === status));
  res.json({ videos });
});

app.post("/api/plan", (req, res) => {
  const minutes = Number(req.body.minutes);
  const mood = ["Any", "Learn", "Chill", "Music"].includes(req.body.mood) ? req.body.mood : "Any";
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 600) {
    return res.status(400).json({ error: "Choose between 1 and 600 minutes." });
  }
  const all = readVideos();
  const combo = makeCombo(all, Math.round(minutes * 60), mood, Boolean(req.body.shuffle));
  res.json(combo);
});

app.post("/api/videos", (req, res) => {
  const title = String(req.body.title || "").trim();
  const channel = String(req.body.channel || "Added by you").trim();
  const duration = Number(req.body.duration);
  const mood = ["Learn", "Chill", "Music"].includes(req.body.mood) ? req.body.mood : "Learn";
  const videoId = String(req.body.videoId || "").trim();
  if (!title || !Number.isFinite(duration) || duration < 1 || duration > 86400) {
    return res.status(400).json({ error: "Add a title and a duration between 1 second and 24 hours." });
  }
  const videos = readVideos();
  const video = { id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title, channel, duration: Math.round(duration), mood, videoId, status: "saved" };
  videos.unshift(video);
  writeVideos(videos);
  res.status(201).json({ video });
});

app.patch("/api/videos/:id", (req, res) => {
  const videos = readVideos();
  const video = videos.find(v => v.id === req.params.id);
  if (!video) return res.status(404).json({ error: "Video not found." });
  if (req.body.status === "saved" || req.body.status === "later") video.status = req.body.status;
  writeVideos(videos);
  res.json({ video });
});

app.delete("/api/videos/:id", (req, res) => {
  const videos = readVideos();
  const next = videos.filter(v => v.id !== req.params.id);
  if (next.length === videos.length) return res.status(404).json({ error: "Video not found." });
  writeVideos(next);
  res.json({ ok: true });
});

app.post("/api/youtube/lookup", async (req, res) => {
  const url = String(req.body.url || "").trim();
  const videoId = videoIdFromUrl(url);
  if (!videoId) return res.status(400).json({ error: "That doesn't look like a YouTube video URL." });
  if (!process.env.YOUTUBE_API_KEY) {
    return res.status(501).json({ error: "YouTube API key not configured. You can still add the video manually with its duration." });
  }
  try {
    const endpoint = new URL("https://www.googleapis.com/youtube/v3/videos");
    endpoint.searchParams.set("part", "snippet,contentDetails");
    endpoint.searchParams.set("id", videoId);
    endpoint.searchParams.set("key", process.env.YOUTUBE_API_KEY);
    const response = await fetch(endpoint);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "YouTube lookup failed.");
    const item = data.items?.[0];
    if (!item) return res.status(404).json({ error: "Video not found or unavailable." });
    res.json({
      videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      duration: parseDuration(item.contentDetails.duration),
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url
    });
  } catch (error) {
    res.status(502).json({ error: error.message || "Couldn't contact YouTube." });
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => {
  ensureData();
  console.log(`Time-Boxed Watch Later running at http://localhost:${PORT}`);
});
