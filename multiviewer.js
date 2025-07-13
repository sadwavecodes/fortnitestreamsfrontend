// multiviewer.js
const streamSelect = document.getElementById("stream-select");
const loadBtn = document.getElementById("load-selected");
const clearBtn = document.getElementById("clear-selected");
const multiViewerSection = document.getElementById("multi-viewer-section");
const firefoxModeCheckbox = document.getElementById("firefox-mode");

let allStreams = [];

async function fetchStreams() {
  try {
    const res = await fetch("https://fortnitestreams.onrender.com/filtered?minViewers=0");
    const streams = await res.json();
    allStreams = streams;
    populateStreamSelect();
  } catch (e) {
    console.error("Failed to load streams:", e);
  }
}

function populateStreamSelect() {
  streamSelect.innerHTML = "";
  allStreams.forEach((stream, i) => {
    const option = document.createElement("option");
    option.value = i; // store index
    option.textContent = `${stream.user_login || "Unknown Creator"} (${stream.viewer_count || 0} viewers)`;
    streamSelect.appendChild(option);
  });
}

function createIframe(stream) {
  const iframe = document.createElement("iframe");
  // Use parent param dynamically to fix Twitch embed on Firefox
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

  iframe.width = "100%";
  iframe.height = "100%";

  // For Firefox mode, disable autoplay by default
  if (firefoxModeCheckbox.checked) {
    iframe.src += "&autoplay=false"; // Twitch & YouTube param to disable autoplay
  }

  return iframe;
}

function renderMultiViewer(selectedStreams) {
  multiViewerSection.innerHTML = "";
  multiViewerSection.dataset.count = selectedStreams.length;

  selectedStreams.forEach((stream) => {
    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.width = "100%";
    container.style.aspectRatio = "16 / 9";
    container.style.backgroundColor = "#000";
    container.style.borderRadius = "10px";
    container.style.overflow = "hidden";

    // Firefox mode: show clickable thumbnail to load iframe on click
    if (firefoxModeCheckbox.checked) {
      const thumbnailUrl = stream.thumbnailUrl || `https://static-cdn.jtvnw.net/previews-ttv/live_user_${stream.user_login || ""}-320x180.jpg`;
      const img = document.createElement("img");
      img.src = thumbnailUrl;
      img.alt = stream.user_login || "Unknown Creator";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.style.cursor = "pointer";
      img.style.borderRadius = "10px";

      img.addEventListener("click", () => {
        container.innerHTML = "";
        container.appendChild(createIframe(stream));
      });

      container.appendChild(img);
    } else {
      // Autoplay mode - load iframe immediately
      container.appendChild(createIframe(stream));
    }

    multiViewerSection.appendChild(container);
  });
}

loadBtn.addEventListener("click", () => {
  const selectedIndexes = Array.from(streamSelect.selectedOptions).map(opt => parseInt(opt.value));
  if (selectedIndexes.length === 0) {
    alert("Please select at least one stream");
    return;
  }
  if (selectedIndexes.length > 16) {
    alert("You can select up to 16 streams only");
    return;
  }
  const selectedStreams = selectedIndexes.map(i => allStreams[i]);
  renderMultiViewer(selectedStreams);
});

clearBtn.addEventListener("click", () => {
  multiViewerSection.innerHTML = "";
  multiViewerSection.dataset.count = 0;
  streamSelect.selectedIndex = -1;
});

window.addEventListener("load", fetchStreams);
