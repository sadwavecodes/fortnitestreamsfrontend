import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
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

const loginBtn = document.getElementById("login-btn");
const referralSection = document.getElementById("referral-section");
const referralLinkInput = document.getElementById("referral-link");
const minViewersInput = document.getElementById("min-viewers");
const minViewersValue = document.getElementById("min-viewers-value");
const creatorNameInput = document.getElementById("creator-name");
const applyFiltersBtn = document.getElementById("apply-filters-btn");
const streamsContainer = document.getElementById("streams");

minViewersInput.addEventListener("input", () => {
  minViewersValue.textContent = minViewersInput.value;
});

let allStreamsCache = [];

function createStreamPreview(stream) {
  const container = document.createElement("div");
  container.classList.add("stream-preview");

  // Streamer name fallback
  const streamerName = stream.user_name || stream.user_login || stream.channel || "Unknown Creator";

  // Use thumbnail URL if provided, or Twitch fallback
  let thumbnailUrl = stream.thumbnailUrl || "";
  if (thumbnailUrl) {
    thumbnailUrl = thumbnailUrl.replace("{width}", "320").replace("{height}", "180");
  } else {
    thumbnailUrl = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${stream.user_login || stream.channel || ""}-320x180.jpg`;
  }

  const img = document.createElement("img");
  img.src = thumbnailUrl;
  img.alt = `Preview of ${streamerName}`;
  img.loading = "lazy";

  // Name overlay
  const nameOverlay = document.createElement("div");
  nameOverlay.className = "stream-name-overlay";
  nameOverlay.textContent = streamerName;

  container.appendChild(img);
  container.appendChild(nameOverlay);

  container.addEventListener("click", () => {
    const iframe = document.createElement("iframe");
    // Twitch player URL fix for parent param
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

function renderStreamsFiltered() {
  const minViewers = parseInt(minViewersInput.value) || 0;
  const creatorFilter = creatorNameInput.value.trim().toLowerCase();

  const filtered = allStreamsCache.filter((stream) => {
    const name = (stream.user_name || stream.user_login || "").toLowerCase();
    const meetsViewers = (stream.viewer_count || 0) >= minViewers;
    const matchesName = !creatorFilter || name.includes(creatorFilter);
    return meetsViewers && matchesName;
  });

  streamsContainer.innerHTML = "";
  filtered.forEach((stream) => {
    streamsContainer.appendChild(createStreamPreview(stream));
  });
}

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

loginBtn.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    alert("Login failed: " + e.message);
  }
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginBtn.style.display = "none";
    referralSection.style.display = "block";

    const idToken = await user.getIdToken();
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      const refCode = Math.random().toString(36).substring(2, 8);
      await setDoc(userRef, {
        displayName: user.displayName,
        email: user.email,
        referralCode: refCode,
        referredBy: "",
        referredCount: 0,
        isPremium: false,
      });
      referralLinkInput.value = `${window.location.origin}?ref=${refCode}`;
    } else {
      referralLinkInput.value = `${window.location.origin}?ref=${userDoc.data().referralCode}`;
    }

    await loadCachedStreams();
  } else {
    loginBtn.style.display = "block";
    referralSection.style.display = "none";
    streamsContainer.innerHTML = "";
    allStreamsCache = [];
  }
});

applyFiltersBtn.addEventListener("click", () => {
  renderStreamsFiltered();
});

// Initial load
loadCachedStreams();
