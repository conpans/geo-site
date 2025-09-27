// tools/linkify-map.mjs
import { promises as fs } from 'node:fs'
import path from 'node:path'

const RAW = 'src/_includes/world.raw.svg'
const OUT = 'src/_includes/world.svg'
const COUNTRY_DIR = 'src/country'

// country codes from filenames like co.md, fj.md
const files = await fs.readdir(COUNTRY_DIR).catch(() => [])
const codes = new Set(
  files.filter(f => f.endsWith('.md'))
       .map(f => path.basename(f, '.md').toLowerCase())
)

let svg = await fs.readFile(RAW, 'utf8')

// ensure root <svg> has class="map" for CSS
svg = svg.replace(/<svg(?![^>]*class=)/, '<svg class="map"')

// 1) wrap <path id="XX" .../>  (self-closing or not)
const pathRe = /<path([^>]*?)\sid=["']([A-Za-z]{2})["']([^>]*?)(?:\/>|><\/path>)/g
svg = svg.replace(pathRe, (m, pre, id2, post) => {
  const code = id2.toLowerCase()
  if (!codes.has(code)) return m
  const pathEl = `<path${pre} id="${id2}"${post}/>`
  return `<a href="/country/${code}/" data-iso="${code}" aria-label="${id2}"><title>${id2}</title>${pathEl}</a>`
})

// 2) wrap <g id="XX"> ... </g> (non-greedy block)
const groupRe = /<g([^>]*?)\sid=["']([A-Za-z]{2})["']([^>]*)>([\s\S]*?)<\/g>/g
svg = svg.replace(groupRe, (m, pre, id2, post, inner) => {
  const code = id2.toLowerCase()
  if (!codes.has(code)) return m
  return `<a href="/country/${code}/" data-iso="${code}" aria-label="${id2}"><title>${id2}</title><g${pre} id="${id2}"${post}>${inner}</g></a>`
})

await fs.writeFile(OUT, svg, 'utf8')
console.log('Linked countries:', [...codes].join(', '))
