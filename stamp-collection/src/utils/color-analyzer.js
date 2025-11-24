/**
 * Color analysis utilities for finding dominant colors in stamp collections
 */

/**
 * Extract all colors with their population counts from stamps
 */
function extractColorsFromStamps(stamps) {
  const colorMap = new Map(); // Map of hex -> total population
  
  stamps.forEach(stamp => {
    if (stamp.colors && Array.isArray(stamp.colors.colorData)) {
      stamp.colors.colorData.forEach(colorObj => {
        if (colorObj.hex && colorObj.population !== undefined) {
          const currentPop = colorMap.get(colorObj.hex) || 0;
          colorMap.set(colorObj.hex, currentPop + colorObj.population);
        }
      });
    }
  });
  
  // Convert map to array of {hex, population} and sort by population
  return Array.from(colorMap.entries())
    .map(([hex, population]) => ({ hex, population }))
    .sort((a, b) => b.population - a.population);
}

/**
 * Get top colors with distribution skewed toward more frequent colors
 * Uses exponential scaling to favor dominant colors while showing variety
 * Only samples from the top 85% of colors to avoid rare outliers
 * @param {Array} stamps - Array of stamp objects with color data
 * @param {number} numColors - Number of colors to return (default: 5)
 * @returns {Array} Array of hex color strings representing the distribution
 */
export function getTopColors(stamps, numColors = 5) {
  // Extract all colors with their populations from stamps
  const colorsByPopulation = extractColorsFromStamps(stamps);
  
  if (colorsByPopulation.length === 0) {
    return [];
  }
  
  // If we have fewer colors than requested, return all of them
  if (colorsByPopulation.length <= numColors) {
    return colorsByPopulation.map(colorObj => colorObj.hex);
  }

  // Only sample from the top 85% of colors to avoid rare outliers
  const maxRange = Math.floor(colorsByPopulation.length * 0.85);
  const sampleRange = Math.max(maxRange, numColors); // At least enough for numColors
  
  const selectedIndices = [];
  
  for (let i = 0; i < numColors; i++) {
    // Use exponential scaling within the limited range
    // This keeps us in the visually dominant colors
    const ratio = i / (numColors - 1);
    const position = Math.floor(Math.pow(ratio, 2.5) * (sampleRange - 1));
    selectedIndices.push(position);
  }
  
  // Return colors at the calculated positions
  return selectedIndices.map(index => colorsByPopulation[index].hex);
}

/**
 * Get dominant colors for a specific decade and theme
 * @param {Array} groupedData - Array of grouped data objects
 * @param {number} decade - Target decade
 * @param {string} theme - Target theme
 * @param {number} topN - Number of colors to return
 * @returns {Array} Array of hex color strings
 */
export function getColorsForDecadeAndTheme(groupedData, decade, theme, topN = 5) {
  const group = groupedData.find(g => g.decade === decade && g.theme === theme);
  
  if (!group || !group.stamps) {
    return [];
  }
  
  return getTopColors(group.stamps, topN);
}