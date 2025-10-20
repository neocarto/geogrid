import { geoProject } from "d3-geo-projection";
const d3 = Object.assign({}, { geoProject });

/**
 * @function project
 * @description The function `project` use geoproject from d3-geo-projection to project a geoJSON. It returns a GeoJSON FeatureCollection with coordinates in the page map.
 * @property {object} data - a GeoJSON FeatureCollection
 * @property {function} options.projection - projection definition. See [d3-geo](https://github.com/d3/d3-geo) & [d3-geo-projection](https://github.com/d3/d3-geo-projection)
 * @example
 * let newGeoJSON = project(world, { projection: d3.geoOrthographic()})
 */
export function project(data, { projection = null } = {}) {
  return projection == null ? data : d3.geoProject(data, projection);
}
