// Generates the PWA icons (no dependencies) – a dumbbell on a dark rounded square.
// Run: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

function crc32(buf) {
  let c, crc = ~0
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return ~crc >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(size, fullBleed) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  const s = size / 512
  const inRR = (x, y, x0, y0, x1, y1, r) => {
    if (x < x0 || x > x1 || y < y0 || y > y1) return false
    const cx = Math.min(Math.max(x, x0 + r), x1 - r)
    const cy = Math.min(Math.max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
  }
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const px = x / s, py = y / s
      let rgba = [0, 0, 0, 0]
      if (fullBleed || inRR(px, py, 0, 0, 512, 512, 112)) rgba = [15, 23, 42, 255]
      const bar = inRR(px, py, 150, 240, 362, 272, 8)
      const plates = [
        [100, 180, 140, 332], [140, 150, 180, 362], [332, 150, 372, 362], [372, 180, 412, 332],
      ].some(([a, b, c, d]) => inRR(px, py, a, b, c, d, 14))
      if (bar || plates) rgba = [52, 211, 153, 255]
      const o = y * (size * 4 + 1) + 1 + x * 4
      raw[o] = rgba[0]; raw[o + 1] = rgba[1]; raw[o + 2] = rgba[2]; raw[o + 3] = rgba[3]
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ])
}
writeFileSync('public/pwa-192.png', png(192, false))
writeFileSync('public/pwa-512.png', png(512, true)) // full-bleed so it also works as maskable
writeFileSync('public/apple-touch-icon.png', png(180, true)) // iOS rounds corners itself
console.log('icons written')
