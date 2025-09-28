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
  1780: "During the American Revolutionary War, the Continental Congress established a postal system to facilitate communication among the colonies and with foreign allies. The first official postmark was introduced in 1787.",
  1790: "The first U.S. postage stamps were issued in 1847, featuring Benjamin Franklin and George Washington. Before that, letters were often marked with hand-stamped postmarks indicating payment or due postage.",
  1800: "Embossed postmarks were used on letters to indicate that postage had been paid. These early postmarks were often simple designs embossed directly onto the paper.",
  1810: "The U.S. Postal Service continued to expand, and postmarks became more standardized. The use of hand-stamped postmarks was common for indicating the date and location of mailing.",
  1820: "Postmarks evolved to include more detailed information, such as the specific post office location and date of mailing. This helped improve mail sorting and delivery.",
  1830: "The introduction of the first adhesive postage stamp in the U.S. in 1847 marked a significant advancement in postal services. Postmarks were used to cancel stamps and prevent reuse.",
  1840: "The U.S. Postal Service introduced the first adhesive postage stamps, featuring Benjamin Franklin and George Washington. Postmarks were used to cancel these stamps.",
  1850: "Postmarks became more intricate, often including decorative elements. The use of different colors of ink for postmarks also became more common during this period.",
  1860: "During the Civil War, both the Union and Confederate states issued their own postage stamps. Postmarks from this era often reflect the tumultuous times and the division between North and South.",
  1870: "The U.S. Postal Service introduced new stamp designs and denominations. Postmarks continued to evolve, with some featuring unique designs to commemorate special events or anniversaries.",
  1880: "The late 19th century saw the introduction of more elaborate postmarks, including pictorial designs. The use of machine cancellations also began to emerge during this period.",
  1890: "Postmarks became more standardized across the country, with the U.S. Postal Service implementing uniform designs and formats. This helped improve mail processing efficiency.",
  1900: "The early 20th century saw the introduction of commemorative stamps and special postmarks for events such as expositions and anniversaries. The use of machine cancellations became more widespread.",
  1910: "During this decade, the U.S. Postal Service continued to innovate with new stamp designs and postmark styles. Special postmarks were often created for significant events, such as the Panama-Pacific International Exposition in 1915.",
  1920: "The 1920s saw a boom in stamp collecting, leading to the issuance of numerous commemorative stamps. Postmarks from this era often reflect the cultural and social changes of the time.",
  1930: "The Great Depression influenced stamp designs and themes, with many stamps commemorating historical events and figures. Postmarks continued to be an essential part of mail processing.",
  1940: "During World War II, stamps often featured patriotic themes, and postmarks were used to commemorate war-related events. The U.S. Postal Service also introduced new technologies for mail sorting and delivery.",
}

const themeNormalization = {
  // Standardize spelling variants
  "isabela": "Isabella",
  "isabella": "Isabella",

  "post office": "Post Office",
  "postmaster": "Post Office",
  "postmark": "Post Office",
  "envelope": "Post Office",
  "envelopes": "Post Office",

  "soldier": "Soldier",
  "soldiers": "Soldier",

  "newspaper": "Newspaper",
  "newspapers": "Newspaper",

  // Group allegorical figures together
  "clio": "Muses",
  "vesta": "Muses",
  "ceres": "Muses",
  "maiden": "Muses"
};

const themeBuckets = {
  "Founding Figures": [
    "Washington","Franklin","Jefferson","Hamilton","Lafayette","Madison",
    "Grant","Sherman","Garfield","Jackson","Lincoln","Webster","Davis","Clay",
    "Perry","Taylor","Stanton","Marshall","Scott","Winfield"
  ],
  "Ideals & Allegories": [
    "Liberty","Justice","Freedom","Independence","Victory","Peace","Union","Equality",
    "Democracy","Muses","Eagle"
  ],
  "Mythmaking & Identity": [
    "Columbus","Isabella","Pilgrim","Mayflower","Centennial","Exposition"
  ],
  "Postal System": [
    "Post Office","Provisional","Messenger","Newspaper","Department"
  ],
  "Military & War": [
    "Battle","Soldier","War","Confederate"
  ],
  "Government & Institutions": [
    "Constitution","Congress","Treasury","State","Navy","Agriculture","Tax","Locomotive","Adriatic"
  ]
};

