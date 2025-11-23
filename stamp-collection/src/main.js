import * as d3 from "d3";
import { themeBuckets } from "./constants/themes.js";
import { colors } from "./constants/colors.js";
import { historicalContext } from "./constants/context.js";
import { images, titles, ids } from "./constants/images.js";
import stampsJSON from "./data/stamps.json" assert { type: "json" };
import embeddingsJSON from "./data/embeddings.json" assert { type: "json" };
import detectedJSON from "./data/detected-all.json" assert { type: "json" };
import colorsJSON from "./data/colors.json" assert { type: "json" };
import { getAndParseAllData } from "./fetch-data.js";
import contextRegex from "./constants/text.js";
import { processInfo } from "./constants/process-info.js";
import { getColorsForDecadeAndTheme } from "./data/color-analyzer.js";

// constant to store initial data from fetch
let allStamps = [];
let allDecades = [];

// to use as state variables and pull from to update filtering
let state = {
  selectedDecade: 1760,
  stamps: [],
  themeBuckets: [],
  historicalContext: '',
  words: [],
  materials: [],
  colors: [],
  decades: [],
  featuredStamp: null,
  aboutSection: {
    isOpen: false,
    colIndex: null
  },
  fullScreenStamp: null
}

// for the selected decade, materials, and colors update the stamps and decades
const getFilteredStampData = () => {
  const { stamps, materials, words, colors } = state;
  let hasActiveFilters = false;

  let filteredStamps = allStamps;

  // Get currently selected filters
  const selectedMaterials = materials.filter(m => m.selected).map(m => m.name);
  const selectedWords = words.filter(w => w.selected).map(w => w.text);

  // Apply each filter type if any are selected
  if (selectedMaterials.length > 0) {
    hasActiveFilters = true;
    filteredStamps = filteredStamps.filter(stamp =>
      selectedMaterials.every(mat =>
        stamp.materials.some(m => m.toLowerCase() === mat.toLowerCase())
      )
    );
  }

  if (selectedWords.length > 0) {
    hasActiveFilters = true;
    filteredStamps = filteredStamps.filter(stamp => {
      const title = stamp.title.toLowerCase();
      const desc = stamp.description.toLowerCase();
      return selectedWords.every(word =>
        title.includes(word.toLowerCase()) || desc.includes(word.toLowerCase())
      );
    });
  }

  state.stamps = filteredStamps;

  const resetFiltersButton = document.getElementById("reset-filters");
  if (hasActiveFilters) {
    // Show the reset filters button
    resetFiltersButton.style.display = "block";
    resetFiltersButton.onclick = () => {
      resetFilters();
    };
  } else {
    // Hide the reset filters button
    resetFiltersButton.style.display = "none";
  }

  return filteredStamps;
}

