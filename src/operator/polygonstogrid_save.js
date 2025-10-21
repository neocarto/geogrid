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

  const gridFeatures = grid.features;
  const polys = polygons.features;
  const hasVar = varField !== undefined && varField !== null;

  const gridbyindex = new Map(gridFeatures.map((d, i) => [i, d]));

  // ---- 1. Spatial index ----
  const tree = new RBush();
  const items = gridFeatures.map((g, i) => {
    const [minX, minY, maxX, maxY] = bbox(g);
    return { minX, minY, maxX, maxY, i };
  });
  tree.load(items);

  // ---- 2. Stockage pour chaque carré ----
  const gridStats = new Map();
  gridFeatures.forEach((_, i) => {
    gridStats.set(i, { numericList: [], valuesList: [], countSet: new Set() });
  });

  // ---- 3. Boucle sur les polygones ----
  for (let i = 0; i < polys.length; i++) {
    const p = polys[i];
    if (!p.geometry || !["Polygon", "MultiPolygon"].includes(p.geometry.type))
      continue;

    const val = hasVar ? parseFloat(p.properties?.[varField]) || 0 : 1;

    // 3a. Récupérer tous les carrés intersectant ce polygone
    const [minX, minY, maxX, maxY] = bbox(p);
    const candidates = tree.search({ minX, minY, maxX, maxY });

    // 3b. Calculer toutes les intersections et leur aire
    const pieces = [];
    for (const cand of candidates) {
      const g = gridbyindex.get(cand.i);
      if (!g.geometry || !["Polygon", "MultiPolygon"].includes(g.geometry.type))
        continue;

      let f;
      try {
        f = intersect(featureCollection([p, g]));
      } catch (e) {
        continue;
      }
      if (!f) continue;

      const areapiece = area(f);
      if (areapiece <= 0) continue;

      pieces.push({ index: cand.i, area: areapiece });
    }

    // 3c. Somme totale des aires des morceaux pour ce polygone
    const totalPieceArea = sum(pieces.map((d) => d.area));
    if (totalPieceArea === 0) continue;

    // 3d. Calculer la valeur proportionnelle de chaque morceau
    for (const piece of pieces) {
      const fraction = piece.area / totalPieceArea;
      const pieceValue = val * fraction;

      const stats = gridStats.get(piece.index);
      stats.numericList.push(pieceValue);
      if (includeValues) stats.valuesList.push(pieceValue);
      stats.countSet.add(i);
    }
  }

  // ---- 4. Construire le GeoJSON final ----
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
