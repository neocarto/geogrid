import { createSteppedArray } from "../helpers/createSteppedArray.js";

/**
 * @function triangle
 * @summary Compute a triangle grid.
 * @description The `triangle()` function allows to create a triangle grid in SVG coordinates.
 * @param {number} [step = 50] - Step of the grid.
 * @param {array} [start = [0,0]] - Positioning coordinates [x,y].
 * @param {number} [width = 1000] - Width of the grid
 * @param {number} [height = 500] - Height of the grid
 * @param {boolean} [overflow = true] - Depending on the step you choose, the grid may be smaller than the bounding box defined by with and height. With overflow = true, the grid is allowed to exceed the bounding box.
 * @returns {object} - A GeoJSON FeatureCollection
 * @example
 * geogrid.triangle({step:30})
 */
export function triangle({
  start = [0, 0],
  width = 1000,
  height = 500,
  step = 50,
  overflow = true,
} = {}) {
  let triangletop = (p, size) => {
    let h = (Math.sqrt(3) / 2) * size;
    let p1 = [p[0] + size / 2, p[1]];
    let p2 = [p[0], p[1] - h];
    let p3 = [p[0] - size / 2, p[1]];
    return [p1, p2, p3, p1];
  };

  let trianglebottom = (p, size) => {
    let h = (Math.sqrt(3) / 2) * size;
    let p1 = [p[0] + size / 2, p[1]];
    let p2 = [p[0], p[1] + h];
    let p3 = [p[0] - size / 2, p[1]];
    return [p1, p2, p3, p1];
  };

  let size = step / Math.sqrt(3);
  let h = (Math.sqrt(3) / 2) * step;

  // build grid
  let x0 = overflow ? start[0] - step / 2 : start[0];
  let y0 = overflow ? start[1] - h / 2 : start[1];
  let xend = start[0] + width + h;
  let yend = x0 + height + h;

  let x = createSteppedArray(x0, xend, step);
  let y = createSteppedArray(y0, yend, h, true);

  if (y.length % 2) {
    y.unshift(y[0] + h);
  }

  let grid = x.map((x, i) => y.map((y) => [x, y])).flat();
  grid = grid.map((d, i) => {
    return i % 2 == 1 ? [d[0] + step / 2, d[1]] : d;
  });

  let nb = grid.length;
  grid = grid.concat(grid);

  // Build triangles
  let triangles = [];
  grid.forEach((d, i) => {
    if (overflow) {
      // triangle top
      if (i < nb) {
        if (
          d[0] <= x0 + width + step &&
          d[0] > x0 &&
          d[1] >= y0 + step / 2 &&
          d[1] <= start[1] + height + h
        ) {
          triangles.push(triangletop(d, step));
        }
      }
      //triangle bottom
      else {
        if (
          d[0] <= x0 + width + step &&
          d[0] > x0 &&
          d[1] <= start[1] + height
        ) {
          triangles.push(trianglebottom(d, step));
        }
      }
    } else {
      // triangle top
      if (i < nb) {
        if (
          d[0] <= x0 + width - step / 2 &&
          d[0] > x0 &&
          d[1] <= y0 + height &&
          d[1] > y0
        ) {
          triangles.push(triangletop(d, step));
        }
      }
      //triangle bottom
      else {
        if (
          d[0] <= x0 + width - step / 2 &&
          d[0] > x0 &&
          d[1] <= y0 + height - h
        ) {
          triangles.push(trianglebottom(d, step));
        }
      }
    }
  });

  // Build geojson

  let result = triangles.map((d, i) => ({
    type: "Feature",
    geometry: {
      type: "Polygon",
      //coordinates: d
      coordinates: [d],
    },
    properties: {
      index: i,
      coords: d,
    },
  }));

  return {
    type: "FeatureCollection",
    grid: "triangle",
    geo: false,
    features: result,
  };
}
