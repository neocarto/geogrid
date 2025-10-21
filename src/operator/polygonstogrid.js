import { featureCollection } from "@turf/helpers";
import { bbox } from "@turf/bbox";
import { intersect } from "@turf/intersect";
import area from "@turf/area";
import RBush from "rbush";
import { min, max, median, mean, sum } from "d3-array";

/**
 * @function polygonstogrid
 * @description Assign polygons to a grid and compute statistics per cell.
 *              Optimized and removes cells with count = 0
 * @param {object} opts
 * @property {object} [grid] - GeoJSON grid
 * @property {object} [polygons] - GeoJSON polygons to assign
 * @property {string} [var] - Field for weighting (optional)
 * @property {boolean} [values=false] - Include array of raw values
 * @property {boolean} [sum=true] - Compute sum
 * @property {boolean} [median=false] - Compute median
 * @property {boolean} [min=false] - Compute minimum
 * @property {boolean} [max=false] - Compute maximum
 * @property {boolean} [mean=false] - Compute mean
 */
export function polygonstogrid(opts = {}) {
  const {
    grid,
    polygons,
    var: varField,
    values: includeValues = false,
    sum: calcSum = true,
    median: calcMedian = false,
    min: calcMin = false,
    max: calcMax = false,
    mean: calcMean = false,
  } = opts;

  const t0 = performance.now();

  const t1 = performance.now();
  console.log(`Execution time: ${(t1 - t0).toFixed(2)} ms`);
}
