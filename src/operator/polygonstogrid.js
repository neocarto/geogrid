import { bbox } from "@turf/bbox";
import { intersect } from "@turf/intersect";
import { geoPath } from "d3-geo";
import RBush from "rbush";

/**
 * @function polygonstogrid
 * @description Assign polygons to a grid and compute weighted sums per cell.
 *              Uses a spatial index to speed up calculations
 *              Optimized and removes cells with count = 0
 *              Supports multiple variables in varField (string or array of strings)
 *              Treats undefined or NaN as zero when summing
 *              If `values` is true, stores an array of intersected polygon properties
 * @param {object} opts
 * @property {object} [polygons] - GeoJSON polygons or multi polygons to assign
 * @property {object} [grid] - GeoJSON grid
 * @property {string|Array} [var] - Field(s) ton compute weighted sums (optional)
 * @property {boolean} [values=false] - Include array of raw polygons properties
 */
export function polygonstogrid(opts = {}) {
  const {
    grid,
    polygons,
    grid_id = "index",
    var: varField,
    values: includeValues = false,
  } = opts;

  const t0 = performance.now();
  const path = geoPath();

  // --- Normalize varField to array ---
  const varFields = varField
    ? Array.isArray(varField)
      ? varField
      : [varField]
    : [];

  // --- 1. Compute planar areas for polygons and grid cells ---
  for (const poly of polygons.features) {
    poly.properties.area_plan = path.area(poly);
  }
  for (const cell of grid.features) {
    cell.properties.area_plan = path.area(cell);

    // initialize statistics
    cell.properties.count = 0;
    for (const v of varFields) {
      cell.properties[v] = 0;
    }
    if (includeValues) cell.properties.values = [];
  }

  // --- 2. Build spatial index (RBush) on the grid ---
  const tree = new RBush();
  const items = grid.features.map((cell) => {
    const [minX, minY, maxX, maxY] = bbox(cell);
    return { minX, minY, maxX, maxY, cell };
  });
  tree.load(items);

  // --- 3. Loop over polygons ---
  for (const poly of polygons.features) {
    const [minX, minY, maxX, maxY] = bbox(poly);
    const candidates = tree.search({ minX, minY, maxX, maxY });

    for (const cand of candidates) {
      const cell = cand.cell;

      const inter = intersect({
        type: "FeatureCollection",
        features: [poly, cell],
      });
      if (!inter) continue;

      const areaPlan = path.area(inter);
      const pctAreaPlan = areaPlan / poly.properties.area_plan;

      // update cell statistics
      cell.properties.count += 1;

      for (const v of varFields) {
        const value = parseFloat(poly.properties[v]);
        cell.properties[v] += !isNaN(value) ? value * pctAreaPlan : 0;
      }

      // add properties of intersected polygons
      if (includeValues) {
        cell.properties.values.push({ ...poly.properties });
      }
    }
  }

  // --- 4. Filter out cells with count == 0 ---
  const filteredGrid = {
    ...grid,
    features: grid.features.filter((cell) => cell.properties.count > 0),
  };

  const t1 = performance.now();
  console.log(
    `Intersection completed for ${filteredGrid.features.length} cells — ${(
      t1 - t0
    ).toFixed(2)} ms`
  );

  return filteredGrid;
}
