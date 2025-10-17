import { featureCollection } from "@turf/helpers";
import { bbox } from "@turf/bbox";
import { intersect } from "@turf/intersect";
import RBush from "rbush";
import { geoPath } from "d3-geo";
import { groups } from "d3-array";

const d3 = Object.assign({}, { geoPath, groups });

/**
 * @function linesstogrid
 * @description Count points (optionally weighted) within polygons (e.g. grid cells)
 * @property {object} [lines] - lines geoJSON
 * @property {object} [grid] - grid geoJSON
 * @property {string} [var = undefined] - field for point weight
 */
export function linesstogrid(
  opts = { grid: undefined, polygons: undefined, var: undefined }
) {}
