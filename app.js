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
const streamsContainer = document.getElementById("streams");

// Update slider display
minViewersInput.addEventListener("input", () => {
  minViewersValue.textContent = minViewersInput.value;
});

let allStreamsCache = []; // Keep all loaded streams for filtering

// Create clickable preview thumbnail that loads iframe on click
function createStreamPreview(stream) {
  const container = document.createElement("div");
  container.classList.add("stream-preview");
  container.style.position = "relative";
  container.style.width = "320px"; // Thumbnail size
  container.style.height = "180px"; // 16:9 ratio
  container.style.margin = "8px";
  container.style.borderRadius = "10px";
  container.style.overflow = "hidden";
  container.style.backgroundColor = "#000";

  // Streamer display name or fallback to login name
  const streamerName = stream.user_name || stream.user_login || stream.channel || "Unknown Creator";

  // Thumbnail image fallback to Twitch preview pattern
  const thumbnailUrl =
    stream.thumbnailUrl?.replace("{width}", "320").replace("{height}", "180") ||
    `https://static-cdn.jtvnw.net/previews-ttv/live_user_${stream.user_login || stream.channel || ""}-320x180.jpg`;

  const img = document.createElement("img");
  img.src = thumbnailUrl;
  img.alt = `Preview of ${streamerName}`;
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "cover";
  img.style.cursor = "pointer";
  img.style.display = "block";

  // Streamer name overlay at bottom
  const nameOverlay = document.createElement("div");
  nameOverlay.textContent = streamerName;
  nameOverlay.style.position = "absolute";
  nameOverlay.style.bottom = "0";
  nameOverlay.style.left = "0";
  nameOverlay.style.width = "100%";
  nameOverlay.style.background = "rgba(0, 0, 0, 0.7)";
  nameOverlay.style.color = "white";
  nameOverlay.style.fontWeight = "bold";
  nameOverlay.style.padding = "4px 8px";
  nameOverlay.style.fontSize = "14px";

  container.appendChild(img);
  container.appendChild(nameOverlay);

  // On click, replace thumbnail with embedded stream iframe
  container.addEventListener("click", () => {
    const iframe = document.createElement("iframe");
    // Twitch embeds require parent param
    if (stream.embedUrl.includes("player.twitch.tv")) {
      const parent = window.location.hostname;
      let cleanUrl = stream.embedUrl.replace(/([&?])parent=[^&]+/, "");
      cleanUrl += cleanUrl.includes("?") ? `&parent=${parent}` : `?parent=${parent}`;
      iframe.src = cleanUrl;
    } else {
      iframe.src = stream.embedUrl;
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

// Render streams filtered by name and min viewers
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

    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && (!userDoc.exists() || !userDoc.data().referredBy)) {
      // You can add submitReferralCode logic here if you want
    }

    await loadCachedStreams();
  } else {
    loginBtn.style.display = "block";
    referralSection.style.display = "none";
    streamsContainer.innerHTML = "";
    allStreamsCache = [];
  }
});

window.applyFilters = () => {
  renderStreamsFiltered();
};

// Initial load
loadCachedStreams();
