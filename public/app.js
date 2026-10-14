const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
let allVideos = [];
let plan = [];
let currentView = "saved";
let currentFilter = "All";
let lastShuffle = false;
let toastTimer;

const escapeHtml = (str = "") => String(str).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const formatDuration = (seconds) => {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h) return `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  return `${m}:${String(sec).padStart(2,"0")}`;
};
const prettyMinutes = seconds => {
  const mins = seconds / 60;
  return Number.isInteger(mins) ? `${mins} min` : `${Math.round(mins * 10) / 10} min`;
};
const moodClass = mood => (mood || "Learn").toLowerCase();
const symbolFor = mood => ({Learn:"✳",Chill:"☼",Music:"♫"})[mood] || "✳";
const videoUrl = v => v.videoId ? `https://www.youtube.com/watch?v=${encodeURIComponent(v.videoId)}` : "#";

async function api(url, options = {}) {
  const response = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}
function toast(message) {
  const el = $("#toast");
  el.textContent = message; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}
async function loadVideos() {
  const data = await api("/api/videos?status=all");
  allVideos = data.videos;
  $("#savedCount").textContent = allVideos.filter(v => v.status !== "later").length;
  $("#laterCount").textContent = allVideos.filter(v => v.status === "later").length;
  renderLibrary();
}
async function buildPlan(shuffle = false) {
  const minutes = Number($("#minutes").value);
  const mood = $("#mood").value;
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 600) { toast("Choose between 1 and 600 minutes."); return; }
  lastShuffle = shuffle;
  try {
    const data = await api("/api/plan", { method:"POST", body:JSON.stringify({minutes,mood,shuffle}) });
    plan = data.videos;
    const title = currentView === "later" ? "Your Maybe later list" : `A good ${minutes} minutes starts here.`;
    $("#resultTitle").textContent = title;
    $("#resultSubtitle").textContent = plan.length ? `A ${mood === "Any" ? "mixed" : mood.toLowerCase()}-mood combo, picked to fit your gap.` : "No saved videos matched that time and mood.";
    $("#summaryTime").textContent = prettyMinutes(data.usedSeconds);
    $("#summaryCount").textContent = `${plan.length} ${plan.length === 1 ? "video" : "videos"}`;
    $("#planList").innerHTML = plan.map((v,i) => cardMarkup(v,i)).join("");
    $("#emptyPlan").classList.toggle("hidden", plan.length > 0);
    $("#planSummary").classList.toggle("hidden", plan.length === 0);
  } catch (e) { toast(e.message); }
}
function cardMarkup(v, index) {
  return `<article class="video-card">
    <div class="thumb ${moodClass(v.mood)}"><span class="thumb-symbol">${symbolFor(v.mood)}</span><a class="play-overlay" href="${videoUrl(v)}" target="_blank" rel="noopener" aria-label="Watch ${escapeHtml(v.title)}">▶</a><span class="duration-tag">${formatDuration(v.duration)}</span></div>
    <div class="video-meta"><span class="mood-tag ${moodClass(v.mood)}">${escapeHtml(v.mood)}</span></div>
    <h3>${escapeHtml(v.title)}</h3><div class="channel">${escapeHtml(v.channel || "Added by you")}</div>
    <div class="card-footer"><a class="watch-link" href="${videoUrl(v)}" target="_blank" rel="noopener">Watch on YouTube ↗</a><button class="icon-btn" data-later="${escapeHtml(v.id)}" title="Move to Maybe later">◷</button></div>
  </article>`;
}
function renderLibrary() {
  const query = $("#search").value.trim().toLowerCase();
  const videos = allVideos.filter(v => currentView === "later" ? v.status === "later" : v.status !== "later")
    .filter(v => currentFilter === "All" || v.mood === currentFilter)
    .filter(v => `${v.title} ${v.channel} ${v.mood}`.toLowerCase().includes(query));
  $("#libraryTitle").textContent = currentView === "later" ? "Videos you parked" : "Your saved videos";
  $("#libraryKicker").textContent = currentView === "later" ? "NO PRESSURE, JUST LATER" : "THE BACKLOG, MADE BETTER";
  $("#breadcrumbLabel").textContent = currentView === "later" ? "Maybe later" : "Watch Later";
  $("#listCount").textContent = `${videos.length} ${videos.length === 1 ? "video" : "videos"}`;
  $("#libraryList").innerHTML = videos.length ? videos.map(v => `<div class="library-row">
    <div class="row-thumb ${moodClass(v.mood)}">${symbolFor(v.mood)}</div>
    <div><div class="row-title">${escapeHtml(v.title)}</div><div class="row-channel">${escapeHtml(v.channel || "Added by you")} · <span class="mood-tag ${moodClass(v.mood)}">${escapeHtml(v.mood)}</span></div></div>
    <div class="row-duration">${formatDuration(v.duration)}</div>
    <div class="row-actions"><a class="row-action watch" href="${videoUrl(v)}" target="_blank" rel="noopener" title="Watch">▶</a><button class="row-action later" data-toggle="${escapeHtml(v.id)}" title="${v.status === "later" ? "Restore to Watch Later" : "Move to Maybe later"}">${v.status === "later" ? "↶ Restore" : "◷ Later"}</button></div>
    <div class="row-actions"><button class="row-action" data-delete="${escapeHtml(v.id)}" title="Remove video">× Remove</button></div>
  </div>`).join("") : `<div class="empty-library">${currentView === "later" ? "Nothing parked here. You can move a video here whenever you want." : "No videos found. Try another search or add a video."}</div>`;
}
async function toggleLater(id) {
  const v = allVideos.find(x => x.id === id); if (!v) return;
  const next = v.status === "later" ? "saved" : "later";
  await api(`/api/videos/${encodeURIComponent(id)}`, {method:"PATCH",body:JSON.stringify({status:next})});
  await loadVideos(); await buildPlan(lastShuffle);
  toast(next === "later" ? "Parked in Maybe later — no pressure." : "Back in Watch Later.");
}
async function deleteVideo(id) {
  await api(`/api/videos/${encodeURIComponent(id)}`, {method:"DELETE"});
  await loadVideos(); await buildPlan(lastShuffle); toast("Video removed from your list.");
}
function openModal() { $("#modalBackdrop").classList.remove("hidden"); $("#videoTitle").focus(); }
function closeModal() { $("#modalBackdrop").classList.add("hidden"); $("#addForm").reset(); $("#lookupMessage").textContent = ""; }

