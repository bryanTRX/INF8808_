/* global d3 */

const DATASET_URL = "../dataset.csv";

const MAJOR_GENRES = [
  "pop",
  "rock",
  "hip-hop",
  "electronic",
  "dance",
  "indie",
  "r&b",
  "country",
  "jazz",
  "classical",
  "latin",
  "metal",
];

const GENRE_LABELS = new Map([
  ["pop", "Pop"],
  ["rock", "Rock"],
  ["hip-hop", "Hip-Hop"],
  ["electronic", "Electronic"],
  ["dance", "Dance"],
  ["indie", "Indie"],
  ["r&b", "R&B"],
  ["country", "Country"],
  ["jazz", "Jazz"],
  ["classical", "Classical"],
  ["latin", "Latin"],
  ["metal", "Metal"],
]);

const DEFAULT_GENRES = ["pop", "rock", "hip-hop", "electronic", "dance", "latin"];
const COLOR_SCALE = d3
  .scaleOrdinal()
  .domain(MAJOR_GENRES)
  .range([
    "#2f80ed",
    "#d1495b",
    "#1b998b",
    "#8f63c7",
    "#f2a541",
    "#537a5a",
    "#ef476f",
    "#7f5539",
    "#118ab2",
    "#6c757d",
    "#e76f51",
    "#343a40",
  ]);

const chart = d3.select("#chart");
const genreFilter = d3.select("#genre-filter");
const metrics = d3.select("#metrics");
const legend = d3.select("#legend");
const trackCount = d3.select("#track-count");
const facetCount = d3.select("#facet-count");
const statusText = d3.select("#status");
const sampleInput = d3.select("#sample-size");
const sampleLabel = d3.select("#sample-size-value");
const sharedScalesInput = d3.select("#shared-scales");
const searchInput = d3.select("#search");

let tip;
let tracks = [];
let resizeTimer;

const state = {
  selectedGenres: new Set(DEFAULT_GENRES),
  sampleSize: 500,
  sharedScales: true,
  search: "",
};

function classifyGenre(trackGenre) {
  const tokens = String(trackGenre || "")
    .toLowerCase()
    .split(";");

  if (tokens.some((d) => d.includes("hip-hop") || d.includes("hip hop"))) return "hip-hop";
  if (tokens.some((d) => d === "r-n-b" || d === "r&b" || d.includes("soul"))) return "r&b";

  for (const genre of MAJOR_GENRES) {
    if (tokens.some((d) => d.includes(genre))) return genre;
  }

  return null;
}

function parseRow(row) {
  const tempo = Number(row.tempo);
  const danceability = Number(row.danceability);
  if (!Number.isFinite(tempo) || !Number.isFinite(danceability)) return null;

  const genre = classifyGenre(row.track_genre);
  if (!genre) return null;

  return {
    trackId: row.track_id,
    artists: row.artists,
    trackName: row.track_name,
    popularity: Number(row.popularity),
    tempo,
    danceability,
    genre,
  };
}

function linearRegression(data, xKey, yKey) {
  if (data.length < 2) return null;

  const xMean = d3.mean(data, (d) => d[xKey]);
  const yMean = d3.mean(data, (d) => d[yKey]);
  const numerator = d3.sum(data, (d) => (d[xKey] - xMean) * (d[yKey] - yMean));
  const xVariance = d3.sum(data, (d) => (d[xKey] - xMean) ** 2);
  const yVariance = d3.sum(data, (d) => (d[yKey] - yMean) ** 2);

  if (xVariance === 0 || yVariance === 0) return null;

  const slope = numerator / xVariance;
  const intercept = yMean - slope * xMean;
  const r = numerator / Math.sqrt(xVariance * yVariance);

  return { slope, intercept, r };
}

function sampleValues(values, size) {
  if (values.length <= size) return values;
  const step = values.length / size;
  return d3.range(size).map((i) => values[Math.floor(i * step)]);
}

function matchesSearch(d, search) {
  if (!search) return false;
  return `${d.trackName} ${d.artists}`.toLowerCase().includes(search);
}

function pointOpacity(d, search) {
  if (!search) return 0.5;
  return matchesSearch(d, search) ? 0.95 : 0.07;
}

