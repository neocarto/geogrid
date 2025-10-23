import { polygon, featureCollection } from "@turf/helpers";

/**
 * Crée un polygone approximatif de la sphère projetée dans le plan SVG
 * et le retourne dans une FeatureCollection
 * @param {d3.GeoProjection} projection - La projection D3 utilisée pour le SVG
 * @param {number} [stepDeg=5] - Pas en degrés pour approximer la sphère
 * @returns {GeoJSON.FeatureCollection} - FeatureCollection contenant le polygone Turf de la sphère projetée
 */
export function sphere(projection, stepDeg = 5) {
  const coords = [];

  // contour supérieur (latitude 90°)
  for (let lon = -180; lon <= 180; lon += stepDeg) {
    const pt = projection([lon, 90]);
    if (pt) coords.push(pt);
  }

  // contour droit (longitude 180°)
  for (let lat = 90; lat >= -90; lat -= stepDeg) {
    const pt = projection([180, lat]);
    if (pt) coords.push(pt);
  }

  // contour inférieur (latitude -90°)
  for (let lon = 180; lon >= -180; lon -= stepDeg) {
    const pt = projection([lon, -90]);
    if (pt) coords.push(pt);
  }

  // contour gauche (longitude -180°)
  for (let lat = -90; lat <= 90; lat += stepDeg) {
    const pt = projection([-180, lat]);
    if (pt) coords.push(pt);
  }

  const poly = polygon([coords]);

  // Retourner une FeatureCollection pour être compatible avec Turf intersect
  return featureCollection([poly]);
}
