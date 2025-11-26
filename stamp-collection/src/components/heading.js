import { findBucketForTheme } from "../utils/helpers.js";
import { historicalContext } from "../constants/context.js";
import contextRegex from "../constants/text.js";
import { getColorsForDecadeAndTheme } from "../utils/color-analyzer.js";

/**
 * Helper function to toggle selection state for any filter item
 */
const toggleSelection = (item, element, className, callback) => {
  item.selected = !item.selected;
  element.classList.toggle(className);
  callback();
};

/**
 * Update main themes display
 */
export const updateThemes = (data) => {
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
}

/**
 * Update historical context with clickable keywords
 */
export const updateHistory = (state, onWordClick) => {
  // Store currently selected words BEFORE clearing
  const previouslySelected = state.words
    .filter(w => w.selected)
    .map(w => w.text);
  
  // Clear previous words
  state.words = [];

  const histContext = document.querySelector("#historical-context");
  const content = historicalContext[state.selectedDecade];
  
  // Helper function to check if a word appears in the filtered stamps
  const wordExistsInStamps = (word) => {
    const wordLower = word.toLowerCase();
    const wordRegex = new RegExp(`\\b${wordLower}`, 'i');
    
    return state.stamps.some(stamp => {
      const title = stamp.title.toLowerCase();
      const desc = stamp.description.toLowerCase();
      return stamp.decade === state.selectedDecade && (wordRegex.test(title) || wordRegex.test(desc));
    });
  };

  // Parse content to match all context words and wrap in spans
  const parsedContent = content.replace(contextRegex, (match) => {
    if (wordExistsInStamps(match)) {
      const wasSelected = previouslySelected.includes(match);
      state.words.push({ text: match, selected: wasSelected });
      
      const selectedClass = wasSelected ? ' selected-word' : '';
      return `<span class="filter-word${selectedClass}">${match}</span>`;
    } else {
      return match;
    }
  });

  histContext.innerHTML = parsedContent;

  // Check for previously selected words that are NOT in the current context
  const wordsInContext = state.words.map(w => w.text);
  const missingSelected = previouslySelected.filter(word => 
    !wordsInContext.includes(word)
  );

  // Append missing selected words at the end
  if (missingSelected.length > 0) {
    const appendDiv = document.createElement("div");
    appendDiv.style.marginTop = "0.5em";
    
    missingSelected.forEach(word => {
      const wordSpan = document.createElement("span");
      wordSpan.className = "filter-word selected-word";
      wordSpan.textContent = word;
      wordSpan.style.marginRight = "0.15em";
      
      const wordObj = { text: word, selected: true };
      state.words.push(wordObj);
      appendDiv.appendChild(wordSpan);
      
      wordSpan.addEventListener("click", () => {
        toggleSelection(wordObj, wordSpan, "selected-word", onWordClick);
      });
    });
    
    histContext.appendChild(appendDiv);
  }

  // Add click handlers to all filter words
  const filterWords = document.querySelectorAll(".filter-word");
  filterWords.forEach((wordSpan) => {
    wordSpan.addEventListener("click", () => {
      const wordObj = state.words.find(w => w.text === wordSpan.textContent);
      if (wordObj) {
        toggleSelection(wordObj, wordSpan, "selected-word", onWordClick);
      }
    });
  });
}

/**
 * Update materials display with top materials from current theme
 */
export const updateMaterials = (data, state, onMaterialClick) => {
  const featuredMaterialsContainer = document.querySelector("#featured-materials");

  // Store currently selected materials BEFORE clearing
  const previouslySelected = state.materials
    .filter(m => m.selected)
    .map(m => m.name);
  
  featuredMaterialsContainer.innerHTML = "";

  // Get top materials from the top theme
  const topThemeStamps = data[0]?.stamps || [];
  const materialCounts = {};
  
  topThemeStamps.forEach((stamp) => {
    stamp.materials.forEach((material) => {
      const matLower = material.toLowerCase();
      materialCounts[matLower] = (materialCounts[matLower] || 0) + 1;
    });
  });

  const sortedMaterials = Object.entries(materialCounts).sort((a, b) => b[1] - a[1]);
  const topMaterials = sortedMaterials.slice(0, 5).map(entry => entry[0]);

  // Build materials array: selected materials first, then fill with top materials
  const materialsToDisplay = [...topMaterials];
  const missingSelected = previouslySelected.filter(s => !topMaterials.includes(s));
  
  if (missingSelected.length > 0) {
    materialsToDisplay.push(...missingSelected);
    materialsToDisplay.splice(5); // Keep only first 5
  }

  state.materials = [];

  materialsToDisplay.forEach((material) => {
    const wasSelected = previouslySelected.includes(material);
    const materialObj = { name: material, selected: wasSelected };
    state.materials.push(materialObj);
    
    const materialDiv = document.createElement("div");
    const materialText = document.createElement("p");
    materialDiv.className = "material-item";
    materialText.innerHTML = material;
    if (wasSelected) materialText.classList.add("selected-word");
    materialDiv.appendChild(materialText);

    materialDiv.onclick = () => {
      toggleSelection(materialObj, materialText, "selected-word", onMaterialClick);
    };
    
    featuredMaterialsContainer.appendChild(materialDiv);
  });
}

/**
 * Update color swatches
 */
export const updateColors = (data, state, onColorClick) => {
  const swatches = document.querySelectorAll(".color-swatch");
  swatches.forEach(s => {
    s.style.backgroundColor = "transparent";
    s.classList.remove("selected");
  });

  const topThemeGroup = data[0];
  if (!topThemeGroup?.stamps) return;

  const previouslySelected = state.colors.filter(c => c.selected);
  const topColors = getColorsForDecadeAndTheme(data, state.selectedDecade, topThemeGroup.theme, 5);
  
  // Build color array: selected colors first, then fill with top colors
  const colorsToDisplay = [];
  const usedHexes = new Set();
  
  // Add selected colors that exist in topColors
  topColors.forEach(topColor => {
    const selectedMatch = previouslySelected.find(ps => ps.hex === topColor.hex);
    if (selectedMatch) {
      colorsToDisplay.push(selectedMatch);
      usedHexes.add(topColor.hex);
    }
  });
  
  // Add missing selected colors (not in topColors)
  previouslySelected.forEach(selectedColor => {
    if (!usedHexes.has(selectedColor.hex)) {
      colorsToDisplay.push(selectedColor);
      usedHexes.add(selectedColor.hex);
    }
  });
  
  // Fill remaining slots with non-selected top colors
  topColors.forEach(topColor => {
    if (!usedHexes.has(topColor.hex) && colorsToDisplay.length < 5) {
      colorsToDisplay.push({ ...topColor, selected: false });
      usedHexes.add(topColor.hex);
    }
  });
  
  state.colors = colorsToDisplay;
  
  // Render swatches
  swatches.forEach((swatch, idx) => {
    const color = colorsToDisplay[idx];
    
    if (color) {
      swatch.style.backgroundColor = color.hex;
      if (color.selected) swatch.classList.add("selected");
      swatch.style.cursor = "pointer";
      
      swatch.onclick = () => {
        toggleSelection(color, swatch, "selected", onColorClick);
      };
    } else {
      swatch.style.cursor = "default";
      swatch.onclick = null;
    }
  });
}
