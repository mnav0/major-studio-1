import * as d3 from "d3";

/**
 * Draw stamp bars grouped by theme and split by decade
 * @param {Array} data - Array of theme data with stamps
 * @param {Function} onStampClick - Callback when stamp is clicked
 */
export const drawBars = (data, decades, onStampClick) => {
  // Display stamp thumbnails grouped by theme with labels on the left
  const container = d3.select("#bars-container");

  // Create a div for each theme group
  decades.forEach(decade => {
    const decadeContainer = container.append("div")
      .attr("class", "decade-section")
      .attr("id", `decade-${decade}`);
    
    const decadeData = data.filter(d => d.decade === decade);
    
  
    decadeData.forEach(themeData => {
      const themeRow = decadeContainer.append("div")
        .attr("class", "bar-container");
      
      // Left side: theme label and count
      const labelContainer = themeRow.append("div")
        .attr("class", "label");
      
      labelContainer.append("p")
        .attr("class", "theme-title")
        .text(themeData.theme);
      
      labelContainer.append("p")
        .text(`(${themeData.count})`);
      
      // Right side: stamp thumbnails
      const stampsContainer = themeRow.append("div")
        .attr("class", "bar");
      
      // Display stamp thumbnails
      themeData.stamps.forEach(stamp => {
        const imgSizeParam = "max";
        const imgSizeValue = 200;
        const imageUrl = stamp.thumbnail + `&${imgSizeParam}=${imgSizeValue}`;
        
        stampsContainer.append("div")
          .attr("class", () => {
            const baseClass = "stamp-image-container-small";
            const finalClass = !!stamp.aspectRatio ? `${baseClass} ${stamp.aspectRatio}-stamp` : baseClass;
            return finalClass;
          })
          .append("img")
          .attr("class", "stamp-image-small")
          .attr("src", imageUrl)
          .attr("alt", stamp.title)
          .on("click", () => {
            onStampClick(stamp);
          });
      });
    });
  });
}
