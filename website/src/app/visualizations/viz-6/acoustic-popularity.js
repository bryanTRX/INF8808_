/* global d3 */

const DATASET_URL = "../dataset.csv";

const GENRES = [
  { id: "pop", label: "Pop", color: "#2f80ed" },
  { id: "rock", label: "Rock", color: "#d1495b" },
];

const chart = d3.select("#chart");
const comparison = d3.select("#comparison");
const popCount = d3.select("#pop-count");
const rockCount = d3.select("#rock-count");
const statusText = d3.select("#status");
const sampleInput = d3.select("#sample-size");
const sampleLabel = d3.select("#sample-size-value");
const sharedScalesInput = d3.select("#shared-scales");
const searchInput = d3.select("#search");

let tip;
let tracksByGenre = { pop: [], rock: [] };
let resizeTimer;

const state = {
  sampleSize: 700,
  sharedScales: true,
  search: "",
};

function classifyPopRock(trackGenre) {
  const tokens = String(trackGenre || "")
    .toLowerCase()
    .split(";")
    .map((t) => t.trim())
    .filter(Boolean);

  if (tokens.some((t) => t.includes("hip-hop") || t.includes("hip hop"))) return null;

  for (const genre of ["pop", "rock"]) {
    if (tokens.some((t) => t.includes(genre))) return genre;
  }

  return null;
}

