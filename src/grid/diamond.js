import { createSteppedArray } from "../helpers/createSteppedArray.js";

/**
 * @function diamond
 * @summary Compute a diamond grid.
 * @description The `diamond()` function allows to create a diamond grid in SVG coordinates.
 * @param {number} [step = 50] - Step of the grid.
 * @param {array} [start = [0,0]] - Positioning coordinates [x,y].
 * @param {number} [width = 1000] - Width of the grid
 * @param {number} [height = 500] - Height of the grid
 * @param {boolean} [overflow = true] - Depending on the step you choose, the grid may be smaller than the bounding box defined by with and height. With overflow = true, the grid is allowed to exceed the bounding box.
 * @returns {object} - A GeoJSON FeatureCollection
 * @example
 * geogrid.diamond({step:30})
 */
export function diamond({
  start = [0, 0],
  width = 1000,
  height = 500,
  step = 50,
  overflow = true,
} = {}) {
  let size = step * Math.sqrt(2);

  let x0 = overflow ? start[0] : start[0] + size / 2;
  let y0 = overflow ? start[1] : start[1] + size / 2;
  let xend = start[0] + width + size / 2;
  let yend = start[1] + height + size / 2;

  let x = createSteppedArray(x0, xend, size);
  let y = createSteppedArray(y0, yend, size / 2, false);
  let grid = x.map((x) => y.map((y, j) => [x, y, j % 2])).flat();
  grid = grid.map((d) => {
    return d[2] === 1 ? [d[0] + size / 2, d[1]] : [d[0], d[1]];
  });

  grid = overflow
    ? grid.filter((d) => d[0] <= start[0] + width + size / 2)
    : grid.filter((d) => d[0] <= start[0] + width - size / 2);

  grid = overflow
    ? grid.filter((d) => d[1] <= start[1] + height + size / 2)
    : grid.filter((d) => d[1] <= start[1] + height - size / 2);

  let s = size / 2;

  let result = grid.map((d, i) => {
    return {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [d[0] - s, d[1]],
            [d[0], d[1] + s],
            [d[0] + s, d[1]],
            [d[0], d[1] - s],
            [d[0] - s, d[1]],
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
    grid: "diamond",
    geo: false,
    features: result,
  };
}