const resetFilters = () => {
  state.materials.forEach(m => m.selected = false);
  state.words.forEach(w => w.selected = false);
  state.colors.forEach(c => c.selected = false);

  groupAndDisplayData();
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
        stamps: data.stamps, // full stamp objects included
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

const getAspectRatio = (stamp) => {
  const aspectRatio = stamp.media[0].resources?.[0]?.width / stamp.media[0].resources?.[0]?.height;

  let stampRatio = "";

  if ((aspectRatio > 1.05 && aspectRatio < 1.3) || stamp.decade === 1780) {
    stampRatio = "horizontal";
  } else if (aspectRatio >= 0.95 && aspectRatio <= 1.05) {
    stampRatio = "square";
  } else if (aspectRatio > 1.3 && aspectRatio <= 1.5) {
    stampRatio = "wide";
  } else if (aspectRatio > 1.5 && aspectRatio <= 1.8) {
    stampRatio = "extra-wide";
  } else if (aspectRatio > 1.8) {
    stampRatio = "widest";
  } else if (aspectRatio < 0.6) {
    stampRatio = "tall";
  }

  return stampRatio;
}

const fetchStampData = () => {
  getAndParseAllData().then(async (stampData) => {
    stampData.forEach((stamp) => {
      stamp.embedding = embeddingsJSON.find(e => e.id === stamp.id)?.embedding || null;
      stamp.detected = detectedJSON.find(d => d.id === stamp.id)?.detected || null;
      // Find the color data object and assign it to stamp.colors
      const colorData = colorsJSON.find(c => c.id === stamp.id);
      stamp.colors = colorData ? { colorData: colorData.colorData } : null;
      stamp.aspectRatio = getAspectRatio(stamp);
    });

    // update allStamps after merging
    allStamps = stampData;
    state.stamps = stampData;

    const grouped = groupByDecadeAndTheme(allStamps);
    allDecades = Object.keys(grouped).map(d => Number(d)).sort((a, b) => a - b);
    state.decades = allDecades; // Initially all decades are available

    setupEntryButton();
    drawTimeSlider(allDecades);

    // set title with the total number of stamps
    const titleText = document.querySelector("#data-title-text");
    titleText.innerHTML = `<strong>America’s Stamp Collection / 1765-1894</strong> (${stampData.length} stamps)`;
    titleText.onclick = () => {
      enterHomepage();
    }
  });
}

const fetchStampDataForDev = async () => {
  stampsJSON.forEach((stamp) => {
    stamp.embedding = embeddingsJSON.find(e => e.id === stamp.id)?.embedding || null;
    stamp.detected = detectedJSON.find(d => d.id === stamp.id)?.detected || null;
    // Find the color data object and assign it to stamp.colors
    const colorData = colorsJSON.find(c => c.id === stamp.id);
    stamp.colors = colorData ? { colorData: colorData.colorData } : null;
  });

  // update allStamps after merging
  allStamps = stampData;
  state.stamps = stampData;

  const grouped = groupByDecadeAndTheme(allStamps);
  allDecades = Object.keys(grouped).map(d => Number(d)).sort((a, b) => a - b);
  state.decades = allDecades; // Initially all decades are available

  setupEntryButton();
  drawTimeSlider(allDecades);

  // set title with the total number of stamps
  const titleText = document.querySelector("#data-title-text");
  titleText.innerHTML = `<strong>America’s Stamp Collection / 1765-1894</strong> (${stampsJSON.length} stamps)`;
  titleText.onclick = () => {
    enterHomepage();
  }
}

const setupEntryButton = () => {
  const entryButton = document.querySelector("#entry-button");
  entryButton.style.display = "inline-block";

  entryButton.addEventListener("click", (e) => {
    enterVisualization();
  })
}

const enterVisualization = () => {
  const introSection = document.querySelector("#intro-section");
  introSection.style.display = "none";
  
  const dataSection = document.querySelector("#data");
  dataSection.style.display = "block";
  groupAndDisplayData();
  
  setupClickableHeadings();
}

const enterHomepage = () => {
  const introSection = document.querySelector("#intro-section");
  introSection.style.display = "block";

  const dataSection = document.querySelector("#data");
  dataSection.style.display = "none";
}

const updateTimeSliderVisibility = () => {
  // Update tick visibility based on available decades
  d3.selectAll("line.tick")
    .style("opacity", d => state.decades.includes(d) ? 1 : 0);
  
  // Update tick area clickability
  d3.selectAll("rect.tick-area")
    .style("pointer-events", d => state.decades.includes(d) ? "auto" : "none")
    .style("cursor", d => state.decades.includes(d) ? "pointer" : "default");
}

const drawTimeSlider = (decades) => {
  const sliderSection = document.querySelector("#slider-container");
  sliderSection.style.display = "block";

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
    .text(d => d === state.selectedDecade ? d : '');

  // add line for current position indicator
  const lineIndicator = timeline.append("line")
    .attr("class", "indicator-line")
    .attr("x1", 0)
    .attr("x2", 35)
    .attr("y1", y(state.selectedDecade))
    .attr("y2", y(state.selectedDecade))
    .attr("stroke", colors.middle)
    .attr("stroke-width", 1);

  // add circle for current position indicator
  const circleIndicator = timeline.append("circle")
    .attr("class", "position-indicator")
    .attr("cx", 0)
    .attr("cy", y(state.selectedDecade))
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
      state.selectedDecade = d;
      lineIndicator.transition()
        .duration(150)
        .attr("y1", y(state.selectedDecade))
        .attr("y2", y(state.selectedDecade));
      circleIndicator.transition()
        .duration(150)
        .attr("cy", y(state.selectedDecade));

      // const dataToDisplay = groupedData.filter((item) => item.decade == state.selectedDecade).sort((a, b) => b.count - a.count);
      timeline.selectAll("text.decade-label").text(dd => dd === state.selectedDecade ? dd : '');
      groupAndDisplayData();
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
      
      stampsContainer.append("div")
        .attr("class", () => {
          const baseClass = "stamp-image-container-small";
          const finalClass = !!stamp.aspectRatio ? `${baseClass} ${stamp.aspectRatio}-stamp` : baseClass;
          return finalClass;
        })
        .append("img")
        .attr("class", "stamp-image-small")
        .attr("src", imageUrl)
        .attr("alt", stamp.title)
        .on("click", () => {
          state.fullScreenStamp = stamp;
          toggleStampModal();
        });
        
    });
  });
}

