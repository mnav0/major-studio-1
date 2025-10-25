import * as d3 from "d3";
import { themeBuckets, themeNormalization, themePriority } from "./constants/themes.js";
import { colors } from "./constants/colors.js";
import { historicalContext, postalContext } from "./constants/context.js";
import { Vibrant } from "node-vibrant/browser";
import { images, titles } from "./constants/images.js";

// state variables
let selectedDecade = 1760;
let stampData = [];
let groupedData = [];

// search: fetches an array of terms based on term category
const constructAndFetchQueries = (searchTerm) => {
    // search base URL
    const searchBaseURL = "https://api.si.edu/openaccess/api/v1.0/search"; 

    // API key
    const apiKey = import.meta.env.VITE_SI_API_KEY;

    let url = searchBaseURL + "?api_key=" + apiKey + "&q=" + searchTerm;

    return window
      .fetch(url)
      .then(res => res.json())
      .then(data => {

        // constructing search queries to get all the rows of data
        let pageSize = 1000;
        let numberOfQueries = Math.ceil(data.response.rowCount / pageSize);
        const fetchAllPromises = [];
        let searchAllURL = "";

        for(let i = 0; i < numberOfQueries; i++) {
          // making sure that our last query calls for the exact number of rows
          if (i == (numberOfQueries - 1)) {
            searchAllURL = url + `&start=${i * pageSize}&rows=${data.response.rowCount - (i * pageSize)}`;
          } else {
            searchAllURL = url + `&start=${i * pageSize}&rows=${pageSize}`;
          }

          fetchAllPromises.push(fetchAllData(searchAllURL));
        }

        return Promise.all(fetchAllPromises);
      })
      .catch(error => {
        console.log(error);
      })
  }

// fetching all the data listed under our search and pushing them all into our custom array
const fetchAllData = (url) => {
  return window
    .fetch(url)
    .then(res => res.json())
    .then(data => {
      data.response.rows.forEach(function(n) {
        parseObject(n);
      });
    })
    .catch(error => {
      console.log(error)
    })

}

// add only the necessary data to our array
const parseObject = (objectData) => { 
  let rawYearData;
  const dates = objectData.content.indexedStructured.date;
  if (dates) {
    rawYearData = parseInt(dates[dates.length - 1].slice(0, 4));
  } else if (objectData.content.freetext.date) {
    const firstDateContent = objectData.content.freetext?.date[0].content;
    rawYearData = parseInt(firstDateContent.slice(-4));
  }

  const decade = Math.floor(rawYearData / 10) * 10;

  let currentPlace = "";
  if (objectData.content.indexedStructured.place) {
    currentPlace = objectData.content.indexedStructured.place[0];
  }

  const isUSTopic = objectData.content.indexedStructured.topic?.includes("U.S. Stamps");
  const isUSPlace = currentPlace.toLowerCase().includes("united states");
  if (!(isUSTopic || isUSPlace)) return;

  const notes = objectData.content.freetext.notes?.[0].content || "";
  const title = objectData.title || "";

  let theme;

  // Manual overrides for early decades
  if (decade <= 1800) {
    if (decade === 1760) theme = "British Crown";
    else if (decade === 1780) theme = "Manual postmark";
    else theme = "Embossed postmark";
  } else {
    theme = extractTheme(title);
  }

  const media = objectData.content.descriptiveNonRepeating.online_media?.media;
  const thumbnail = media && media.length > 0 ? media[0].thumbnail : null;

  if (decade && decade < 1900 && theme && thumbnail) {
    stampData.push({
      id: objectData.id,
      thumbnail,
      decade,
      title,
      notes,
      theme // single string
    });
  }
};

// Build regex from all keys/values
const themesRegex = new RegExp(
  "\\b(" +
    [...new Set([
      ...Object.keys(themeNormalization),
      ...Object.values(themeNormalization),
      ...themePriority
    ])].join("|") +
  ")\\b",
  "gi"
);

