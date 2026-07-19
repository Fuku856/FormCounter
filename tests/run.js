// Node 用テストランナー（依存ゼロ）。
//   node tests/run.js
// ブラウザで動かす場合は tests/unit.html を開く。
'use strict';

const path = require('path');

// content script と同じ「globalThis.FC にぶら下げる」流儀で読み込む
require(path.join(__dirname, '..', 'src', 'common', 'defaults.js'));
require(path.join(__dirname, '..', 'src', 'common', 'counter.js'));
const cases = require(path.join(__dirname, 'cases.js'));

let pass = 0;
const failures = [];

for (const c of cases) {
  let actual;
  try {
    actual = c.run();
  } catch (e) {
    failures.push({ name: c.name, expected: c.expected, actual: `例外: ${e.message}` });
    continue;
  }
  if (actual === c.expected) pass++;
  else failures.push({ name: c.name, expected: c.expected, actual });
}

for (const f of failures) {
  console.error(`FAIL  ${f.name}\n      期待値: ${f.expected}  実際: ${f.actual}`);
}

console.log(`\n${pass}/${cases.length} 件成功`);
process.exit(failures.length === 0 ? 0 : 1);