const toggleStampModal = () => {
  const modal = document.querySelector("#modal");
  const modalContent = modal.querySelector(".modal-content");

  if (state.fullScreenStamp) {
    modal.style.display = "block";

    const imgSizeParam = "max";
    const imgSizeValue = 1500;
    const imageUrl = state.fullScreenStamp.thumbnail + `&${imgSizeParam}=${imgSizeValue}`;

    const imageContainer = document.querySelector("#modal-image");

    if (state.fullScreenStamp.aspectRatio === "tall") {
      imageContainer.classList.add("tall-modal-image");
    }

    const img = imageContainer.querySelector("img");

    img.src = imageUrl;
    img.alt = state.fullScreenStamp.title;


    const textContainer = modal.querySelector("#modal-text").querySelector('.text');
    const titleElem = document.createElement("h2");
    titleElem.textContent = state.fullScreenStamp.title;
    const descElem = document.createElement("p");
    descElem.textContent = state.fullScreenStamp.description;
    textContainer.appendChild(titleElem);
    textContainer.appendChild(descElem);

    const closeButton = document.querySelector("#close-modal-button");
    closeButton.onclick = () => {
      state.fullScreenStamp = null;
      modal.style.display = "none";
      img.src = "";
      img.alt = "";
      textContainer.innerHTML = "";
      imageContainer.classList.remove("tall-modal-image");
    }
  }
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

const updateSelectedWords = (wordSpan) => {
  const wordObj = state.words.find(w => w.text === wordSpan.textContent);
  if (!wordObj?.selected) {
    wordObj.selected = true;
    wordSpan.classList.add("selected-word");
  } else {
    wordObj.selected = false;
    wordSpan.classList.remove("selected-word");
  }

  groupAndDisplayData();
}

const updateHistory = () => {
  // Store currently selected words BEFORE clearing
  const previouslySelected = state.words
    .filter(w => w.selected)
    .map(w => w.text);
  
  // Clear previous words
  state.words = [];

  // update the historical context paragraph
  const histContext = document.querySelector("#historical-context");
  const content = historicalContext[state.selectedDecade];
  
  // Helper function to check if a word appears in the filtered stamps
  const wordExistsInStamps = (word) => {
    const wordLower = word.toLowerCase();
    const wordRegex = new RegExp(`\\b${wordLower}`, 'i');
    
    return state.stamps.some(stamp => {
      const title = stamp.title.toLowerCase();
      const desc = stamp.description.toLowerCase();
      return stamp.decade === state.selectedDecade && (wordRegex.test(title) || wordRegex.test(desc));
    });
  };

  // parse content to match all context words found and wrap in spans
  const parsedContent = content.replace(contextRegex, (match) => {
    // Only make it clickable if the word exists in filtered stamps
    if (wordExistsInStamps(match)) {
      const wasSelected = previouslySelected.includes(match);
      state.words.push({ text: match, selected: wasSelected });
      
      const selectedClass = wasSelected ? ' selected-word' : '';
      return `<span class="filter-word${selectedClass}">${match}</span>`;
    } else {
      // Word doesn't exist in filtered stamps, render as plain text
      return match;
    }
  });

  histContext.innerHTML = parsedContent;


  const filterWords = document.querySelectorAll(".filter-word");
  filterWords.forEach((wordSpan) => {
    wordSpan.addEventListener("click", () => {
      updateSelectedWords(wordSpan);
    });
  });
}

const updateSelectedMaterials = (materialText) => {
  const material = state.materials.find(mat => mat.name === materialText.textContent.toLowerCase());
  if (!material?.selected) {
    material.selected = true;
    materialText.classList.add("selected-word");
  } else {
    material.selected = false;
    materialText.classList.remove("selected-word");
  }

  groupAndDisplayData();
}

const updateMaterials = (data) => {
  // clear previous materials
  const featuredMaterialsContainer = document.querySelector("#featured-materials");

  // Store currently selected materials BEFORE clearing
  const previouslySelected = state.materials
    .filter(m => m.selected)
    .map(m => m.name);
  
  featuredMaterialsContainer.innerHTML = "";
  state.materials = [];

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
    const materialDiv = document.createElement("div");
    const materialText = document.createElement("p");
    materialDiv.className = "material-item";
    materialText.innerHTML = material;
    materialDiv.appendChild(materialText);

    materialDiv.onclick = () => updateSelectedMaterials(materialText);

     // Check if this material was previously selected
    const wasSelected = previouslySelected.includes(material);
    
    // Add to state with restored selection state
    state.materials.push({ name: material, selected: wasSelected });
    
    // Apply selected class if it was selected
    if (wasSelected) {
      materialText.classList.add("selected-word");
    }
    
    featuredMaterialsContainer.appendChild(materialDiv);
  });
}

