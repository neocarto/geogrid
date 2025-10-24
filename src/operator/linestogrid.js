import { bbox } from "@turf/bbox";
import { lineSplit } from "@turf/line-split";
import { length } from "@turf/length";
import { stitchmerge } from "../helpers/stitchmerge.js";
import { unstitch } from "../helpers/unstitch.js";
import RBush from "rbush";

/**
 * @function linestogrid
 * @description Assign lines (LineString or MultiLineString) to a grid and compute weighted sums per cell.
 *              Uses a spatial index to speed up calculations.
 *              Optimized and removes cells with count = 0.
 *              Supports multiple variables in varField (string or array of strings).
 *              Treats undefined or NaN as zero when summing.
 *              If `values` is true, stores an array of intersected line properties.
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

  // --- Unstitch grid if spherical
  if (spherical) {
    grid = unstitch(grid);
  }

  // --- Normalize varField to array ---
  const varFields = varField
    ? Array.isArray(varField)
      ? varField
      : [varField]
    : [];

  // --- Flatten MultiLineString features into LineStrings ---
  const flatLines = [];
  for (const feature of lines.features) {
    if (feature.geometry.type === "LineString") {
      flatLines.push(feature);
    } else if (feature.geometry.type === "MultiLineString") {
      for (const coords of feature.geometry.coordinates) {
        flatLines.push({
          type: "Feature",
          geometry: { type: "LineString", coordinates: coords },
          properties: { ...feature.properties },
        });
      }
    }
  }

  // --- Compute total lengths for each line ---
  for (const line of flatLines) {
    line.properties.length_total = length(line, { units: "meters" });
  }

  // --- Initialize grid cells ---
  for (const cell of grid.features) {
    cell.properties.count = 0;
    for (const v of varFields) cell.properties[v] = 0;
    if (includeValues) cell.properties.values = [];
  }

  // --- Build spatial index (RBush) on the grid ---
  const tree = new RBush();
  const items = grid.features.map((cell) => {
    const [minX, minY, maxX, maxY] = bbox(cell);
    return { minX, minY, maxX, maxY, cell };
  });
  tree.load(items);

  // --- Process all (flattened) lines ---
  for (const line of flatLines) {
    const [minX, minY, maxX, maxY] = bbox(line);
    const candidates = tree.search({ minX, minY, maxX, maxY });

    for (const cand of candidates) {
      const cell = cand.cell;

      let splitLines;
      try {
        splitLines = lineSplit(line, cell);
      } catch {
        // skip problematic geometries (rare)
        continue;
      }

      if (!splitLines.features.length) continue;

      let totalSegLength = 0;
      for (const seg of splitLines.features) {
        totalSegLength += length(seg, { units: "meters" });
      }
      if (totalSegLength === 0) continue;

      cell.properties.count += 1;

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

  // --- Filter out empty cells ---
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
