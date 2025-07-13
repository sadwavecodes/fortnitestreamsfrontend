// viewer.js (ES module)

// Parse selected streams from URL param
function getSelectedStreams() {
  const params = new URLSearchParams(window.location.search);
  const streamsJson = params.get("streams");
  if (!streamsJson) return [];
  try {
    return JSON.parse(decodeURIComponent(streamsJson));
  } catch {
    return [];
  }
}

function createIframe(embedUrl) {
  const iframe = document.createElement("iframe");

  // Add Twitch parent param for Firefox fix
  if (embedUrl.includes("player.twitch.tv")) {
    const parent = window.location.hostname;
    let cleanUrl = embedUrl.replace(/([&?])parent=[^&]+/, "");
    cleanUrl += cleanUrl.includes("?") ? `&parent=${parent}` : `?parent=${parent}`;
    iframe.src = cleanUrl;
  } else {
    iframe.src = embedUrl;
  }

  iframe.allowFullscreen = true;
  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute("allow", "autoplay; fullscreen; picture-in-picture");

  // size will be controlled by CSS grid and container aspect ratio
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.borderRadius = "10px";

  return iframe;
}

// Calculate grid layout based on number of streams
function getGridDimensions(count) {
  if (count <= 1) return [1, 1];
  if (count <= 4) return [2, 2];
  if (count <= 6) return [3, 2];
  if (count <= 9) return [3, 3];
  if (count <= 12) return [4, 3];
  if (count <= 16) return [4, 4];
  return [4, 4];
}

function renderStreams(streams) {
  const container = document.getElementById("multi-viewer-16by9");
  container.innerHTML = "";

  if (streams.length === 0) {
    container.textContent = "No streams selected.";
    return;
  }

  const [cols, rows] = getGridDimensions(streams.length);
  container.style.display = "grid";
  container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  container.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  container.style.gap = "8px";

  streams.forEach((stream) => {
    const iframeWrapper = document.createElement("div");
    iframeWrapper.style.width = "100%";
    iframeWrapper.style.height = "100%";
    iframeWrapper.style.aspectRatio = "16 / 9";
    iframeWrapper.style.borderRadius = "10px";
    iframeWrapper.style.overflow = "hidden";
    iframeWrapper.appendChild(createIframe(stream.embedUrl));
    container.appendChild(iframeWrapper);
  });
}

function init() {
  const streams = getSelectedStreams();
  renderStreams(streams);
}

window.addEventListener("DOMContentLoaded", init);
