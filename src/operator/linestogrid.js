import { bbox } from "@turf/bbox";
import { lineSplit } from "@turf/line-split";
import { length } from "@turf/length";
import { booleanWithin } from "@turf/boolean-within";
import { stitchmerge } from "../helpers/stitchmerge.js";
import { unstitch } from "../helpers/unstitch.js";
import RBush from "rbush";

/**
 * @function linestogrid
 * @description Assign lines (LineString or MultiLineString) to a grid and compute weighted sums per cell.
 *              MultiLineStrings are treated as a single feature for count and proportional distribution.
 */

export function linestogrid(opts = {}) {
  let {
    grid,
    lines,
    var: varField,
    values: includeValues = false,
    spherical = false,
    debug = false,
  } = opts;

  const t0 = performance.now();

  if (spherical) grid = unstitch(grid);

  const varFields = varField
    ? Array.isArray(varField)
      ? varField
      : [varField]
    : [];

  // --- Add stable ID to grid cells ---
  grid.features.forEach((cell, i) => (cell._id = i));

  // --- Compute total length per line feature ---
  for (const f of lines.features) {
    if (f.geometry.type === "LineString") {
      f.properties.length_total = length(f, { units: "meters" });
    } else if (f.geometry.type === "MultiLineString") {
      let total = 0;
      for (const coords of f.geometry.coordinates) {
        const part = {
          type: "Feature",
          geometry: { type: "LineString", coordinates: coords },
        };
        total += length(part, { units: "meters" });
      }
      f.properties.length_total = total;
    } else {
      f.properties.length_total = 0;
    }
  }

  // --- Initialize grid cells ---
  for (const cell of grid.features) {
    cell.properties.count = 0;
    for (const v of varFields) cell.properties[v] = 0;
    if (includeValues) cell.properties.values = [];
  }

  // --- Build spatial index ---
  const tree = new RBush();
  const items = grid.features.map((cell) => {
    const [minX, minY, maxX, maxY] = bbox(cell);
    return { minX, minY, maxX, maxY, cell };
  });
  tree.load(items);

  // --- Track counted features for debug ---
  const countedLines = new Set();

  // --- Process each line feature ---
  for (const f of lines.features) {
    const totalLength = f.properties.length_total || 0;
    if (totalLength === 0) continue;

    const [minX, minY, maxX, maxY] = bbox(f);
    const candidates = tree.search({ minX, minY, maxX, maxY });
    const touched = new Set();
    let totalSegLen = 0;

    for (const cand of candidates) {
      const cell = cand.cell;
      let segLen = 0;

      if (f.geometry.type === "LineString") {
        segLen = safeSegLength(f, cell);
      } else if (f.geometry.type === "MultiLineString") {
        for (const coords of f.geometry.coordinates) {
          const part = {
            type: "Feature",
            geometry: { type: "LineString", coordinates: coords },
          };
          segLen += safeSegLength(part, cell);
        }
      }

      if (segLen === 0) continue;
      totalSegLen += segLen;

      if (!touched.has(cell._id)) {
        cell.properties.count += 1;
        touched.add(cell._id);
      }

      for (const v of varFields) {
        const value = parseFloat(f.properties[v]);
        cell.properties[v] += !isNaN(value)
          ? value * (segLen / totalLength)
          : 0;
      }

      if (includeValues) cell.properties.values.push({ ...f.properties });
    }

    if (totalSegLen > 0) countedLines.add(f.properties.id || f.id || f);
  }

  // --- Filter empty cells ---
  const filteredGrid = {
    ...grid,
    features: grid.features.filter((c) => c.properties.count > 0),
  };

  const t1 = performance.now();
  console.log(
    `Line aggregation completed for ${filteredGrid.features.length} cells — ${(
      t1 - t0
    ).toFixed(2)} ms`
  );

  // --- Debug report ---
  if (debug) {
    const totalLines = lines.features.length;
    const missing = totalLines - countedLines.size;
    console.log(
      `Counted ${countedLines.size}/${totalLines} line features (${missing} missing)`
    );
  }

  return spherical ? stitchmerge(filteredGrid) : filteredGrid;
}

/**
 * @function safeSegLength
 * @description Returns total segment length of intersection between a line and polygon cell,
 *              including case where line is entirely contained in the cell.
 */
function safeSegLength(line, cell) {
  try {
    if (booleanWithin(line, cell)) {
      return length(line, { units: "meters" });
    }

    const split = lineSplit(line, cell);
    let sum = 0;
    for (const s of split.features) {
      const l = length(s, { units: "meters" });
      if (l > 0.001) sum += l; // ignore sub-mm artifacts
    }
    return sum;
  } catch (e) {
    return 0;
  }
}
