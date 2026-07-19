// 文字数のカウント（純粋関数）。
//
// DOM に一切触れないので、ブラウザなしでテーブル駆動テストができる。
var FC = (globalThis.FC ||= {});

// この2つの文字クラスは構成上ぜったいに互いに素:
//   NEWLINES … 改行だけ
//   SPACES   … 「\s の否定」の否定、つまり \s から改行を除いた残り全部
// 互いに素なので、空白と改行を取り除く順序は結果に影響しない。
//
// SPACES が \s 由来で自動的に含むもの:
//   U+0020 半角スペース / U+3000 全角スペース（日本語で最重要）/ U+0009 タブ /
//   U+00A0 NBSP / U+2000-U+200A 各種の組版スペース / U+202F / U+205F / U+FEFF /
//   U+2028 行区切り / U+2029 段落区切り
// 含まないもの: U+200B ゼロ幅スペース（\s に非含有。幅ゼロなので放置）
const NEWLINES = /[\r\n]/g;
const SPACES = /[^\S\r\n]/g;

/**
 * @param {string} text 入力欄の内容
 * @param {{countSpaces: boolean, countNewlines: boolean}} settings
 * @returns {number} コードポイント数
 */
FC.countCharacters = function (text, settings) {
  if (!text) return 0;

  const countSpaces = !!(settings && settings.countSpaces);
  const countNewlines = !!(settings && settings.countNewlines);

  let s = text;
  if (!countNewlines) s = s.replace(NEWLINES, '');
  if (!countSpaces) s = s.replace(SPACES, '');

  // コードポイント数。text.length（UTF-16 符号単位）と違い、
  // 𠮷 のような追加面の文字を 1 と数える。
  // 通常の日本語文（かな・漢字・英数）ではどちらでも結果は同じ。
  return Array.from(s).length;
};

// Node からもテストできるように（ブラウザ・content script では無害）
if (typeof module !== 'undefined' && module.exports) module.exports = FC;
