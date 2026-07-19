// manifest.json の version を書き換える（依存ゼロ）。
//   node tools/bump-version.js 0.2.0
//
// 自動更新はバージョンが増えたときだけ発火する。手で編集して上げ忘れると
// 「リリースしたのに配られない」という分かりにくい失敗になるので、
// リリース手順ではこのスクリプトを通す（docs/RELEASE.md 参照）。
'use strict';

const fs = require('fs');
const path = require('path');

const next = process.argv[2];
if (!next) {
  console.error('使い方: node tools/bump-version.js <バージョン>   例: 0.2.0');
  process.exit(1);
}

// Chrome の仕様: 1〜4 個の 0〜65535 をドットで区切る。
if (!/^\d{1,5}(\.\d{1,5}){0,3}$/.test(next) || next.split('.').some((n) => Number(n) > 65535)) {
  console.error(`バージョン "${next}" は Chrome の形式に合いません（例: 0.2.0）`);
  process.exit(1);
}

const manifestPath = path.join(__dirname, '..', 'manifest.json');
const raw = fs.readFileSync(manifestPath, 'utf8');
const current = JSON.parse(raw).version;

// 数値として増えているかを確認する。減っていると更新が配られない。
const cmp = (a, b) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
};
if (cmp(next, current) <= 0) {
  console.error(`現在の ${current} から ${next} へは上げられません（増やす必要があります）`);
  process.exit(1);
}

// 整形やコメント位置を壊さないよう、version 行だけを置換する。
const updated = raw.replace(/("version"\s*:\s*")[^"]*(")/, `$1${next}$2`);
if (updated === raw) {
  console.error('manifest.json の version 行が見つかりません');
  process.exit(1);
}
fs.writeFileSync(manifestPath, updated);

console.log(`OK  version ${current} -> ${next}`);
console.log(`    次: git commit -am "v${next}" && git tag v${next} && git push --follow-tags`);
