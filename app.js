import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC_cqrtbrgJFcZaOWB_HQOwUzh7RZ4XDj0",
  authDomain: "fortnitestreams-1b4c1.firebaseapp.com",
  projectId: "fortnitestreams-1b4c1",
  storageBucket: "fortnitestreams-1b4c1.firebasestorage.app",
  messagingSenderId: "101101720081",
  appId: "1:101101720081:web:bd56205f0312d0145997b0",
  measurementId: "G-XLWHDJXSD4",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userInfo = document.getElementById("user-info");
const userEmailDisplay = document.getElementById("user-name");
const favoriteSection = document.getElementById("favorite-streams-section");
const favoritesContainer = document.getElementById("favorite-streams");
const streamsContainer = document.getElementById("streams");
const minViewersInput = document.getElementById("min-viewers");
const minViewersValue = document.getElementById("min-viewers-value");
const creatorNameInput = document.getElementById("creator-name");
const applyFiltersBtn = document.getElementById("apply-filters-btn");

let allStreamsCache = [];
let currentUser = null;
let userFavorites = [];

// Update range UI
minViewersInput.addEventListener("input", () => {
  minViewersValue.textContent = minViewersInput.value;
});

// Login with Google
loginBtn.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    alert("Login failed: " + e.message);
  }
});

// Logout
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    signOut(auth);
  });
}

// Auth state change
onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if (user) {
    loginBtn.style.display = "none";
    userInfo.style.display = "flex";
    favoriteSection.style.display = "block";
    userEmailDisplay.textContent = user.email;

    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      await setDoc(userRef, {
        email: user.email,
        favorites: []
      });
      userFavorites = [];
    } else {
      const data = userDoc.data();
      userFavorites = data.favorites || [];
    }

    await loadCachedStreams();
  } else {
    loginBtn.style.display = "block";
    userInfo.style.display = "none";
    favoriteSection.style.display = "none";
    currentUser = null;
    userFavorites = [];
    streamsContainer.innerHTML = "";
    favoritesContainer.innerHTML = "";
  }
});

// Load streams from backend
async function loadCachedStreams() {
  try {
    const res = await fetch("https://fortnitestreams.onrender.com/cache");
    if (!res.ok) throw new Error("Failed to fetch streams");
    const streams = await res.json();
    allStreamsCache = streams;
    renderStreamsFiltered();
  } catch (e) {
    console.error("Failed to load cached streams", e);
  }
}

// Filtering + rendering
applyFiltersBtn.addEventListener("click", () => {
  renderStreamsFiltered();
});

function renderStreamsFiltered() {
  const minViewers = parseInt(minViewersInput.value) || 0;
  const creatorFilter = creatorNameInput.value.trim().toLowerCase();

  const filtered = allStreamsCache.filter((stream) => {
    const name = (stream.user_name || stream.user_login || "").toLowerCase();
    const meetsViewers = (stream.viewer_count || 0) >= minViewers;
    const matchesName = !creatorFilter || name.includes(creatorFilter);
    return meetsViewers && matchesName;
  });

  const favorites = filtered.filter((stream) =>
    userFavorites.includes(stream.user_login || stream.channel)
  );

  const others = filtered.filter(
    (stream) => !userFavorites.includes(stream.user_login || stream.channel)
  );

  favoritesContainer.innerHTML = "";
  streamsContainer.innerHTML = "";

  favorites.forEach((stream) => {
    favoritesContainer.appendChild(createStreamPreview(stream, true));
  });

  others.forEach((stream) => {
    streamsContainer.appendChild(createStreamPreview(stream, false));
  });
}

// Create a stream tile with favorite button
function createStreamPreview(stream, isFavorite = false) {
  const container = document.createElement("div");
  container.classList.add("stream-preview");

  const streamerId = stream.user_login || stream.channel || "";
  const streamerName = stream.user_name || streamerId || "Unknown Creator";

  let thumbnailUrl = stream.thumbnailUrl || "";
  if (thumbnailUrl) {
    thumbnailUrl = thumbnailUrl.replace("{width}", "320").replace("{height}", "180");
  } else {
    thumbnailUrl = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${streamerId}-320x180.jpg`;
  }

  const img = document.createElement("img");
  img.src = thumbnailUrl;
  img.alt = `Preview of ${streamerName}`;
  img.loading = "lazy";

  const nameOverlay = document.createElement("div");
  nameOverlay.className = "stream-name-overlay";
  nameOverlay.textContent = streamerName;

  const favBtn = document.createElement("button");
  favBtn.className = "fav-btn";
  favBtn.textContent = isFavorite ? "★ Unfavorite" : "☆ Favorite";

  favBtn.onclick = async (e) => {
    e.stopPropagation();
    if (!currentUser) return;

    const uid = currentUser.uid;
    const userRef = doc(db, "users", uid);
    const newFavorites = [...userFavorites];

    if (isFavorite) {
      const index = newFavorites.indexOf(streamerId);
      if (index > -1) newFavorites.splice(index, 1);
    } else {
      if (!newFavorites.includes(streamerId)) newFavorites.push(streamerId);
    }

    userFavorites = newFavorites;
    await updateDoc(userRef, { favorites: newFavorites });
    renderStreamsFiltered();
  };

  container.appendChild(img);
  container.appendChild(nameOverlay);
  if (currentUser) container.appendChild(favBtn);

  container.addEventListener("click", () => {
    const iframe = document.createElement("iframe");
    if (stream.embedUrl && stream.embedUrl.includes("player.twitch.tv")) {
      const parent = window.location.hostname;
      let cleanUrl = stream.embedUrl.replace(/([&?])parent=[^&]+/, "");
      cleanUrl += cleanUrl.includes("?") ? `&parent=${parent}` : `?parent=${parent}`;
      iframe.src = cleanUrl;
    } else {
      iframe.src = stream.embedUrl || "";
    }
    iframe.allowFullscreen = true;
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("scrolling", "no");
    iframe.setAttribute("allow", "autoplay; fullscreen; picture-in-picture");
    iframe.width = "320";
    iframe.height = "180";

    container.innerHTML = "";
    container.appendChild(iframe);
  });

  return container;
}

// Initial load (for guests)
loadCachedStreams();
