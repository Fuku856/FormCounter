// 自由記述欄かどうかの判定。
//
// 探索にはセレクタを使わない。document 上の capture フェーズの focusin に
// 委譲し、フォーカスされた要素だけをここで判定する。この方式なら
// SPA の DOM 差し替え・セクション移動・条件分岐質問・後から現れる
// 「その他」欄のすべてに耐えられる（MutationObserver は不要）。
//
// 分類のときだけ DOM 構造を見るが、難読化された class 名
// （.whsOnd など、予告なく変わる）ではなく ARIA 属性を使う。
// ARIA は Google 自身のアクセシビリティ準拠に必要なので最も変わりにくい。
var FC = (globalThis.FC ||= {});

// 短答は type="text"。type 未指定も text 扱い（HTML の既定）。
// email / number / date / time / file などはここで落ちる。
const TEXT_INPUT_TYPES = new Set(['text', '']);

// [role="listitem"] が存在するか。1 回だけ調べて記憶する。
// Google が構造を変えて listitem が消えた場合、構造フィルタを無効化して
// 「その他欄でも数えてしまう」に倒す（fail-open）。
// 「何も表示されない」より害が小さい。
let structuralFilter = null;

function structuralFilterAvailable() {
  if (structuralFilter === null) {
    structuralFilter = document.querySelector('[role="listitem"]') !== null;
  }
  return structuralFilter;
}

// テスト用（fixture を差し替えるたびに再判定させる）
FC.resetFieldCache = function () {
  structuralFilter = null;
};

// 質問の枠の中にあるか。
//
// Google フォームでは質問 1 つが role="listitem" で表され、その中に
// 質問文の見出し（role="heading"）を含む。ラジオ／チェックボックスの
// 「選択肢」も role="listitem" だが見出しを持たない。
// この差により、「その他」の自由入力欄を名指しせずに除外できる。
function inQuestion(el) {
  if (!structuralFilterAvailable()) return true;
  const item = el.closest('[role="listitem"]');
  if (!item) return false;
  return !!item.querySelector('[role="heading"], h1, h2, h3, h4');
}

/**
 * フォーカスされた要素が、文字数を表示すべき自由記述欄か。
 * @param {Element} el
 * @returns {boolean}
 */
FC.isFreeTextAnswer = function (el) {
  if (!el || el.nodeType !== 1) return false;
  if (el.disabled || el.readOnly) return false;
  if (el.getAttribute('aria-readonly') === 'true') return false;

  const tag = el.tagName;

  if (tag === 'TEXTAREA') return inQuestion(el); // 段落
  if (tag !== 'INPUT') return false;

  const type = (el.getAttribute('type') || '').toLowerCase();
  if (!TEXT_INPUT_TYPES.has(type)) return false;

  return inQuestion(el); // 短答
};

if (typeof module !== 'undefined' && module.exports) module.exports = FC;