$("#buildPlan").addEventListener("click", () => buildPlan(false));
$("#shuffleBtn").addEventListener("click", () => buildPlan(true));
$("#tryAgain").addEventListener("click", () => { $("#minutes").focus(); $("#minutes").select(); });
$$("[data-minutes]").forEach(btn => btn.addEventListener("click", () => {
  $("#minutes").value = btn.dataset.minutes;
  $$("[data-minutes]").forEach(b => b.classList.toggle("selected", b === btn));
  buildPlan(false);
}));
$("#minutes").addEventListener("input", () => $$("[data-minutes]").forEach(b => b.classList.toggle("selected", Number(b.dataset.minutes) === Number($("#minutes").value))));
$("#mood").addEventListener("change", () => buildPlan(false));
$("#search").addEventListener("input", renderLibrary);
$$("[data-filter]").forEach(btn => btn.addEventListener("click", () => {
  currentFilter = btn.dataset.filter;
  $$("[data-filter]").forEach(b => b.classList.toggle("active", b === btn));
  renderLibrary();
}));
$$("[data-view]").forEach(btn => btn.addEventListener("click", () => {
  currentView = btn.dataset.view;
  $$("[data-view]").forEach(b => b.classList.toggle("active", b === btn));
  renderLibrary();
  if (currentView === "later") {
    $("#resultTitle").textContent = "A little space for later.";
    $("#resultSubtitle").textContent = "No guilt. These videos are still here when you want them.";
    $("#planList").innerHTML = ""; $("#planSummary").classList.add("hidden"); $("#emptyPlan").classList.add("hidden");
  } else buildPlan(false);
}));
document.addEventListener("click", async e => {
  const later = e.target.closest("[data-later]");
  const toggle = e.target.closest("[data-toggle]");
  const del = e.target.closest("[data-delete]");
  try {
    if (later) await toggleLater(later.dataset.later);
    if (toggle) await toggleLater(toggle.dataset.toggle);
    if (del) await deleteVideo(del.dataset.delete);
  } catch (err) { toast(err.message); }
});
$("#addVideoBtn").addEventListener("click", openModal);
$("#closeModal").addEventListener("click", closeModal);
$("#cancelModal").addEventListener("click", closeModal);
$("#modalBackdrop").addEventListener("click", e => { if (e.target === $("#modalBackdrop")) closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

$("#lookupBtn").addEventListener("click", async () => {
  const url = $("#videoUrl").value.trim();
  if (!url) { $("#lookupMessage").textContent = "Paste a YouTube video URL first."; return; }
  $("#lookupMessage").textContent = "Looking up video…";
  try {
    const v = await api("/api/youtube/lookup", {method:"POST",body:JSON.stringify({url})});
    $("#videoTitle").value = v.title;
    $("#videoChannel").value = v.channel;
    $("#videoDuration").value = (v.duration / 60).toFixed(2);
    $("#videoMood").value = "Learn";
    $("#lookupMessage").textContent = "Details filled in. Choose a mood and save.";
    $("#videoUrl").dataset.videoId = v.videoId;
  } catch (err) {
    $("#lookupMessage").textContent = err.message;
    const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
    if (match) $("#videoUrl").dataset.videoId = match[1];
  }
});
$("#addForm").addEventListener("submit", async e => {
  e.preventDefault();
  const url = $("#videoUrl").value.trim();
  const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
  const duration = Number($("#videoDuration").value);
  try {
    await api("/api/videos", {method:"POST",body:JSON.stringify({
      title:$("#videoTitle").value.trim(), channel:$("#videoChannel").value.trim() || "Added by you",
      duration:Math.round(duration*60), mood:$("#videoMood").value,
      videoId:$("#videoUrl").dataset.videoId || (match ? match[1] : "")
    })});
    closeModal(); await loadVideos(); await buildPlan(false); toast("Saved! Your next break just got easier.");
  } catch (err) { $("#lookupMessage").textContent = err.message; }
});

(async function init() {
  try { await loadVideos(); await buildPlan(false); }
  catch (e) { toast("Couldn't connect to the server. Try refreshing."); console.error(e); }
})();
