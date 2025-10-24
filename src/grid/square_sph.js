import booleanIntersects from "@turf/boolean-intersects";

/**
 * @function square_sph
 * @summary Build a global square grid in lon/lat.
 * @description
 * Generates a grid of square polygons covering the whole globe in WGS84 coordinates.
 * - Longitudes: start at -180, add `step` until reaching +180 (last cell may be smaller)
 * - Latitudes: start at +90, subtract `step` until reaching -90 (last cell may be smaller)
 * - Cells never overlap; borders align exactly
 * - EPS is used to avoid coordinates exactly at ±180 and ±90 to prevent rewind/topology issues
 *
 * @param {object} options
 * @param {number} [options.step=1] - Grid cell size in degrees
 * @param {GeoJSON} [options.domain=null] - Optional GeoJSON mask; only intersecting cells are kept
 * @returns {GeoJSON.FeatureCollection} A FeatureCollection of square polygons
 */
export function square_sph({ step = 1, domain = null } = {}) {
  const LON_MIN = -180;
  const LON_MAX = 180;
  const LAT_MIN = -90;
  const LAT_MAX = 90;
  const EPS = 1e-2; // small offset to avoid exact ±180/±90 coordinates

  if (step <= 0) throw new Error("step must be > 0");

  const features = [];
  let index = 0;

  // --- Longitudes: from -180 (west) to +180 (east), incrementing by step ---
  let lonWest = LON_MIN;
  while (lonWest < LON_MAX - 1e-12) {
    let lonEast = lonWest + step;
    if (lonEast > LON_MAX) lonEast = LON_MAX;

    // Apply EPS to avoid exact ±180
    const lonW = Math.max(lonWest, LON_MIN + EPS);
    const lonE = Math.min(lonEast, LON_MAX - EPS);

    // --- Latitudes: from +90 (north) to -90 (south), decrementing by step ---
    let latNorth = LAT_MAX;
    while (latNorth > LAT_MIN + 1e-12) {
      let latSouth = latNorth - step;
      if (latSouth < LAT_MIN) latSouth = LAT_MIN;

      // Apply EPS to avoid exact ±90
      const latN = Math.min(latNorth, LAT_MAX - EPS);
      const latS = Math.max(latSouth, LAT_MIN + EPS);

      // Skip degenerate cells (can happen with EPS near poles)
      if (lonE - lonW > 1e-12 && latN - latS > 1e-12) {
        features.push({
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [lonW, latN],
                [lonE, latN],
                [lonE, latS],
                [lonW, latS],
                [lonW, latN],
              ],
            ],
          },
          properties: { index: index++ },
        });
      }

      // Move to the next row (southward)
      latNorth = latSouth;
    }

    // Move to the next column (eastward)
    lonWest = lonEast;
  }

  // --- Optional filtering by domain ---
  const filtered = domain
    ? features.filter((f) => {
        try {
          return booleanIntersects(f, domain);
        } catch {
          return false;
        }
      })
    : features;

  return {
    type: "FeatureCollection",
    grid: "square_sph",
    geo: true,
    features: filtered,
  };
}
