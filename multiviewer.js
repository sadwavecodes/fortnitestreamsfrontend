// multiviewer.js (ES module)

async function fetchStreams() {
  try {
    const res = await fetch("https://fortnitestreams.onrender.com/cache");
    const streams = await res.json();
    return streams;
  } catch (e) {
    console.error("Failed to load cached streams", e);
    return [];
  }
}

function createOption(stream) {
  const option = document.createElement("option");
  option.value = JSON.stringify(stream);
  option.textContent = stream.user_name || stream.title || "Unnamed Stream";

  // Add thumbnail icon in option text if supported (Note: native select doesn't support images inside options,
  // so here we just append text, you can consider custom dropdown UI for better UX)
  return option;
}

function renderOptions(streams) {
  const select = document.getElementById("multi-viewer-select");
  select.innerHTML = "";
  streams.forEach((stream) => {
    select.appendChild(createOption(stream));
  });
}

function createIframe(embedUrl) {
  const iframe = document.createElement("iframe");

  // Add parent param if twitch URL for Firefox embedding issue fix
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
  iframe.width = "480";
  iframe.height = "270";
  iframe.style.borderRadius = "10px";
  iframe.style.margin = "6px";

  return iframe;
}

function renderMultiViewer(streams) {
  const container = document.getElementById("multi-viewer-container");
  container.innerHTML = "";
  streams.forEach((stream) => {
    container.appendChild(createIframe(stream.embedUrl));
  });
}

function setupMultiSelect(streams) {
  const select = document.getElementById("multi-viewer-select");
  select.addEventListener("change", () => {
    const selectedStreams = Array.from(select.selectedOptions).map(opt => JSON.parse(opt.value));
    renderMultiViewer(selectedStreams);
  });

  // Auto-select first stream for quick start
  if (streams.length > 0) {
    select.options[0].selected = true;
    renderMultiViewer([streams[0]]);
  }
}

async function init() {
  const streams = await fetchStreams();
  renderOptions(streams);
  setupMultiSelect(streams);
}

window.addEventListener("DOMContentLoaded", init);
