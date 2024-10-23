import { square } from "./grid/square.js";
import { triangle } from "./grid/triangle.js";
import { dot } from "./grid/dot.js";
import { random } from "./grid/random.js";
import { diamond } from "./grid/diamond.js";
import { hexbin } from "./grid/hexbin.js";
import { h3 } from "./grid/h3.js";

export let make = {
  square,
  triangle,
  dot,
  diamond,
  random,
  hexbin,
  h3,
};

import { pointstogrid } from "./operator/pointstogrid.js";
import { polygonstogrid } from "./operator/polygonstogrid.js";
export let op = { pointstogrid, polygonstogrid };
