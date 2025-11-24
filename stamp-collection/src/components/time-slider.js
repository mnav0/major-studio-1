import * as d3 from "d3";
import { colors } from "../constants/colors.js";

/**
 * Draw the vertical time slider
 * @param {Array} decades - Array of all decades to show on slider
 * @param {Object} state - Application state object
 * @param {Function} onDecadeChange - Callback when decade is changed
 */
export const drawTimeSlider = (decades, state, onDecadeChange) => {
  const sliderSection = document.querySelector("#slider-container");
  sliderSection.style.display = "block";

  // Create vertical timeline structure
  const margin = { top: 10, right: 0, bottom: 10, left: 10 };
  const width = 110;
  const height = 300;

  const svg = d3.select("#slider-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("display", "block");

  // Create vertical scale
  const y = d3.scaleLinear()
    .domain([d3.min(decades), d3.max(decades)])
    .range([margin.top, height - margin.bottom]);

  const timeline = svg.append("g")
    .attr("class", "timeline")
    .attr("transform", `translate(${margin.left},0)`);

  // Draw vertical line
  timeline.append("line")
    .attr("class", "track")
    .attr("x1", 0)
    .attr("x2", 0)
    .attr("y1", y.range()[0])
    .attr("y2", y.range()[1])
    .attr("stroke", colors.middle)
    .attr("stroke-width", 1)
    .attr("stroke-linecap", "round");

  // Add decade ticks and labels
  timeline.selectAll("line.tick")
    .data(decades)
    .enter()
    .append("line")
    .attr("class", "tick")
    .attr("x1", -8)
    .attr("x2", 8)
    .attr("y1", d => y(d))
    .attr("y2", d => y(d))
    .attr("stroke", colors.middle)
    .attr("stroke-width", 1);

  timeline.selectAll("text.decade-label")
    .data(decades)
    .enter()
    .append("text")
    .attr("class", "decade-label")
    .attr("x", 40)
    .attr("y", d => y(d))
    .attr("dy", "0.35em")
    .attr("text-anchor", "start")
    .style("font-size", "14px")
    .text(d => d === state.selectedDecade ? d : '');

  // Add line for current position indicator
  const lineIndicator = timeline.append("line")
    .attr("class", "indicator-line")
    .attr("x1", 0)
    .attr("x2", 35)
    .attr("y1", y(state.selectedDecade))
    .attr("y2", y(state.selectedDecade))
    .attr("stroke", colors.middle)
    .attr("stroke-width", 1);

  // Add circle for current position indicator
  const circleIndicator = timeline.append("circle")
    .attr("class", "position-indicator")
    .attr("cx", 0)
    .attr("cy", y(state.selectedDecade))
    .attr("r", 8)
    .attr("fill", colors.dark);

  // Add click interaction to ticks
  const tickPadding = 10;
  timeline.selectAll("rect.tick-area")
    .data(decades)
    .enter()
    .append("rect")
    .attr("class", "tick-area")
    .attr("x", -8 - tickPadding)
    .attr("y", d => y(d) - tickPadding)
    .attr("width", 16 + tickPadding * 2)
    .attr("height", tickPadding * 2)
    .attr("fill", "transparent")
    .style("cursor", "pointer")
    .on("click", function(event, d) {
      state.selectedDecade = d;
      lineIndicator.transition()
        .duration(150)
        .attr("y1", y(state.selectedDecade))
        .attr("y2", y(state.selectedDecade));
      circleIndicator.transition()
        .duration(150)
        .attr("cy", y(state.selectedDecade));

      timeline.selectAll("text.decade-label").text(dd => dd === state.selectedDecade ? dd : '');
      onDecadeChange();
    });
}

/**
 * Update time slider tick visibility based on available decades
 * @param {Object} state - Application state containing decades array
 */
export const updateTimeSliderVisibility = (state) => {
  // Update tick visibility based on available decades
  d3.selectAll("line.tick")
    .style("opacity", d => state.decades.includes(d) ? 1 : 0);
  
  // Update tick area clickability
  d3.selectAll("rect.tick-area")
    .style("pointer-events", d => state.decades.includes(d) ? "auto" : "none")
    .style("cursor", d => state.decades.includes(d) ? "pointer" : "default");
}
