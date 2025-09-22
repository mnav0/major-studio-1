// array of stamp data based on Smithsonian API
let stampData = [];

// search: fetches an array of terms based on term category
const constructAndFetchQueries = (searchTerm) => {
    // search base URL
    const searchBaseURL = "https://api.si.edu/openaccess/api/v1.0/search"; 

    // API key
    const apiKey = process.env.SI_API_KEY;  

    let url = searchBaseURL + "?api_key=" + apiKey + "&q=" + searchTerm;

    return window
      .fetch(url)
      .then(res => res.json())
      .then(data => {

        // constructing search queries to get all the rows of data
        let pageSize = 1000;
        let numberOfQueries = Math.ceil(data.response.rowCount / pageSize);
        const fetchAllPromises = [];

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

  if (!!decadeStart && !objectData.title.toLowerCase().includes("cover") && isUSStamp) {
    // TODO: parse titles and add tags
    stampData.push({
      id: objectData.id,
      title: objectData.title,
      link: objectData.content.descriptiveNonRepeating.record_link,
      decade: decadeStart,
      media: objectData.content.descriptiveNonRepeating.online_media?.media,
      notes: objectData.content.freetext.notes?.[0].content
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

  data.forEach((stamp) => {
    // skip stamps without images
    if (stamp.media) {
      const container = document.createElement("div");
      container.className = "stamp-image-container";

      const thumbnailImg = stamp.media[0].thumbnail;

      // create image element
      const img = document.createElement("img");
      img.src = thumbnailImg;
      img.className = "stamp-thumbnail";
      img.alt = stamp.title;

      container.appendChild(img);
      imagesContainer.appendChild(container);
    } 
  })
}

getAndParseAllData();
