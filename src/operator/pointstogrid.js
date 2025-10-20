import RBush from "rbush";
import { bbox } from "@turf/bbox";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { min, max, median, mean, sum } from "d3-array";

/**
 * @function pointstogrid
 * @description Assigns points to grid cells and computes statistics per cell.
 * @param {object} opts
 * @property {object} [points] - GeoJSON points
 * @property {object} [grid] - GeoJSON grid (polygons)
 * @property {string} [var] - Field for weighting points (optional)
 * @property {boolean} [values=false] - Include array of raw values/IDs
 * @property {boolean} [sum=true] - Compute sum
 * @property {boolean} [median=false] - Compute median
 * @property {boolean} [min=false] - Compute minimum
 * @property {boolean} [max=false] - Compute maximum
 * @property {boolean} [mean=false] - Compute mean
 */
export function pointstogrid(opts = {}) {
  const {
    points,
    grid,
    var: varField,
    values: includeValues = false,
    sum: calcSum = true,
    median: calcMedian = false,
    min: calcMin = false,
    max: calcMax = false,
    mean: calcMean = false,
  } = opts;

  const t0 = performance.now();
  const gridFeatures = grid.features;
  const pointFeatures = points.features;
  const hasVar = varField !== undefined && varField !== null;

  const gridbyindex = new Map(gridFeatures.map((d, i) => [i, d]));

  // ---- 1. Spatial index for polygons ----
  const tree = new RBush();
  const items = gridFeatures.map((g, i) => {
    const [minX, minY, maxX, maxY] = bbox(g);
    return { minX, minY, maxX, maxY, i };
  });
  tree.load(items);

  // ---- 2. Prepare stats storage per cell ----
  const gridStats = new Map();
  gridFeatures.forEach((g, i) => {
    gridStats.set(i, { countSet: new Set(), valuesList: [], numericList: [] });
  });

  // ---- 3. Loop over points ----
  pointFeatures.forEach((pt, i) => {
    const x = pt.geometry.coordinates[0];
    const y = pt.geometry.coordinates[1];

    const candidates = tree.search({ minX: x, minY: y, maxX: x, maxY: y });

    for (const cand of candidates) {
      const poly = gridbyindex.get(cand.i);
      if (!booleanPointInPolygon(pt, poly)) continue;

      const stats = gridStats.get(cand.i);
      stats.countSet.add(i);

      const val = hasVar ? pt.properties[varField] : 1;

      if (includeValues)
        stats.valuesList.push(hasVar ? pt.properties[varField] : i);
      if (hasVar) stats.numericList.push(parseFloat(val) || 0);
      break; // point counted once per cell
    }
  });

  // ---- 4. Build final GeoJSON ----
  const result = {
    type: "FeatureCollection",
    features: gridFeatures
      .map((g, i) => {
        const stats = gridStats.get(i);
        const numericValues = stats.numericList;
        const values = stats.valuesList;
        const count = stats.countSet.size;

        if (count === 0) return null;

        const cellProps = { count };

        if (hasVar && numericValues.length > 0) {
          if (calcSum) cellProps.sum = sum(numericValues);
          if (calcMean) cellProps.mean = mean(numericValues);
          if (calcMedian) cellProps.median = median(numericValues);
          if (calcMin) cellProps.min = min(numericValues);
          if (calcMax) cellProps.max = max(numericValues);
        }

        if (includeValues) cellProps.values = values;

        return {
          type: g.type,
          properties: { ...g.properties, ...cellProps },
          geometry: g.geometry,
        };
      })
      .filter((f) => f !== null),
  };

  const t1 = performance.now();
  console.log(`Execution time: ${(t1 - t0).toFixed(2)} ms`);
  return result;
}
