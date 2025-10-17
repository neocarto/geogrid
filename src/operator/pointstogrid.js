import RBush from "rbush";
import { bbox } from "@turf/bbox";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { geoPath } from "d3-geo";
import { groups } from "d3-array";
const d3 = Object.assign({}, { geoPath, groups });

/**
 * @function pointstogrid
 * @description The `op.pointstogrid()` function allows to count dots in polygons (e.g. grid cells)
 * @property {object} [points] - dots geoJSON
 * @property {object} [grid] - grid
 * @property {string} [var = undefined] - field (absolute quantitative data only)
 */
export function pointstogrid(
  opts = {
    points: undefined,
    grid: undefined,
    var: undefined,
  }
) {
  const t0 = performance.now();

  const polys = opts.grid.features;
  const points = opts.points.features;
  const count = new Array(polys.length).fill(0);

  // ---- 1. Construire l’index spatial des polygones ----
  const tree = new RBush();
  const items = polys.map((p, i) => {
    const [minX, minY, maxX, maxY] = bbox(p);
    return { minX, minY, maxX, maxY, i };
  });
  tree.load(items);

  // ---- 2. Boucle sur les points ----
  points.forEach((pt) => {
    const [x, y] = pt.geometry.coordinates;

    // Trouver les polygones candidats dont la bbox contient le point
    const candidates = tree.search({
      minX: x,
      minY: y,
      maxX: x,
      maxY: y,
    });

    // Tester seulement ces candidats
    for (const cand of candidates) {
      const poly = polys[cand.i];
      if (booleanPointInPolygon(pt, poly)) {
        const value =
          opts.var === undefined ? 1 : parseFloat(pt.properties[opts.var]) || 0;
        count[cand.i] += value;
        break; // Si un point ne doit appartenir qu'à une cellule
      }
    }
  });

  // ---- 3. Reconstituer la grille ----
  const output = polys
    .map((d, i) => ({
      type: d.type,
      geometry: d.geometry,
      properties: { ...d.properties, count: count[i] },
    }))
    .filter((d) => d.properties.count !== 0);

  const t1 = performance.now();
  console.log(`Temps d'exécution: ${(t1 - t0).toFixed(2)} ms`);
  return { type: "FeatureCollection", features: output };
}
