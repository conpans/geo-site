# geo-site

Personal notes and dossiers with a clickable world map.
Built with Eleventy. Countries link to `/country/<iso2>/`.

## How the map pipeline works

1. **Source data → `world.raw.svg`**
   - Export the world from Mapshaper as SVG with two helpful attributes:
     - `id-field=ISO_A2` (so each country path has id like `id="CO"`)
     - (Optional) `precision=0.2` to shrink SVG size
   - Save as `src/_includes/world.raw.svg`.

2. **Linkify countries → `world.svg`**
   - Run the script (reads `.md` files in `src/country` and wraps matching ISO-2 ids in links):
     ```bash
     node tools/linkify-map.mjs
     ```
   - Output is `src/_includes/world.svg` (this is what the page includes).

3. **Microstate markers**
   - Editable CSV: `tools/microstates.csv`
   - Script to inject/update markers:
     ```bash
     node tools/add-micro-markers.mjs
     ```
   - Markers appear as `<circle>` elements inside `<g id="microstates">` at the end of the SVG.
   - We style them in CSS so they sit above countries and scale cleanly.

4. **Styling**
   - All map styles live in `src/css/site.css` under the `.map` section:
     - Base country fill/borders
     - Hover/focus states
     - Link states for visited/active
     - Microstate dot styling (including when dots are wrapped in `<a>`)

5. **Pages**
   - Country pages live in `src/country/*.md` with filenames equal to ISO-2 codes (e.g., `co.md`, `fj.md`).
   - The linkify script generates `<a href="/country/<code>/">…</a>` wrappers for those countries.

## Updating the map

- **New/changed country pages**: add/edit files in `src/country/`, then re-run:
  ```bash
  node tools/linkify-map.mjs
