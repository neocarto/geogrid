import { createSteppedArray } from "../helpers/createSteppedArray.js";

/**
 * @function square
 * @summary Compute a square grid.
 * @description The `square()` function allows to create a square grid in SVG coordinates.
 * @param {number} [step = 50] - Step of the grid.
 * @param {array} [start = [0,0]] - Positioning coordinates [x,y].
 * @param {number} [width = 1000] - Width of the grid
 * @param {number} [height = 500] - Height of the grid
 * @param {boolean} [overflow = true] - Depending on the step you choose, the grid may be smaller than the bounding box defined by with and height. With overflow = true, the grid is allowed to exceed the bounding box.
 * @returns {object} - A GeoJSON FeatureCollection
 * @example
 * geogrid.square({step:30})
 */
export function square({
  start = [0, 0],
  width = 1000,
  height = 500,
  step = 50,
  overflow = true,
} = {}) {
  // build grid

  let x0 = overflow ? start[0] : start[0] + step / 2;
  let y0 = overflow ? start[1] : start[1] + step / 2;

  let y = createSteppedArray(y0, start[1] + height - step / 2, step, true);
  let x = createSteppedArray(x0, start[0] + width - step / 2, step);

  if (overflow) {
    if (y[0] + step / 2 < start[1] + height) {
      y.unshift(y[0] + step);
    }
    if (x.at(-1) + step / 2 < start[0] + width) {
      x.push(x.at(-1) + step);
    }
  }

  let grid = x.map((x) => y.map((y) => [x, y])).flat();

  let s = step / 2;
  // build object
  let result = grid.map((d, i) => {
    return {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [d[0] - s, d[1] + s],
            [d[0] + s, d[1] + s],
            [d[0] + s, d[1] - s],
            [d[0] - s, d[1] - s],
            [d[0] - s, d[1] + s],
          ],
        ],
      },
      properties: {
        index: i,
      },
    };
  });
  return {
    type: "FeatureCollection",
    grid: "square",
    geo: false,
    features: result,
  };
}
