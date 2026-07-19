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
// 書記素クラスタ 1 つが「まるごと改行か / まるごと空白か」を判定する。
// 分割してから分類するので、途中一致の g フラグ版ではなく全体一致で使う。
// CRLF は 1 クラスタなので、改行 1 つ = 1 文字として数えられる。
const NEWLINE_SEG = /^[\r\n]+$/;
const SPACE_SEG = /^[^\S\r\n]+$/;

// 絵文字は絵柄 1 つで 1 文字。RGI_Emoji は肌色修飾・ZWJ 合成・異体字セレクタ
// （❤️）・keycap（1️⃣）・国旗（🇯🇵）を「1 つの絵文字」としてまとめて拾う。
// v フラグ必須（Chrome 112+ / Node 20+。manifest の minimum_chrome_version 参照）。
const EMOJI = /^\p{RGI_Emoji}$/v;

// 書記素クラスタへの分割器。入力のたびに呼ばれるので使い回す。
// 分割結果はロケールに依存しないので undefined でよい。
const SEGMENTER = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/**
 * @param {string} text 入力欄の内容
 * @param {{countSpaces: boolean, countNewlines: boolean}} settings
 * @returns {number} 文字数（絵文字は絵柄 1 つを 1、それ以外はコードポイント数）
 */
FC.countCharacters = function (text, settings) {
  if (!text) return 0;

  const countSpaces = !!(settings && settings.countSpaces);
  const countNewlines = !!(settings && settings.countNewlines);

  // 空白・改行は「除去してから分割」ではなく「分割してから分類」する。
  // 先に除去すると、離れていた文字が隣接して新しいクラスタが生まれてしまう
  // （例: 🇯 と 🇵 が空白を挟んで並ぶと、除去後に国旗 🇯🇵 へ結合して 1 になる）。
  // 元の文字列をそのまま分割すれば結合は起きない。
  let n = 0;
  for (const { segment } of SEGMENTER.segment(text)) {
    if (NEWLINE_SEG.test(segment)) {
      if (countNewlines) n += 1;
      continue;
    }
    if (SPACE_SEG.test(segment)) {
      if (countSpaces) n += 1;
      continue;
    }
    // 絵文字クラスタは中身が何コードポイントでも 1。
    // それ以外はコードポイント数。text.length（UTF-16 符号単位）と違い、
    // 𠮷 のような追加面の文字を 1 と数える一方、か + 濁点のような
    // 非絵文字の合成は見た目 1 文字でも 2 のまま据え置く。
    n += EMOJI.test(segment) ? 1 : Array.from(segment).length;
  }
  return n;
};

// Node からもテストできるように（ブラウザ・content script では無害）
if (typeof module !== 'undefined' && module.exports) module.exports = FC;
