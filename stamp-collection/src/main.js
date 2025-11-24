// components
import { drawTimeSlider, updateTimeSliderVisibility } from "./components/time-slider.js";
import { drawBars } from "./components/bars.js";
import { toggleStampModal } from "./components/modal.js";
import { updateFeaturedImg as updateFeaturedImgComponent, getFeaturedStamp as getFeaturedStampComponent } from "./components/featured-stamp.js";
import { updateThemes, updateHistory, updateMaterials, updateColors } from "./components/heading.js";

// utils
import { groupByDecadeAndTheme, flattenGroupedData, distToStamp } from "./utils/helpers.js";
import { fetchStampData as loadStampData } from "./utils/data-loader.js";
import { stampHasSimilarColors } from "./utils/color-analyzer.js";

// constants
import { processInfo } from "./constants/process-info.js";

// state and data
let allStamps = [];
let allDecades = [];

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

// filtering logic
const getFilteredStampData = () => {
  const { materials, words, colors } = state;
  let hasActiveFilters = false;
  let filteredStamps = allStamps;

  // Get currently selected filters
  const selectedMaterials = materials.filter(m => m.selected).map(m => m.name);
  const selectedWords = words.filter(w => w.selected).map(w => w.text);
  const selectedColorObjects = colors.filter(c => c.selected); // Keep full objects with {hex, rgb}

  // Apply material filters
  if (selectedMaterials.length > 0) {
    hasActiveFilters = true;
    filteredStamps = filteredStamps.filter(stamp =>
      selectedMaterials.every(mat =>
        stamp.materials.some(m => m.toLowerCase() === mat.toLowerCase())
      )
    );
  }

  // Apply word filters
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

  // Apply color filters with fuzzy matching using RGB data
  if (selectedColorObjects.length > 0) {
    hasActiveFilters = true;
    const colorThreshold = 20;
    filteredStamps = filteredStamps.filter(stamp => 
      stampHasSimilarColors(stamp, selectedColorObjects, colorThreshold)
    );
  }

  state.stamps = filteredStamps;

  // Show/hide reset filters button
  const resetFiltersButton = document.getElementById("reset-filters");
  if (hasActiveFilters) {
    resetFiltersButton.style.display = "block";
    resetFiltersButton.onclick = () => {
      resetFilters();
    };
  } else {
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

// group and update the displayed data
const groupAndDisplayData = () => {
  const filteredStamps = getFilteredStampData();
  const grouped = groupByDecadeAndTheme(filteredStamps);

  // Update available decades from grouped data
  const availableDecades = Object.keys(grouped).map(d => Number(d)).sort((a, b) => a - b);
  const hasActiveFilters = state.materials.some(m => m.selected) || 
                           state.words.some(w => w.selected) || 
                           state.colors.some(c => c.selected);
  
  state.decades = hasActiveFilters ? availableDecades : allDecades;
  
  updateTimeSliderVisibility(state);

  // Get data for selected decade only
  const groupedForDecade = { [state.selectedDecade]: grouped[state.selectedDecade] || {} };
  const flattened = flattenGroupedData(groupedForDecade);
  const dataToDisplay = flattened.sort((a, b) => b.count - a.count);

  // Determine featured stamp
  const currFeaturedStamp = state.featuredStamp;
  const newFeaturedStamp = getFeaturedStampComponent(
    dataToDisplay,
    currFeaturedStamp,
    state.stamps,
    state.selectedDecade
  );

  let shouldUpdateFeatured = false;
  if (currFeaturedStamp !== newFeaturedStamp) {
    shouldUpdateFeatured = true;
    state.featuredStamp = newFeaturedStamp;
  }

  // Sort stamps by similarity to featured stamp
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

  // Update UI
  const barsContainer = document.querySelector("#bars-container");
  barsContainer.innerHTML = "";

  updateHeading(dataToDisplay, shouldUpdateFeatured);
  drawBars(dataToDisplay, handleStampClick);
}

/**
 * Update all heading sections
 */
const updateHeading = (data, shouldUpdateFeatured = true) => {
  updateColors(data, state, groupAndDisplayData);
  updateThemes(data);
  updateHistory(state, groupAndDisplayData);
  updateMaterials(data, state, groupAndDisplayData);

  if (shouldUpdateFeatured) {
    updateFeaturedImgComponent(state.featuredStamp, state);
  }
}

// open stamp modal
const handleStampClick = (stamp) => {
  state.fullScreenStamp = stamp;
  toggleStampModal(stamp, () => {
    state.fullScreenStamp = null;
  });
}

// dropdown about sections
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

// enable about sections
const setupClickableHeadings = () => {
  const clickableHeadings = document.querySelectorAll(".col-heading");
  clickableHeadings.forEach((heading, index) => {
    heading.onclick = () => toggleAboutInfo(index);
  });
}

// expose entry point
const setupEntryButton = () => {
  const entryButton = document.querySelector("#entry-button");
  entryButton.style.display = "inline-block";
  entryButton.addEventListener("click", () => {
    enterVisualization();
  });
}

// enter visualization
const enterVisualization = () => {
  const introSection = document.querySelector("#intro-section");
  introSection.style.display = "none";
  
  const dataSection = document.querySelector("#data");
  dataSection.style.display = "block";
  
  groupAndDisplayData();
  setupClickableHeadings();
}

// exit visualization
const enterHomepage = () => {
  const introSection = document.querySelector("#intro-section");
  introSection.style.display = "block";

  const dataSection = document.querySelector("#data");
  dataSection.style.display = "none";
}

// start point
const initializeApp = (stampData, decades) => {
  allStamps = stampData;
  state.stamps = stampData;
  allDecades = decades;
  state.decades = decades;

  setupEntryButton();
  drawTimeSlider(allDecades, state, groupAndDisplayData);

  // Set title with total stamps
  const titleText = document.querySelector("#data-title-text");
  titleText.innerHTML = `<strong>America's Stamp Collection / 1765-1894</strong> (${stampData.length} stamps)`;
  titleText.onclick = () => {
    enterHomepage();
  };
}

// load data and initialize application
loadStampData(initializeApp);