function drawControls() {
  genreFilter
    .selectAll("label")
    .data(MAJOR_GENRES)
    .join("label")
    .html((d) => {
      const checked = state.selectedGenres.has(d) ? "checked" : "";
      return `<input type="checkbox" value="${d}" ${checked}> ${GENRE_LABELS.get(d)}`;
    });

  genreFilter.selectAll("input").on("change", function () {
    if (this.checked) state.selectedGenres.add(this.value);
    else state.selectedGenres.delete(this.value);
    render();
  });

  const selected = [...state.selectedGenres];
  legend
    .selectAll(".legend-item")
    .data(selected, (d) => d)
    .join("div")
    .attr("class", "legend-item")
    .html((d) => `<span class="swatch" style="background:${COLOR_SCALE(d)}"></span>${GENRE_LABELS.get(d)}`);
}

function drawMetrics(facets) {
  const rows = facets
    .map(([genre, values]) => {
      const fit = linearRegression(values, "tempo", "danceability");
      return {
        genre,
        count: values.length,
        r: fit ? fit.r : null,
        slope: fit ? fit.slope : null,
      };
    })
    .sort((a, b) => (b.r ?? -2) - (a.r ?? -2));

  metrics
    .selectAll(".metric-row")
    .data(rows, (d) => d.genre)
    .join("div")
    .attr("class", "metric-row")
    .html((d) => {
      const rText = d.r === null ? "n/a" : d3.format("+.2f")(d.r);
      const slopeText = d.slope === null ? "n/a" : d3.format("+.4f")(d.slope);
      return `
        <strong style="color:${COLOR_SCALE(d.genre)}">${rText}</strong>
        <span>${GENRE_LABELS.get(d.genre)} · ${d3.format(",")(d.count)} tracks<br>slope ${slopeText}</span>
      `;
    });
}

