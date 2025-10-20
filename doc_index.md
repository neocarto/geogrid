![npm](https://img.shields.io/npm/v/geogrid) ![jsdeliver](https://img.shields.io/jsdelivr/npm/hw/geogrid) ![license](https://img.shields.io/badge/license-MIT-success) ![code size](https://img.shields.io/github/languages/code-size/neocarto/geogrid)

![banner](https://raw.githubusercontent.com/neocarto/geogrid/d3b8112f2ca0ca635c011162afb60797f738a77f/img/banner.png)

# `geogrid`

### `geogrid` is a JavaScript library that allows you to create regular grids with various patterns on a flat plane or on the globe. In addition, it provides geoprocessing functions to transfer GeoJSON data (points, lines, or polygons) onto these grids.


### ➡️ Installation

<b>1. Via CDN</b>

Include directly in your HTML:

``` html
<script src="https://cdn.jsdelivr.net/npm/geogrid" charset="utf-8"></script>
```

<b>2. Via npm</b>

Install with npm:

```
npm install geogrid
```

Then import in your JavaScript/TypeScript project:

``` js
import * as geogrid from "geogrid";
```

Or

``` js
import { pointstogrid, polygonstogrid, linestogrid } from "geogrid";
```

<b>3. ES Modules</b>

``` js
import * as geogrid from "https://cdn.jsdelivr.net/npm/geogrid@0.0.4/+esm";
```

<b>4. In Observable Notebooks</b>

``` js
geogrid = require("geogrid");
```

### ➡️ Functions

**Planar grids**

- [**`dot`**](global.html#dot) - The function create a regular dot grid.
- [**`hexbin`**](global.html#hexbin) - The function create a regular hexbin grid.
- [**`random`**](global.html#random) - The function create a random grid.
- [**`square`**](global.html#square) - The function create a regular square grid.
- [**`triangle`**](global.html#triangle) - The function create a regular triangle grid.

**Globe grids**

- [**`h3`**](global.html#h3) - The function create a [h3-js](https://github.com/uber/h3-js) global grid.

**Operators**

- [**`pointstogrid`**](global.html#pointstogrid) - Assigns points to grid cells and computes statistics per cell
- [**`linesstogrid`**](global.html#linesstogrid) - Assigns lines to a grid and computes statistics per cell
- [**`polygonstogrid`**](global.html#polygonstogrid) - Assign polygons to a grid and compute statistics per cell

*N.B.: All geometries must be in the same projection.*

**Helpers**

- [**`project`**](global.html#project) - Allows to project GeoJSON geometries.

### ➡️ Usage

Find an example [here](https://github.com/neocarto/geogrid/blob/main/examples/example.html).

### ➡️ Issues / Feature Requests

Other ideas? => [issues](https://github.com/riatelab/geogrid/issues)

See also [https://github.com/LandscapeGeoinformatics/awesome-discrete-global-grid-systems](https://github.com/LandscapeGeoinformatics/awesome-discrete-global-grid-systems) & [https://github.com/am2222/webDggrid](https://github.com/am2222/webDggrid).
