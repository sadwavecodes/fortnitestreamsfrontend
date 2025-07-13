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
  return option;
}

function renderOptions(streams) {
  const select = document.getElementById("multi-viewer-select");
  select.innerHTML = "";
  streams.forEach((stream) => {
    select.appendChild(createOption(stream));
  });
}

function setupWatchButton() {
  const button = document.getElementById("watch-btn");
  const select = document.getElementById("multi-viewer-select");

  button.addEventListener("click", () => {
    const selectedOptions = Array.from(select.selectedOptions);
    if (selectedOptions.length === 0) {
      alert("Please select at least one stream.");
      return;
    }

    const selectedStreams = selectedOptions.map(opt => JSON.parse(opt.value));
    // Encode selected streams as URL param (URI encoded JSON)
    const streamsParam = encodeURIComponent(JSON.stringify(selectedStreams));

    // Open viewer.html with streams param
    window.location.href = `viewer.html?streams=${streamsParam}`;
  });
}

async function init() {
  const streams = await fetchStreams();
  renderOptions(streams);
  setupWatchButton();
}

window.addEventListener("DOMContentLoaded", init);
