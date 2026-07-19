// 設定画面のプレビューを生成する（依存ゼロ）。
//   node tools/make-popup-preview.js
//
// なぜ必要か:
//  1. popup.html を直接ブラウザで開くと chrome.storage / chrome.i18n が
//     無いため popup.js が落ちる。
//  2. (pointer: coarse) は PC のブラウザでは再現できないので、
//     スマートフォン向けの分岐を目視確認できない。
//
// そこで CSS を inline 展開した 2 種類を出力する:
//   _preview-desktop.html … そのまま（PC 分岐）
//   _preview-mobile.html  … (pointer: coarse) を常に真に置換（スマホ分岐）
//
// 生成物は .gitignore 済み。
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const popupDir = path.join(root, 'src', 'popup');
const outDir = path.join(root, 'tests');

const css = fs.readFileSync(path.join(popupDir, 'popup.css'), 'utf8');
const html = fs.readFileSync(path.join(popupDir, 'popup.html'), 'utf8');

const bodyMatch = html.match(/<body>([\s\S]*?)<script/);
if (!bodyMatch) {
  console.error('popup.html の body を取り出せませんでした');
  process.exit(1);
}
const body = bodyMatch[1];

// 実物と同じ viewport meta を必ず含める。
// これが無いと 980px でレイアウトされ、実機と違う結果になる。
const meta = '<meta name="viewport" content="width=device-width, initial-scale=1">';

function write(name, styles, title) {
  const out = path.join(outDir, name);
  fs.writeFileSync(
    out,
    `<!doctype html><html lang="ja"><head><meta charset="utf-8">${meta}` +
      `<title>${title}</title><style>${styles}</style></head><body>${body}</body></html>`
  );
  console.log(`${path.relative(root, out).replace(/\\/g, '/')}`);
}

write('_preview-desktop.html', css, 'popup (PC)');
write('_preview-mobile.html', css.replace(/\(pointer: coarse\)/g, '(min-width: 0px)'), 'popup (スマホ)');
