export function createSteppedArray(start, max, step, reverse = false) {
  const result = [];
  for (let i = start; i <= max; i += step) {
    result.push(i);
  }
  return reverse ? result.reverse() : result;
}