const themesRegex = new RegExp(
  "\\b(" +
    [
      ...Object.values(themeBuckets).flat(),
      ...Object.keys(themeNormalization) // make sure variants are caught
    ].join("|") +
  ")\\b",
  "gi"
);

const themePriority = [
  "Washington","Franklin","Jefferson","Hamilton","Lafayette","Madison",
  "Grant","Sherman","Garfield","Jackson","Lincoln","Webster","Davis","Clay",
  "Perry","Taylor","Stanton","Marshall","Scott","Winfield", // Founding Figures first
  "Liberty","Justice","Freedom","Independence","Victory","Peace","Union","Equality",
  "Democracy","Muses","Eagle", // Ideals
  "Columbus","Isabella","Muses","Pilgrim","Mayflower","Centennial","Exposition", // Mythmaking
  "Post Office","Provisional","Messenger","Newspaper", // Postal System
  "Battle","Soldier","War","Confederate", // Military
  "Constitution","Congress","Treasury","State","Navy","Agriculture","Tax","Locomotive","Adriatic", "Department" // Government
];

function extractThemesWithContext(text) {
  if (!text) return [];

  const matches = text.match(themesRegex);
  if (!matches) return [];

  // Normalize and dedupe
  const normalized = [...new Set(matches.map(m => {
    const rawKey = m.toLowerCase();
    return themeNormalization[rawKey] || m;
  }))];

  // Assign based on priority (first one that appears in themePriority wins)
  for (const theme of themePriority) {
    if (normalized.some(n => n.toLowerCase() === theme.toLowerCase())) {
      let bucket = "Other";
      for (const [bucketName, keywords] of Object.entries(themeBuckets)) {
        if (keywords.map(k => k.toLowerCase()).includes(theme.toLowerCase())) {
          bucket = bucketName;
          break;
        }
      }
      return [{
        keyword: theme,
        bucket
      }];
    }
  }

  return [];
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
  // some dates are in different places
  let rawYearData;
  if (objectData.content.indexedStructured.date) {
    rawYearData = parseInt(objectData.content.indexedStructured.date[0].slice(0, 4));
  } else if (objectData.content.freetext.date) {
    const firstDateContent = objectData.content.freetext?.date[0].content;
    rawYearData = parseInt(firstDateContent.slice(firstDateContent.length - 4, firstDateContent.length));
  }

  const decade = Math.floor(rawYearData / 10) * 10;

  // some locations are in different places
  let currentPlace = "";
  if(objectData.content.indexedStructured.place) {
    currentPlace = objectData.content.indexedStructured.place[0];
  }

  let isUSStamp = false;
  let isUSTopic = objectData.content.indexedStructured.topic?.includes("U.S. Stamps") || objectData.content.indexedStructured.topic?.includes("Ernest K. Ackerman Collection of U.S. Proofs") || objectData.content.indexedStructured.topic?.includes("'American Expansion (1800-1860)'");
  let isUSPlace = (currentPlace.toLowerCase().includes("united states") || currentPlace.toLowerCase().includes("u.s.") || currentPlace.toLowerCase().includes("confederate states of america") || currentPlace.toLowerCase().includes("us"));

  if (isUSTopic || isUSPlace) {
    isUSStamp = true;
  }

  const notes = objectData.content.freetext.notes?.[0].content || "";
  const title = objectData.title || "";

  const themes = [];

  // --- Add manual overrides for early decades ---
  if (decade <= 1800) {
    if (decade == 1760) {
      themes.push({ keyword: "British Crown", bucket: "Uncategorized", context: "Stamp Act taxation under British rule" });
    } else if (decade == 1780) {
      themes.push({ keyword: "Manual postmark", bucket: "Uncategorized", context: "Colonial self-sufficient postal system emerging" });
    } else {
      themes.push({ keyword: "Embossed postmark", bucket: "Uncategorized", context: "Move toward embossed postmarks before stamps" });
    }
  } else {
    const themesFromRegex = extractThemesWithContext(title);
    themes.push(...themesFromRegex);
  }

  if (!!decade && !objectData.title.toLowerCase().includes("cover") && isUSStamp) {
    stampData.push({
      id: objectData.id,
      media: objectData.content.descriptiveNonRepeating.online_media?.media,
      decade,
      title,
      notes,
      themes
    })
  }
}

