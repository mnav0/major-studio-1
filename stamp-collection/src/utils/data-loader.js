import stampsJSON from "../data/stamps.json" assert { type: "json" };
import embeddingsJSON from "../data/embeddings.json" assert { type: "json" };
import detectedJSON from "../data/detected-all.json" assert { type: "json" };
import colorsJSON from "../data/colors.json" assert { type: "json" };
import imagesIdsJSON from "../data/images-ids.json" assert { type: "json" };
import { getAndParseAllData } from "../fetch-data.js";
import { getAspectRatio, groupByDecadeAndTheme } from "./helpers.js";

/**
 * Fetch and initialize all stamp data
 * @param {Function} onComplete - Callback when data is loaded with (stampData, decades)
 */
export const fetchStampData = (onComplete) => {
  getAndParseAllData().then(async (stampData) => {
    const stampsWithImages = stampData.filter(stamp => imagesIdsJSON.includes(stamp.id));
    stampsWithImages.forEach((stamp) => {
      stamp.embedding = embeddingsJSON.find(e => e.id === stamp.id)?.embedding || null;
      stamp.detected = detectedJSON.find(d => d.id === stamp.id)?.detected || null;
      const colorData = colorsJSON.find(c => c.id === stamp.id);
      stamp.colors = colorData ? { colorData: colorData.colorData } : null;
      stamp.aspectRatio = getAspectRatio(stamp);
    });

    const grouped = groupByDecadeAndTheme(stampsWithImages);
    const decades = Object.keys(grouped).map(d => Number(d)).sort((a, b) => a - b);

    onComplete(stampsWithImages, decades);
  });
}

/**
 * Development version - use preloaded JSON
 */
export const fetchStampDataForDev = (onComplete) => {
  const stampData = stampsJSON;
  const stampsWithImages = stampData.filter(stamp => imagesIdsJSON.includes(stamp.id));

  stampsWithImages.forEach((stamp) => {
    stamp.embedding = embeddingsJSON.find(e => e.id === stamp.id)?.embedding || null;
    stamp.detected = detectedJSON.find(d => d.id === stamp.id)?.detected || null;
    const colorData = colorsJSON.find(c => c.id === stamp.id);
    stamp.colors = colorData ? { colorData: colorData.colorData } : null;
    stamp.aspectRatio = getAspectRatio(stamp);
  });

  const grouped = groupByDecadeAndTheme(stampsWithImages);
  const decades = Object.keys(grouped).map(d => Number(d)).sort((a, b) => a - b);

  onComplete(stampsWithImages, decades);
}
