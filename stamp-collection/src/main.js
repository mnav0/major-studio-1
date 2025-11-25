import scrollama from "scrollama";

// components
import { drawTimeSlider, updateTimeSliderVisibility, redrawCurrentDecadeIndicator } from "./components/time-slider.js";
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
let scroller = null; // Scrollama instance

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
  fullScreenStamp: null,
  isFiltering: false
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

/**
 * Set min-height of decade sections to fill viewport (minus header)
 */
const setDecadeSectionHeights = () => {
  const viewportHeight = window.innerHeight;
  const header = document.querySelector('.data-heading');
  const headerHeight = header ? header.offsetHeight : 0;
  const minHeight = viewportHeight - headerHeight;
  
  document.querySelectorAll('.decade-section').forEach(section => {
    section.style.minHeight = `${minHeight}px`;
  });
};

// group and update the displayed data
const groupAndDisplayData = () => {
  state.isFiltering = true; // Set flag before changes
  
  const filteredStamps = getFilteredStampData();
  const grouped = groupByDecadeAndTheme(filteredStamps);

  // Update available decades from grouped data
  const availableDecades = Object.keys(grouped).map(d => Number(d)).sort((a, b) => a - b);
  const hasActiveFilters = state.materials.some(m => m.selected) || 
                           state.words.some(w => w.selected) || 
                           state.colors.some(c => c.selected);
  
  state.decades = hasActiveFilters ? availableDecades : allDecades;
  
  // If current decade not available, switch to first available
  if (!state.decades.includes(state.selectedDecade)) {
    state.selectedDecade = state.decades[0];
  }
  
  updateTimeSliderVisibility(state);

  // Flatten and sort by count
  const flattened = flattenGroupedData(grouped);
  const sortedByCount = flattened.sort((a, b) => b.count - a.count);

  // For each decade, determine featured stamp and sort stamps by similarity
  const dataByDecade = {};
  sortedByCount.forEach(group => {
    if (!dataByDecade[group.decade]) {
      dataByDecade[group.decade] = [];
    }
    dataByDecade[group.decade].push(group);
  });

  // Sort stamps within each decade by featured stamp
  Object.keys(dataByDecade).forEach(decade => {
    const decadeData = dataByDecade[decade];
    const featuredStamp = getFeaturedStampComponent(
      decadeData,
      null,
      filteredStamps,
      Number(decade)
    );
    
    // Sort stamps within each theme by similarity to featured stamp
    decadeData.forEach(group => {
      group.stamps.sort((a, b) => {
        if (a.embedding && b.embedding && featuredStamp?.embedding) {
          return distToStamp(a, b, featuredStamp.embedding);
        }
        return 0;
      });
    });

    // Store featured stamp for current decade
    if (Number(decade) === state.selectedDecade) {
      state.featuredStamp = featuredStamp;
    }
  });

  // Render all decades
  const barsContainer = document.querySelector("#bars-container");
  barsContainer.innerHTML = "";
  
  state.decades.forEach(decade => {
    const decadeData = dataByDecade[decade] || [];
    if (decadeData.length > 0) {
      drawBars(decadeData, [decade], handleStampClick);
    }
  });

  // Set min-height on all decade sections to fill viewport
  setDecadeSectionHeights();

  // Update heading for currently selected decade
  const currentDecadeData = dataByDecade[state.selectedDecade] || [];
  if (currentDecadeData.length > 0) {
    updateHeading(currentDecadeData, true);
  }

  // After rendering, scroll back to the selected decade
  requestAnimationFrame(() => {
    const newDecadeSection = document.querySelector(`#decade-${state.selectedDecade}`);
    if (newDecadeSection) {
      // Get the sticky header height
      const header = document.querySelector('.data-heading');
      const headerHeight = header ? header.offsetHeight : 0;
      
      // Scroll to top of decade section, accounting for sticky header
      const sectionTop = newDecadeSection.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: sectionTop - headerHeight,
        behavior: 'instant'
      });
    }
    
    // Set up scroll observer after scrolling back
    setTimeout(() => {
      setupScroll();
      state.isFiltering = false; // Clear flag after setup
    }, 100);
  });
}

/**
 * Update all heading sections
 * @param {Array} data - Theme data to display, or null to recalculate from current decade
 * @param {boolean} shouldUpdateFeatured - Whether to update featured image
 */
const updateHeading = (data = null, shouldUpdateFeatured = true) => {
  // If no data provided, recalculate for current decade
  if (!data) {
    const filteredStamps = state.stamps;
    const grouped = groupByDecadeAndTheme(filteredStamps);
    const flattened = flattenGroupedData(grouped);
    
    data = flattened
      .filter(group => group.decade === state.selectedDecade)
      .sort((a, b) => b.count - a.count);
    
    if (data.length === 0) return;
    
    // Determine featured stamp for this decade
    state.featuredStamp = getFeaturedStampComponent(
      data,
      state.featuredStamp,
      filteredStamps,
      state.selectedDecade
    );
  }

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

const setupScroll = () => {
  // Destroy existing scroller if it exists
  if (scroller) {
    scroller.destroy();
  }

  // instantiate the scrollama
  scroller = scrollama();

  // setup the instance, pass callback functions
  scroller
    .setup({
      step: ".decade-section",
      offset: 0.75
    })
    .onStepEnter((response) => {
      // Ignore scroll events during filtering
      if (state.isFiltering) return;
      
      const newDecade = Number(response.element.id.replace("decade-", ""));

      // Only update if decade has changed
      if (newDecade !== state.selectedDecade) {
        // Update the circle position on the slider
        redrawCurrentDecadeIndicator(state, newDecade);
        
        // Update selected decade and heading (will recalculate from state.stamps)
        state.selectedDecade = newDecade;
        updateHeading(null, true);
      }
    })
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

  // Add window resize listener to update decade section heights
  // let resizeTimeout;
  // window.addEventListener('resize', () => {
  //   clearTimeout(resizeTimeout);
  //   resizeTimeout = setTimeout(() => {
  //     setDecadeSectionHeights();
  //     // Optionally resize scrollama after height changes
  //     if (scroller) {
  //       scroller.resize();
  //     }
  //   }, 250); // Debounce resize events
  // });
}

// load data and initialize application
loadStampData(initializeApp);
