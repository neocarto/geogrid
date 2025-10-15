import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { geoProject } from "d3-geo-projection";

/**
 * @function op.pointstogrid
 * @description The `op.pointstogrid()` function allows to count dots in polygons (e.g. grid cells)
 * @property {object} [points] - dots geoJSON
 * @property {object} [grid] - grid
 * @property {string} [var = undefined] - field (absolute quantitative data only)
 * @property {function} [projecton = null] -
 */
export function pointstogrid(
  opts = {
    points: undefined,
    grid: undefined,
    var: undefined,
    projection: null,
  }
) {
  let polys = opts.grid.features;
  let points = opts.points.features;
  let count = new Array(polys.length).fill(0);
  let nb = points.length;
  let test = new Array(nb).fill(true);

  // projection
  // Manage projection

  polys.forEach((p, i) => {
    points.forEach((d, j) => {
      if (test[j]) {
        if (booleanPointInPolygon(d, p)) {
          if (opts.var == undefined) {
            count[i] = count[i] + 1;
          } else {
            count[i] = count[i] + parseFloat(d.properties[opts.var]);
          }
          test[j] = false;
        }
      }
    });
  });

  //Rebuild grid
  let output = polys
    .map((d, i) => ({
      type: d.type,
      geometry: d.geometry,
      properties: { ...d.properties, count: count[i] },
    }))
    .filter((d) => d.properties.count !== 0);

  //const endTime = performance.now();
  //const elapsedTime = endTime - startTime;
  return { type: "FeatureCollection", features: output };
}
