import { bbox } from "@turf/bbox";
import { lineSplit } from "@turf/line-split";
import { length } from "@turf/length";
import { stitchmerge } from "../helpers/stitchmerge.js";
import { unstitch } from "../helpers/unstitch.js";
import RBush from "rbush";

/**
 * @function linestogrid
 * @description Assign lines to a grid and compute weighted sums per cell.
 *              Uses a spatial index to speed up calculations.
 *              Optimized and removes cells with count = 0.
 *              Supports multiple variables in varField (string or array of strings)
 *              Treats undefined or NaN as zero when summing
 *              If `values` is true, stores an array of intersected line properties
 * @param {object} opts
 * @property {object} [lines] - GeoJSON lines to assign
 * @property {object} [grid] - GeoJSON grid
 * @property {string|Array} [var] - Field(s) to compute weighted sums (optional)
 * @property {boolean} [values=false] - Include array of raw lines properties
 */
export function linestogrid(opts = {}) {
  let {
    grid,
    lines,
    var: varField,
    values: includeValues = false,
    spherical = false,
  } = opts;

  const t0 = performance.now();

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

  // --- 1. Compute total lengths for lines and initialize grid cells ---
  for (const line of lines.features) {
    line.properties.length_total = length(line, { units: "meters" });
  }

  for (const cell of grid.features) {
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

  // --- 3. Loop over lines ---
  for (const line of lines.features) {
    const [minX, minY, maxX, maxY] = bbox(line);
    const candidates = tree.search({ minX, minY, maxX, maxY });

    for (const cand of candidates) {
      const cell = cand.cell;

      // split line by cell polygon
      const splitLines = lineSplit(line, cell);
      if (!splitLines.features.length) continue;

      // compute total length of segments inside the cell
      let totalSegLength = 0;
      for (const seg of splitLines.features) {
        totalSegLength += length(seg, { units: "meters" });
      }
      if (totalSegLength === 0) continue;

      // --- update cell statistics ---
      cell.properties.count += 1; // one line per cell

      for (const v of varFields) {
        const value = parseFloat(line.properties[v]);
        cell.properties[v] += !isNaN(value)
          ? value * (totalSegLength / line.properties.length_total)
          : 0;
      }

      if (includeValues) {
        cell.properties.values.push({ ...line.properties });
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
    `Line intersection completed for ${filteredGrid.features.length} cells — ${(
      t1 - t0
    ).toFixed(2)} ms`
  );

  return spherical ? stitchmerge(filteredGrid) : filteredGrid;
}
