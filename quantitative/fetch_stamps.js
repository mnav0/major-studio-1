// put your API key here;
const apiKey = "";  

// search base URL
const searchBaseURL = "https://api.si.edu/openaccess/api/v1.0/search";

// constructing the initial search query to get all stamps
const allStampsSearch = `unit_code:"NPM" AND object_type:"Postage stamps"`

// these are the outliers that we will need to fetch the initial stamps from the 1780s
const processingStampsSearch = `stamp AND unit_code:"NPM" AND date:"1780s"`

// these are the outliers that we will need to fetch the embossed stamps from the early 1800s
const embossedStampsSearch = `unit_code:"NPM" AND object_type:"Tax stamps" AND date:"1800s"`

const searches = [ allStampsSearch, processingStampsSearch, embossedStampsSearch ];

// array that we will write into
let stampData = [];

// search: fetches an array of terms based on term category
function fetchSearchData(searchTerm) {
    let url = searchBaseURL + "?api_key=" + apiKey + "&q=" + searchTerm;

    return window
      .fetch(url)
      .then(res => res.json())
      .then(data => {
        
        // constructing search queries to get all the rows of data
        // you can change the page size
        let pageSize = 1000;
        let numberOfQueries = Math.ceil(data.response.rowCount / pageSize);

        for(let i = 0; i < numberOfQueries; i++) {
          // making sure that our last query calls for the exact number of rows
          if (i == (numberOfQueries - 1)) {
            searchAllURL = url + `&start=${i * pageSize}&rows=${data.response.rowCount - (i * pageSize)}`;
          } else {
            searchAllURL = url + `&start=${i * pageSize}&rows=${pageSize}`;
          }

          return fetchAllData(searchAllURL);
        
        }
      })
      .catch(error => {
        console.log(error);
      })
  }

// fetching all the data listed under our search and pushing them all into our custom array
function fetchAllData(url) {
  return window
    .fetch(url)
    .then(res => res.json())
    .then(data => {
      data.response.rows.forEach(function(n) {
        addObject(n);
      });
      return;
    })
    .catch(error => {
      console.log(error)
    })

}

// create your own array with just the data you need
function addObject(objectData) {  
  
  // we've encountered that some places have data others don't
  let currentPlace = "";
  if(objectData.content.indexedStructured.place) {
    currentPlace = objectData.content.indexedStructured.place[0];
  }

  // what to do with uncategorized dates? is there another place in structure we can look for date?
  let decadeStart;
  if (objectData.content.indexedStructured.date) {
    decadeStart = parseInt(objectData.content.indexedStructured.date[0].slice(0, 4));
  } else if (objectData.content.freetext.date) {
    decadeStart = parseInt(objectData.freetext?.date[0].content.split(", ")[1]);
  }

  stampData.push({
    id: objectData.id,
    title: objectData.title,
    link: objectData.content.descriptiveNonRepeating.record_link,
    decade: decadeStart,
    place: currentPlace,
    media: objectData.content.descriptiveNonRepeating.online_media?.media,
    notes: objectData.content.freetext.notes?.[0].content
  })
}

// TODO: fix promise chaining - not fetching the last 500 records?
const searchPromises = searches.map((search) => 
  Promise.resolve(fetchSearchData(search))
);

Promise.all(searchPromises).then((result) => {
  stampData.sort((a, b) => a.decade - b.decade);

  const imageContainer = document.querySelector("#stamp-images");

  stampData.forEach((stamp) => {
    // what to do about stamps w no thumbnail? backup media? or skip?
    if (stamp.media) {
      const thumbnailImg = stamp.media[0].thumbnail;
      var img = document.createElement("img");
      img.src = thumbnailImg;
      img.className = "stamp-thumbnail";
      // TODO: move to constants
      img.style.width = "50px";
      img.style.height = "50px";
      imageContainer.appendChild(img);
    }
  })
})