/* global d3 */

const DATASET_URL = "../dataset.csv";
const STACK_KEYS = ["clean", "explicit"];
const COLORS = {
  clean: "#10cc95",
  explicit: "#ef533b",
};
const LABELS = {
  clean: "Clean",
  explicit: "Explicit",
};

const chart = d3.select("#chart");
const statusText = d3.select("#status");
const tip = d3
  .select("body")
  .append("div")
  .attr("class", "d3-tip")
  .style("display", "none");

let genreStats = [];
let resizeTimer;

function splitGenres(value) {
  return String(value || "")
    .split(";")
    .map((genre) => genre.trim().toLowerCase())
    .filter(Boolean);
}

function isExplicit(value) {
  return String(value).toLowerCase() === "true";
}

function aggregateByGenre(rows) {
  const byGenre = new Map();

  rows.forEach((row) => {
    const genres = splitGenres(row.track_genre);
    if (!genres.length) return;

    const explicit = isExplicit(row.explicit);

    genres.forEach((genre) => {
      if (!byGenre.has(genre)) {
        byGenre.set(genre, { genre, total: 0, explicit: 0, clean: 0 });
      }

      const target = byGenre.get(genre);
      target.total += 1;
      if (explicit) {
        target.explicit += 1;
      } else {
        target.clean += 1;
      }
    });
  });

  genreStats = Array.from(byGenre.values())
    .map((item) => {
      const explicitPercent = (item.explicit / item.total) * 100;
      const cleanPercent = (item.clean / item.total) * 100;
      return {
        ...item,
        explicitPercent,
        cleanPercent,
      };
    })
    .sort((a, b) => d3.ascending(a.explicitPercent, b.explicitPercent));
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

function getChartSize() {
  const node = chart.node();
  const width = Math.max(320, node.clientWidth || window.innerWidth - 24);
  const height = Math.max(280, node.clientHeight || window.innerHeight - 56);
  return { width, height };
}

function getXLabelLayout(barCount, innerWidth) {
  const bandwidth = innerWidth / barCount;
  const fontSize = Math.max(6.5, Math.min(8.5, bandwidth * 0.85));
  const maxGenreLength = d3.max(genreStats, (d) => d.genre.length) || 10;
  const labelWidth = maxGenreLength * fontSize * 0.58;
  const bottom = Math.max(104, labelWidth * 0.72 + 36);
  return { fontSize, bottom };
}

function render() {
  if (!genreStats.length) return;

  chart.selectAll("*").remove();

  const barCount = genreStats.length;
  const { width, height } = getChartSize();
  const margin = {
    top: 40,
    right: 92,
    bottom: 0,
    left: 50,
  };
  const innerWidth = width - margin.left - margin.right;
  const { fontSize, bottom } = getXLabelLayout(barCount, innerWidth);
  margin.bottom = bottom;
  const chartHeight = height - margin.top - margin.bottom;

  const x = d3
    .scaleBand()
    .domain(genreStats.map((d) => d.genre))
    .range([0, innerWidth])
    .paddingInner(0.12);

  const y = d3.scaleLinear().domain([0, 100]).range([chartHeight, 0]);

  const stack = d3
    .stack()
    .keys(STACK_KEYS)
    .order(d3.stackOrderNone)
    .offset(d3.stackOffsetExpand);

  const stacked = stack(genreStats);

  const svg = chart
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("overflow", "visible")
    .attr("role", "img")
    .attr("aria-label", "Percentage of explicit versus clean tracks by music genre");

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  g.append("text")
    .attr("class", "chart-title")
    .attr("x", 0)
    .attr("y", -18)
    .text("Content Divide: Percentage of Explicit vs. Clean Tracks");

  g.append("g")
    .attr("class", "axis y-axis")
    .call(d3.axisLeft(y).ticks(6).tickFormat((d) => `${d}`))
    .call((axis) => axis.select(".domain").remove());

  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -chartHeight / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .text("Percentage (%)");

  const xAxis = g
    .append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0,${chartHeight})`)
    .call(d3.axisBottom(x).tickSizeOuter(0));

  xAxis.selectAll(".tick text")
    .attr("y", 8)
    .attr("x", 0)
    .attr("dy", "0.72em")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end")
    .style("font-size", `${fontSize}px`);

  g.append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", chartHeight + margin.bottom - 14)
    .attr("text-anchor", "middle")
    .text("Music Genre");

  const barGroups = g
    .selectAll(".bar-group")
    .data(stacked)
    .join("g")
    .attr("class", "bar-group")
    .attr("fill", (series) => COLORS[series.key]);

  barGroups
    .selectAll("rect")
    .data((series) => series)
    .join("rect")
    .attr("class", "bar-segment")
    .attr("x", (d) => x(d.data.genre))
    .attr("y", (d) => y(d[1] * 100))
    .attr("width", x.bandwidth())
    .attr("height", (d) => Math.max(0, y(d[0] * 100) - y(d[1] * 100)))
    .on("mouseover", function (event, d) {
      d3.select(this).attr("opacity", 0.88);
      const key = d3.select(this.parentNode).datum().key;
      const percent = key === "explicit" ? d.data.explicitPercent : d.data.cleanPercent;
      showTooltip(
        event,
        `
          <div><strong>${d.data.genre}</strong></div>
          <div><strong>${LABELS[key]}: </strong><span class="tooltip-value">${d3.format(".1f")(percent)}%</span></div>
          <div><strong>Tracks: </strong><span class="tooltip-value">${d3.format(",")(d.data.total)}</span></div>
        `,
      );
    })
    .on("mousemove", (event) => positionTooltip(event))
    .on("mouseout", function () {
      d3.select(this).attr("opacity", 1);
      hideTooltip();
    });

  const legend = svg
    .append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width - margin.right + 12}, ${margin.top + 4})`);

  legend.append("text").attr("class", "legend-title").attr("x", 0).attr("y", 0).text("Content Type");

  STACK_KEYS.forEach((key, index) => {
    const row = legend
      .append("g")
      .attr("transform", `translate(0, ${22 + index * 24})`);

    row
      .append("rect")
      .attr("width", 14)
      .attr("height", 14)
      .attr("rx", 2)
      .attr("fill", COLORS[key]);

    row
      .append("text")
      .attr("class", "legend-label")
      .attr("x", 22)
      .attr("y", 11)
      .text(LABELS[key]);
  });

  statusText.text(
    `${d3.format(",")(barCount)} genres · tri croissant par part de contenu explicite`,
  );
}

function init() {
  if (window.location.protocol === "file:") {
    statusText.text('Ouvre via le serveur local : cd Project, puis npm start, puis /duration-explicit/explicit-stacked.html');
    return;
  }

  if (typeof d3 === "undefined") {
    statusText.text("D3 n'a pas pu se charger. Vérifie ta connexion internet.");
    return;
  }

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 150);
  });

  statusText.text("Chargement de Project/dataset.csv…");

  d3.csv(DATASET_URL, d3.autoType)
    .then((rows) => {
      if (!rows || !rows.length) {
        throw new Error("dataset.csv est vide ou introuvable");
      }

      aggregateByGenre(rows);
      if (!genreStats.length) {
        throw new Error("Aucun genre valide après agrégation");
      }

      requestAnimationFrame(render);
    })
    .catch((error) => {
      console.error(error);
      statusText.text(`Erreur : ${error.message}. Lance "npm start" dans le dossier Project.`);
    });
}

init();
