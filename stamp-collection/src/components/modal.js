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

    const imgSizeParam = "max";
    const imgSizeValue = 1500;
    const imageUrl = stamp.thumbnail + `&${imgSizeParam}=${imgSizeValue}`;

    if (stamp.aspectRatio === "tall") {
      imageContainer.classList.add("tall-modal-image");
    }

    const img = imageContainer.querySelector("img");
    img.src = imageUrl;
    img.alt = stamp.title;

    const textContainer = modal.querySelector("#modal-text").querySelector('.text');
    const titleElem = document.createElement("h2");
    titleElem.textContent = stamp.title;
    const descElem = document.createElement("p");
    descElem.textContent = stamp.description;
    textContainer.appendChild(titleElem);
    textContainer.appendChild(descElem);

    const closeButton = document.querySelector("#close-modal-button");
    closeButton.onclick = () => {
      modal.style.display = "none";
      img.src = "";
      img.alt = "";
      textContainer.innerHTML = "";
      imageContainer.classList.remove("tall-modal-image");
      onClose();
    };
  }

   setTimeout(() => {
     loadingDiv.style.opacity = "0";
   }, 1000);
}