const updateColors = (data) => {
  const swatches = document.querySelectorAll(".color-swatch");
  swatches.forEach(s => {
    s.style.backgroundColor = "transparent";
  });

  // Get top 5 colors from the most common theme for this decade
  const topThemeGroup = data[0]; // data is already sorted by count descending
  
  if (topThemeGroup && topThemeGroup.stamps) {
    const topColors = getColorsForDecadeAndTheme(
      data, 
      state.selectedDecade, 
      topThemeGroup.theme, 
      5
    );
    
    // update color swatches with the analyzed colors
    swatches.forEach((s, idx) => {
      if (topColors[idx]) {
        s.style.backgroundColor = topColors[idx];
      }
    });
  }
}

const updateFeaturedImg = () => {
  const container = document.querySelector(".stamp-image-container");
  
  // Clear any existing content
  container.innerHTML = "";

  // Use the featured stamp that was already determined in groupAndDisplayData
  const featuredStamp = state.featuredStamp;
  
  if (!featuredStamp) {
    return;
  }

  // Check if this stamp has a local image available
  const stampDecade = featuredStamp.decade || state.selectedDecade;
  const hasLocalImage = ids[stampDecade] === featuredStamp.id;


   // For preprocessed stamps with local images, use <img> tag
  if (hasLocalImage) {
    const img = document.createElement('img');
    img.id = 'stamp-highlight-image';
    img.className = 'stamp-highlight-thumbnail';
    img.src = images[stampDecade];
    img.alt = titles[stampDecade];
    
    // Apply aspect ratio class for proper styling
    const aspectRatioClass = state.stamps.find(s => s.id === featuredStamp.id)?.aspectRatio;
    if (!!aspectRatioClass) {
      img.classList.add(`${aspectRatioClass}-stamp-thumbnail`);
    }
    
    container.appendChild(img);
    return;
  }

  // For stamps with detection data, use canvas
  const canvas = document.createElement('canvas');
  canvas.id = 'stamp-highlight-canvas';
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  container.appendChild(canvas);
  
  const ctx = canvas.getContext('2d');

  // create a new div to fill with the top color for loading
  const loadingDiv = document.createElement('div');
  loadingDiv.classList.add('featured-stamp-loading');
  container.appendChild(loadingDiv);

  // Show loading state with top color from stamp's color data
  if (featuredStamp.colors && featuredStamp.colors.colorData?.length > 0) {
    const topColor = featuredStamp.colors.colorData.sort((a, b) => b.population - a.population)[0];
    loadingDiv.style.backgroundColor = topColor.hex || colors.light;
  }

  // Force a reflow to ensure the initial opacity: 0 state is rendered
  // before adding show-loading class
  loadingDiv.offsetHeight;
  
  loadingDiv.classList.add('show-loading');

  // Create an image object to load the stamp
  const tempImg = new Image();
  tempImg.crossOrigin = "Anonymous";
  
  const imgSizeParam = "max";
  const imgSizeValue = 800;
  tempImg.src = featuredStamp.thumbnail + `&${imgSizeParam}=${imgSizeValue}`;
  
  
  // When image loads, draw it to canvas (with cropping if detection data exists)
  tempImg.onload = function() {
    // Check if we have detection data to crop
    let detectedData = featuredStamp.detected || [];
    if (detectedData.length > 0 && !hasLocalImage) {
      // look at the differences between boxes and either choose the first one if the differences are large (> 1.0 for score)
      // or the next cluster if the differences are small
      let bestDetection = detectedData[0];

      // if selected decade is > 1800, filter out embossed and postmark
      // if selected decade is == 1800, filter for ONLY embossed
      if (state.selectedDecade > 1800) {
        detectedData = detectedData.filter(d => d.label !== 'postmark' && d.label !== 'embossed');
      } else if (state.selectedDecade === 1800) {
        detectedData = detectedData.filter(d => d.type === 'embossed');
      }

      if (detectedData.length === 0) {
        // If filtering removed everything, use the original best
        detectedData = featuredStamp.detected;
        bestDetection = detectedData[0];
      } else {
        // Find clusters: group detections that are within 0.1 score of each other
        const scoreDiffThreshold = 0.1;
        const highestScore = detectedData[0].score;
        let largestCluster = [];
        
        for (let i = 0; i < detectedData.length; i++) {
          let cluster = [detectedData[i]];
          
          // Find all detections within scoreDiffThreshold of this one
          for (let j = i + 1; j < detectedData.length; j++) {
            if (Math.abs(detectedData[i].score - detectedData[j].score) <= scoreDiffThreshold) {
              cluster.push(detectedData[j]);
            }
          }
          
          // Keep track of the largest cluster
          if (cluster.length > largestCluster.length) {
            largestCluster = cluster;
          }
        }
        
        // If we found a cluster of 3+, use the highest scored one from that cluster
        if (largestCluster.length >= 3) {
          const clusterHighestScore = largestCluster[0].score;
          
          // Only use cluster if it's within 0.3 of the absolute highest score
          if (highestScore - clusterHighestScore <= 0.3) {
            bestDetection = largestCluster[0];
          } else {
            // Cluster is too far from highest, use the highest scored detection
            bestDetection = detectedData[0];
           }
        } else {
          // No cluster found, use the highest scored detection
          bestDetection = detectedData[0];
        }
      }

      const [x1, y1, x2, y2] = bestDetection.box;
      
      // Calculate detection box in pixel coordinates
      const sourceX = x1 * tempImg.width;
      const sourceY = y1 * tempImg.height;
      const sourceWidth = (x2 - x1) * tempImg.width;
      const sourceHeight = (y2 - y1) * tempImg.height;
      
      // Calculate how to fit the detection box into the canvas while maintaining aspect ratio
      const sourceAspect = sourceWidth / sourceHeight;
      const canvasAspect = canvas.width / canvas.height;
      
      let destX = 0, destY = 0, destWidth = canvas.width, destHeight = canvas.height;
      
      if (sourceAspect > canvasAspect) {
        // Source is wider - fit to width
        destHeight = canvas.width / sourceAspect;

        // center vertically unless the aspect ratio is very wide
        if (sourceAspect < 1.2) {
          destY = (canvas.height - destHeight) / 2;
        } else {
          destY = 32;
        }
      } else {
        // Source is taller - fit to height, center horizontally
        destWidth = canvas.height * sourceAspect;
        destX = (canvas.width - destWidth) / 2;
      }
      // Draw the cropped portion of the image
      ctx.drawImage(
        tempImg,
        sourceX, sourceY, sourceWidth, sourceHeight,  // Source rectangle (detection box)
        destX, destY, destWidth, destHeight            // Destination rectangle (canvas)
      );
    } else {
      // No detection data - draw full image
      const imgAspect = tempImg.width / tempImg.height;
      const canvasAspect = canvas.width / canvas.height;
      
      let destX = 0, destY = 0, destWidth = canvas.width, destHeight = canvas.height;
      
      if (imgAspect > canvasAspect) {
        // Image is wider - fit to height, center horizontally
        destWidth = canvas.height * imgAspect;
        destX = (canvas.width - destWidth) / 2;
      } else {
        // Image is taller - fit to width, center vertically
        destHeight = canvas.width / imgAspect;
        destY = (canvas.height - destHeight) / 2;
      }
      // Draw the full image
      ctx.drawImage(tempImg, destX, destY, destWidth, destHeight);
    }


    loadingDiv.classList.remove('show-loading');
  };
}

