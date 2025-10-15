import { Webdggrid } from "webdggrid";

export function webggrid(opts = { resolution: 4 }) {
  const dg = new Webdggrid(opts.resolution);
  return dg;
}
