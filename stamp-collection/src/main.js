import * as d3 from "d3";
import { themeBuckets } from "./constants/themes.js";
import { colors } from "./constants/colors.js";
import { historicalContext, postalContext } from "./constants/context.js";
import { images, titles, ids } from "./constants/images.js";
import stampsJSON from "./data/stamps.json" assert { type: "json" };
import embeddingsJSON from "./data/embeddings.json" assert { type: "json" };
import colorsJSON from "./data/decade-colors.json" assert { type: "json" };
import { getAndParseAllData } from "./fetch-data.js";
import contextRegex from "./constants/text.js";
import { processInfo } from "./constants/process-info.js";

// state variables
let selectedDecade = 1760;
let groupedData = [];

// to use as state variables and pull from to update heading
let state = {
  selectedDecade: 1760,
  stamps: [],
  themeBuckets: [],
  historicalContext: historicalContext[selectedDecade],
  materials: [],
  colors: [],
  featuredStamp: images[selectedDecade],
  aboutSection: {
    isOpen: false,
    colIndex: null
  }
}

function findBucketForTheme(theme) {
  for (const [bucketName, keywords] of Object.entries(themeBuckets)) {
    if (keywords.map(k => k.toLowerCase()).includes(theme.toLowerCase())) {
      return bucketName;
    }
  }
  return "Other";
}

function groupByDecadeAndTheme(stampData) {
  const result = {};

  stampData.forEach(stamp => {
    const { decade, theme } = stamp;
    if (!result[decade]) result[decade] = {};
    if (!result[decade][theme]) result[decade][theme] = { count: 0, stamps: [] };

    result[decade][theme].count++;
    result[decade][theme].stamps.push(stamp);
  });

  return result;
}

function flattenGroupedData(groupedData) {
  const rows = [];
  for (const [decade, themes] of Object.entries(groupedData)) {
    const decadeNum = Number(decade);
    for (const [theme, data] of Object.entries(themes)) {
      rows.push({
        decade: decadeNum,
        theme,           // single string
        count: data.count,
        stamps: data.stamps // full stamp objects included
      });
    }
  }
  return rows;
}

function distToStamp(A, B, stampEmbedding) {
  const embeddingA = A.embedding;
  const embeddingB = B.embedding;
  let diffSumA = 0
  let diffSumB = 0

  for (let idx = 0; idx < stampEmbedding.length; idx++) {
    diffSumA += (embeddingA[idx] - stampEmbedding[idx]) ** 2;
    diffSumB += (embeddingB[idx] - stampEmbedding[idx]) ** 2;
  }

  return diffSumA - diffSumB;
}

const fetchStampData = () => {
  getAndParseAllData().then((stampData) => {
    stampData.forEach((stamp) => {
      stamp.embedding = embeddingsJSON.find(e => e.id === stamp.id)?.embedding || null;
    });

    // group data by decade and theme
    const grouped = groupByDecadeAndTheme(stampData);
    groupedData = flattenGroupedData(grouped);
    
    // fetch colors from json and add to object to look up by decade
    groupedData.forEach(group => {
      const colors = colorsJSON[group.decade];
      group.colors = colors;
    });

    // sort stamps within their decade and theme by their distance from the featured image id
    groupedData.forEach(group => {
      group.stamps.sort((a, b) => {
        if (a.embedding && b.embedding) {
          const featuredStamp = stampData.find(s => s.id === ids[group.decade]);
          let featuredEmbedding = featuredStamp.embedding;
          if (!featuredEmbedding) {
            featuredEmbedding = stamps[0].embedding; // fallback to first stamp embedding
          }
          return distToStamp(a, b, featuredEmbedding);
        } else {
          return 0;
        }
      });
    });

    drawTimeSlider(groupedData);

    setupEntryButton(groupedData);

    // set title with the total number of stamps
    const titleText = document.querySelector("#data-title-text");
    titleText.innerHTML = `<strong>America’s Stamp Collection / 1765-1894</strong> (${stampData.length} stamps)`;
    titleText.onclick = () => {
      enterHomepage();
    }
  });
}

