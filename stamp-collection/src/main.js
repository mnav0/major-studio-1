import * as d3 from "d3";
import { themeBuckets, themeNormalization, themePriority } from "./constants/themes.js";
import { colors } from "./constants/colors.js";
import { historicalContext, postalContext } from "./constants/context.js";
import { Vibrant } from "node-vibrant/browser";

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
  if (objectData.content.indexedStructured.date) {
    rawYearData = parseInt(objectData.content.indexedStructured.date[0].slice(0, 4));
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


  /** 
  const thumbnail = objectData.content.descriptiveNonRepeating.online_media?.media[0]?.thumbnail;

  const colors = []
  // Using builder
  Vibrant.from(thumbnail)
    .getPalette()
    .then((palette) => {
      colors.push(palette.Vibrant.hex);
      colors.push(palette.Muted.hex);
      // colors.push(palette.DarkVibrant.hex);
      colors.push(palette.LightVibrant.hex);
      // colors.push(palette.DarkMuted.hex);
      colors.push(palette.LightMuted.hex);
    });
  */



  if (decade && decade < 1900 && theme) {
    stampData.push({
      id: objectData.id,
      media: objectData.content.descriptiveNonRepeating.online_media?.media,
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
  const margin = { top: 15, right: 0, bottom: 40, left: 200 };
  const width = 300;
  const height = 700;

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
    .attr("x", -20)
    .attr("y", d => y(d.decade))
    .attr("text-anchor", "end")
    .style("font-size", "12px")
    .each(function(d) {
      const words = d.text.split(" ");
      const lineHeight = 1.2;
      const textElement = d3.select(this);
      let line = [];
      let lineNumber = 0;
      const wordsPerLine = 3; // Wrap after 3 words
      
      // Align the text block to the top of the tick (no vertical centering offset)
      words.forEach((word, i) => {
        line.push(word);
        
        // Create new line after wordsPerLine words or on last word
        if ((i + 1) % wordsPerLine === 0 || i === words.length - 1) {
          textElement.append("tspan")
            .attr("x", -20)
            .attr("dy", lineNumber === 0 ? "0em" : `${lineHeight}em`)
            .attr("text-anchor", "end")
            .text(line.join(" "));
          
          line = [];
          lineNumber++;
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
  
  // Create a wrapper for sticky positioning
  const barsContent = container.append("div")
    .attr("class", "bars-content");
  
  // Create a div for each theme group
  data.forEach(themeData => {
    const themeRow = barsContent.append("div")
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

    // TODO filter out images before when processing data
    const stampsWithImages = themeData.stamps.filter(stamp => 
      stamp.media && stamp.media.length > 0
    );
    
    // Display stamp thumbnails
    stampsWithImages.forEach(stamp => {
      const imageUrl = stamp.media[0].thumbnail;
      
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

  // update the stamp highlight image to a random stamp from the top theme
  const isEntryPoint = selectedDecade == 1760; 
  const imgContainer = document.querySelector("#stamp-highlight");
  const img = document.querySelector("#stamp-highlight-image");
  img.src = "";
  img.alt = "";
  imgContainer.classList.remove("postmark-image-container");

  let stampToDisplay;

  if (isEntryPoint) {
    stampToDisplay = data[0].stamps.find(s => s.id == "ld1-1643399842277-1643399842286-1");
  } else {
    // update the stamp highlight with a randomly selected stamp from the top theme
    const topThemeStampsWithImages = data[0].stamps.filter(s => s.media && s.media.length > 0);
    stampToDisplay = topThemeStampsWithImages[Math.floor(Math.random() * topThemeStampsWithImages.length)];
  }

  if (stampToDisplay) {
    const imageUrl = stampToDisplay.media[0].thumbnail;
    img.src = imageUrl;
    img.alt = stampToDisplay.title;

    const swatches = document.querySelectorAll(".color-swatch");

    Vibrant.from(imageUrl)
      .getPalette()
      .then((palette) => {
        swatches[0].style.backgroundColor = palette.Vibrant.hex;
        swatches[1].style.backgroundColor = palette.Muted.hex;
        swatches[2].style.backgroundColor = palette.LightVibrant.hex;
        swatches[3].style.backgroundColor = palette.LightMuted.hex;
      });

    if (data[0].theme.toLowerCase().includes("postmark")) {
      imgContainer.classList.add("postmark-image-container");
    }
  }
  
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
