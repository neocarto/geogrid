import { createSteppedArray } from "../helpers/createSteppedArray.js";

/**
 * @function dot
 * @summary Compute a dot grid.
 * @description The `dot()` function allows to create a square grid in SVG coordinates.
 * @param {number} [step = 50] - Step of the grid.
 * @param {array} [start = [0,0]] - Positioning coordinates [x,y].
 * @param {number} [width = 1000] - Width of the grid
 * @param {number} [height = 500] - Height of the grid
 * @param {boolean} [overflow = true] - Depending on the step you choose, the grid may be smaller than the bounding box defined by with and height. With overflow = true, the grid is allowed to exceed the bounding box.
 * @returns {object} - A GeoJSON FeatureCollection
 * @example
 * geogrid.dot({step:30})
 */
export function dot({
  step = 30,
  start = [0, 0],
  width = 1000,
  height = 500,
  overflow = true,
} = {}) {
  // build grid
  let x0 = overflow ? start[0] - step / 2 : start[0];
  let y0 = overflow ? start[1] - step / 2 : start[1];
  let xend = overflow ? start[0] + width + step : start[0] + width;
  let yend = overflow ? start[1] + height + step : start[1] + height;
  let x = createSteppedArray(x0, xend, step);
  let y = createSteppedArray(y0, yend, step, true);

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
