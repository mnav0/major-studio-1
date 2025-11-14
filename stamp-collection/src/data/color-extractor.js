import { Vibrant } from "node-vibrant/browser";

const stampColors = [];

// Extract color palette from a single stamp image
async function extractStampColors(stamp) {
  try {
    const imageUrl = stamp.thumbnail || stamp.media?.[0]?.thumbnail;
    if (!imageUrl) return null;

    const palette = await Vibrant.from(imageUrl).getPalette();

    const colorArr = [];
    for (const swatch in palette) {
      const colorInfo = palette[swatch];
      if (colorInfo) {
        colorArr.push({
          hsl: colorInfo.hsl,
          hex: colorInfo.hex,
          population: colorInfo.population,
          rgb: colorInfo.rgb
        });
      }
    }

    return colorArr;
  } catch (error) {
    console.warn(`Failed to extract colors for stamp ${stamp.id}:`, error);
    return null;
  }
}

// Process stamps in batches to avoid overwhelming Vibrant.js
export async function extractColorsForAllStamps(stampData, batchSize = 50, delayMs = 100) {
  console.log(`Starting color extraction for ${stampData.length} stamps...`);
  
  for (let i = 0; i < stampData.length; i += batchSize) {
    const batch = stampData.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(stampData.length / batchSize)}`);
    
    // Process batch in parallel
    const colorPromises = batch.map(stamp => extractStampColors(stamp));
    const colors = await Promise.all(colorPromises);
    
    // Assign colors to stamps
    batch.forEach((stamp, index) => {
      const stampColorObj = {
        id: stamp.id,
        colorData: colors[index]
      }
      stampColors.push(stampColorObj);
    });
    
    // Add delay between batches to prevent overload
    if (i + batchSize < stampData.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return stampColors;
}
