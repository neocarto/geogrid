import { Delaunay } from "d3-delaunay";
const d3 = Object.assign({}, { Delaunay });

/**
 * @function hexbin
 * @summary Compute a hexbin grid.
 * @description The `hexbin()` function allows to create a hexbin grid in SVG coordinates.
 * @param {number} [step = 50] - Step of the grid.
 * @param {array} [start = [0,0]] - Positioning coordinates [x,y].
 * @param {number} [width = 1000] - Width of the grid
 * @param {number} [height = 500] - Height of the grid
 * @param {boolean} [overflow = true] - Depending on the step you choose, the grid may be smaller than the bounding box defined by with and height. With overflow = true, the grid is allowed to exceed the bounding box.
 * @returns {object} - A GeoJSON FeatureCollection
 * @example
 * geogrid.hexbin({step:30})
 */

export function random({
  start = [0, 0],
  width = 1000,
  height = 500,
  step = 50,
  overflow = false,
} = {}) {
  let x0 = overflow ? start[0] - step : start[0];
  let y0 = overflow ? start[1] - step : start[1];
  let xend = overflow ? start[0] + width + step : x0 + width;
  let yend = overflow ? start[1] + height + step : y0 + height;

  let w = overflow ? width + step * 2 : width;
  let h = overflow ? height + step * 2 : height;
  let grid = [];
  let nb = Math.round((width / step) * (height / step));
  for (let i = 0; i < nb; i++) {
    grid.push([Math.random() * w + x0, Math.random() * h + y0]);
  }

  let voronoi = d3.Delaunay.from(
    grid,
    (d) => d[0],
    (d) => d[1]
  ).voronoi([x0, y0, xend, yend]);

  // build object
  let result = grid.map((d, i) => {
    return {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [voronoi.cellPolygon(i)],
      },
      properties: {
        index: i,
      },
    };
  });

  //  return result;
  return {
    type: "FeatureCollection",
    grid: "random",
    geo: false,
    features: result,
  };
}
