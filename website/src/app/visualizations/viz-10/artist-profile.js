/* global d3 */

const DATASET_URL = "../dataset.csv";

const TOP_PERFORMERS = [
  { rank: 1, name: "Eminem" },
  { rank: 2, name: "Bad Bunny" },
  { rank: 3, name: "Ariana Grande" },
  { rank: 4, name: "Maluma" },
  { rank: 5, name: "Frank Ocean" },
  { rank: 6, name: "Travis Scott" },
  { rank: 7, name: "Radiohead" },
  { rank: 8, name: "The Neighbourhood" },
  { rank: 9, name: "Stray Kids" },
  { rank: 10, name: "System Of A Down" },
  { rank: 11, name: "TWICE" },
  { rank: 12, name: "2Pac" },
];

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

const radarAxes = [
  { key: "danceability", label: "Danceability", kind: "unit" },
  { key: "energy", label: "Energy", kind: "unit" },
  { key: "valence", label: "Valence", kind: "unit" },
  { key: "acousticness", label: "Acousticness", kind: "unit" },
  { key: "tempo", label: "Tempo", kind: "tempo" },
  { key: "loudness", label: "Loudness", kind: "loudness" },
  { key: "popularity", label: "Popularity", kind: "popularity" },
  { key: "durationMinutes", label: "Duration", kind: "duration" },
];

let radarGrid;
let statusText;
let tip;

let tracks = [];
let performers = [];
let normalizeValue;
let resizeTimer;

