import * as d3 from "d3";

const colors = {
  middle: '#cbb28e',
  light: '#f2e5d1',
  dark: '#6b5347'
};

let selectedDecade = 1760;

// array of stamp data based on Smithsonian API
let stampData = [];

let groupedData = [];

// load or write with JSON and fetch historical context for themes here
const historicalContext = {
  1760: "The Stamp Act of 1765 imposed a direct tax on the colonies by the British government, requiring many printed materials in the colonies to be produced on stamped paper produced in London, carrying an embossed revenue stamp.",
  1780: "During the Revolutionary War, the beginnings of the new U.S. postal system relied on manual postmarks with the location and date to facilitate communication among the colonies as they moved away from British-issued stamps.",
  1800: "The Postal Service Act of 1792 created a formal U.S. Post Office. Experimentation with standardized markings (precursors to embossed seals) reflected the shift toward a national postal identity, independent of Britain.",
  1840: "The 1847 was the U.S.’s first official stamp release, anchoring Revolutionary leaders like George Washington and Benjamin Franklin as symbols of national legitimacy.",
  1850: "This decade reflects the popularization of adhesive stamps as postage became standardized and accessible nationwide. At the same time, the growing number of stamps featuring national leaders mirrors the rising sectional tensions before the Civil War, as imagery of unity and founding ideals was used to reinforce national identity amid political division.",
  1860: "During the Civil War, both the Union and Confederate states issued their own postage stamps. Union issues celebrated Washington, Franklin, and patriotic symbols like the eagle, while Confederate issues showed Davis and state leaders.",
  1870: "Departmental stamps for Treasury, War, Navy, Agriculture, etc. symbolized Reconstruction and the expansion of federal authority. “Liberty” and “Justice” begin appearing explicitly, echoing post-war ideals of unity and equality.",
  1880: "An increase in allegorical figures, classical muses, and themes of discovery, anticipating the grand Columbian Exposition of 1893. These designs reveal how the U.S. was using stamps to myth-make national identity, linking classical ideals with narratives of progress and discovery",
  1890: "The landmark 1893 Columbian Exposition Issue commemorated the 400th anniversary of Columbus’s voyage, with a sprawling set of stamps illustrating discovery, conquest, and nationhood. The popularity of these stamps reflected a Gilded Age America eager to project itself as both modern and rooted in heroic origins.",
}

const themeBuckets = {
  "Founding Figures": [
    "George Washington","Benjamin Franklin","Thomas Jefferson",
    "Alexander Hamilton","James Madison","Daniel Webster","Henry Clay","John Marshall"
  ],
  "Military Figures": [
    "Ulysses Grant","William Sherman","James Garfield","Andrew Jackson",
    "Abraham Lincoln","Jefferson Davis","Oliver Perry","Zachary Taylor",
    "Edwin M. Stanton","Winfield Scott"
  ],
  "Independence": [
    "Liberty","Justice","Freedom","Independence","Peace",
    "Union","Equality","Democracy","Eagle"
  ],
  "Allegories": [
    "Clio", "Ceres","Vesta", "Minerva"
  ],
  "Discovering America": [
    "Christopher Columbus","Queen Isabella","Pilgrim","Mayflower","Centennial","Exposition"
  ],
  "Postal System": [
    "Post Office","Messenger","Newspaper","Manual postmark","Embossed postmark"
  ],
  "Colonization, Control": [
    "British Crown"
  ],
  "War, Victory": [
    "Battle","Soldier","War","Confederate","Victory"
  ],
  "Government": [
    "Constitution","Congress","Treasury","State","Navy","Agriculture","Tax","Locomotive","Adriatic"
  ]
};

const themeNormalization = {
  // Standardize spelling variants
  "isabela": "Queen Isabella",
  "isabella": "Queen Isabella",
  "columbus": "Christopher Columbus",

  "post office": "Post Office",
  "postmaster": "Post Office",
  "postmark": "Post Office",
  "envelope": "Post Office",
  "envelopes": "Post Office",

  "soldier": "Soldier",
  "soldiers": "Soldier",

  "newspaper": "Newspaper",
  "newspapers": "Newspaper",

  "washington": "George Washington",
  "franklin": "Benjamin Franklin",
  "jefferson": "Thomas Jefferson",
  "hamilton": "Alexander Hamilton",
  "madison": "James Madison",

  "grant": "Ulysses Grant",
  "sherman": "William Sherman",
  "garfield": "James Garfield",

  "jackson": "Andrew Jackson",
  "lincoln": "Abraham Lincoln",
  "webster": "Daniel Webster",
  "davis": "Jefferson Davis",
  "clay": "Henry Clay",

  "perry": "Oliver Perry",
  "taylor": "Zachary Taylor",
  "stanton": "Edwin Stanton",
  "marshall": "John Marshall",
  "scott": "Winfield Scott"
};

