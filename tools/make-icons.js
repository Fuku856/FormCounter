// アイコン PNG の生成（依存ゼロ / Node 標準の zlib のみ）。
//   node tools/make-icons.js
//
// 意匠: 角丸の濃紺のタイル + 白い横棒3本（文章を表す）。
// 16px でも潰れないよう、棒の本数と太さを抑えている。
// 4倍スーパーサンプリングでアンチエイリアスをかける。
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SS = 4; // スーパーサンプリング倍率

// --- PNG エンコード ---------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

/** @param {Uint8Array} rgba 長さ w*h*4 */
function encodePng(rgba, w, h) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // 各スキャンラインの先頭にフィルタ種別 0 を付ける
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- 図形 -------------------------------------------------------------------

/** 角丸長方形の内側なら true（座標は 0..1 の正規化空間ではなく実ピクセル） */
function inRoundRect(px, py, x, y, w, h, r) {
  if (px < x || py < y || px >= x + w || py >= y + h) return false;
  const cx = Math.min(Math.max(px, x + r), x + w - r);
  const cy = Math.min(Math.max(py, y + r), y + h - r);
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

const BG = [32, 43, 64]; // 濃紺
const FG = [255, 255, 255];

function renderIcon(size) {
  const S = size * SS;
  const acc = new Float32Array(size * size * 4);

  // 3本の横棒: 上から 100%, 100%, 60% の長さ
  const barLengths = [1, 1, 0.6];
  const pad = S * 0.22; // タイル内側の余白
  const barH = S * 0.1;
  const gap = S * 0.11;
  const innerW = S - pad * 2;
  const totalH = barH * 3 + gap * 2;
  const barTop = (S - totalH) / 2;

  for (let sy = 0; sy < S; sy++) {
    for (let sx = 0; sx < S; sx++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      // 背景タイル（全面、角丸）
      if (inRoundRect(sx + 0.5, sy + 0.5, 0, 0, S, S, S * 0.22)) {
        [r, g, b] = BG;
        a = 255;

        // 白い棒
        for (let i = 0; i < 3; i++) {
          const by = barTop + i * (barH + gap);
          const bw = innerW * barLengths[i];
          if (inRoundRect(sx + 0.5, sy + 0.5, pad, by, bw, barH, barH / 2)) {
            [r, g, b] = FG;
            break;
          }
        }
      }

      // スーパーサンプルを出力ピクセルへ集約
      const ox = Math.floor(sx / SS);
      const oy = Math.floor(sy / SS);
      const o = (oy * size + ox) * 4;
      acc[o] += r * (a / 255);
      acc[o + 1] += g * (a / 255);
      acc[o + 2] += b * (a / 255);
      acc[o + 3] += a;
    }
  }

  const n = SS * SS;
  const out = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const alpha = acc[i * 4 + 3] / n;
    // 事前乗算を解いてストレートアルファに戻す
    const scale = alpha > 0 ? 255 / alpha / n : 0;
    out[i * 4] = Math.round(Math.min(255, acc[i * 4] * scale));
    out[i * 4 + 1] = Math.round(Math.min(255, acc[i * 4 + 1] * scale));
    out[i * 4 + 2] = Math.round(Math.min(255, acc[i * 4 + 2] * scale));
    out[i * 4 + 3] = Math.round(alpha);
  }
  return out;
}

// --- 出力 -------------------------------------------------------------------

const outDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const png = encodePng(renderIcon(size), size, size);
  const file = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(file, png);
  console.log(`${path.relative(path.join(__dirname, '..'), file)}  ${png.length} bytes`);
}
