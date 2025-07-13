// app.js (ES module)

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

// Your Firebase config (safe to expose)
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
const referralSection = document.getElementById("referral-section");
const referralLinkInput = document.getElementById("referral-link");
const minViewersInput = document.getElementById("min-viewers");
const minViewersValue = document.getElementById("min-viewers-value");
const creatorNameInput = document.getElementById("creator-name");
const streamsContainer = document.getElementById("streams");
const filteredStreamsContainer = document.getElementById("filtered-streams");

// Update min viewers value label dynamically
minViewersInput.addEventListener("input", () => {
  minViewersValue.textContent = minViewersInput.value;
});

// Helpers

// Create clickable preview thumbnail, load iframe only on click
function createStreamPreview(stream) {
  const container = document.createElement("div");
  container.classList.add("stream-preview");
  container.style.position = "relative";
  container.style.width = "320px";
  container.style.height = "180px";
  container.style.margin = "8px";
  container.style.borderRadius = "8px";
  container.style.overflow = "hidden";
  container.style.backgroundColor = "#000";

  // Get real creator name from multiple possible keys
  const creatorName =
    stream.user_name ||
    stream.display_name ||
    stream.channel ||
    stream.user_login ||
    "Unknown Creator";

  // Determine thumbnail URL with fallback
  let thumbnailUrl = "";

  if (stream.thumbnailUrl) {
    // Replace {width} and {height} placeholders if exist
    thumbnailUrl = stream.thumbnailUrl
      .replace("{width}", "320")
      .replace("{height}", "180");
  } else if (stream.thumbnail) {
    // YouTube streams might have 'thumbnail'
    thumbnailUrl = stream.thumbnail;
  } else if (stream.user_login) {
    // Twitch fallback URL pattern
    thumbnailUrl = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${stream.user_login}-320x180.jpg`;
  } else if (stream.channel) {
    thumbnailUrl = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${stream.channel}-320x180.jpg`;
  } else {
    thumbnailUrl = "https://via.placeholder.com/320x180?text=No+Preview";
  }

  // Thumbnail image element
  const img = document.createElement("img");
  img.src = thumbnailUrl;
  img.alt = stream.title || "Stream preview";
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "cover";
  img.style.cursor = "pointer";

  // Creator name overlay
  const nameOverlay = document.createElement("div");
  nameOverlay.textContent = creatorName;
  nameOverlay.style.position = "absolute";
  nameOverlay.style.bottom = "0";
  nameOverlay.style.left = "0";
  nameOverlay.style.right = "0";
  nameOverlay.style.background = "rgba(0, 0, 0, 0.6)";
  nameOverlay.style.color = "white";
  nameOverlay.style.fontWeight = "bold";
  nameOverlay.style.padding = "4px 8px";
  nameOverlay.style.fontSize = "14px";
  nameOverlay.style.userSelect = "none";

  container.appendChild(img);
  container.appendChild(nameOverlay);

  // Click handler loads actual player iframe
  container.addEventListener("click", () => {
    const iframe = document.createElement("iframe");

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
    iframe.width = "640";
    iframe.height = "360";

    container.innerHTML = "";
    container.appendChild(iframe);
  });

  return container;
}

function renderStreams(container, streams) {
  container.innerHTML = "";
  streams.forEach((stream) => {
    container.appendChild(createStreamPreview(stream));
  });
}

// Fetch all cached Twitch streams from backend
async function loadCachedStreams() {
  try {
    const res = await fetch("https://fortnitestreams.onrender.com/cache");
    const streams = await res.json();
    renderStreams(streamsContainer, streams);
  } catch (e) {
    console.error("Failed to load cached streams", e);
  }
}

// Fetch filtered Twitch streams (with minViewers and creatorName filters)
async function loadFilteredStreams(minViewers, creatorName) {
  try {
    let url = `https://fortnitestreams.onrender.com/filtered?minViewers=${minViewers}`;
    if (creatorName && creatorName.trim() !== "") {
      url += `&creatorName=${encodeURIComponent(creatorName.trim())}`;
    }
    const res = await fetch(url);
    const streams = await res.json();
    renderStreams(filteredStreamsContainer, streams);
  } catch (e) {
    console.error("Failed to load filtered streams", e);
  }
}

// Fetch YouTube streams (premium only)
async function loadYouTubeStreams(idToken) {
  try {
    const res = await fetch("https://fortnitestreams.onrender.com/youtube", {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (res.ok) {
      const ytStreams = await res.json();
      ytStreams.forEach((stream) => {
        filteredStreamsContainer.appendChild(createStreamPreview(stream));
      });
    } else {
      console.log("YouTube streams unavailable:", await res.json());
    }
  } catch (e) {
    console.error("Failed to load YouTube streams", e);
  }
}

// Referral code submission
async function submitReferralCode(idToken, code) {
  try {
    const res = await fetch("https://fortnitestreams.onrender.com/register-referral", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ referralCode: code }),
    });
    const data = await res.json();
    if (data.success) {
      alert("Referral registered! You unlocked premium.");
    } else {
      alert("Referral error: " + (data.error || "Unknown error"));
    }
  } catch (e) {
    alert("Referral submission failed.");
    console.error(e);
  }
}

// Generate random referral code
function generateReferralCode() {
  return Math.random().toString(36).substring(2, 8);
}

// Sign in flow
loginBtn.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    alert("Login failed: " + e.message);
  }
});

// Handle user state
onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginBtn.style.display = "none";
    referralSection.style.display = "block";

    const idToken = await user.getIdToken();
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      const refCode = generateReferralCode();
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

    // Check referral query param once
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && (!userDoc.exists() || !userDoc.data().referredBy)) {
      await submitReferralCode(idToken, ref);
    }

    // Load all streams on login
    await loadCachedStreams();

    const minViewers = parseInt(minViewersInput.value) || 0;
    const creatorName = creatorNameInput.value;
    await loadFilteredStreams(minViewers, creatorName);

    await loadYouTubeStreams(idToken);
  } else {
    loginBtn.style.display = "block";
    referralSection.style.display = "none";
    streamsContainer.innerHTML = "";
    filteredStreamsContainer.innerHTML = "";
  }
});

// Filter button handler
window.applyFilters = async () => {
  const minViewers = parseInt(minViewersInput.value) || 0;
  const creatorName = creatorNameInput.value;
  await loadFilteredStreams(minViewers, creatorName);

  const user = auth.currentUser;
  if (user) {
    const idToken = await user.getIdToken();
    await loadYouTubeStreams(idToken);
  }
};

// Load cached streams on initial page load
loadCachedStreams();