function render() {
  const selectedGenres = MAJOR_GENRES.filter((g) => state.selectedGenres.has(g));
  const facets = d3
    .groups(
      tracks.filter((d) => selectedGenres.includes(d.genre)),
      (d) => d.genre,
    )
    .sort((a, b) => selectedGenres.indexOf(a[0]) - selectedGenres.indexOf(b[0]));

  facetCount.text(String(facets.length));
  drawControls();
  drawMetrics(facets);

  chart.selectAll("*").remove();

  if (facets.length === 0) {
    chart.append("div").attr("class", "empty-chart").text("Select at least one genre.");
    return;
  }

  const columns = facets.length >= 6 ? 3 : facets.length >= 3 ? 3 : facets.length;
  const rows = Math.ceil(facets.length / columns);
  const width = Math.max(chart.node().clientWidth || 900, 720);
  const facetWidth = width / columns;
  const facetHeight = 250;
  const height = rows * facetHeight + 24;
  const margin = { top: 36, right: 18, bottom: 44, left: 52 };

  const allValues = facets.flatMap(([, values]) => values);
  const xDomain = state.sharedScales
    ? d3.extent(allValues, (d) => d.tempo)
    : null;
  const yDomain = state.sharedScales ? [0, 1] : null;

  const svg = chart
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`);

  facets.forEach(([genre, values], index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const xOffset = column * facetWidth;
    const yOffset = row * facetHeight;
    const innerWidth = facetWidth - margin.left - margin.right;
    const innerHeight = facetHeight - margin.top - margin.bottom;
    const sampled = sampleValues(values, state.sampleSize);
    const search = state.search.toLowerCase();

    const xScale = d3
      .scaleLinear()
      .domain(xDomain || d3.extent(values, (d) => d.tempo))
      .nice()
      .range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain(yDomain || d3.extent(values, (d) => d.danceability))
      .nice()
      .range([innerHeight, 0]);

    const facet = svg
      .append("g")
      .attr("transform", `translate(${xOffset + margin.left},${yOffset + margin.top})`);

    facet
      .append("text")
      .attr("class", "facet-title")
      .attr("x", 0)
      .attr("y", -14)
      .text(`${GENRE_LABELS.get(genre)} (${d3.format(",")(values.length)} tracks)`);

    facet
      .append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(yScale).ticks(4).tickSize(-innerWidth).tickFormat(""));

    facet
      .append("g")
      .attr("class", "x axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(4));

    facet.append("g").attr("class", "y axis").call(d3.axisLeft(yScale).ticks(4));

    if (column === 0) {
      facet
        .append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -38)
        .attr("text-anchor", "middle")
        .text("Danceability");
    }

    if (row === rows - 1) {
      facet
        .append("text")
        .attr("class", "axis-label")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 34)
        .attr("text-anchor", "middle")
        .text("Tempo (BPM)");
    }

    facet
      .selectAll(".point")
      .data(sampled, (d) => d.trackId)
      .join("circle")
      .attr("class", "point")
      .attr("cx", (d) => xScale(d.tempo))
      .attr("cy", (d) => yScale(d.danceability))
      .attr("r", (d) => (matchesSearch(d, search) ? 4 : 2.6))
      .attr("fill", COLOR_SCALE(genre))
      .attr("opacity", (d) => pointOpacity(d, search))
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("r", 5).attr("opacity", 1);
        tip
          .html(
            `
              <div><strong>${d.trackName}</strong></div>
              <div class="muted">${d.artists}</div>
              <div>${GENRE_LABELS.get(d.genre)} · popularity ${d.popularity}</div>
              <div>Tempo: ${d3.format(".1f")(d.tempo)} BPM</div>
              <div>Danceability: ${d3.format(".2f")(d.danceability)}</div>
            `,
          )
          .classed("is-visible", true)
          .style("display", "block");
        positionTooltip(event);
      })
      .on("mousemove", positionTooltip)
      .on("mouseleave", function (event, d) {
        d3.select(this)
          .attr("r", matchesSearch(d, search) ? 4 : 2.6)
          .attr("opacity", pointOpacity(d, search));
        tip.classed("is-visible", false).style("display", "none");
      });

    const fit = linearRegression(values, "tempo", "danceability");
    if (fit) {
      const lineData = xScale.domain().map((x) => ({
        x,
        y: fit.intercept + fit.slope * x,
      }));

      facet
        .append("path")
        .datum(lineData)
        .attr("class", "trend")
        .attr("stroke", COLOR_SCALE(genre))
        .attr(
          "d",
          d3
            .line()
            .x((d) => xScale(d.x))
            .y((d) => yScale(d.y))
            .defined((d) => Number.isFinite(d.y)),
        );

      facet
        .append("text")
        .attr("class", "corr-label")
        .attr("x", innerWidth - 4)
        .attr("y", 12)
        .attr("text-anchor", "end")
        .attr("fill", COLOR_SCALE(genre))
        .text(`r = ${d3.format("+.2f")(fit.r)}`);
    }
  });
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

function bindDom() {
  tip = d3
    .select("body")
    .append("div")
    .attr("class", "d3-tip")
    .style("display", "none");

  sampleInput.on("input", function () {
    state.sampleSize = +this.value;
    sampleLabel.text(state.sampleSize);
    render();
  });

  sharedScalesInput.on("change", function () {
    state.sharedScales = this.checked;
    render();
  });

  searchInput.on("input", function () {
    state.search = this.value.trim();
    render();
  });

  d3.select("#reset").on("click", () => {
    state.selectedGenres = new Set(DEFAULT_GENRES);
    state.sampleSize = 500;
    state.sharedScales = true;
    state.search = "";
    sampleInput.property("value", state.sampleSize);
    sampleLabel.text(state.sampleSize);
    sharedScalesInput.property("checked", true);
    searchInput.property("value", "");
    render();
  });

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 150);
  });
}

function setStatus(message) {
  const node = document.getElementById("status");
  if (node) node.textContent = message;
}

function init() {
  if (window.location.protocol === "file:") {
    setStatus("Open via npm start, then /tempo-danceability/tempo-danceability.html");
    return;
  }

  if (typeof d3 === "undefined") {
    setStatus("D3 failed to load.");
    return;
  }

  bindDom();
  drawControls();
  statusText.text("Loading dataset.csv…");

  d3.csv(DATASET_URL, d3.autoType)
    .then((rows) => {
      tracks = rows.map(parseRow).filter(Boolean);
      if (!tracks.length) throw new Error("No valid tracks");

      trackCount.text(d3.format(",")(tracks.length));
      render();
      statusText.text(`Ready — ${d3.format(",")(tracks.length)} tracks with genre labels`);
    })
    .catch((error) => {
      console.error(error);
      statusText.text(`Error: ${error.message}`);
    });
}

init();
