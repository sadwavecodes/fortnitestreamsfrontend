// app.js (ES module) — Modern, Clean, Seamless Version

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
const creatorInput = document.getElementById("creator-name");
const streamsContainer = document.getElementById("streams");
const filteredStreamsContainer = document.getElementById("filtered-streams");

function createStreamPreview(stream) {
  const wrapper = document.createElement("div");
  wrapper.className = "stream-preview";

  const thumbnail = document.createElement("img");
  thumbnail.src = stream.thumbnailUrl || "https://placehold.co/320x180?text=Stream";
  thumbnail.alt = stream.title || "Stream";
  thumbnail.className = "stream-thumb";

  const title = document.createElement("div");
  title.className = "stream-title";
  title.textContent = stream.displayName || stream.channel || "Unnamed Stream";

  const launch = document.createElement("button");
  launch.className = "stream-launch";
  launch.textContent = "▶ Watch";

  launch.addEventListener("click", () => {
    const iframe = document.createElement("iframe");
    const url = new URL(stream.embedUrl);
    if (url.hostname.includes("twitch.tv")) {
      url.searchParams.set("parent", location.hostname);
    }
    iframe.src = url.toString();
    iframe.allowFullscreen = true;
    iframe.frameBorder = "0";
    iframe.width = "640";
    iframe.height = "360";
    wrapper.innerHTML = "";
    wrapper.appendChild(iframe);
  });

  wrapper.append(thumbnail, title, launch);
  return wrapper;
}

function renderStreams(container, streams) {
  container.innerHTML = "";
  streams.forEach((s) => container.appendChild(createStreamPreview(s)));
}

async function loadCachedStreams() {
  try {
    const res = await fetch("https://fortnitestreams.onrender.com/cache");
    const data = await res.json();
    renderStreams(streamsContainer, data);
  } catch (err) {
    console.error("Cache load fail", err);
  }
}

async function loadFilteredStreams(minViewers, creatorName = "") {
  try {
    const res = await fetch(
      `https://fortnitestreams.onrender.com/filtered?minViewers=${minViewers}&creator=${encodeURIComponent(creatorName)}`
    );
    const data = await res.json();
    renderStreams(filteredStreamsContainer, data);
  } catch (err) {
    console.error("Filter load fail", err);
  }
}

async function loadYouTubeStreams(idToken) {
  try {
    const res = await fetch("https://fortnitestreams.onrender.com/youtube", {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (res.ok) {
      const yt = await res.json();
      renderStreams(filteredStreamsContainer, yt);
    } else {
      console.warn("YT restricted", await res.json());
    }
  } catch (err) {
    console.error("YT load fail", err);
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
    const json = await res.json();
    alert(json.success ? "Referral success!" : `Error: ${json.error}`);
  } catch (e) {
    alert("Referral failed");
  }
}

function generateReferralCode() {
  return Math.random().toString(36).slice(2, 8);
}

loginBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (e) {
    alert("Login failed: " + e.message);
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    loginBtn.style.display = "block";
    referralSection.style.display = "none";
    return;
  }

  loginBtn.style.display = "none";
  referralSection.style.display = "block";

  const idToken = await user.getIdToken();
  const refDoc = doc(db, "users", user.uid);
  const snap = await getDoc(refDoc);

  if (!snap.exists()) {
    const refCode = generateReferralCode();
    await setDoc(refDoc, {
      displayName: user.displayName,
      email: user.email,
      referralCode: refCode,
      referredBy: "",
      referredCount: 0,
      isPremium: false,
    });
    referralLinkInput.value = `${location.origin}?ref=${refCode}`;
  } else {
    referralLinkInput.value = `${location.origin}?ref=${snap.data().referralCode}`;
  }

  const params = new URLSearchParams(location.search);
  const ref = params.get("ref");
  if (ref && (!snap.exists() || !snap.data().referredBy)) {
    await submitReferralCode(idToken, ref);
  }

  await loadCachedStreams();
  await loadFilteredStreams(parseInt(minViewersInput.value) || 0, creatorInput.value || "");
  await loadYouTubeStreams(idToken);
});

window.applyFilters = async () => {
  const min = parseInt(minViewersInput.value) || 0;
  const name = creatorInput.value || "";
  await loadFilteredStreams(min, name);
  const user = auth.currentUser;
  if (user) await loadYouTubeStreams(await user.getIdToken());
};

loadCachedStreams();
