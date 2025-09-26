// array of stamp data based on Smithsonian API
let stampData = [];

// Regex and context dictionary for extracting themes from title and notes
const themesRegex = new RegExp(
  "\\b(Crown|Clio|Soldier|Adriatic|Newspaper|Newspapers|Messenger|Seward|Vesta|Ceres|Marshall|Maiden|Isabella|Isabela|Confederate|Grant|Madison|Sherman|Soldier|Soldiers|Garfield|Post Office|Tax|Eagle|Horse|Provisional|Jackson|Lincoln|Scott|Webster|Davis|Clay|Perry|Locomotive|Calhoun|Peace|Taylor|Stanton|Minerva|Washington|Franklin|Jefferson|Hamilton|Lafayette|Liberty|Justice|Freedom|Independence|Victory|Columbus|Treasury|State|Navy|War|Agriculture)\\b",
  "gi"
);
const themeContext = {
  washington: "First U.S. President, Revolutionary War leader. Stamps featuring Washington began in 1847 and surged around centennials (1876, 1932).",
  franklin: "Founding Father, Postmaster General, scientist, and diplomat. Featured on the first U.S. stamps and reappears in issues celebrating communication and science.",
  adams: "John and John Quincy Adams linked to independence and early Republic. Appear in commemoratives tied to Revolutionary anniversaries.",
  jefferson: "Jefferson, Author of the Declaration of Independence, emphasized in centennial and bicentennial commemoratives.",
  hamilton: "Treasury Secretary and Federalist leader, commemorated in stamps marking finance and governance.",
  lafayette: "French Revolutionary ally, honored in stamps during French-American commemorations (especially 1824 visit anniversary, bicentennials).",

  liberty: "Symbol of freedom and independence. Peaks after the Civil War, especially following the 1886 Statue of Liberty gift, and during both World Wars.",
  justice: "Associated with law, equality, and governance. Emerges in post–Civil War and Reconstruction themes.",
  freedom: "Appears around 1876 Centennial and resurges with 20th-century struggles (WWII, Civil Rights).",
  independence: "Marks 1776 anniversaries — especially 1876 Centennial and 1976 Bicentennial issues.",
  union: "Civil War–era theme stressing unity of the states, resurfaces during Reconstruction.",
  equality: "Occasional appearances in 20th-century civic and civil rights commemoratives.",
  democracy: "Highlights American political ideals, especially in Progressive Era and Cold War stamps.",

  battle: "Commemorates Revolutionary battles (Bunker Hill, Saratoga, Yorktown) and Civil War anniversaries. Peaks in the 1870s–1890s centennials.",
  revolution: "Rarely literal, but appears in commemorative issues marking 1776 anniversaries (1876, 1976).",
  victory: "Strongly tied to WWI and WWII issues, connecting modern wars to Revolutionary victory symbolism.",
  constitution: "Marks adoption of the Constitution (1787). Major surges in 1937 (sesquicentennial) and 1987 (bicentennial).",
  congress: "Linked to the establishment of representative government. Appears in legislative commemoratives.",

  columbus: "1893 Columbian Exposition Issue celebrated Columbus’s voyage, symbolizing discovery and nationhood.",
  pilgrim: "Appears in 1920s with 300th anniversary of Plymouth settlement.",
  mayflower: "Associated with Pilgrims and early settlement. Peaks around 1920 commemoratives.",
  centennial: "Spikes in 1876 (Philadelphia Centennial Exhibition), resurges in 1926 and 1976.",
  exposition: "Prominent in 1893 World’s Columbian Exposition and other world’s fairs, tied to national mythmaking.",

  postmaster: "Figures like Franklin and Hazard reflect early independence from Britain in postal systems.",
  postmark: "Manual postmarks in the 1780s–1790s show early U.S. postal autonomy.",
  envelope: "Covers and envelopes reveal how correspondence functioned as symbols of independence.",
  cover: "Postal covers demonstrate postal independence and the spread of communication.",
  department: "Refers to the U.S. Post Office Department, central to building national infrastructure.",

  winfield: "U.S. Army general and early 19th-century figure, appears in stamps commemorating military history.",
  post: "Refers to postal services, often linked to figures like Franklin and early U.S. postal history."
};

