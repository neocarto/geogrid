import { featureCollection } from "@turf/helpers";
import { bbox } from "@turf/bbox";
import { intersect } from "@turf/intersect";
import RBush from "rbush";
import { geoPath } from "d3-geo";
import { groups } from "d3-array";

const d3 = Object.assign({}, { geoPath, groups });

/**
 * @function pointstogrid
 * @description Count points (optionally weighted) within polygons (e.g. grid cells)
 * @property {object} [points] - points geoJSON
 * @property {object} [grid] - grid geoJSON
 * @property {string} [var = undefined] - field for point weight
 */
export function polygonstogrid(
  opts = { grid: undefined, polygons: undefined, var: undefined }
) {
  const t0 = performance.now();

  const grid = opts.grid.features;
  const polys = opts.polygons.features;
  const gridbyindex = new Map(grid.map((d, i) => [i, d]));

  // ---- 1. Créer l’index spatial RBush ----
  const tree = new RBush();
  const items = grid.map((g, i) => {
    const [minX, minY, maxX, maxY] = bbox(g);
    return { minX, minY, maxX, maxY, i };
  });
  tree.load(items);

  const arr = [];
  const path = d3.geoPath();

  // ---- 2. Boucle sur les polygones ----
  polys.forEach((p, i) => {
    const area = path.area(p);
    const [minX, minY, maxX, maxY] = bbox(p);

    // 3. Chercher uniquement les cellules qui peuvent intersecter
    const candidates = tree.search({ minX, minY, maxX, maxY });

    // 4. Tester seulement les candidats
    for (const cand of candidates) {
      const g = gridbyindex.get(cand.i);
      const f = intersect(featureCollection([p, g]));
      if (f) {
        const areapiece = path.area(f);
        arr.push([i, cand.i, areapiece / area]);
      }
    }
  });

  // ---- 5. Calcul des valeurs ----
  const accessor = new Map(
    polys.map((d, i) => [
      i,
      opts.var ? parseFloat(d.properties[opts.var]) || 0 : 1,
    ])
  );

  const datagrid = d3.groups(arr, (d) => d[1]);

  function getsum(cell) {
    let sum = 0;
    cell[1].forEach((d) => {
      sum += accessor.get(d[0]) * d[2];
    });
    return sum === 0 ? undefined : sum;
  }

  // ---- 6. Assemblage du résultat ----
  const result = {
    type: "FeatureCollection",
    features: datagrid.map(([key, vals]) => {
      const tmp = gridbyindex.get(key);
      return {
        type: tmp.type,
        properties: { ...tmp.properties, sum: getsum([key, vals]) },
        geometry: tmp.geometry,
      };
    }),
  };

  const t1 = performance.now();
  console.log(`Temps d'exécution: ${(t1 - t0).toFixed(2)} ms`);
  return result;
}
