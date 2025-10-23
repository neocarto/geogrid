import { createSteppedArray } from "../helpers/createSteppedArray.js";
import booleanIntersects from "@turf/boolean-intersects";

/**
 * @function square_sph
 * @summary Compute a square grid in WGS84 degrees.
 * @description Builds a square grid in latitude/longitude degrees,
 * avoids coordinates exactly at ±180 or ±90 to prevent rewind issues.
 * @param {object} options
 * @param {number[]} [options.start=[-180, -90]] - Starting coordinates [lon, lat].
 * @param {number} [options.width=360] - Width of the grid in degrees (longitude span).
 * @param {number} [options.height=180] - Height of the grid in degrees (latitude span).
 * @param {number} [options.step=1] - Step size in degrees.
 * @param {GeoJSON.Feature|GeoJSON.FeatureCollection|GeoJSON.Geometry} [options.domain] -
 *   Optional GeoJSON object. Only cells that intersect this domain are kept.
 * @returns {GeoJSON.FeatureCollection} A GeoJSON FeatureCollection of polygons.
 */
export function square_sph({
  start = [-180, -90],
  width = 360,
  height = 180,
  step = 1,
  domain = null,
} = {}) {
  const LON_MIN = -180;
  const LON_MAX = 180;
  const LAT_MIN = -90;
  const LAT_MAX = 90;
  const EPS = 1e-2; // petit décalage pour éviter ±180 et ±90 exacts

  const lonStart = Math.max(LON_MIN, start[0]);
  const latStart = Math.max(LAT_MIN, start[1]);
  const lonEnd = Math.min(LON_MAX, start[0] + width);
  const latEnd = Math.min(LAT_MAX, start[1] + height);

  let x = createSteppedArray(lonStart + step / 2, lonEnd - step / 2, step);
  let y = createSteppedArray(
    latStart + step / 2,
    latEnd - step / 2,
    step,
    true
  );

  const features = [];
  let i = 0;

  for (const lon of x) {
    for (const lat of y) {
      // coins initiaux
      let lonWest = lon - step / 2;
      let lonEast = lon + step / 2;
      let latSouth = lat - step / 2;
      let latNorth = lat + step / 2;

      // remplacer ±180 et ±90 par des valeurs légèrement inférieures/supérieures
      if (lonWest <= LON_MIN) lonWest = LON_MIN + EPS;
      if (lonEast >= LON_MAX) lonEast = LON_MAX - EPS;
      if (latSouth <= LAT_MIN) latSouth = LAT_MIN + EPS;
      if (latNorth >= LAT_MAX) latNorth = LAT_MAX - EPS;

      features.push({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [lonWest, latNorth],
              [lonEast, latNorth],
              [lonEast, latSouth],
              [lonWest, latSouth],
              [lonWest, latNorth],
            ],
          ],
        },
        properties: { index: i++ },
      });
    }
  }

  // Domain
  let filtered = features;
  if (domain) {
    filtered = features.filter((f) => {
      try {
        return booleanIntersects(f, domain);
      } catch {
        return false;
      }
    });
  }

  return {
    type: "FeatureCollection",
    grid: "square_sph",
    geo: true,
    features: filtered,
  };
}
