const API_KEY = "0c7387ed17fe3d2959530a2f0ca70022";
const API_URL = "https://api.themoviedb.org/3";
const IMAGE_URL_POSTER = "https://image.tmdb.org/t/p/w500";

/* =========================
   OPTIONAL PROXY (OFF)
========================= */
const USE_PROXY = false;

function proxy(url) {
  if (!USE_PROXY) return url;
  return `/proxy?url=${encodeURIComponent(url)}`;
}

/* =========================
   YOUTUBE / TWITCH
========================= */
const YOUTUBE_SEARCH_URL = "/api/youtube/search/";
const YOUTUBE_SCRAPE_URL = "/worker/watch/yt/dl/360pS/";
const TWITCH_ACTIVE_STREAMS_URL = "/worker/watch/ttv/active";
const TWITCH_GET_STREAM_URL = "/worker/watch/ttv/get/";
const TWITCH_PROXY_URL = "/worker/watch/ttv/proxy?url=";

const MOVIE_API_BASE = "";

const PHONETIC = [
  "Alpha","Bravo","Charlie","Delta","Echo","Foxtrot","Golf","Hotel",
  "India","Juliett","Kilo","Lima","Mike","November","Oscar","Papa",
  "Quebec","Romeo","Sierra","Tango","Uniform","Victor","Whiskey",
  "X-ray","Yankee","Zulu",
];

/* =========================
   HELPERS
========================= */

function capitalize(str) {
  return !str
    ? ""
    : str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

/* 🔥 FIX: universal YouTube ID extractor */
function getYouTubeId(item) {
  return (
    item.videoId ||
    item.id?.videoId ||
    item.id ||
    null
  );
}

/* =========================
   STATE
========================= */

let currentSource = "movie";
let currentFilter = "popularity.desc";
let currentQuery = "";

let currentFetchId = 0;
let currentPage = 1;
let totalPages = 1;
let isFetching = false;

/* =========================
   DOM
========================= */

const grid = document.getElementById("grid");
const input = document.querySelector(".search-bar input");
const noResultsMessage = document.querySelector(".no-results-message");

/* =========================
   SOURCE SWITCH UI
========================= */

function syncSourceUI() {
  input.placeholder = `Search ${currentSource}...`;
}

/* =========================
   FETCH ENTRY
========================= */

async function fetchData() {
  currentFetchId++;
  const fetchId = currentFetchId;

  grid.innerHTML = "";

  if (currentSource === "youtube") {
    await fetchYoutube(fetchId);
  } else if (currentSource === "twitch") {
    await fetchTwitch(fetchId);
  } else {
    await fetchTMDB(fetchId);
  }
}

/* =========================
   TMDB
========================= */

async function fetchTMDB(fetchId) {
  const params = new URLSearchParams({
    api_key: API_KEY,
    page: currentPage,
  });

  let endpoint = "";

  if (currentQuery) {
    endpoint = `/search/${currentSource}`;
    params.append("query", currentQuery);
  } else {
    endpoint = `/discover/${currentSource}`;
    params.append("sort_by", currentFilter);
  }

  const res = await fetch(`${API_URL}${endpoint}?${params}`);
  const data = await res.json();

  if (fetchId !== currentFetchId) return;

  renderItems(data.results || []);
}

/* =========================
   YOUTUBE (FIXED)
========================= */

async function fetchYoutube(fetchId) {
  if (!currentQuery) return;

  const res = await fetch(
    `${YOUTUBE_SEARCH_URL}${encodeURIComponent(currentQuery)}?max=20`
  );

  const json = await res.json();

  if (fetchId !== currentFetchId) return;

  const formatted = (json.items || [])
    .map(item => {
      const videoId = getYouTubeId(item);
      if (!videoId) return null;

      return {
        ...item,
        videoId,
        media_type: "youtube",
        uploaderName: item.author?.name || "",
      };
    })
    .filter(Boolean);

  renderItems(formatted);
}

/* =========================
   TWITCH
========================= */

async function fetchTwitch(fetchId) {
  const res = await fetch(TWITCH_ACTIVE_STREAMS_URL);
  const data = await res.json();

  if (fetchId !== currentFetchId) return;

  const formatted = data.map(item => ({
    ...item,
    media_type: "twitch",
    channel_name: item.url.split("/").pop(),
  }));

  renderItems(formatted);
}

/* =========================
   RENDER
========================= */

function renderItems(items) {
  if (!items.length) {
    noResultsMessage.style.display = "block";
    return;
  }

  const frag = document.createDocumentFragment();

  items.forEach(item => {
    const card = document.createElement("div");

    const type = item.media_type || currentSource;

    let title = "";
    let cover = "";

    if (type === "youtube") {
      if (!item.videoId) return; // 🔥 FIX CRASH

      title = item.title;
      cover = item.thumbnail;

      card.className = "card youtube-card";
      card.dataset.id = item.videoId;

      card.innerHTML = `
        <div class="yt-thumb"></div>
        <div class="yt-info">
          <div class="yt-title">${title}</div>
          <div class="yt-channel">${item.uploaderName || ""}</div>
        </div>
      `;

      card.onclick = () => playMedia("youtube", item.videoId, title);
    }

    else if (type === "movie" || type === "tv") {
      title = item.title || item.name;
      cover = item.poster_path
        ? `${IMAGE_URL_POSTER}${item.poster_path}`
        : "";

      card.className = "card media-card";
      card.dataset.id = item.id;

      card.innerHTML = `<div class="card-name">${title}</div>`;
    }

    frag.appendChild(card);
  });

  grid.appendChild(frag);
}

/* =========================
   PLAYER (MINIMAL)
========================= */

function playMedia(type, id, title) {
  console.log("Play:", type, id, title);
}

/* =========================
   INIT
========================= */

syncSourceUI();
fetchData();
