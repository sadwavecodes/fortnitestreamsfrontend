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
const streamsContainer = document.getElementById("streams");
const minViewersInput = document.getElementById("min-viewers");
const minViewersValue = document.getElementById("min-viewers-value");
const creatorNameInput = document.getElementById("creator-name");
const applyFiltersBtn = document.getElementById("apply-filters-btn");

let allStreamsCache = [];
let currentUser = null;

minViewersInput.addEventListener("input", () => {
  minViewersValue.textContent = minViewersInput.value;
});

loginBtn.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    alert("Login failed: " + e.message);
  }
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    signOut(auth);
  });
}

userEmailDisplay.addEventListener("click", async () => {
  if (!currentUser) return;

  const userRef = doc(db, "users", currentUser.uid);
  const userDoc = await getDoc(userRef);
  const data = userDoc.exists() ? userDoc.data() : {};
  const history = data.watchHistory || {};

  const sorted = Object.entries(history)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const content = sorted.length
    ? sorted.map(([name, count]) => `${name}: ${count} views`).join("\n")
    : "No streamers watched yet.";

  alert("Top 5 Most Watched Streamers:\n\n" + content);
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if (user) {
    loginBtn.style.display = "none";
    userInfo.style.display = "flex";
    userEmailDisplay.textContent = user.email;

    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        email: user.email,
        watchHistory: {},
      });
    }

    await loadCachedStreams();
  } else {
    loginBtn.style.display = "block";
    userInfo.style.display = "none";
    currentUser = null;
    streamsContainer.innerHTML = "";
    allStreamsCache = [];
  }
});

applyFiltersBtn.addEventListener("click", () => {
  renderStreamsFiltered();
});

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

function renderStreamsFiltered() {
  const minViewers = parseInt(minViewersInput.value) || 0;
  const creatorFilter = creatorNameInput.value.trim().toLowerCase();

  const filtered = allStreamsCache.filter((stream) => {
    const name = (stream.user_name || stream.user_login || "").toLowerCase();
    return (
      (stream.viewer_count || 0) >= minViewers &&
      (!creatorFilter || name.includes(creatorFilter))
    );
  });

  streamsContainer.innerHTML = "";
  filtered.forEach((stream) => {
    streamsContainer.appendChild(createStreamPreview(stream));
  });
}

function createStreamPreview(stream) {
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

  container.appendChild(img);
  container.appendChild(nameOverlay);

  container.addEventListener("click", async () => {
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
    
    iframe.style.width = "100%";
iframe.style.height = "100%";
iframe.style.border = "none";
iframe.style.display = "block";

    container.innerHTML = "";
    container.appendChild(iframe);

    if (currentUser) {
      const userRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userRef);
      const data = userDoc.exists() ? userDoc.data() : {};
      const history = data.watchHistory || {};
      const key = streamerName;
      history[key] = (history[key] || 0) + 1;
      await updateDoc(userRef, { watchHistory: history });
    }
  });

  return container;
}

// Initial guest load
loadCachedStreams();
