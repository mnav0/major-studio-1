import { colors } from "../constants/colors.js";
import { images, titles, ids } from "../constants/images.js";

/**
 * Update the featured stamp display
 * @param {Object} featuredStamp - The stamp to feature
 * @param {Object} state - Application state
 */
export const updateFeaturedImg = (featuredStamp, state) => {
  const container = document.querySelector(".stamp-image-container");
  
  // Clear any existing content
  container.innerHTML = "";

  if (!featuredStamp) {
    return;
  }

  // Check if this stamp has a local image available
  const stampDecade = featuredStamp.decade || state.selectedDecade;
  const hasLocalImage = ids[stampDecade] === featuredStamp.id;

  // For preprocessed stamps with local images, use <img> tag
  if (hasLocalImage) {
    const img = document.createElement('img');
    img.id = 'stamp-highlight-image';
    img.className = 'stamp-highlight-thumbnail';
    img.src = images[stampDecade];
    img.alt = titles[stampDecade];
    
    // Apply aspect ratio class for proper styling
    const aspectRatioClass = state.stamps.find(s => s.id === featuredStamp.id)?.aspectRatio;
    if (!!aspectRatioClass) {
      img.classList.add(`${aspectRatioClass}-stamp-thumbnail`);
    }
    
    container.appendChild(img);
    return;
  }

  // For stamps with detection data, use canvas
  const canvas = document.createElement('canvas');
  canvas.id = 'stamp-highlight-canvas';
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  canvas.title = featuredStamp.title || "Featured stamp";
  container.appendChild(canvas);
  
  const ctx = canvas.getContext('2d');

  // Create loading div with dominant color
  const loadingDiv = document.createElement('div');
  loadingDiv.classList.add('featured-stamp-loading');
  container.appendChild(loadingDiv);

  if (featuredStamp.colors && featuredStamp.colors.colorData?.length > 0) {
    const topColor = featuredStamp.colors.colorData.sort((a, b) => b.population - a.population)[0];
    loadingDiv.style.backgroundColor = topColor.hex || colors.light;
  }

  // Force reflow for animation
  loadingDiv.offsetHeight;
  loadingDiv.classList.add('show-loading');

  // Load and render stamp image
  const tempImg = new Image();
  tempImg.crossOrigin = "Anonymous";

  const imgSizeParam = "max";
  const imgSizeValue = 1500;
  tempImg.src = featuredStamp.thumbnail + `&${imgSizeParam}=${imgSizeValue}`;

  tempImg.onload = function() {
    let detectedData = featuredStamp.detected || [];
    
    if (detectedData.length > 0 && !hasLocalImage) {
      let bestDetection = detectedData[0];

      // Filter detections by decade
      if (state.selectedDecade > 1800) {
        detectedData = detectedData.filter(d => d.label !== 'postmark' && d.label !== 'embossed');
      } else if (state.selectedDecade === 1800) {
        detectedData = detectedData.filter(d => d.type === 'embossed');
      }

      if (detectedData.length === 0) {
        detectedData = featuredStamp.detected;
        bestDetection = detectedData[0];
      } else {
        bestDetection = selectBestDetection(detectedData);
      }

      renderCroppedImage(ctx, tempImg, bestDetection.box, canvas);
    } else {
      renderFullImage(ctx, tempImg, canvas);
    }

    loadingDiv.classList.remove('show-loading');
  };
}

/**
 * Select best detection using clustering algorithm
 */
function selectBestDetection(detectedData) {
  const scoreDiffThreshold = 0.1;
  const highestScore = detectedData[0].score;
  let largestCluster = [];
  
  for (let i = 0; i < detectedData.length; i++) {
    let cluster = [detectedData[i]];
    
    for (let j = i + 1; j < detectedData.length; j++) {
      if (Math.abs(detectedData[i].score - detectedData[j].score) <= scoreDiffThreshold) {
        cluster.push(detectedData[j]);
      }
    }
    
    if (cluster.length > largestCluster.length) {
      largestCluster = cluster;
    }
  }
  
  if (largestCluster.length >= 3) {
    const clusterHighestScore = largestCluster[0].score;
    
    if (highestScore - clusterHighestScore <= 0.3) {
      return largestCluster[0];
    }
  }
  
  return detectedData[0];
}

/**
 * Render cropped image to canvas using detection box
 */
function renderCroppedImage(ctx, img, box, canvas) {
  const [x1, y1, x2, y2] = box;
  
  const sourceX = x1 * img.width;
  const sourceY = y1 * img.height;
  const sourceWidth = (x2 - x1) * img.width;
  const sourceHeight = (y2 - y1) * img.height;
  
  const sourceAspect = sourceWidth / sourceHeight;
  const canvasAspect = canvas.width / canvas.height;
  
  let destX = 0, destY = 0, destWidth = canvas.width, destHeight = canvas.height;
  
  if (sourceAspect > canvasAspect) {
    destHeight = canvas.width / sourceAspect;
    destY = sourceAspect < 1.2 ? (canvas.height - destHeight) / 2 : 32;
  } else {
    destWidth = canvas.height * sourceAspect;
    destX = (canvas.width - destWidth) / 2;
  }
  
  ctx.drawImage(
    img,
    sourceX, sourceY, sourceWidth, sourceHeight,
    destX, destY, destWidth, destHeight
  );
}

/**
 * Render full image to canvas
 */
function renderFullImage(ctx, img, canvas) {
  const imgAspect = img.width / img.height;
  const canvasAspect = canvas.width / canvas.height;
  
  let destX = 0, destY = 0, destWidth = canvas.width, destHeight = canvas.height;
  
  if (imgAspect > canvasAspect) {
    destWidth = canvas.height * imgAspect;
    destX = (canvas.width - destWidth) / 2;
  } else {
    destHeight = canvas.width / imgAspect;
    destY = (canvas.height - destHeight) / 2;
  }
  
  ctx.drawImage(img, destX, destY, destWidth, destHeight);
}

/**
 * Get the featured stamp for display
 * @param {Array} dataToDisplay - Sorted theme data
 * @param {Object} currentFeatured - Currently featured stamp
 * @param {Array} stamps - All filtered stamps
 * @param {number} selectedDecade - Current decade
 * @returns {Object} Featured stamp object
 */
export const getFeaturedStamp = (dataToDisplay, currentFeatured, stamps, selectedDecade) => {
  const defaultStampId = ids[selectedDecade];
  const defaultFeaturedInStamps = stamps.find(s => s.id === defaultStampId);

  if (defaultFeaturedInStamps) {
    return defaultFeaturedInStamps;
  }

  const topTheme = dataToDisplay[0];
  const currentFeaturedInStamps = stamps.find(s => s.id === currentFeatured?.id);
  
  if (currentFeaturedInStamps) {
    const currentFeaturedInTopTheme = topTheme?.stamps.find(s => s.id === currentFeatured.id);
    if (currentFeaturedInTopTheme) {
      return currentFeatured;
    }
  }
  
  if (topTheme?.stamps.length > 0) {
    return topTheme.stamps[0];
  }

  return currentFeatured;
}