const fetchStampDataForDev = () => {
  stampsJSON.forEach((stamp) => {
    stamp.embedding = embeddingsJSON.find(e => e.id === stamp.id)?.embedding || null;
  });
  
  // group data by decade and theme
  const grouped = groupByDecadeAndTheme(stampsJSON);
  groupedData = flattenGroupedData(grouped);
  
  // fetch colors from json and add to object to look up by decade
  groupedData.forEach(group => {
    const colors = colorsJSON[group.decade];
    group.colors = colors;
  });

  // sort stamps within their decade and theme by their distance from the featured image id
  groupedData.forEach(group => {
    group.stamps.sort((a, b) => {
      if (a.embedding && b.embedding) {
        const featuredStamp = stampsJSON.find(s => s.id === ids[group.decade]);
        let featuredEmbedding = featuredStamp.embedding;
        if (!featuredEmbedding) {
          featuredEmbedding = stamps[0].embedding; // fallback to first stamp embedding
        }
        return distToStamp(a, b, featuredEmbedding);
      } else {
        return 0;
      }
    });
  });

  drawTimeSlider(groupedData);

  setupEntryButton(groupedData);

  // set title with the total number of stamps
  const titleText = document.querySelector("#data-title-text");
  titleText.innerHTML = `<strong>America’s Stamp Collection / 1765-1894</strong> (${stampsJSON.length} stamps)`;
  titleText.onclick = () => {
    enterHomepage();
  }
}

const setupEntryButton = (data) => {
  const entryButton = document.querySelector("#entry-button");
  entryButton.style.display = "inline-block";

  entryButton.addEventListener("click", (e) => {
    enterVisualization(data);
  })
}

const enterVisualization = (data) => {
  const introSection = document.querySelector("#intro-section");
  introSection.style.display = "none";

  const dataToDisplay = data.filter((item) => item.decade == selectedDecade).sort((a, b) => b.count - a.count);
  displayData(dataToDisplay);
}

const enterHomepage = () => {
  const introSection = document.querySelector("#intro-section");
  introSection.style.display = "block";

  const dataSection = document.querySelector("#data");
  dataSection.style.display = "none";
}

