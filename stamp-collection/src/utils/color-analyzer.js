/**
 * Color analysis utilities for finding dominant colors in stamp collections
 */

/**
 * Calculate color distance using Euclidean distance in RGB space
 * Returns a value between 0 (identical) and ~441.67 (opposite corners of RGB cube)
 * @param {Array} rgb1 - First color as [r, g, b] array
 * @param {Array} rgb2 - Second color as [r, g, b] array
 * @returns {number} Distance between colors
 */
function colorDistance(rgb1, rgb2) {
  const rDiff = rgb1[0] - rgb2[0];
  const gDiff = rgb1[1] - rgb2[1];
  const bDiff = rgb1[2] - rgb2[2];
  return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
}

/**
 * Check if two colors are similar within a tolerance threshold
 * @param {Array} rgb1 - First RGB array [r, g, b]
 * @param {Array} rgb2 - Second RGB array [r, g, b]
 * @param {number} threshold - Maximum distance to consider colors similar (default: 50)
 *                             Typical values: 30 (strict), 50 (moderate), 100 (loose)
 * @returns {boolean} True if colors are similar
 */
export function areColorsSimilar(rgb1, rgb2, threshold = 50) {
  return colorDistance(rgb1, rgb2) <= threshold;
}

/**
 * Check if a stamp contains ALL selected colors (AND logic, not OR)
 * @param {Object} stamp - Stamp object with colors.colorData
 * @param {Array} selectedColorObjects - Array of selected color objects with {rgb} property
 * @param {number} threshold - Color similarity threshold
 * @returns {boolean} True if stamp contains ALL selected colors
 */
export function stampHasSimilarColors(stamp, selectedColorObjects, threshold = 50) {
  if (!stamp.colors?.colorData) return false;
  
  // Stamp must contain ALL selected colors (AND logic)
  return selectedColorObjects.every(selectedColor => {
    if (!selectedColor.rgb) return false;
    
    // Check if stamp has at least one color similar to this selected color
    return stamp.colors.colorData.some(colorObj => 
      colorObj.rgb && areColorsSimilar(selectedColor.rgb, colorObj.rgb, threshold)
    );
  });
}

/**
 * Extract all colors with their population counts and RGB data from stamps
 */
function extractColorsFromStamps(stamps) {
  const colorMap = new Map(); // Map of hex -> {population, rgb}
  
  stamps.forEach(stamp => {
    if (stamp.colors && Array.isArray(stamp.colors.colorData)) {
      stamp.colors.colorData.forEach(colorObj => {
        if (colorObj.hex && colorObj.population !== undefined && colorObj.rgb) {
          const existing = colorMap.get(colorObj.hex);
          if (existing) {
            existing.population += colorObj.population;
          } else {
            colorMap.set(colorObj.hex, {
              hex: colorObj.hex,
              population: colorObj.population,
              rgb: colorObj.rgb
            });
          }
        }
      });
    }
  });
  
  // Convert map to array and sort by population
  return Array.from(colorMap.values())
    .sort((a, b) => b.population - a.population);
}

/**
 * Get top colors ensuring all returned colors are visually distinct from each other
 * @param {Array} stamps - Array of stamp objects with color data
 * @param {number} numColors - Number of colors to return (default: 5)
 * @param {number} minDistance - Minimum RGB distance between colors (default: 50)
 * @returns {Array} Array of color objects with {hex, rgb} properties
 */
export function getTopColors(stamps, numColors = 5, minDistance = 50) {
  const colorsByPopulation = extractColorsFromStamps(stamps);
  if (colorsByPopulation.length === 0) return [];

  const selectedColors = [];
  
  // Iterate through colors by popularity, selecting distinct ones
  for (const candidate of colorsByPopulation) {
    if (selectedColors.length >= numColors) break;
    
    // Check if this color is distinct from all already-selected colors
    const isDistinct = selectedColors.every(selected => 
      colorDistance(candidate.rgb, selected.rgb) >= minDistance
    );
    
    if (isDistinct) {
      selectedColors.push(candidate);
    }
  }
  
  // If we still need more colors, relax min distance and retry
  if (selectedColors.length < numColors) {
    const relaxedDistance = minDistance * 0.75;
    for (const candidate of colorsByPopulation) {
      if (selectedColors.length >= numColors) break;
      if (selectedColors.some(s => s.hex === candidate.hex)) continue;
      
      const isDistinct = selectedColors.every(selected => 
        colorDistance(candidate.rgb, selected.rgb) >= relaxedDistance
      );
      
      if (isDistinct) {
        selectedColors.push(candidate);
      }
    }
  }
  
  return selectedColors.map(({ hex, rgb }) => ({ hex, rgb }));
}

/**
 * Get dominant colors for a specific decade and theme
 * @param {Array} groupedData - Array of grouped data objects
 * @param {number} decade - Target decade
 * @param {string} theme - Target theme
 * @param {number} topN - Number of colors to return
 * @returns {Array} Array of color objects with {hex, rgb} properties
 */
export function getColorsForDecadeAndTheme(groupedData, decade, theme, topN = 5) {
  const group = groupedData.find(g => g.decade === decade && g.theme === theme);
  
  if (!group || !group.stamps) {
    return [];
  }
  
  return getTopColors(group.stamps, topN);
}