function groupByDecadeAndTheme(stampData) {
  const result = {};

  stampData.forEach(stamp => {
    const decade = stamp.decade;
    if (!result[decade]) result[decade] = {};

    stamp.themes.forEach(theme => {
      const keyword = theme.keyword;
      const bucket = theme.bucket;

      if (!result[decade][keyword]) {
        result[decade][keyword] = { count: 0, bucket, stamps: [] };
      }

      result[decade][keyword].count++;
      result[decade][keyword].stamps.push(stamp);
    });
  });

  return result;
}

function flattenGroupedData(groupedData) {
  const rows = [];
  for (const [decade, themes] of Object.entries(groupedData)) {
    const decadeNum = Number(decade);
    for (const [keyword, data] of Object.entries(themes)) {
      rows.push({
        decade: decadeNum,
        theme: keyword,
        bucket: data.bucket,
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

    setupEntryButton(flatData);

    // for dev:
    // const dataToDisplay = groupedData.filter((item) => item.decade == selectedDecade).sort((a, b) => b.count - a.count);
    // displayData(dataToDisplay);
  })
}

const setupEntryButton = (data) => {
  const entryButton = document.querySelector("#entry-button");

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

  const minSliderWidth = 1000;
  const margin = { top: 20, right: 30, bottom: 40, left: 150 },
      sliderWidth = Math.max(minSliderWidth, window.innerWidth - margin.left - margin.right - 100),
      sliderHeight = 100;

  const svg = d3.select("#slider-container")
    .append("svg")
    .attr("width", sliderWidth)
    .attr("height", sliderHeight);

  const x = d3.scaleLinear()
    .domain([d3.min(decades), d3.max(decades)])
    .range([50, sliderWidth - 50])
    .clamp(true);

  const slider = svg.append("g")
    .attr("class", "slider")
    .attr("transform", `translate(0,${sliderHeight / 2})`);

  slider.append("line")
    .attr("class", "track")
    .attr("x1", x.range()[0])
    .attr("x2", x.range()[1])
    .attr("stroke", colors.dark)
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
      .attr("y1", -10)
      .attr("y2", 10)
      .attr("stroke", colors.middle)
      .attr("stroke-width", 1);
}

const drawBars = (data) => {
  // build a d3 bar chart based off of data grouping by decade and theme
  // one bar for each decade - theme pairing
  // height of bar is number of stamps in that decade with that theme
  const length = data.length;

  // set dimensions and margins for the chart
  const margin = { top: 20, right: 30, bottom: 40, left: 150 },
        width = window.innerWidth - margin.left - margin.right - 400,
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

// when passed to here the data is already sorted by count descending and filtered by decade
const updateHeading = (data) => {
  // calculate total number of stamps in this decade
  let stampsCount = 0;
  data.forEach((d) => {
    stampsCount += d.count;
  })

  // update the subheading with the selected decade and number of stamps
  const heading = document.querySelector(".chart-dates-results");
  heading.innerHTML = `Themes of U.S. Stamps from the ${selectedDecade}s <strong>(${stampsCount} stamps)</strong>`;

  const mainThemes = document.querySelector("#chart-main-themes");
  const theme1 = data[0] ? data[0].theme : "";
  const theme2 = data[1] ? data[1].theme : "";

  mainThemes.innerHTML = `${theme1}${theme2 ? ", " + theme2 : ""}`;

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
