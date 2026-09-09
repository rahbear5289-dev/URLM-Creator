// Garment overlay library — SVG-based upper-body clothing rendered as data URLs.
// Used by the Photos Studio for the clothing swap feature.

export type GarmentType = 'tshirt' | 'shirt' | 'coat'

export interface GarmentDef {
  type: GarmentType
  label: string
  desc: string
  svg: (color: string) => string
}

// Darken a hex color for stroke/detail lines
function shade(hex: string, amount = 0.25): string {
  const m = hex.replace('#', '')
  const full = m.length === 3 ? m.split('').map(c => c + c).join('') : m
  const num = parseInt(full, 16)
  const r = Math.max(0, Math.round(((num >> 16) & 255) * (1 - amount)))
  const g = Math.max(0, Math.round(((num >> 8) & 255) * (1 - amount)))
  const b = Math.max(0, Math.round((num & 255) * (1 - amount)))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function toDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const WRAP = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">${inner}</svg>`

export const GARMENTS: GarmentDef[] = [
  {
    type: 'tshirt',
    label: 'Premium T-Shirt',
    desc: 'Crew neck, smart fit',
    svg: (color) => {
      const dark = shade(color)
      return WRAP(`
        <path d="M150 48 L98 72 L52 170 L112 204 L138 162 L138 360 L262 360 L262 162 L288 204 L348 170 L302 72 L250 48 C236 74 219 84 200 84 C181 84 164 74 150 48 Z"
          fill="${color}" stroke="${dark}" stroke-width="5" stroke-linejoin="round"/>
        <path d="M150 48 C164 74 181 84 200 84 C219 84 236 74 250 48" fill="none" stroke="${dark}" stroke-width="6" stroke-linecap="round"/>
        <path d="M162 52 C172 68 186 74 200 74 C214 74 228 68 238 52" fill="none" stroke="${dark}" stroke-width="4" stroke-linecap="round" opacity="0.55"/>
        <path d="M138 158 L138 360 M262 158 L262 360" stroke="${dark}" stroke-width="3" opacity="0.35"/>
        <path d="M60 150 L52 170 L112 204" fill="none" stroke="${dark}" stroke-width="3" opacity="0.3"/>
      `)
    }
  },
  {
    type: 'shirt',
    label: 'Formal Shirt',
    desc: 'Collar, full sleeves',
    svg: (color) => {
      const dark = shade(color)
      return WRAP(`
        <!-- long sleeves -->
        <path d="M146 52 L100 76 L82 330 L134 340 L142 180 Z" fill="${color}" stroke="${dark}" stroke-width="4" stroke-linejoin="round"/>
        <path d="M254 52 L300 76 L318 330 L266 340 L258 180 Z" fill="${color}" stroke="${dark}" stroke-width="4" stroke-linejoin="round"/>
        <!-- cuffs -->
        <path d="M82 316 L134 326 L134 340 L82 330 Z" fill="${dark}" opacity="0.35"/>
        <path d="M318 316 L266 326 L266 340 L318 330 Z" fill="${dark}" opacity="0.35"/>
        <!-- body -->
        <path d="M146 52 L200 108 L254 52 L286 78 L272 360 L128 360 L114 78 Z"
          fill="${color}" stroke="${dark}" stroke-width="5" stroke-linejoin="round"/>
        <!-- placket -->
        <path d="M200 108 L200 360" stroke="${dark}" stroke-width="4"/>
        <path d="M186 108 L186 360 M214 108 L214 360" stroke="${dark}" stroke-width="2" opacity="0.45"/>
        <!-- buttons -->
        <circle cx="200" cy="150" r="5" fill="${dark}"/>
        <circle cx="200" cy="205" r="5" fill="${dark}"/>
        <circle cx="200" cy="260" r="5" fill="${dark}"/>
        <circle cx="200" cy="315" r="5" fill="${dark}"/>
        <!-- collar -->
        <path d="M146 52 L200 108 L166 120 Z" fill="${shade(color, 0.12)}" stroke="${dark}" stroke-width="4" stroke-linejoin="round"/>
        <path d="M254 52 L200 108 L234 120 Z" fill="${shade(color, 0.12)}" stroke="${dark}" stroke-width="4" stroke-linejoin="round"/>
      `)
    }
  },
  {
    type: 'coat',
    label: 'Blazer Coat',
    desc: 'Lapel, buttoned front',
    svg: (color) => {
      const dark = shade(color)
      const inner = shade(color, 0.45)
      return WRAP(`
        <!-- long sleeves -->
        <path d="M142 56 L96 82 L80 336 L132 346 L140 190 Z" fill="${color}" stroke="${dark}" stroke-width="4" stroke-linejoin="round"/>
        <path d="M258 56 L304 82 L320 336 L268 346 L260 190 Z" fill="${color}" stroke="${dark}" stroke-width="4" stroke-linejoin="round"/>
        <!-- inner shirt visible through opening -->
        <path d="M200 96 L172 360 L228 360 Z" fill="${inner}"/>
        <!-- left panel -->
        <path d="M142 56 L200 96 L206 360 L128 360 L112 82 Z" fill="${color}" stroke="${dark}" stroke-width="5" stroke-linejoin="round"/>
        <!-- right panel -->
        <path d="M258 56 L200 96 L194 360 L272 360 L288 82 Z" fill="${color}" stroke="${dark}" stroke-width="5" stroke-linejoin="round"/>
        <!-- lapels -->
        <path d="M142 56 L200 96 L176 190 L150 108 Z" fill="${shade(color, 0.15)}" stroke="${dark}" stroke-width="4" stroke-linejoin="round"/>
        <path d="M258 56 L200 96 L224 190 L250 108 Z" fill="${shade(color, 0.15)}" stroke="${dark}" stroke-width="4" stroke-linejoin="round"/>
        <!-- buttons -->
        <circle cx="182" cy="235" r="6" fill="${dark}"/>
        <circle cx="182" cy="290" r="6" fill="${dark}"/>
        <!-- pocket line -->
        <path d="M136 280 L168 286" stroke="${dark}" stroke-width="3" opacity="0.5"/>
        <path d="M264 280 L232 286" stroke="${dark}" stroke-width="3" opacity="0.5"/>
      `)
    }
  },
]

export function getGarmentDataUrl(type: GarmentType, color: string): string {
  const def = GARMENTS.find(g => g.type === type)
  return toDataUrl(def ? def.svg(color) : GARMENTS[0].svg(color))
}

export const GARMENT_COLORS = [
  { label: 'White', value: '#f8fafc' },
  { label: 'Sky Blue', value: '#93c5fd' },
  { label: 'Royal Blue', value: '#2563eb' },
  { label: 'Navy', value: '#1e3a8a' },
  { label: 'Black', value: '#27272a' },
  { label: 'Gray', value: '#9ca3af' },
  { label: 'Maroon', value: '#7f1d1d' },
  { label: 'Forest', value: '#166534' },
]

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