function splitArtists(value) {
  return String(value || "")
    .split(";")
    .map((artist) => artist.trim())
    .filter(Boolean);
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function parseTrackRow(row, index) {
  const artists = splitArtists(row.artists);
  return {
    id: row.track_id || `row-${index}`,
    artists,
    primaryArtist: artists[0] || "",
    popularity: Number(row.popularity),
    durationMinutes: Number(row.duration_ms) / 60000,
    danceability: Number(row.danceability),
    energy: Number(row.energy),
    valence: Number(row.valence),
    acousticness: Number(row.acousticness),
    loudness: Number(row.loudness),
    tempo: Number(row.tempo),
  };
}

function cleanRows(rows) {
  tracks = rows
    .map(parseTrackRow)
    .filter(
      (track) =>
        track.primaryArtist &&
        Number.isFinite(track.popularity) &&
        radarAxes.every((axis) => Number.isFinite(track[axis.key])),
    );
}

function getTopPerformerTracks() {
  const names = new Set(TOP_PERFORMERS.map((performer) => normalizeText(performer.name)));
  return tracks.filter((track) => names.has(normalizeText(track.primaryArtist)));
}

function buildExtents() {
  const loudness = d3.extent(tracks, (d) => d.loudness);
  const tempo = d3.extent(tracks, (d) => d.tempo);
  // Duration has extreme outliers in the full catalog (e.g. 80+ min). Scope
  // normalization to the top-12 artists so typical 3–5 min tracks spread on the radar.
  const duration = d3.extent(getTopPerformerTracks(), (d) => d.durationMinutes);

  normalizeValue = (key, value) => {
    const axis = radarAxes.find((item) => item.key === key);
    if (!axis) return 0;
    if (axis.kind === "unit") return clamp01(value);
    if (axis.kind === "popularity") return clamp01(value / 100);
    if (axis.kind === "loudness") {
      return clamp01((value - loudness[0]) / (loudness[1] - loudness[0] || 1));
    }
    if (axis.kind === "tempo") {
      return clamp01((value - tempo[0]) / (tempo[1] - tempo[0] || 1));
    }
    if (axis.kind === "duration") {
      return clamp01((value - duration[0]) / (duration[1] - duration[0] || 1));
    }
    return 0;
  };
}

function formatRawValue(key, value) {
  const axis = radarAxes.find((item) => item.key === key);
  if (!axis) return String(value);
  if (axis.kind === "popularity") return d3.format(".0f")(value);
  if (axis.kind === "loudness") return `${d3.format(".1f")(value)} dB`;
  if (axis.kind === "tempo") return `${d3.format(".0f")(value)} BPM`;
  if (axis.kind === "duration") return `${d3.format(".2f")(value)} min`;
  return d3.format(".2f")(value);
}

function getTracksByPerformer(name) {
  const target = normalizeText(name);
  return tracks.filter((track) => normalizeText(track.primaryArtist) === target);
}

function getProfile(name) {
  const artistTracks = getTracksByPerformer(name);
  const profile = {
    name,
    count: artistTracks.length,
    values: {},
    normalized: {},
    meanPopularity: d3.mean(artistTracks, (d) => d.popularity),
    meanDuration: d3.mean(artistTracks, (d) => d.durationMinutes),
  };

  radarAxes.forEach((axis) => {
    const mean = d3.mean(artistTracks, (d) => d[axis.key]);
    profile.values[axis.key] = mean;
    profile.normalized[axis.key] = normalizeValue(axis.key, mean);
  });

  return profile;
}

function positionTooltip(event) {
  const padding = 14;
  const offset = 16;
  const node = tip.node();
  let x = event.clientX + offset;
  let y = event.clientY + offset;
  const bounds = node.getBoundingClientRect();

  if (x + bounds.width > window.innerWidth - padding) {
    x = event.clientX - bounds.width - offset;
  }
  if (y + bounds.height > window.innerHeight - padding) {
    y = event.clientY - bounds.height - offset;
  }

  tip.style("left", `${Math.max(padding, x)}px`).style("top", `${Math.max(padding, y)}px`);
}

function showTooltip(event, html) {
  tip.html(html).style("display", "block").classed("is-visible", true);
  positionTooltip(event);
}

function hideTooltip() {
  tip.classed("is-visible", false).style("display", "none");
}

function renderRadarCell(slot, footer, profile) {
  slot.selectAll("*").remove();

  if (!profile || !profile.count) {
    slot.append("div").attr("class", "empty-state").text("No tracks found.");
    footer.text("—");
    return;
  }

  const width = Math.max(240, Math.min(320, slot.node().clientWidth || 300));
  const height = Math.max(220, width * 0.92);
  const radius = Math.min(width, height) / 2 - 52;
  const centerX = width / 2;
  const centerY = height / 2;
  const angleSlice = (Math.PI * 2) / radarAxes.length;
  const levels = [0.25, 0.5, 0.75, 1];

  const points = radarAxes.map((axis, index) => ({
    axis: axis.label,
    key: axis.key,
    value: profile.normalized[axis.key],
    raw: profile.values[axis.key],
    angle: index * angleSlice,
    artist: profile.name,
  }));

  const svg = slot
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr("aria-label", `Audio profile for ${profile.name}`);

  const g = svg.append("g").attr("transform", `translate(${centerX},${centerY})`);

  g.selectAll(".radar-grid-circle")
    .data(levels)
    .join("circle")
    .attr("class", "radar-grid-circle")
    .attr("r", (d) => radius * d);

  g.selectAll(".radar-grid-label")
    .data(levels)
    .join("text")
    .attr("class", "radar-grid-label")
    .attr("x", 4)
    .attr("y", (d) => -radius * d + 3)
    .attr("text-anchor", "start")
    .text((d) => d3.format(".2f")(d));

  const axisGroups = g
    .selectAll(".radar-axis")
    .data(radarAxes)
    .join("g")
    .attr("class", "radar-axis");

  axisGroups
    .append("line")
    .attr("class", "radar-axis-line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", (d, i) => radius * Math.sin(i * angleSlice))
    .attr("y2", (d, i) => -radius * Math.cos(i * angleSlice));

  axisGroups
    .append("text")
    .attr("class", "radar-axis-label")
    .attr("x", (d, i) => (radius + 14) * Math.sin(i * angleSlice))
    .attr("y", (d, i) => -(radius + 12) * Math.cos(i * angleSlice))
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .text((d) => d.label);

  const radarLine = d3
    .lineRadial()
    .radius((d) => radius * d.value)
    .angle((d) => d.angle)
    .curve(d3.curveLinearClosed);

  g.append("path").attr("class", "radar-area").attr("d", radarLine(points));

  g.selectAll(".radar-point")
    .data(points)
    .join("circle")
    .attr("class", "radar-point")
    .attr("r", 4)
    .attr("cx", (d) => radius * d.value * Math.sin(d.angle))
    .attr("cy", (d) => -radius * d.value * Math.cos(d.angle))
    .on("mouseover", (event, d) => {
      showTooltip(
        event,
        `
          <div><strong>${d.artist}</strong> · ${d.axis}</div>
          <div><span class="tooltip-value">${formatRawValue(d.key, d.raw)}</span> (norm ${d3.format(".2f")(d.value)})</div>
        `,
      );
    })
    .on("mousemove", (event) => positionTooltip(event))
    .on("mouseout", hideTooltip);

  footer.text(
    `Pop. ${d3.format(".1f")(profile.meanPopularity)} · ${d3.format(".2f")(profile.meanDuration)} min · ${d3.format(",")(profile.count)} tracks`,
  );
}

function setupGrid() {
  const cells = radarGrid
    .selectAll(".radar-cell")
    .data(performers, (d) => d.name)
    .join("article")
    .attr("class", "radar-cell");

  cells.selectAll("*").remove();

  cells
    .append("h3")
    .attr("class", "radar-cell-title")
    .text((d) => `${d.rank}. ${d.name}`);

  cells.append("div").attr("class", "radar-chart-slot");
  cells.append("p").attr("class", "radar-cell-footer");
}

function render() {
  radarGrid.selectAll(".radar-cell").each(function (performer) {
    const cell = d3.select(this);
    renderRadarCell(
      cell.select(".radar-chart-slot"),
      cell.select(".radar-cell-footer"),
      getProfile(performer.name),
    );
  });
}

function setStatus(message) {
  const node = document.getElementById("status");
  if (node) node.textContent = message;
}

function bindDom() {
  radarGrid = d3.select("#radar-grid");
  statusText = d3.select("#status");
  tip = d3
    .select("body")
    .append("div")
    .attr("class", "d3-tip")
    .style("display", "none");

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 150);
  });
}

function init() {
  if (window.location.protocol === "file:") {
    setStatus("Open via the local server: cd Project, then npm start, then /artist-profile/artist-profile.html");
    return;
  }

  if (typeof d3 === "undefined") {
    setStatus("D3 failed to load. Check your internet connection.");
    return;
  }

  bindDom();
  performers = TOP_PERFORMERS;
  setupGrid();
  statusText.text("Loading Project/dataset.csv (this can take a few seconds)…");

  d3.csv(DATASET_URL, d3.autoType)
    .then((rows) => {
      if (!rows || !rows.length) {
        throw new Error("dataset.csv is empty or missing");
      }

      cleanRows(rows);
      if (!tracks.length) {
        throw new Error("No valid tracks after parsing dataset.csv");
      }

      buildExtents();
      requestAnimationFrame(() => {
        render();
        statusText.text(`Ready — ${performers.length} artist profiles · ${d3.format(",")(tracks.length)} tracks`);
      });
    })
    .catch((error) => {
      console.error(error);
      statusText.text(`Error: ${error.message}. Run "npm start" inside the Project folder.`);
    });
}

init();