function extractTheme(text) {
  if (!text) return null;

  const matches = text.match(themesRegex);
  if (!matches) return null;

  // Normalize variants
  const normalized = [...new Set(matches.map(m => {
    const raw = m.toLowerCase();
    return themeNormalization[raw] || m;
  }))];

  // Pick highest priority theme
  for (const theme of themePriority) {
    if (normalized.some(n => n.toLowerCase() === theme.toLowerCase())) {
      return theme;
    }
  }

  return null;
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

const getAndParseAllData = () => {
  // constructing the initial search query to get all stamps
  const allStampsSearch = `unit_code:"NPM" AND object_type:"Postage stamps"`;

  // outliers to fetch the initial stamps from the 1780s
  const processingStampsSearch = `stamp AND unit_code:"NPM" AND date:"1780s"`;

  // outliers to fetch the embossed stamps from the early 1800s
  const embossedStampsSearch = `unit_code:"NPM" AND object_type:"Tax stamps" AND date:"1800s"`;

  const searches = [ allStampsSearch, processingStampsSearch, embossedStampsSearch ];

  // create an array of promises for each search
  const searchPromises = searches.map((search) => 
    constructAndFetchQueries(search)
  )

  // when all the searches are done, sort the data and display the images
  Promise.all(searchPromises).then((result) => {
    // group data by decade and theme
    const grouped = groupByDecadeAndTheme(stampData);
    groupedData = flattenGroupedData(grouped);

    drawTimeSlider(groupedData);

    setupEntryButton(groupedData); 

    // set title with the total number of stamps
    const titleText = document.querySelector("#data-title-text");
    titleText.innerHTML = `<strong>America’s Stamp Collection</strong> (${stampData.length} stamps)`;
  })
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

const drawTimeSlider = (data) => {
  const sliderSection = document.querySelector("#slider-container");
  sliderSection.style.display = "block";

  const decades = [...new Set(data.map(d => d.decade))].sort((a, b) => a - b);

  // Create vertical timeline structure
  const margin = { top: 12, right: 10, bottom: 50, left: 230 };
  const width = 350; // Increased to 350px to accommodate text
  const height = 750;

  const svg = d3.select("#slider-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

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
    .attr("stroke-width", 3)
    .attr("stroke-linecap", "round");

  // Add decade ticks and labels
  timeline.selectAll("line.tick")
    .data(decades)
    .enter()
    .append("line")
    .attr("class", "tick")
    .attr("x1", -10)
    .attr("x2", 10)
    .attr("y1", d => y(d))
    .attr("y2", d => y(d))
    .attr("stroke", colors.middle)
    .attr("stroke-width", 2);

  timeline.selectAll("text.decade-label")
    .data(decades)
    .enter()
    .append("text")
    .attr("class", "decade-label")
    .attr("x", 20)
    .attr("y", d => y(d))
    .attr("dy", "0.35em")
    .attr("text-anchor", "start")
    .style("font-size", "14px")
    .text(d => d);

  // Add postal context markers on the left
  const postalContextData = Object.entries(postalContext).map(([decade, text]) => ({
    decade: parseInt(decade),
    text
  }));

  timeline.selectAll("circle.postal-marker")
    .data(postalContextData)
    .enter()
    .append("circle")
    .attr("class", "postal-marker")
    .attr("cx", 0)
    .attr("cy", d => y(d.decade))
    .attr("r", 6)
    .attr("fill", colors.dark)
    .attr("stroke", colors.light)
    .attr("stroke-width", 2);

  timeline.selectAll("text.postal-context")
    .data(postalContextData)
    .enter()
    .append("text")
    .attr("class", "postal-context")
    .attr("x", -25)
    .attr("y", d => y(d.decade) + 5) // Position above the marker
    .attr("text-anchor", "end")
    .style("font-size", "14px")
    .style("line-height", "1.4")
    .style("text-transform", "none") // Prevent CSS text-transform from affecting this
    .each(function(d) {
      const words = d.text.split(" ");
      const lineHeight = 1.3;
      const textElement = d3.select(this);
      let line = [];
      let lineNumber = 0;
      const maxCharsPerLine = 23; // Character-based wrapping for better control
      
      words.forEach((word, i) => {
        const testLine = line.length > 0 ? line.join(" ") + " " + word : word;
        
        // Check if adding this word would exceed the max length
        if (testLine.length > maxCharsPerLine && line.length > 0) {
          // Output current line before adding this word
          textElement.append("tspan")
            .attr("x", -25)
            .attr("dy", lineNumber === 0 ? "0em" : `${lineHeight}em`)
            .attr("text-anchor", "end")
            .text(line.join(" "));
          
          line = [word]; // Start new line with current word
          lineNumber++;
        } else {
          line.push(word);
        }
        
        // If this is the last word, output the remaining line
        if (i === words.length - 1) {
          textElement.append("tspan")
            .attr("x", -25)
            .attr("dy", lineNumber === 0 ? "0em" : `${lineHeight}em`)
            .attr("text-anchor", "end")
            .text(line.join(" "));
        }
      });
    });

  // Add current position indicator
  const indicator = timeline.append("circle")
    .attr("class", "position-indicator")
    .attr("cx", 0)
    .attr("cy", y(selectedDecade))
    .attr("r", 8)
    .attr("fill", colors.middle)
    .attr("stroke", colors.dark)
    .attr("stroke-width", 3);

  // Make decade labels and ticks clickable
  timeline.selectAll("text.decade-label")
    .style("cursor", "pointer")
    .on("click", function(event, d) {
      selectedDecade = d;
      indicator.transition()
        .duration(150)
        .attr("cy", y(selectedDecade));
      
      const dataToDisplay = groupedData.filter((item) => item.decade == selectedDecade).sort((a, b) => b.count - a.count);
      displayData(dataToDisplay);
    });

  timeline.selectAll("line.tick")
    .style("cursor", "pointer")
    .on("click", function(event, d) {
      selectedDecade = d;
      indicator.transition()
        .duration(150)
        .attr("cy", y(selectedDecade));
      
      const dataToDisplay = groupedData.filter((item) => item.decade == selectedDecade).sort((a, b) => b.count - a.count);
      displayData(dataToDisplay);
    });

  // Add click handler to postal context markers
  timeline.selectAll("circle.postal-marker")
    .style("cursor", "pointer")
    .on("click", function(event, d) {
      selectedDecade = d.decade;
      indicator.transition()
        .duration(150)
        .attr("cy", y(selectedDecade));
      
      const dataToDisplay = groupedData.filter((item) => item.decade == selectedDecade).sort((a, b) => b.count - a.count);
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
      
      stampsContainer.append("div")
        .attr("class", "stamp-image-container-small")
        .append("img")
        .attr("class", "stamp-image-small")
        .attr("src", imageUrl)
        .attr("alt", stamp.title);
    });
  });
}

// when passed to here the data is already sorted by count descending and filtered by decade
const updateHeading = (data) => {
  const swatches = document.querySelectorAll(".color-swatch");
  swatches.forEach(s => {
    s.style.backgroundColor = "transparent";
  });

  // calculate total number of stamps in this decade
  let stampsCount = 0;
  data.forEach((d) => {
    stampsCount += d.count;
  })

  // update the subheading with the selected decade and number of stamps
  const heading = document.querySelector(".chart-dates-results");
  heading.innerHTML = `<strong>${selectedDecade}s / Themes</strong> (${stampsCount} stamps)`;

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

  // update the historical context paragraph
  const histContext = document.querySelector("#historical-context");
  histContext.innerHTML = historicalContext[selectedDecade];

  // update the stamp highlight image to the featured stamp for the decade
  const imgContainer = document.querySelector("#stamp-highlight");
  const img = document.querySelector("#stamp-highlight-image");
  img.src = "";
  img.alt = "";
  imgContainer.classList.remove("horizontal-image-container");

  if (selectedDecade === 1890 || selectedDecade === 1780) {
    imgContainer.classList.add("horizontal-image-container");
  }

  const stampToDisplay = images[selectedDecade];

  Vibrant.from(stampToDisplay)
    .getPalette()
    .then((palette) => {
      swatches[0].style.backgroundColor = palette.Vibrant.hex;
      swatches[1].style.backgroundColor = palette.Muted.hex;
      swatches[2].style.backgroundColor = palette.LightVibrant.hex;
      swatches[3].style.backgroundColor = palette.LightMuted.hex;
    });

    img.src = stampToDisplay;
    img.alt = titles[selectedDecade];
}

const displayData = (data) => {
  // make sure data section is visible
  const dataSection = document.querySelector("#data");
  dataSection.style.display = "block";

  // clear previously drawn bars
  const barsContainer = document.querySelector("#bars-container");
  barsContainer.innerHTML = "";
  
  drawBars(data);
  updateHeading(data);
}

getAndParseAllData();