function extractThemesWithContext(text) {
  if (!text) return [];
  const matches = text.match(themesRegex);
  if (!matches) return [];
  return matches.map(m => {
    const key = m.toLowerCase().split(" ")[0]; // use first word for context lookup
    
    return {
      keyword: m,
      context: themeContext[key] || "No context available"
    };
  });
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
  let decadeStart;
  if (objectData.content.indexedStructured.date) {
    decadeStart = parseInt(objectData.content.indexedStructured.date[0].slice(0, 4));
  } else if (objectData.content.freetext.date) {
    const firstDateContent = objectData.content.freetext?.date[0].content;
    decadeStart = parseInt(firstDateContent.slice(firstDateContent.length - 4, firstDateContent.length));
  }

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

  // Extract themes from both title and notes
  const themes = [
    ...extractThemesWithContext(title)
  ];

  if (!!decadeStart && !objectData.title.toLowerCase().includes("cover") && isUSStamp) {
    stampData.push({
      id: objectData.id,
      media: objectData.content.descriptiveNonRepeating.online_media?.media,
      // link: objectData.content.descriptiveNonRepeating.record_link,
      decade: decadeStart,
      title,
      notes,
      themes: [...new Set(themes)] // Remove duplicate themes
    })
  }
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
    sortByDecade(stampData);

    displayData(stampData);
  })
}

const sortByDecade = (data) => {
  data.sort((a, b) => a.decade - b.decade);
}

const displayData = (data) => {
  const imagesContainer = document.querySelector("#stamp-images");

  // display the stamps grouped by theme
  const themesSet = new Set();
  themesSet.add("AAUncategorized");

  themesSet.add("First Stamps");
  themesSet.add("Early Postmarks");
  data.forEach((stamp) => {
    stamp.themes.forEach((theme) => {
      themesSet.add(theme.keyword);
    });
  });

  const themesArray = Array.from(themesSet).sort();
  console.log(themesArray);

  themesArray.forEach((theme) => {
    // create theme section
    const themeSection = document.createElement("div");
    themeSection.className = "theme-section";

    const themeHeader = document.createElement("h2");
    themeHeader.textContent = theme;
    themeSection.appendChild(themeHeader);

    // add context if available
    const context = themeContext[theme.toLowerCase()];
    if (context) {
      const contextPara = document.createElement("p");
      contextPara.className = "theme-context";
      contextPara.textContent = context;
      themeSection.appendChild(contextPara);
    }

    // create container for images under this theme
    const themeImagesContainer = document.createElement("div");
    themeImagesContainer.className = "theme-images-container";

    let themedStamps = [];
    if (theme === "AAUncategorized") {
      themedStamps = data.filter(stamp => stamp.themes.length === 0);
    } else {
      // filter stamps for this theme
      themedStamps = data.filter(stamp => 
        stamp.themes.some(t => t.keyword === theme)
      );
    }

    // add images to the theme container
    themedStamps.forEach((stamp) => {
      if (stamp.media && stamp.decade == 1840) {
        const container = document.createElement("div");
        container.className = "stamp-image-container";

        const thumbnailImg = stamp.media[0].thumbnail;

        // create image element
        const img = document.createElement("img");
        img.src = thumbnailImg;
        img.className = "stamp-thumbnail";
        img.alt = stamp.title + ", " + (stamp.decade ? stamp.decade + "s" : "Date unknown");

        container.appendChild(img);
        themeImagesContainer.appendChild(container);
      }
    });

    themeSection.appendChild(themeImagesContainer);
    imagesContainer.appendChild(themeSection);
  });

  // data.forEach((stamp) => {
  //   // skip stamps without images
  //   if (stamp.media) {
  //     const container = document.createElement("div");
  //     container.className = "stamp-image-container";

  //     const thumbnailImg = stamp.media[0].thumbnail;

  //     // create image element
  //     const img = document.createElement("img");
  //     img.src = thumbnailImg;
  //     img.className = "stamp-thumbnail";
  //     img.alt = stamp.title;

  //     container.appendChild(img);
  //     imagesContainer.appendChild(container);
  //   } 
  // })
}

getAndParseAllData();
