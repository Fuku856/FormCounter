// 署名鍵から拡張 ID と manifest 用の key を求める（依存ゼロ / Node 標準の crypto のみ）。
//   node tools/crx-id.js <秘密鍵.pem>
//
// 拡張 ID は公開鍵から決まるので、同じ .pem を使い続ける限り不変。
// 出力する 2 つの値の用途:
//   ID  … update.xml の appid。実際にインストールした拡張の ID と一致しないと
//         自動更新は永久に動かない。
//   key … manifest.json に入れると、パッケージ化されていない拡張機能として
//         読み込んだときも .crx 版と同じ ID になり、設定を共有できる。
'use strict';

const fs = require('fs');
const crypto = require('crypto');

const keyPath = process.argv[2];
if (!keyPath) {
  console.error('使い方: node tools/crx-id.js <秘密鍵.pem>');
  process.exit(1);
}

let der;
try {
  const pem = fs.readFileSync(keyPath, 'utf8');
  // 秘密鍵を渡しても公開鍵を導出できる。公開鍵をそのまま渡しても通る。
  der = crypto.createPublicKey(pem).export({ type: 'spki', format: 'der' });
} catch (e) {
  console.error(`鍵を読めません (${keyPath}): ${e.message}`);
  process.exit(1);
}

// ID は「公開鍵 DER の SHA-256 の先頭 16 バイト」を 16 進で表し、
// 各桁 0-9a-f を a-p へ写像したもの（Chrome の mpdecimal 表記）。
const digest = crypto.createHash('sha256').update(der).digest();
const id = Array.from(digest.subarray(0, 16))
  .map((b) => b.toString(16).padStart(2, '0'))
  .join('')
  .replace(/[0-9a-f]/g, (c) => String.fromCharCode(97 + parseInt(c, 16)));

console.log(`ID   ${id}`);
console.log(`key  ${der.toString('base64')}`);
