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
const streamsContainer = document.getElementById("streams");
const filteredStreamsContainer = document.getElementById("filtered-streams");

// Helpers

// Create clickable preview thumbnail, load iframe only on click
function createStreamPreview(stream) {
  const container = document.createElement("div");
  container.classList.add("stream-preview");
  container.style.position = "relative";
  container.style.width = "320px";  // thumbnail size for grid
  container.style.height = "180px"; // 16:9 ratio
  container.style.margin = "8px";

  // Thumbnail image (use backend thumbnailUrl or fallback Twitch preview)
  const img = document.createElement("img");
  img.src = stream.thumbnailUrl || `https://static-cdn.jtvnw.net/previews-ttv/live_user_${stream.user_login || stream.channel || ""}-320x180.jpg`;
  img.alt = stream.title || "Stream preview";
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "cover";
  img.style.cursor = "pointer";
  img.style.borderRadius = "8px";

  // Play button overlay
  const playButton = document.createElement("div");
  playButton.textContent = "▶";
  playButton.style.position = "absolute";
  playButton.style.top = "50%";
  playButton.style.left = "50%";
  playButton.style.transform = "translate(-50%, -50%)";
  playButton.style.fontSize = "48px";
  playButton.style.color = "white";
  playButton.style.textShadow = "0 0 5px black";
  playButton.style.pointerEvents = "none";

  container.appendChild(img);
  container.appendChild(playButton);

  // On click, replace thumbnail with Twitch iframe
  container.addEventListener("click", () => {
    const iframe = document.createElement("iframe");

    // If Twitch player URL, add correct 'parent' param dynamically
    if (stream.embedUrl.includes("player.twitch.tv")) {
      const parent = window.location.hostname;
      // Remove any existing parent param first
      let cleanUrl = stream.embedUrl.replace(/([&?])parent=[^&]+/, "");
      // Add parent param properly
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

    // Replace preview with actual stream iframe
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

// Fetch cached Twitch streams from backend
async function loadCachedStreams() {
  try {
    const res = await fetch("https://fortnitestreams.onrender.com/cache");
    const streams = await res.json();
    renderStreams(streamsContainer, streams);
  } catch (e) {
    console.error("Failed to load cached streams", e);
  }
}

// Fetch filtered Twitch streams (with minViewers)
async function loadFilteredStreams(minViewers) {
  try {
    const res = await fetch(`https://fortnitestreams.onrender.com/filtered?minViewers=${minViewers}`);
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

    // Load streams
    await loadCachedStreams();
    const minViewers = parseInt(minViewersInput.value) || 0;
    await loadFilteredStreams(minViewers);
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
  await loadFilteredStreams(minViewers);

  const user = auth.currentUser;
  if (user) {
    const idToken = await user.getIdToken();
    await loadYouTubeStreams(idToken);
  }
};

// Load cached streams on initial page load
loadCachedStreams();