function parseRow(row) {
  const acousticness = Number(row.acousticness);
  const popularity = Number(row.popularity);
  if (!Number.isFinite(acousticness) || !Number.isFinite(popularity)) return null;

  const genre = classifyPopRock(row.track_genre);
  if (!genre) return null;

  return {
    trackId: row.track_id,
    artists: row.artists,
    trackName: row.track_name,
    acousticness,
    popularity,
    genre,
    trackGenre: row.track_genre,
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

function binnedMeans(data, xKey, yKey, binCount = 10) {
  const bins = d3
    .bin()
    .domain([0, 1])
    .thresholds(binCount)(data.map((d) => d[xKey]));

  return bins
    .map((bin) => {
      const points = data.filter((d) => d[xKey] >= bin.x0 && d[xKey] < (bin.x1 ?? 1.001));
      if (!points.length) return null;
      return {
        x: (bin.x0 + (bin.x1 ?? 1)) / 2,
        y: d3.mean(points, (d) => d[yKey]),
        n: points.length,
      };
    })
    .filter(Boolean);
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
  if (!search) return 0.48;
  return matchesSearch(d, search) ? 0.95 : 0.08;
}

function drawComparison(facets) {
  const stats = facets.map(([genre, values]) => {
    const fit = linearRegression(values, "acousticness", "popularity");
    const means = binnedMeans(values, "acousticness", "popularity");
    const lowAcoustic = values.filter((d) => d.acousticness < 0.33);
    const highAcoustic = values.filter((d) => d.acousticness > 0.66);
    return {
      genre,
      label: GENRES.find((g) => g.id === genre).label,
      color: GENRES.find((g) => g.id === genre).color,
      count: values.length,
      fit,
      meanPopLow: d3.mean(lowAcoustic, (d) => d.popularity),
      meanPopHigh: d3.mean(highAcoustic, (d) => d.popularity),
      binnedPeak: d3.max(means, (d) => d.y),
    };
  });

  comparison.selectAll("*").remove();

  stats.forEach((s) => {
    const card = comparison.append("div").attr("class", "compare-card");
    card
      .append("h3")
      .style("color", s.color)
      .text(`${s.label} (${d3.format(",")(s.count)} tracks)`);
    const dl = card.append("dl");
    dl.append("dt").text("Pearson r");
    dl.append("dd").text(s.fit ? d3.format("+.3f")(s.fit.r) : "n/a");
    dl.append("dt").text("Slope");
    dl.append("dd").text(s.fit ? d3.format("+.2f")(s.fit.slope) : "n/a");
    dl.append("dt").text("Mean pop. (low acoustic)");
    dl.append("dd").text(s.meanPopLow == null ? "n/a" : d3.format(".1f")(s.meanPopLow));
    dl.append("dt").text("Mean pop. (high acoustic)");
    dl.append("dd").text(s.meanPopHigh == null ? "n/a" : d3.format(".1f")(s.meanPopHigh));
  });

  if (stats.length === 2 && stats[0].fit && stats[1].fit) {
    const popStat = stats.find((s) => s.genre === "pop");
    const rockStat = stats.find((s) => s.genre === "rock");
    const rGap = popStat.fit.r - rockStat.fit.r;
    const slopeGap = popStat.fit.slope - rockStat.fit.slope;

    comparison
      .append("div")
      .attr("class", "compare-diff")
      .html(
        `<strong>How they differ</strong>
        Pop correlation is ${d3.format("+.3f")(rGap)} ${rGap >= 0 ? "higher" : "lower"} than Rock (Δr).
        Pop slope is ${d3.format("+.2f")(slopeGap)} ${slopeGap >= 0 ? "steeper" : "flatter"} than Rock (popularity points per unit acousticness).`,
      );
  }
}

function render() {
  const facets = GENRES.map((g) => [g.id, tracksByGenre[g.id]]).filter(([, values]) => values.length);
  drawComparison(facets);

  chart.selectAll("*").remove();

  const width = Math.max(chart.node().clientWidth || 900, 720);
  const columns = 2;
  const facetWidth = width / columns;
  const facetHeight = 380;
  const height = facetHeight + 8;
  const margin = { top: 40, right: 24, bottom: 48, left: 56 };

  const allValues = facets.flatMap(([, values]) => values);
  const xDomain = state.sharedScales ? [0, 1] : null;
  const yDomain = state.sharedScales
    ? [0, d3.max(allValues, (d) => d.popularity) || 100]
    : null;

  const svg = chart
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`);

  facets.forEach(([genre, values], index) => {
    const meta = GENRES.find((g) => g.id === genre);
    const column = index % columns;
    const xOffset = column * facetWidth;
    const innerWidth = facetWidth - margin.left - margin.right;
    const innerHeight = facetHeight - margin.top - margin.bottom;
    const sampled = sampleValues(values, state.sampleSize);
    const search = state.search.toLowerCase();

    const xScale = d3
      .scaleLinear()
      .domain(xDomain || d3.extent(values, (d) => d.acousticness))
      .nice()
      .range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain(yDomain || d3.extent(values, (d) => d.popularity))
      .nice()
      .range([innerHeight, 0]);

    const facet = svg
      .append("g")
      .attr("transform", `translate(${xOffset + margin.left},${margin.top})`);

    facet
      .append("text")
      .attr("class", "facet-title")
      .attr("x", 0)
      .attr("y", -16)
      .attr("fill", meta.color)
      .text(`${meta.label} (${d3.format(",")(values.length)} tracks)`);

    facet
      .append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(yScale).ticks(5).tickSize(-innerWidth).tickFormat(""));

    facet
      .append("g")
      .attr("class", "x axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(5));

    facet.append("g").attr("class", "y axis").call(d3.axisLeft(yScale).ticks(5));

    if (column === 0) {
      facet
        .append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -42)
        .attr("text-anchor", "middle")
        .text("Popularity (0–100)");
    }

    facet
      .append("text")
      .attr("class", "axis-label")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 38)
      .attr("text-anchor", "middle")
      .text("Acousticness");

    facet
      .selectAll(".point")
      .data(sampled, (d) => d.trackId)
      .join("circle")
      .attr("class", "point")
      .attr("cx", (d) => xScale(d.acousticness))
      .attr("cy", (d) => yScale(d.popularity))
      .attr("r", (d) => (matchesSearch(d, search) ? 4.2 : 2.8))
      .attr("fill", meta.color)
      .attr("opacity", (d) => pointOpacity(d, search))
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("r", 5).attr("opacity", 1);
        tip
          .html(
            `
              <div><strong>${d.trackName}</strong></div>
              <div class="muted">${d.artists}</div>
              <div>${meta.label} · ${d.trackGenre}</div>
              <div>Acousticness: ${d3.format(".2f")(d.acousticness)}</div>
              <div>Popularity: ${d3.format(".0f")(d.popularity)}</div>
            `,
          )
          .classed("is-visible", true)
          .style("display", "block");
        positionTooltip(event);
      })
      .on("mousemove", positionTooltip)
      .on("mouseleave", function (event, d) {
        d3.select(this)
          .attr("r", matchesSearch(d, search) ? 4.2 : 2.8)
          .attr("opacity", pointOpacity(d, search));
        tip.classed("is-visible", false).style("display", "none");
      });

    const fit = linearRegression(values, "acousticness", "popularity");
    if (fit) {
      const lineData = xScale.domain().map((x) => ({
        x,
        y: fit.intercept + fit.slope * x,
      }));

      facet
        .append("path")
        .datum(lineData)
        .attr("class", "trend")
        .attr("stroke", meta.color)
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
        .attr("y", 14)
        .attr("text-anchor", "end")
        .attr("fill", meta.color)
        .text(`r = ${d3.format("+.2f")(fit.r)}`);
    }

    const means = binnedMeans(values, "acousticness", "popularity", 8);
    facet
      .append("path")
      .datum(means)
      .attr("class", "binned-mean")
      .attr("stroke", meta.color)
      .attr(
        "d",
        d3
          .line()
          .x((d) => xScale(d.x))
          .y((d) => yScale(d.y))
          .defined((d) => Number.isFinite(d.y)),
      );
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
    state.sampleSize = 700;
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
    setStatus("Open via npm start, then /acoustic-popularity/acoustic-popularity.html");
    return;
  }

  if (typeof d3 === "undefined") {
    setStatus("D3 failed to load.");
    return;
  }

  bindDom();
  statusText.text("Loading dataset.csv…");

  d3.csv(DATASET_URL, d3.autoType)
    .then((rows) => {
      const tracks = rows.map(parseRow).filter(Boolean);
      tracksByGenre = { pop: [], rock: [] };
      tracks.forEach((t) => tracksByGenre[t.genre].push(t));

      if (!tracksByGenre.pop.length && !tracksByGenre.rock.length) {
        throw new Error("No Pop or Rock tracks found");
      }

      popCount.text(d3.format(",")(tracksByGenre.pop.length));
      rockCount.text(d3.format(",")(tracksByGenre.rock.length));
      render();
      statusText.text("Ready — compare regression lines and binned means between Pop and Rock");
    })
    .catch((error) => {
      console.error(error);
      statusText.text(`Error: ${error.message}`);
    });
}

init();
