import { colors } from "../constants/colors.js";

/**
 * Toggle stamp modal visibility and populate with stamp data
 * @param {Object} stamp - Stamp object to display (null to close)
 * @param {Function} onClose - Callback when modal is closed
 */
export const toggleStampModal = (stamp, onClose) => {
  const modal = document.querySelector("#modal");
  const imageContainer = document.querySelector("#modal-image");
  const loadingDiv = document.querySelector("#modal-loading-state");

  if (stamp) {
    loadingDiv.style.backgroundColor = colors.light;
    loadingDiv.style.opacity = "1";

    modal.style.display = "block";
    document.body.classList.add("modal-open");

    const imgSizeParam = "max";
    const imgSizeValue = 1500;
    const imageUrl = stamp.thumbnail + `&${imgSizeParam}=${imgSizeValue}`;

    if (stamp.aspectRatio === "tall") {
      imageContainer.classList.add("tall-modal-image");
    }

    const img = imageContainer.querySelector("img");
    if (stamp.aspectRatio === "horizontal" || 
        stamp.aspectRatio === "wide" || 
        stamp.aspectRatio === "widest") {
      img.classList.add("fill-modal-height");
    }
    img.src = imageUrl;
    img.alt = stamp.title;

    const titleElem = modal.querySelector("h2");
    titleElem.textContent = stamp.title;

    const themeElem = modal.querySelector("#modal-theme")
    themeElem.textContent = stamp.theme;

    let descHeading;
    let descElem;
    if (stamp.description) {
      descElem = modal.querySelector("#modal-description");
      descElem.textContent = stamp.description;
    } else {
      descHeading = modal.querySelector("#modal-description-heading");
      descHeading.style.display = "none";
    }
    
    const materialsElem = modal.querySelector("#modal-materials");
    stamp.materials.forEach((material) => {
      const materialDiv = document.createElement("div");
      const materialText = document.createElement("p");
      materialDiv.className = "material-item-sm";
      materialText.innerHTML = material;
      materialDiv.appendChild(materialText);
      materialsElem.appendChild(materialDiv);
    });

    const colorsElem = modal.querySelector("#modal-colors");
    stamp.colors.colorData.forEach(color => {
      const colorSwatch = document.createElement("div");
      colorSwatch.className = "color-swatch-sm";
      colorSwatch.style.backgroundColor = color.hex;
      colorsElem.appendChild(colorSwatch);
    }); 


    const closeButton = document.querySelector("#close-modal-button");
    closeButton.onclick = () => {
      modal.style.display = "none";
      document.body.classList.remove("modal-open");
      img.classList.remove("fill-modal-height");
      img.src = "";
      img.alt = "";
      
      imageContainer.classList.remove("tall-modal-image")

      // clear all text content
      titleElem.textContent = "";
      themeElem.textContent = "";
      if (descHeading) {
        descHeading.style.display = "block";
      } else if (descElem) {
        descElem.textContent = "";
      }
      materialsElem.innerHTML = "";
      colorsElem.innerHTML = "";
      onClose();
    };
  }

   setTimeout(() => {
     loadingDiv.style.opacity = "0";
   }, 1000);
}
