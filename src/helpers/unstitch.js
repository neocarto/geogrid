import { geoProject } from "d3-geo-projection";
import { rewind } from "geotoolbox";
import { geoEquirectangular } from "d3-geo";

/**
 * @function unstitch
 * @description After Matthieu Viry: https://observablehq.com/@mthh/unstitch
 */

export function unstitch(a) {
  a = JSON.parse(JSON.stringify(a));
  a = geoProject(
    a,
    geoEquirectangular()
      .scale(180 / Math.PI)
      .translate([0, 0])
  );

  for (const f of a.features) {
    if (f.geometry.type === "Polygon")
      f.geometry.coordinates.forEach((ring) =>
        ring.forEach((point) => (point[1] *= -1))
      );
    else if (f.geometry.type === "MultiPolygon")
      f.geometry.coordinates.forEach((poly) =>
        poly.forEach((ring) => ring.forEach((point) => (point[1] *= -1)))
      );
  }

  return rewind(a, { simple: true });
}
