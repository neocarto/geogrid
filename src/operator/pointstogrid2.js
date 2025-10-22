import RBush from "rbush";
import { bbox } from "@turf/bbox";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";

/**
 * @function pointstogrid2
 * @description Assigns points to grid cells and computes sums per cell.
 *              Supports multiple variables and stores point properties if values=true
 * @param {object} opts
 * @property {object} [points] - GeoJSON points
 * @property {object} [grid] - GeoJSON grid (polygons)
 * @property {string|Array} [var] - Field(s) for summing values
 * @property {boolean} [values=false] - Include array of raw point properties
 */
export function pointstogrid2(opts = {}) {
  const { points, grid, var: varField, values: includeValues = false } = opts;

  const t0 = performance.now();

  const gridFeatures = grid.features;
  const pointFeatures = points.features;

  // --- Normalize varField to array ---
  const varFields = varField
    ? Array.isArray(varField)
      ? varField
      : [varField]
    : [];

  const gridbyindex = new Map(gridFeatures.map((d, i) => [i, d]));

  // --- 1. Spatial index for polygons ---
  const tree = new RBush();
  const items = gridFeatures.map((g, i) => {
    const [minX, minY, maxX, maxY] = bbox(g);
    return { minX, minY, maxX, maxY, i };
  });
  tree.load(items);

  // --- 2. Prepare stats storage per cell ---
  const gridStats = new Map();
  gridFeatures.forEach((g, i) => {
    gridStats.set(i, { countSet: new Set(), valuesList: [], numericLists: {} });
    varFields.forEach((v) => (gridStats.get(i).numericLists[v] = []));
  });

  // --- 3. Loop over points ---
  pointFeatures.forEach((pt, i) => {
    const x = pt.geometry.coordinates[0];
    const y = pt.geometry.coordinates[1];

    const candidates = tree.search({ minX: x, minY: y, maxX: x, maxY: y });

    for (const cand of candidates) {
      const poly = gridbyindex.get(cand.i);
      if (!booleanPointInPolygon(pt, poly)) continue;

      const stats = gridStats.get(cand.i);
      stats.countSet.add(i);

      // --- handle numeric variables ---
      varFields.forEach((v) => {
        const val = parseFloat(pt.properties[v]);
        if (!isNaN(val)) stats.numericLists[v].push(val);
      });

      // --- handle values option ---
      if (includeValues) stats.valuesList.push({ ...pt.properties });

      break; // point counted once per cell
    }
  });

  // --- 4. Build final GeoJSON ---
  const result = {
    type: "FeatureCollection",
    features: gridFeatures
      .map((g, i) => {
        const stats = gridStats.get(i);
        const count = stats.countSet.size;
        if (count === 0) return null;

        const cellProps = { count };

        // sum each variable
        varFields.forEach((v) => {
          const numericValues = stats.numericLists[v];
          cellProps[v] =
            numericValues.length > 0
              ? numericValues.reduce((a, b) => a + b, 0)
              : 0;
        });

        if (includeValues) cellProps.values = stats.valuesList;

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
