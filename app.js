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

// Firebase config
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
const minViewersValueSpan = document.getElementById("min-viewers-value");
const creatorNameInput = document.getElementById("creator-name");
const applyFiltersBtn = document.getElementById("apply-filters-btn");

const streamsContainer = document.getElementById("streams");
const multiViewerSection = document.getElementById("multi-viewer-section");
const multiViewerContainer = document.getElementById("multi-viewer");
const clearMultiViewerBtn = document.getElementById("clear-multi-viewer");

let allStreams = []; // Full current streams after filtering
let selectedStreams = new Map(); // key: stream embedUrl, value: stream object

// Update min viewers label on input change
minViewersInput.addEventListener("input", () => {
  minViewersValueSpan.textContent = minViewersInput.value;
});

// Create stream preview element with click to select/deselect
function createStreamPreview(stream) {
  const container = document.createElement("div");
  container.classList.add("stream-preview");
  container.title = `${stream.display_name}\n${stream.title}\nViewers: ${stream.viewer_count}`;
  container.style.position = "relative";

  // Thumbnail image
  const img = document.createElement("img");
  img.src = stream.thumbnailUrl || "";
  img.alt = `${stream.display_name} thumbnail`;
  container.appendChild(img);

  // Info bar below thumbnail
  const info = document.createElement("div");
  info.classList.add("stream-info");
  info.innerHTML = `
    <span class="streamer-name">${stream.display_name}</span>
    <span class="viewer-count">👁️ ${stream.viewer_count}</span>
  `;
  container.appendChild(info);

  // Click toggles selection for multi-viewer
  container.addEventListener("click", () => {
    toggleStreamSelection(stream);
  });

  // Highlight if selected
  if (selectedStreams.has(stream.embedUrl)) {
    container.classList.add("selected");
  }

  return container;
}

// Render all streams grid
function renderAllStreams() {
  streamsContainer.innerHTML = "";
  allStreams.forEach((stream) => {
    streamsContainer.appendChild(createStreamPreview(stream));
  });
}

// Render multi-viewer grid with up to 16 streams
function renderMultiViewer() {
  multiViewerContainer.innerHTML = "";

  if (selectedStreams.size === 0) {
    multiViewerSection.style.display = "none";
    return;
  }

  multiViewerSection.style.display = "block";

  // Adjust grid columns based on count
  multiViewerContainer.setAttribute("data-count", selectedStreams.size);

  for (const stream of selectedStreams.values()) {
    const iframe = document.createElement("iframe");
    iframe.src = stream.embedUrl;
    iframe.allowFullscreen = true;
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("scrolling", "no");
    iframe.setAttribute("allow", "autoplay; fullscreen; picture-in-picture");
    iframe.width = "640";
    iframe.height = "360";
    multiViewerContainer.appendChild(iframe);
  }
}

// Toggle stream selection in multi-viewer (max 16)
function toggleStreamSelection(stream) {
  if (selectedStreams.has(stream.embedUrl)) {
    selectedStreams.delete(stream.embedUrl);
  } else {
    if (selectedStreams.size >= 16) {
      alert("You can select up to 16 streams for multi-viewer.");
      return;
    }
    selectedStreams.set(stream.embedUrl, stream);
  }
  renderAllStreams();
  renderMultiViewer();
}

// Clear all selections
clearMultiViewerBtn.addEventListener("click", () => {
  selectedStreams.clear();
  renderAllStreams();
  renderMultiViewer();
});

// Fetch and filter streams
async function loadStreams() {
  try {
    // Fetch cached streams from backend with minViewers filter
    const minViewers = parseInt(minViewersInput.value) || 0;
    const creatorFilter = creatorNameInput.value.trim().toLowerCase();

    const res = await fetch(`https://fortnitestreams.onrender.com/cache`);
    let streams = await res.json();

    // Filter streams by minViewers and creator name (case insensitive)
    streams = streams.filter((s) => {
      const viewerOk = s.viewer_count >= minViewers;
      const creatorOk = creatorFilter === "" || (s.display_name && s.display_name.toLowerCase().includes(creatorFilter));
      return viewerOk && creatorOk;
    });

    allStreams = streams;
    renderAllStreams();

  } catch (e) {
    console.error("Failed to load streams", e);
  }
}

// Referral code submission (kept unchanged)
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

// Generate random referral code (kept unchanged)
function generateReferralCode() {
  return Math.random().toString(36).substring(2, 8);
}

// Sign in flow (kept unchanged)
loginBtn.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    alert("Login failed: " + e.message);
  }
});

// Handle user auth state
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

    await loadStreams();

  } else {
    loginBtn.style.display = "block";
    referralSection.style.display = "none";
    streamsContainer.innerHTML = "";
    multiViewerContainer.innerHTML = "";
    multiViewerSection.style.display = "none";
    allStreams = [];
    selectedStreams.clear();
  }
});

// Apply filters button
applyFiltersBtn.addEventListener("click", () => {
  loadStreams();
});

// Initial load of streams (without auth, shows cached)
loadStreams();