const updateStampsCount = (data) => {
  // calculate total number of stamps in this decade
  let stampsCount = 0;
  data.forEach((d) => {
    stampsCount += d.count;
  });
}

// when passed to here the data is already sorted by count descending and filtered by decade
const updateHeading = (data, shouldUpdateFeatured = true) => {
  updateStampsCount(data);
  updateColors(data);

  updateThemes(data);
  updateHistory(data);

  updateMaterials(data);

  if (shouldUpdateFeatured) {
    updateFeaturedImg();
  }
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

const setupClickableHeadings = () => {
  const clickableHeadings = document.querySelectorAll(".col-heading");

  clickableHeadings.forEach((heading, index) => {
    heading.onclick = () => toggleAboutInfo(index);
  });
}

const getFeaturedStamp = (dataToDisplay) => {
  const currFeaturedStamp = state.featuredStamp;

  const currFeaturedInStamps = state.stamps.find(s => s.id === currFeaturedStamp?.id);

  const defaultStampId = ids[state.selectedDecade];
  const defaultStamp = images[state.selectedDecade];
  const defaultFeaturedInStamps = state.stamps.find(s => s.id === defaultStampId);

  const topTheme = dataToDisplay[0];

  if (defaultFeaturedInStamps) {
    return defaultFeaturedInStamps;
  } else {
    const currFeaturedInTopTheme = topTheme?.stamps.find(s => s.id === currFeaturedStamp.id);
    if (currFeaturedInStamps && currFeaturedInTopTheme) {
      return currFeaturedStamp;
    } else if (topTheme?.stamps.length > 0) {
      return topTheme.stamps[0];
    }
  }

  return defaultStamp;
}

const groupAndDisplayData = () => {
  const filteredStamps = getFilteredStampData();
  const grouped = groupByDecadeAndTheme(filteredStamps);

  // Update available decades from grouped data
  const availableDecades = Object.keys(grouped).map(d => Number(d)).sort((a, b) => a - b);
  const hasActiveFilters = state.materials.some(m => m.selected) || state.words.some(w => w.selected);
  
  state.decades = hasActiveFilters ? availableDecades : allDecades;
  
  updateTimeSliderVisibility();

  const groupedForDecade = { [state.selectedDecade]: grouped[state.selectedDecade] } || {};

  const flattened = flattenGroupedData(groupedForDecade);
  const dataToDisplay = flattened.sort((a, b) => b.count - a.count);

  const currFeaturedStamp = state.featuredStamp;

  // Store the featured stamp in state
  const newFeaturedStamp = getFeaturedStamp(dataToDisplay);

  let shouldUpdateFeatured = false;
  if (currFeaturedStamp !== newFeaturedStamp) {
    shouldUpdateFeatured = true;
    state.featuredStamp = newFeaturedStamp;
  }

  // Sort each theme group based on similarity to the featured stamp
  flattened.forEach(group => {
    group.stamps.sort((a, b) => {
      if (a.embedding && b.embedding) {
        const featuredEmbedding = state.featuredStamp.embedding;
        return distToStamp(a, b, featuredEmbedding);
      } else {
        return 0;
      }
    });
  });

  const barsContainer = document.querySelector("#bars-container");
  barsContainer.innerHTML = "";

  updateHeading(dataToDisplay, shouldUpdateFeatured);
  drawBars(dataToDisplay);
}

fetchStampData();