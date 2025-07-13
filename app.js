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

// DOM elements
const loginBtn = document.getElementById("login-btn");
const referralSection = document.getElementById("referral-section");
const referralLinkInput = document.getElementById("referral-link");
const minViewersInput = document.getElementById("min-viewers");
const minViewersValue = document.getElementById("min-viewers-value");
const creatorNameInput = document.getElementById("creator-name");
const streamsContainer = document.getElementById("streams");
const filteredStreamsContainer = document.getElementById("filtered-streams");

// Update min viewers label live
minViewersInput.addEventListener("input", () => {
  minViewersValue.textContent = minViewersInput.value;
});

// Helper: Create clickable preview thumbnail for stream
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

  // Try to get creator name reliably from any source property
  const creatorName =
    stream.user_name ||
    stream.display_name ||
    stream.channel ||
    stream.user_login ||
    stream.broadcaster_name || // some Twitch APIs
    "Unknown Creator";

  // Viewer count fallback (optional display if you want)
  const viewerCount = stream.viewer_count || stream.viewers || 0;

  // Get thumbnail url, replace placeholders if needed
  let thumbnailUrl = "";

  if (stream.thumbnailUrl) {
    thumbnailUrl = stream.thumbnailUrl.replace("{width}", "320").replace("{height}", "180");
  } else if (stream.thumbnail) {
    thumbnailUrl = stream.thumbnail;
  } else if (stream.user_login) {
    thumbnailUrl = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${stream.user_login}-320x180.jpg`;
  } else if (stream.channel) {
    thumbnailUrl = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${stream.channel}-320x180.jpg`;
  } else if (stream.broadcaster_login) {
    thumbnailUrl = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${stream.broadcaster_login}-320x180.jpg`;
  } else {
    thumbnailUrl = "https://via.placeholder.com/320x180?text=No+Preview";
  }

  // Thumbnail image
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
  nameOverlay.style.background = "rgba(0, 0, 0, 0.7)";
  nameOverlay.style.color = "white";
  nameOverlay.style.fontWeight = "bold";
  nameOverlay.style.padding = "4px 8px";
  nameOverlay.style.fontSize = "14px";
  nameOverlay.style.userSelect = "none";

  container.appendChild(img);
  container.appendChild(nameOverlay);

  // Clicking loads actual iframe stream
  container.addEventListener("click", () => {
    const iframe = document.createElement("iframe");

    // For Twitch embeds, fix parent param for CORS
    if (stream.embedUrl && stream.embedUrl.includes("player.twitch.tv")) {
      const parent = window.location.hostname;
      let cleanUrl = stream.embedUrl.replace(/([&?])parent=[^&]+/, "");
      cleanUrl += cleanUrl.includes("?") ? `&parent=${parent}` : `?parent=${parent}`;
      iframe.src = cleanUrl;
    } else if (stream.embedUrl) {
      iframe.src = stream.embedUrl;
    } else if (stream.url) {
      iframe.src = stream.url;
    } else {
      iframe.src = "#"; // fallback
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

// Render streams inside container
function renderStreams(container, streams) {
  container.innerHTML = "";
  streams.forEach((stream) => {
    container.appendChild(createStreamPreview(stream));
  });
}

// Load ALL cached Fortnite streams (no viewer filter)
async function loadCachedStreams() {
  try {
    const res = await fetch("https://fortnitestreams.onrender.com/cache");
    if (!res.ok) throw new Error("Failed to fetch cache");
    const streams = await res.json();
    renderStreams(streamsContainer, streams);
  } catch (e) {
    console.error("Failed to load cached streams:", e);
  }
}

// Load filtered streams with minViewers and creatorName filter
async function loadFilteredStreams(minViewers, creatorName) {
  try {
    let url = `https://fortnitestreams.onrender.com/filtered?minViewers=${minViewers}`;
    if (creatorName && creatorName.trim()) {
      url += `&creatorName=${encodeURIComponent(creatorName.trim())}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch filtered streams");
    const streams = await res.json();
    renderStreams(filteredStreamsContainer, streams);
  } catch (e) {
    console.error("Failed to load filtered streams:", e);
  }
}

// Load YouTube streams (premium)
async function loadYouTubeStreams(idToken) {
  try {
    const res = await fetch("https://fortnitestreams.onrender.com/youtube", {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) {
      console.log("YouTube streams unavailable:", await res.json());
      return;
    }
    const ytStreams = await res.json();
    ytStreams.forEach((stream) => {
      filteredStreamsContainer.appendChild(createStreamPreview(stream));
    });
  } catch (e) {
    console.error("Failed to load YouTube streams:", e);
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

// Generate referral code
function generateReferralCode() {
  return Math.random().toString(36).substring(2, 8);
}

// Sign in button
loginBtn.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    alert("Login failed: " + e.message);
  }
});

// On auth state change
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

    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && (!userDoc.exists() || !userDoc.data().referredBy)) {
      await submitReferralCode(idToken, ref);
    }

    // Load all cached streams (no filters)
    await loadCachedStreams();

    // Load filtered streams with viewer & creator filters
    const minViewers = parseInt(minViewersInput.value) || 0;
    const creatorName = creatorNameInput.value;
    await loadFilteredStreams(minViewers, creatorName);

    // Load premium YouTube streams
    await loadYouTubeStreams(idToken);
  } else {
    loginBtn.style.display = "block";
    referralSection.style.display = "none";
    streamsContainer.innerHTML = "";
    filteredStreamsContainer.innerHTML = "";
  }
});

// Filter button click
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

// Load cached streams initially on page load
loadCachedStreams();
