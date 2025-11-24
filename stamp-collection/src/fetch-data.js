/** Ran to fetch and process the stamp data served in stamps.json from the Smithsonian API */
import { themeNormalization, themePriority } from "./constants/themes.js";

let stampData = [];

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

function extractMaterials(medium) {
  // convert medium into an array of materials, splitting on ; or /
  const firstMaterials = medium.split(/;|\//).map(m => m.trim());
  // run through materials and if there are any ") " not at the end of a string, split that as well
  const materials = [];
  firstMaterials.forEach(m => {
    if (m.includes(") ")) {
      const splitMaterials = m.split(") ").map(sm => {
        // if there is a beginning parentheses missing after the split, add it back
        // but don't return if materials already includes this
        let processed = sm;
        if (!sm.endsWith(")") && sm.includes("(")) {
          processed = sm + ")";
        }

        return processed.trim();
      });

      materials.push(...splitMaterials);
    } else {
      materials.push(m);
    }
  });

  return materials;
}

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
  if (objectData.content.freetext.date) {
    const firstDateContent = objectData.content.freetext?.date[0].content;

    // use regex to get the first 4 numbers in the firstDateContent field
    const yearMatch = firstDateContent.match(/\d{4}/);
    rawYearData = yearMatch ? parseInt(yearMatch[0]) : null;
  }

  const decade = rawYearData && Math.floor(rawYearData / 10) * 10;

  let currentPlace = "";
  if (objectData.content.indexedStructured.place) {
    currentPlace = objectData.content.indexedStructured.place[0];
  }

  const isUSTopic = objectData.content.indexedStructured.topic?.includes("U.S. Stamps");
  const isUSPlace = currentPlace.toLowerCase().includes("united states");
  if (!(isUSTopic || isUSPlace)) return;

  const description = objectData.content.freetext.notes?.find((n) => n.label == "Description")?.content || "";
  const title = objectData.title || "";
  const medium = objectData.content.freetext.physicalDescription?.find((pd) => pd.label == "Medium")?.content || "";

  const materials = extractMaterials(medium);

  // filter out covers of postage stamp proof that don't show the stamp itself
  const isEnvelope = /envelope/i.test(title); 
  if (isEnvelope) return;

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
      media,
      thumbnail,
      decade,
      title,
      description,
      materials,
      theme // single string
    });
  }
};

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
  return Promise.all(searchPromises).then((result) => {
    // process and display data here
    return stampData;
  })
}

export { getAndParseAllData };