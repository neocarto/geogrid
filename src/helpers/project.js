import { geoPath } from "d3-geo";

/**
 * @function project
 * @description Projects a GeoJSON FeatureCollection using a D3 projection.
 * @param {object} data - GeoJSON FeatureCollection
 * @param {object} options
 * @property {function} options.projection - D3 projection function (e.g., d3.geoOrthographic(), d3.geoMercator())
 * @returns {object} - new GeoJSON FeatureCollection with projected coordinates
 *
 * @example
 * import { geoOrthographic } from "d3-geo-projection";
 * const projected = geoproject(world, { projection: geoOrthographic() });
 */
export function project(data, { projection = null } = {}) {
  if (!projection) return data; // if no projection, return original

  function projectCoords(coords) {
    if (typeof coords[0] === "number") {
      // [lon, lat] => [x, y]
      return projection(coords);
    } else {
      // Array of coordinates (nested for LineString, Polygon, MultiPolygon)
      return coords.map(projectCoords);
    }
  }

  const projectedFeatures = data.features.map((feat) => ({
    ...feat,
    geometry: {
      ...feat.geometry,
      coordinates: projectCoords(feat.geometry.coordinates),
    },
  }));

  return { ...data, features: projectedFeatures };
}
