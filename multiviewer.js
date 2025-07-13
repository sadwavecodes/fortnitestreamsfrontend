// multiviewer.js
const streamSelect = document.getElementById("stream-select");
const loadBtn = document.getElementById("load-multi-btn");
const multiStreamsContainer = document.getElementById("multi-streams");
const firefoxModeContainer = document.getElementById("firefox-mode-container");
const firefoxModeCheckbox = document.getElementById("firefox-mode-checkbox");

// Detect Firefox browser
const isFirefox = navigator.userAgent.toLowerCase().includes("firefox");
if (isFirefox) {
  firefoxModeContainer.style.display = "block";
} else {
  firefoxModeContainer.style.display = "none";
}

// Fetch all cached streams and populate select
async function loadStreamsForSelect() {
  try {
    const res = await fetch("https://fortnitestreams.onrender.com/cache");
    if (!res.ok) throw new Error("Failed to fetch streams");
    const streams = await res.json();

    streams.forEach((stream) => {
      const name = stream.user_name || stream.user_login || stream.channel || "Unknown Creator";
      const option = document.createElement("option");
      option.value = stream.user_login || stream.channel || "";
      option.textContent = `${name} (${stream.viewer_count || 0} viewers)`;
      streamSelect.appendChild(option);
    });
  } catch (e) {
    console.error("Failed to load streams for select", e);
  }
}

function createMultiStreamIframe(channel, firefoxMode) {
  const iframe = document.createElement("iframe");
  let src = `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}`;
  if (firefoxMode) {
    // No autoplay param to avoid Firefox blocking
  } else {
    src += "&autoplay=true";
  }
  iframe.src = src;
  iframe.allowFullscreen = true;
  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute("scrolling", "no");
  iframe.setAttribute("allow", "autoplay; fullscreen; picture-in-picture");
  iframe.width = "320";
  iframe.height = "180";
  iframe.style.margin = "4px";
  iframe.style.borderRadius = "10px";
  iframe.style.backgroundColor = "#000";
  return iframe;
}

loadBtn.addEventListener("click", () => {
  const selectedOptions = Array.from(streamSelect.selectedOptions);
  if (selectedOptions.length === 0) {
    alert("Please select at least one stream.");
    return;
  }
  if (selectedOptions.length > 16) {
    alert("You can select up to 16 streams only.");
    return;
  }

  multiStreamsContainer.innerHTML = "";
  const firefoxMode = firefoxModeCheckbox.checked && isFirefox;

  selectedOptions.forEach((opt) => {
    const iframe = createMultiStreamIframe(opt.value, firefoxMode);
    multiStreamsContainer.appendChild(iframe);
  });
});

// Load streams on page load
loadStreamsForSelect();