// Priority order: first match wins if multiple themes present
const themePriority = [
  "George Washington","Benjamin Franklin","Thomas Jefferson","Alexander Hamilton","James Madison",
  "Ulysses Grant","William Sherman","James Garfield","Andrew Jackson","Abraham Lincoln",
  "Daniel Webster","Jefferson Davis","Henry Clay","Oliver Perry","Zachary Taylor",
  "Edwin Stanton","John Marshall","Winfield Scott",
  "Liberty","Justice","Freedom","Independence","Victory","Peace","Union","Equality","Democracy","Eagle",
  "Clio", "Ceres","Vesta", "Minerva",
  "Christopher Columbus","Queen Isabella","Pilgrim","Mayflower","Centennial","Exposition",
  "Post Office","Messenger","Newspaper",
  "Battle","Soldier","War","Confederate",
  "Constitution","Congress","Treasury","State","Navy","Agriculture","Tax","Locomotive","Adriatic"
];

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

    console.log("Flat Data:", groupedData);
    drawTimeSlider(groupedData);

    setupEntryButton(groupedData);

    // for dev:
    // const dataToDisplay = groupedData.filter((item) => item.decade == selectedDecade).sort((a, b) => b.count - a.count);
    // displayData(dataToDisplay);
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

  // draw a slider with d3 that parses the decades from the data 
  // and reassigns selectedDecade on change
  const decades = [...new Set(data.map(d => d.decade))].sort((a, b) => a - b);

  const minSliderWidth = 768;
  const margin = { top: 20, right: 20, bottom: 40, left: 20 },
      sliderWidth = Math.max(minSliderWidth, window.innerWidth * 0.9),
      sliderHeight = 100;

  const svg = d3.select("#slider-container")
    .append("svg")
    .attr("width", sliderWidth)
    .attr("height", sliderHeight);

  const x = d3.scaleLinear()
    .domain([d3.min(decades), d3.max(decades)])
    .range([margin.left, sliderWidth - margin.right])
    .clamp(true);

  const slider = svg.append("g")
    .attr("class", "slider")
    .attr("transform", `translate(0,${sliderHeight / 2})`);

  slider.append("line")
    .attr("class", "track")
    .attr("x1", x.range()[0])
    .attr("x2", x.range()[1])
    .attr("stroke", colors.middle)
    .attr("stroke-width", 8)
    .attr("stroke-linecap", "round");

  // add a circle handle that can be dragged and updates selectedDecade
  const handle = slider.append("circle")
    .attr("class", "handle")
    .attr("r", 10)
    .attr("cx", x(selectedDecade))
    .attr("fill", colors.middle)
    .attr("stroke", colors.dark)
    .attr("stroke-width", 2)
    .call(d3.drag()
      .on("drag", function(event) {
        const [xPos] = d3.pointer(event, svg.node());
        const decade = Math.round(x.invert(xPos) / 10) * 10;

        if (decades.includes(decade)) {
          if (decade === selectedDecade) return; // no change
          selectedDecade = decade;
          handle.attr("cx", x(selectedDecade));

          const dataToDisplay = groupedData.filter((item) => item.decade == selectedDecade).sort((a, b) => b.count - a.count);
          displayData(dataToDisplay);
        }
      })
    );

  // add decade labels below the slider
  slider.selectAll("text")
    .data(decades)
    .enter()
    .append("text")
      .attr("x", d => x(d))
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .text(d => d);

  // add ticks to slider
  slider.selectAll("line.tick")
    .data(decades)
    .enter()
    .append("line")
      .attr("class", "tick")
      .attr("x1", d => x(d))
      .attr("x2", d => x(d))
      .attr("y1", -9)
      .attr("y2", 9)
      .attr("stroke", colors.middle)
      .attr("stroke-width", 1);
}

const drawBars = (data) => {
  // build a d3 bar chart based off of data grouping by decade and theme
  // one bar for each decade - theme pairing
  // height of bar is number of stamps in that decade with that theme
  const length = data.length;

  // set dimensions and margins for the chart
  const margin = { top: 20, right: 30, bottom: 40, left: 125 },
        width = window.innerWidth * 0.9 - margin.left - margin.right,
        heightScale = length * 64,
        maxCount = 90;

  // append the svg object to the body of the page
  const svg = d3.select("#bars-container")
    .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", heightScale + margin.top + margin.bottom)
    .append("g")
      .attr("transform",
            `translate(${margin.left},${margin.top})`);

  // X axis: scale and draw:
  const x = d3.scaleLinear()
    .domain([0, maxCount]) // number of stamps
    .range([0, width]);

  // Y axis: scale and draw:
  const y = d3.scaleBand()
    .range([0, heightScale])
    .domain(data.map(d => d.theme))
    .padding(0.25);

  // X axis
  svg.append("g")
    .attr("transform", `translate(0,${heightScale})`)
    .call(d3.axisBottom(x))
    .style("display", "none");

  // Y axis
  svg.append("g")
    .call(d3.axisLeft(y))
    .style("display", "none");

  // Bars
  svg.selectAll("myRect")
    .data(data)
    .enter()
    .append("rect")
      .attr("x", x(0))
      .attr("y", d => y(d.theme))
      .attr("width", d => x(d.count))
      .attr("height", y.bandwidth())
      .attr("fill", colors.dark);

  svg.selectAll("theme-label")
    .data(data)
    .enter()
    .append("text")
      .attr("x", -10)
      .attr("y", d => y(d.theme) + y.bandwidth() / 2 + 5)
      .attr("text-anchor", "end")
      .attr("alignment-baseline", "middle")
      .each(function(d) {
        const words = d.theme.split(" ");
        const n = words.length;
        words.forEach((word, i) => {
          d3.select(this)
            .append("tspan")
            .attr("x", -10)
            .attr("dy", i === 0 ? `-${(n-1)/2}em` : "1.2em")
            .text(word);
        });
      });

  svg.selectAll("bar-label")
    .data(data)
    .enter()
    .append("text")
      .attr("x", d => x(d.count) + 5)
      .attr("y", d => y(d.theme) + y.bandwidth() / 2)
      .attr("alignment-baseline", "middle")
      .text(d => d.count);
}

function findBucketForTheme(theme) {
  for (const [bucketName, keywords] of Object.entries(themeBuckets)) {
    if (keywords.map(k => k.toLowerCase()).includes(theme.toLowerCase())) {
      return bucketName;
    }
  }
  return "Other";
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
  heading.innerHTML = `Themes of the ${selectedDecade}s <strong>(${stampsCount} stamps)</strong>`;

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