const drawTimeSlider = (data) => {
  const sliderSection = document.querySelector("#slider-container");
  sliderSection.style.display = "block";
  const decades = [...new Set(data.map(d => d.decade))].sort((a, b) => a - b);

  // Create vertical timeline structure
  const margin = { top: 10, right: 0, bottom: 10, left: 10 };
  const width = 110; // Match CSS width
  const height = 300;

  const svg = d3.select("#slider-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("display", "block");

  // Create vertical scale
  const y = d3.scaleLinear()
    .domain([d3.min(decades), d3.max(decades)])
    .range([margin.top, height - margin.bottom]);

  const timeline = svg.append("g")
    .attr("class", "timeline")
    .attr("transform", `translate(${margin.left},0)`);

  // Draw vertical line
  timeline.append("line")
    .attr("class", "track")
    .attr("x1", 0)
    .attr("x2", 0)
    .attr("y1", y.range()[0])
    .attr("y2", y.range()[1])
    .attr("stroke", colors.middle)
    .attr("stroke-width", 1)
    .attr("stroke-linecap", "round");

  // Add decade ticks and labels
  timeline.selectAll("line.tick")
    .data(decades)
    .enter()
    .append("line")
    .attr("class", "tick")
    .attr("x1", -8)
    .attr("x2", 8)
    .attr("y1", d => y(d))
    .attr("y2", d => y(d))
    .attr("stroke", colors.middle)
    .attr("stroke-width", 1);

  timeline.selectAll("text.decade-label")
    .data(decades)
    .enter()
    .append("text")
    .attr("class", "decade-label")
    .attr("x", 40)
    .attr("y", d => y(d))
    .attr("dy", "0.35em")
    .attr("text-anchor", "start")
    .style("font-size", "14px")
    .text(d => d === selectedDecade ? d : '');

  // add line for current position indicator
  const lineIndicator = timeline.append("line")
    .attr("class", "indicator-line")
    .attr("x1", 0)
    .attr("x2", 35)
    .attr("y1", y(selectedDecade))
    .attr("y2", y(selectedDecade))
    .attr("stroke", colors.middle)
    .attr("stroke-width", 1);

  // add circle for current position indicator
  const circleIndicator = timeline.append("circle")
    .attr("class", "position-indicator")
    .attr("cx", 0)
    .attr("cy", y(selectedDecade))
    .attr("r", 8)
    .attr("fill", colors.dark);

  // add click interaction to ticks with padding around using invisible rects
  const tickPadding = 10;
  timeline.selectAll("rect.tick-area")
    .data(decades)
    .enter()
    .append("rect")
    .attr("class", "tick-area")
    .attr("x", -8 - tickPadding)
    .attr("y", d => y(d) - tickPadding)
    .attr("width", 16 + tickPadding * 2)
    .attr("height", tickPadding * 2)
    .attr("fill", "transparent")
    .style("cursor", "pointer")
    .on("click", function(event, d) {
      selectedDecade = d;
      lineIndicator.transition()
        .duration(150)
        .attr("y1", y(selectedDecade))
        .attr("y2", y(selectedDecade));
      circleIndicator.transition()
        .duration(150)
        .attr("cy", y(selectedDecade));
      
      const dataToDisplay = groupedData.filter((item) => item.decade == selectedDecade).sort((a, b) => b.count - a.count);
      timeline.selectAll("text.decade-label").text(dd => dd === selectedDecade ? dd : '');
      displayData(dataToDisplay);
    });
}

const drawBars = (data) => {
  // Display stamp thumbnails grouped by theme with labels on the left
  const container = d3.select("#bars-container");
  
  // Create a div for each theme group
  data.forEach(themeData => {
    const themeRow = container.append("div")
      .attr("class", "bar-container");
    
    // Left side: theme label and count
    const labelContainer = themeRow.append("div")
      .attr("class", "label")
    
    labelContainer.append("p")
      .attr("class", "theme-title")
      .text(themeData.theme);
    
    labelContainer.append("p")
      .text(`(${themeData.count})`);
    
    // Right side: stamp thumbnails
    const stampsContainer = themeRow.append("div")
      .attr("class", "bar");
    
    // Display stamp thumbnails
    themeData.stamps.forEach(stamp => {
      const imgSizeParam = "max";
      const imgSizeValue = 200;
      const imageUrl = stamp.thumbnail + `&${imgSizeParam}=${imgSizeValue}`;

      const aspectRatio = stamp.media[0].resources?.[0]?.width / stamp.media[0].resources?.[0]?.height;
      const isSquare = aspectRatio >= 0.95 && aspectRatio <= 1.05;
      const isHorizontal = (aspectRatio > 1.05 && aspectRatio < 1.3)|| selectedDecade === 1780;
      const isWideStamp = aspectRatio > 1.3 && aspectRatio <= 1.5;
      const isExtraWideStamp = aspectRatio > 1.5 && aspectRatio <= 1.8;
      const isWidestStamp = aspectRatio > 1.8;
      const isTall = aspectRatio < 0.6;
      
      stampsContainer.append("div")
        .attr("class", () => {
          const baseClass = "stamp-image-container-small";
          let finalClass = baseClass;
          if (isSquare) {
            finalClass += " square-stamp";
          } else if (isTall) {
            finalClass += " tall-stamp";
          } else if (isWidestStamp) {
            finalClass += " widest-stamp";
          } else if (isExtraWideStamp) {
            finalClass += " extra-wide-stamp";
          } else if (isWideStamp) {
            finalClass += " wide-stamp";
          } else if (isHorizontal) {
            finalClass += " horizontal-stamp";
          }
          return finalClass;
        })
        .append("img")
        .attr("class", "stamp-image-small")
        .attr("src", imageUrl)
        .attr("alt", stamp.title);
        
    });
  });
}

const updateDecade = () => {
}

const updateThemes = (data) => {
  const mainThemes = document.querySelector("#chart-main-themes");
  const seenBuckets = new Set();
  const topBuckets = [];

  for (const themeObj of data) {
    const bucket = findBucketForTheme(themeObj.theme);
    if (!seenBuckets.has(bucket)) {
      topBuckets.push(bucket);
      seenBuckets.add(bucket);
    }
    if (topBuckets.length >= 2) break;
  }

  mainThemes.innerHTML = topBuckets.join(", ");
}

const updateHistory = () => {
  // update the historical context paragraph
  const histContext = document.querySelector("#historical-context");
  const content = historicalContext[selectedDecade];

  // parse content to match all context words found and wrap in spans
  const parsedContent = content.replace(contextRegex, (match) => {
    return `<span class="filter-word">${match}</span>`;
  });

  histContext.innerHTML = parsedContent;
}

const updateMaterials = (data) => {
  // clear previous materials
  const featuredMaterialsContainer = document.querySelector("#featured-materials");
  featuredMaterialsContainer.innerHTML = "";

  // update the featured materials to fetch those with highest frequency for the top theme
  const topThemeStamps = data[0]?.stamps || [];
  const materialCounts = {};
  topThemeStamps.forEach((stamp) => {
    stamp.materials.forEach((material) => {
      const matLower = material.toLowerCase();
      if (materialCounts[matLower]) {
        materialCounts[matLower]++;
      } else {
        materialCounts[matLower] = 1;
      }
    });
  });


  // sort materials by frequency
  const sortedMaterials = Object.entries(materialCounts).sort((a, b) => b[1] - a[1]);
  const topMaterials = sortedMaterials.slice(0, 5).map(entry => entry[0]);

  topMaterials.forEach((material) => {
    const materialTag = document.createElement("p");
    materialTag.className = "material-item";
    materialTag.textContent = material;
    featuredMaterialsContainer.appendChild(materialTag);
  });
}

const updateColors = (data) => {
  const swatches = document.querySelectorAll(".color-swatch");
  swatches.forEach(s => {
    s.style.backgroundColor = "transparent";
  });

  // update color swatches for this selected decade
  swatches.forEach((s, idx) => {
    const decadeColors = data[0]?.colors || [];
    s.style.backgroundColor = decadeColors[idx];
  });
}

const updateFeaturedImg = (data) => {
  // update the stamp highlight image to the featured stamp for the decade
  const img = document.querySelector("#stamp-highlight-image");
  img.src = "";
  img.alt = "";
  img.classList.remove("horizontal-stamp-thumbnail");
  img.classList.remove("tall-stamp-thumbnail");

  if (selectedDecade === 1890 || selectedDecade === 1780 || selectedDecade === 1800) {
    img.classList.add("horizontal-stamp-thumbnail");
  } else if (selectedDecade === 1760 || selectedDecade === 1880) {
    img.classList.add("tall-stamp-thumbnail");
  }

  const stampToDisplay = images[selectedDecade];
  img.src = stampToDisplay;
  img.alt = titles[selectedDecade];
}

const updateStampsCount = (data) => {
  // calculate total number of stamps in this decade
  let stampsCount = 0;
  data.forEach((d) => {
    stampsCount += d.count;
  });
}

// when passed to here the data is already sorted by count descending and filtered by decade
const updateHeading = (data) => {
  updateStampsCount(data);
  updateColors(data)

  updateThemes(data);
  updateHistory(data);

  updateMaterials(data);

  updateFeaturedImg(data);
}

const toggleAboutInfo = (n) => {
  const aboutSection = document.querySelector("#expanded-heading");
  const text = aboutSection.querySelector("#about-text");

  const selectedSection = document.querySelector(`#col-heading-${n}`);
  const carrot = selectedSection.querySelector(".carrot");

  const allCarrots = document.querySelectorAll(".carrot");

  if (state.aboutSection.isOpen && state.aboutSection.colIndex === n) {
    aboutSection.classList.remove("open-expanded-heading");

    carrot?.classList.remove("rotated");

    state.aboutSection.isOpen = false;
    state.aboutSection.colIndex = null;
    return;
  }

  text.innerHTML = processInfo[n];
  state.aboutSection.colIndex = n;

  allCarrots.forEach((carrot) => {
    debugger;
    if (carrot.classList.contains("rotated")) {
      carrot.classList.remove("rotated");
    } else if (carrot.parentElement.id === `col-heading-${n}`) {
      carrot.classList.add("rotated");
    }
  });

  if (!state.aboutSection.isOpen) {
    aboutSection.classList.add("open-expanded-heading");

    state.aboutSection.isOpen = true;
  }
}

const setupHeadingDropdowns = () => {
  const clickableHeadings = document.querySelectorAll(".col-heading");

  clickableHeadings.forEach((heading, index) => {
    heading.onclick = () => toggleAboutInfo(index);
  })
}

const displayData = (data) => {
  // make sure data section is visible
  const dataSection = document.querySelector("#data");
  dataSection.style.display = "block";

  // clear previously drawn bars
  const barsContainer = document.querySelector("#bars-container");
  barsContainer.innerHTML = "";
  
  setupHeadingDropdowns();
  drawBars(data);
  updateHeading(data);
};

fetchStampData();