import { findBucketForTheme } from "../utils/helpers.js";
import { historicalContext } from "../constants/context.js";
import contextRegex from "../constants/text.js";
import { getColorsForDecadeAndTheme } from "../utils/color-analyzer.js";

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

  const filterWords = document.querySelectorAll(".filter-word");
  filterWords.forEach((wordSpan) => {
    wordSpan.addEventListener("click", () => {
      const wordObj = state.words.find(w => w.text === wordSpan.textContent);
      if (!wordObj?.selected) {
        wordObj.selected = true;
        wordSpan.classList.add("selected-word");
      } else {
        wordObj.selected = false;
        wordSpan.classList.remove("selected-word");
      }
      onWordClick();
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
  state.materials = [];

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

  topMaterials.forEach((material) => {
    const materialDiv = document.createElement("div");
    const materialText = document.createElement("p");
    materialDiv.className = "material-item";
    materialText.innerHTML = material;
    materialDiv.appendChild(materialText);

    materialDiv.onclick = () => {
      const materialObj = state.materials.find(mat => mat.name === materialText.textContent.toLowerCase());
      if (!materialObj?.selected) {
        materialObj.selected = true;
        materialText.classList.add("selected-word");
      } else {
        materialObj.selected = false;
        materialText.classList.remove("selected-word");
      }
      onMaterialClick();
    };

    const wasSelected = previouslySelected.includes(material);
    state.materials.push({ name: material, selected: wasSelected });
    
    if (wasSelected) {
      materialText.classList.add("selected-word");
    }
    
    featuredMaterialsContainer.appendChild(materialDiv);
  });
}

/**
 * Update color swatches
 */
export const updateColors = (data, state, onColorClick) => {
  const swatches = document.querySelectorAll(".color-swatch");
  
  // Clear swatches visual state
  swatches.forEach(s => {
    s.style.backgroundColor = "transparent";
    s.classList.remove("selected");
  });

  const topThemeGroup = data[0];
  if (!topThemeGroup?.stamps) return;

  const topColors = getColorsForDecadeAndTheme(
    data, 
    state.selectedDecade, 
    topThemeGroup.theme, 
    5
  );
  
  // Build new color array, preserving positions of selected colors
  const colorsToDisplay = new Array(5).fill(null);
  
  // Keep selected colors in their original positions
  state.colors.forEach((color, idx) => {
    if (color.selected && idx < 5) {
      colorsToDisplay[idx] = { ...color };
    }
  });
  
  // Fill empty slots with new top colors (skip colors already selected)
  let newColorIndex = 0;
  for (let i = 0; i < 5; i++) {
    if (colorsToDisplay[i] === null && newColorIndex < topColors.length) {
      // Find next unused color
      while (newColorIndex < topColors.length) {
        const newColor = topColors[newColorIndex++];
        const alreadyUsed = colorsToDisplay.some(c => c?.hex === newColor.hex);
        
        if (!alreadyUsed) {
          colorsToDisplay[i] = { ...newColor, selected: false };
          break;
        }
      }
    }
  }
  
  // Update state with non-null colors
  state.colors = colorsToDisplay.filter(c => c !== null);
  
  // Render swatches
  swatches.forEach((swatch, idx) => {
    const color = colorsToDisplay[idx];
    
    if (color) {
      swatch.style.backgroundColor = color.hex;
      if (color.selected) swatch.classList.add("selected");
      swatch.style.cursor = "pointer";
      
      swatch.onclick = () => {
        const stateColor = state.colors.find(c => c.hex === color.hex);
        if (stateColor) {
          stateColor.selected = !stateColor.selected;
          swatch.classList.toggle("selected");
          onColorClick();
        }
      };
    } else {
      // No color - make non-interactive
      swatch.style.cursor = "default";
      swatch.onclick = null;
    }
  });
}
