import {
  getRes0Cells,
  cellToChildren,
  isPentagon,
  cellToBoundary,
} from "h3-js";

import { featureToH3Set, h3SetToFeatureCollection } from "geojson2h3";
import { rewind as rrewind } from "geotoolbox";

/**
 * @function make.h3
 * @description The `make.h3()` function allows to create a hexbin geoJSON grid in geographical coordinates.
 * @property {number} [level = 0] - level of the grid. Form 0 (large hexagons) to 4 (small hexagons). See:  https://h3geo.org
 * @property {object} [domain] - a geoJSON to define an extent
 * @property {boolen} [rewind] - to rewind the output
 */
export function h3({ level = 0, domain = undefined, rewind = undefined } = {}) {
  let output;
  if (domain) {
    rewind = rewind !== undefined ? rewind : true;
    const hexagons = featureToH3Set(domain, level);
    output = h3SetToFeatureCollection(hexagons, (hex) => ({
      value: hex,
    }));
  } else {
    rewind = rewind !== undefined ? rewind : false;
    output = {
      type: "FeatureCollection",
      grid: "h3",
      level: level,
      geo: true,
      features: getRes0Cells()
        .map((i) => cellToChildren(i, level))
        .flat()
        .map((d) => ({
          type: "Feature",
          properties: { id: d, pentagon: isPentagon(d) },
          geometry: {
            type: "Polygon",
            coordinates: [cellToBoundary(d, true).reverse()],
          },
        })),
    };
  }

  return rewind ? rrewind(output) : output;
}
