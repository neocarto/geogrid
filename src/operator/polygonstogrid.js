import { bbox } from "@turf/bbox";
import { intersect } from "@turf/intersect";
import { area } from "@turf/area";
import { geoPath } from "d3-geo";
import { stitchmerge } from "../helpers/stitchmerge.js";
import { unstitch } from "../helpers/unstitch.js";
import RBush from "rbush";

/**
 * @function polygonstogrid
 * @description Assign polygons to a grid and compute weighted sums per cell.
 *              Supports planar (path.area) or spherical (Turf area) surface calculation.
 *              Optimized and removes cells with count = 0.
 *              Supports multiple variables in varField (string or array of strings).
 *              Treats undefined or NaN as zero when summing.
 *              If `values` is true, stores an array of intersected polygon properties.
 * @param {object} opts
 * @property {object} [polygons] - GeoJSON polygons or multipolygons to assign
 * @property {object} [grid] - GeoJSON grid
 * @property {string|Array} [var] - Field(s) to compute weighted sums (optional)
 * @property {boolean} [values=false] - Include array of raw polygon properties
 * @property {boolean} [spherical=false] - Compute areas on the sphere (Turf) instead of planar (D3)
 */
export function polygonstogrid(opts = {}) {
  let {
    grid,
    polygons,
    var: varField,
    values: includeValues = false,
    spherical = false,
  } = opts;

  const t0 = performance.now();
  const path = geoPath();

  // Unstitch grids if needed
  if (spherical) {
    grid = unstitch(grid);
  }

  // --- Normalize varField to array ---
  const varFields = varField
    ? Array.isArray(varField)
      ? varField
      : [varField]
    : [];

  // --- 1. Compute areas for polygons and grid cells ---
  for (const poly of polygons.features) {
    if (spherical) poly.properties.area_spherical = area(poly);
    else poly.properties.area_plan = path.area(poly);
  }

  for (const cell of grid.features) {
    if (spherical) cell.properties.area_spherical = area(cell);
    else cell.properties.area_plan = path.area(cell);

    cell.properties.count = 0;
    for (const v of varFields) cell.properties[v] = 0;
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

      // vérifier que les deux features existent
      if (!poly || !cell) continue;

      // Turf v7: intersect via FeatureCollection contenant exactement deux géométries
      const inter = intersect({
        type: "FeatureCollection",
        features: [poly, cell],
      });
      if (!inter) continue;

      const areaVal = spherical ? area(inter) : path.area(inter);
      const pctArea =
        areaVal /
        (spherical
          ? poly.properties.area_spherical
          : poly.properties.area_plan);

      // update cell statistics
      cell.properties.count += 1;
      for (const v of varFields) {
        const value = parseFloat(poly.properties[v]);
        cell.properties[v] += !isNaN(value) ? value * pctArea : 0;
      }

      if (includeValues) cell.properties.values.push({ ...poly.properties });
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

  return spherical ? stitchmerge(filteredGrid) : filteredGrid;
}
