import { createSteppedArray } from "../helpers/createSteppedArray.js";

/**
 * @function dot
 * @summary Compute a dot grid.
 * @description The `square()` function allows to create a square grid in SVG coordinates.
 * @param {number} [step = 50] - step of the grid.
 * @param {array} [width = [0,1000, 500, 0]] - Bounding box [top, right, bottom, left].
 * @param {boolean} [overflow = false] - Depending on the step you choose, the grid may be smaller than the bounding box. With overflow = true, the grid is allowed to exceed the bounding box.
 * @returns {object} - A GeoJSON FeatureCollection
 * @example
 * geogrid.dot({step:30})
 */
export function dot({ step = 30, width = 1000, height = 500 } = {}) {
  // build grid
  let y = d3.range(0 + step / 2, height, step).reverse();
  let x = d3.range(0 + step / 2, width, step);
  let grid = x.map((x) => y.map((y) => [x, y])).flat();
  let s = step / 2;
  // build object
  let result = grid.map((d, i) => {
    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: d,
      },
      properties: {
        index: i,
      },
    };
  });
  return {
    type: "FeatureCollection",
    grid: "dot",
    geo: false,
    features: result,
  };
}
