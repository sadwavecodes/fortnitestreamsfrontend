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
const creatorSearchInput = document.getElementById("creator-name") || null;
const streamsContainer = document.getElementById("streams");
const filteredStreamsContainer = document.getElementById("filtered-streams");

// Helpers
function createStreamPreview(stream) {
  const container = document.createElement("div");
  container.classList.add("stream-preview");
  container.style.position = "relative";
  container.style.width = "320px";
  container.style.height = "180px";
  container.style.margin = "8px";

  const img = document.createElement("img");
  img.src = stream.thumbnailUrl || `https://static-cdn.jtvnw.net/previews-ttv/live_user_${stream.user_login || stream.channel || ""}-320x180.jpg`;
  img.alt = stream.title || "Stream preview";
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "cover";
  img.style.cursor = "pointer";
  img.style.borderRadius = "8px";

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

  const label = document.createElement("div");
  label.textContent = stream.channel || stream.user_login || stream.creator || "Unknown Creator";
  label.style.position = "absolute";
  label.style.bottom = "4px";
  label.style.left = "8px";
  label.style.color = "white";
  label.style.background = "rgba(0, 0, 0, 0.6)";
  label.style.padding = "2px 6px";
  label.style.fontSize = "12px";
  label.style.borderRadius = "4px";

  container.appendChild(img);
  container.appendChild(playButton);
  container.appendChild(label);

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

async function loadCachedStreams() {
  try {
    const res = await fetch("https://fortnitestreams.onrender.com/cache");
    const streams = await res.json();
    renderStreams(streamsContainer, streams);
  } catch (e) {
    console.error("Failed to load cached streams", e);
  }
}

async function loadFilteredStreams(minViewers, creator = "") {
  try {
    const url = new URL("https://fortnitestreams.onrender.com/filtered");
    url.searchParams.set("minViewers", minViewers);
    if (creator) url.searchParams.set("creator", creator);
    const res = await fetch(url);
    const streams = await res.json();
    renderStreams(filteredStreamsContainer, streams);
  } catch (e) {
    console.error("Failed to load filtered streams", e);
  }
}

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

function generateReferralCode() {
  return Math.random().toString(36).substring(2, 8);
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

    await loadCachedStreams();
    const minViewers = parseInt(minViewersInput.value) || 0;
    const creator = creatorSearchInput?.value || "";
    await loadFilteredStreams(minViewers, creator);
    await loadYouTubeStreams(idToken);
  } else {
    loginBtn.style.display = "block";
    referralSection.style.display = "none";
    streamsContainer.innerHTML = "";
    filteredStreamsContainer.innerHTML = "";
  }
});

window.applyFilters = async () => {
  const minViewers = parseInt(minViewersInput.value) || 0;
  const creator = creatorSearchInput?.value || "";
  await loadFilteredStreams(minViewers, creator);

  const user = auth.currentUser;
  if (user) {
    const idToken = await user.getIdToken();
    await loadYouTubeStreams(idToken);
  }
};

loadCachedStreams();
