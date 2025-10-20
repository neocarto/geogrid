import { featureCollection } from "@turf/helpers";
import { bbox } from "@turf/bbox";
import { intersect } from "@turf/intersect";
import area from "@turf/area";
import RBush from "rbush";
import { min, max, median, mean, sum } from "d3-array";

/**
 * polygonstogrid – répartir une variable d’un maillage irrégulier sur une grille régulière
 *
 * @param {object} opts
 *   - grid: GeoJSON FeatureCollection (maillage cible)
 *   - polygons: GeoJSON FeatureCollection (maillage source)
 *   - var: string (champ contenant la valeur quantitative à répartir)
 *   - varIsDensity: boolean (false par défaut) — si true, la variable est une densité (val / unité de surface)
 *   - values: boolean (false) — inclure la liste des valeurs non pondérées
 *   - valuesWeighted: boolean (false) — inclure la liste des valeurs pondérées (apport à la cellule)
 *   - sum: boolean (true) — calculer la somme
 *   - mean: boolean (false) — calculer la moyenne
 *   - median: boolean (false) — calculer la médiane
 *   - min: boolean (false)
 *   - max: boolean (false)
 *   - validateConservation: boolean (true) — vérification de la conservation de la somme si var est total
 */
export function polygonstogrid(opts = {}) {
  const {
    grid,
    polygons,
    var: varField,
    varIsDensity = false,
    values: includeValues = false,
    valuesWeighted = false,
    sum: calcSum = true,
    mean: calcMean = false,
    median: calcMedian = false,
    min: calcMin = false,
    max: calcMax = false,
    validateConservation = true,
  } = opts;

  if (!grid || !polygons) {
    throw new Error("Both grid and polygons must be provided");
  }

  const t0 = performance.now();

  const gridFeatures = grid.features;
  const polyFeatures = polygons.features;
  const hasVar = varField !== undefined && varField !== null;

  // construire un index spatial sur la grille
  const tree = new RBush();
  const items = gridFeatures.map((g, i) => {
    const [minX, minY, maxX, maxY] = bbox(g);
    return { minX, minY, maxX, maxY, i };
  });
  tree.load(items);

  // préparer le stockage des statistiques par cellule
  const gridStats = new Map();
  gridFeatures.forEach((g, i) => {
    gridStats.set(i, {
      countSet: new Set(),
      valuesList: [],
      weightedValues: [],
      numericList: [],
    });
  });

  // pour la vérification de conservation de la somme
  let totalPolygonsValue = 0;

  // itérer sur chaque polygone source
  polyFeatures.forEach((p, pi) => {
    const polygonArea = area(p);
    const rawVal = hasVar ? parseFloat(p.properties?.[varField]) : undefined;

    if (hasVar && !varIsDensity) {
      if (!isNaN(rawVal)) totalPolygonsValue += rawVal;
    }

    const [minX, minY, maxX, maxY] = bbox(p);
    const candidates = tree.search({ minX, minY, maxX, maxY });
    if (candidates.length === 0) return;

    candidates.forEach((cand) => {
      const cellIndex = cand.i;
      const g = gridFeatures[cellIndex];
      const inter = intersect(p, g);
      if (!inter) return;

      const interArea = area(inter);
      if (interArea <= 0) return;

      const stats = gridStats.get(cellIndex);
      stats.countSet.add(pi);

      if (includeValues) {
        stats.valuesList.push(hasVar ? rawVal : 1);
      }

      // calcul de l’apport selon varIsDensity vs total
      let apport = 0;
      if (hasVar) {
        if (varIsDensity) {
          // variable = densité => densité * aire d’intersection
          const dens = isNaN(rawVal) ? 0 : rawVal;
          apport = dens * interArea;
        } else {
          // variable = total => fraction d’aire * valeur totale
          if (polygonArea > 0) {
            const fraction = interArea / polygonArea;
            const val = isNaN(rawVal) ? 0 : rawVal;
            apport = val * fraction;
          } else {
            apport = 0;
          }
        }
      } else {
        // pas de var, on compte juste « unité » proportionnée
        if (polygonArea > 0) {
          const fraction = interArea / polygonArea;
          apport = 1 * fraction;
        } else {
          apport = 0;
        }
      }

      stats.numericList.push(apport);
      if (valuesWeighted) {
        stats.weightedValues.push(apport);
      }
    });
  });

  // construire la grille résultat, supprimer les cellules sans intersection
  const resultFeatures = [];
  let totalGridValue = 0;

  gridFeatures.forEach((g, i) => {
    const stats = gridStats.get(i);
    const numericList = stats.numericList;
    const count = stats.countSet.size;

    if (count === 0) {
      // pas d’intersection — on « supprime » (ne pas ajouter) la cellule selon ta logique
      return;
    }

    const props = { count };

    if (hasVar && numericList.length > 0) {
      if (calcSum) {
        const s = sum(numericList);
        props.sum = s;
        totalGridValue += s;
      }
      if (calcMean) props.mean = mean(numericList);
      if (calcMedian) props.median = median(numericList);
      if (calcMin) props.min = min(numericList);
      if (calcMax) props.max = max(numericList);
    } else if (!hasVar && numericList.length > 0) {
      if (calcSum) props.sum = sum(numericList);
    }

    if (includeValues) props.values = stats.valuesList;
    if (valuesWeighted) props.valuesWeighted = stats.weightedValues;

    resultFeatures.push({
      type: g.type,
      geometry: g.geometry,
      properties: { ...g.properties, ...props },
    });
  });

  // validation de conservation (si applicable)
  if (validateConservation && hasVar && !varIsDensity) {
    const diff = Math.abs(totalPolygonsValue - totalGridValue);
    const rel =
      totalPolygonsValue !== 0 ? diff / Math.abs(totalPolygonsValue) : 0;
    console.log(
      `💡 Conservation check: source total = ${totalPolygonsValue}, grid total = ${totalGridValue}, |diff| = ${diff}, relative = ${rel}`
    );
  }

  const t1 = performance.now();
  console.log(`Execution time: ${(t1 - t0).toFixed(2)} ms`);

  return {
    type: "FeatureCollection",
    features: resultFeatures,
  };
}
