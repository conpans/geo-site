// tools/add-micro-markers.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const RAW = path.join(ROOT, "src/_includes/world.raw.svg");
const OUT = path.join(ROOT, "src/_includes/world.svg");
const CSV = path.join(ROOT, "tools/microstates.csv");

// read CSV
const rows = fs.readFileSync(CSV, "utf8")
  .split(/\r?\n/)
  .map(l => l.trim())
  .filter(l => l && !l.startsWith("#"));

/*
  Expect columns like:
  code,name,lon,lat
  VA,Vatican City,12.4534,41.9029
*/
const data = rows.slice(1).map(l => {
  const [code,name,lon,lat] = l.split(",");
  return { code, name, lon: +lon, lat: +lat };
});

// read SVGs
let rawSvg = fs.readFileSync(RAW, "utf8");
let outSvg = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : rawSvg;

// derive width/height from viewBox
const vbMatch = rawSvg.match(/viewBox="([\d\.\-\s]+)"/);
if (!vbMatch) {
  console.error("No viewBox found in world.raw.svg");
  process.exit(1);
}
const [, vb] = vbMatch;
const [minX, minY, width, height] = vb.split(/\s+/).map(Number);

// equirectangular projection
const project = ({lon, lat}) => {
  const x = (lon + 180) / 360 * width;
  const y = (90 - lat) / 180 * height;
  return { x: +x.toFixed(2), y: +y.toFixed(2) };
};

const circles = data.map(d => {
  const {x, y} = project(d);
  // r=2.6 is what we aimed for in Mapshaper
  return `<circle cx="${x}" cy="${y}" r="2.6" data-code="${d.code}" data-name="${d.name}" />`;
}).join("\n  ");

const group = `\n  <g id="microstates">\n  ${circles}\n  </g>\n`;

// helper to insert/replace the group
function upsertMicroGroup(svg) {
  if (svg.includes('<g id="microstates"')) {
    // replace existing group
    return svg.replace(
      /<g id="microstates">[\s\S]*?<\/g>/,
      group.trim()
    );
  }
  // insert after countries group if present, else before </svg>
  if (svg.includes('<g id="ne_110m_admin_0_countries"')) {
    return svg.replace(
      /(<\/g>\s*)<\/svg>\s*$/s,   // end of countries group then svg
      `$1${group}</svg>`
    );
  }
  return svg.replace(/<\/svg>\s*$/s, `${group}</svg>`);
}

// write back: update BOTH raw and final world.svg
rawSvg = upsertMicroGroup(rawSvg);
outSvg = upsertMicroGroup(outSvg);

fs.writeFileSync(RAW, rawSvg);
fs.writeFileSync(OUT, outSvg);
console.log(`Wrote ${data.length} microstate markers into:
- ${RAW}
- ${OUT}
`);
