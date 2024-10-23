import { range } from "d3-array";
const d3 = Object.assign({}, { range });

/**
 * @function make.dot
 * @description The `make.dot()` function allows to create a geoJSON vith regular dots in SVG coordinates.
 * @property {number} [step = 50] - step of the grid
 * @property {number} [width = 1000] - width of the grid
 * @property {number} [height = 500] - height of the grid
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
