import { themeBuckets } from "../constants/themes.js";

/**
 * Find which theme bucket a theme belongs to
 */
export function findBucketForTheme(theme) {
  for (const [bucketName, keywords] of Object.entries(themeBuckets)) {
    if (keywords.map(k => k.toLowerCase()).includes(theme.toLowerCase())) {
      return bucketName;
    }
  }
}

/**
 * Group stamps by decade and theme
 */
export function groupByDecadeAndTheme(stampData) {
  const result = {};

  stampData.forEach(stamp => {
    const { decade, theme } = stamp;
    if (!result[decade]) result[decade] = {};
    if (!result[decade][theme]) result[decade][theme] = { count: 0, stamps: [] };

    result[decade][theme].count++;
    result[decade][theme].stamps.push(stamp);
  });

  return result;
}

/**
 * Flatten grouped data structure into array
 */
export function flattenGroupedData(groupedData) {
  const rows = [];
  for (const [decade, themes] of Object.entries(groupedData)) {
    const decadeNum = Number(decade);
    for (const [theme, data] of Object.entries(themes)) {
      rows.push({
        decade: decadeNum,
        theme,
        count: data.count,
        stamps: data.stamps,
      });
    }
  }
  return rows;
}

/**
 * Calculate distance between two stamps based on their embeddings
 */
export function distToStamp(A, B, stampEmbedding) {
  const embeddingA = A.embedding;
  const embeddingB = B.embedding;
  let diffSumA = 0;
  let diffSumB = 0;

  for (let idx = 0; idx < stampEmbedding.length; idx++) {
    diffSumA += (embeddingA[idx] - stampEmbedding[idx]) ** 2;
    diffSumB += (embeddingB[idx] - stampEmbedding[idx]) ** 2;
  }

  return diffSumA - diffSumB;
}

/**
 * Determine aspect ratio class for a stamp
 */
export function getAspectRatio(stamp) {
  const aspectRatio = stamp.media[0].resources?.[0]?.width / stamp.media[0].resources?.[0]?.height;

  let stampRatio = "";

  if ((aspectRatio > 1.05 && aspectRatio < 1.3) || stamp.decade === 1780) {
    stampRatio = "horizontal";
  } else if (aspectRatio >= 0.95 && aspectRatio <= 1.05) {
    stampRatio = "square";
  } else if (aspectRatio > 1.3 && aspectRatio <= 1.5) {
    stampRatio = "wide";
  } else if (aspectRatio > 1.5 && aspectRatio <= 1.8) {
    stampRatio = "extra-wide";
  } else if (aspectRatio > 1.8) {
    stampRatio = "widest";
  } else if (aspectRatio < 0.6) {
    stampRatio = "tall";
  }

  return stampRatio;
}

/**
 * Apply material and word filters to stamps
 */
export function applyFilters(stamps, selectedMaterials, selectedWords) {
  let filtered = stamps;
  
  if (selectedMaterials.length > 0) {
    filtered = filtered.filter(stamp =>
      selectedMaterials.every(mat =>
        stamp.materials.some(m => m.toLowerCase() === mat.toLowerCase())
      )
    );
  }

  if (selectedWords.length > 0) {
    filtered = filtered.filter(stamp => {
      const title = stamp.title.toLowerCase();
      const desc = stamp.description.toLowerCase();
      return selectedWords.every(word =>
        title.includes(word.toLowerCase()) || desc.includes(word.toLowerCase())
      );
    });
  }
  
  return filtered;
}
