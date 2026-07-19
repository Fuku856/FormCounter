// バッジの配置計算（純粋関数）。
//
// DOM にも window にも触れない。矩形を受け取って座標を返すだけなので、
// 実機もソフトウェアキーボードもなしにテーブル駆動テストで検証できる。
// これは意図的な設計で、PC では再現できない「キーボードで可視領域が
// 縮んだ状態」を唯一テストできる手段になっている。
var FC = (globalThis.FC ||= {});

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
FC.clamp = clamp;

/**
 * @param {object} args
 * @param {{top:number,right:number,bottom:number,left:number,width:number,height:number}} args.field
 *        入力欄の矩形（getBoundingClientRect と同じレイアウトビューポート座標）
 * @param {{left:number,top:number,right:number,bottom:number}} args.view
 *        可視領域（visualViewport から合成。同じ座標空間）
 * @param {{width:number,height:number}} args.badge バッジの実測サイズ
 * @param {number} args.gap  入力欄とバッジの間隔
 * @param {number} args.edge 可視領域の縁からの最小余白
 * @param {boolean} args.singleLine 短答（input）なら true、段落（textarea）なら false
 * @returns {{x:number, y:number, mode:'outside'|'above'|'corner'}}
 */
FC.computePlacement = function ({ field, view, badge, gap, edge, singleLine }) {
  const L = view.left + edge;
  const T = view.top + edge;
  const R = view.right - edge;
  const B = view.bottom - edge;

  let x;
  let y;
  let mode;

  if (R - field.right >= badge.width + gap) {
    // 横幅に余裕がある（主に PC）: 入力欄の右端の「外側」に置く。
    // 外側なので、入力した文字にもカーソルにも絶対に重ならない。
    mode = 'outside';
    x = field.right + gap;
    // 短答か段落かは高さで推測せず、要素の種類（input / textarea）で決める。
    // 高さの閾値は文字サイズや Forms の余白に左右されて当てにならない。
    y = singleLine
      ? field.top + (field.height - badge.height) / 2 // 短答: 上下中央
      : field.bottom - badge.height; // 段落: 下端そろえ（伸長しても追随する）
  } else {
    // 横幅がない（主にスマートフォン）: 入力欄の「真上」・右端そろえ。
    //  - 入力文字に重ならない（文字は欄の内側にある）
    //  - 次へ／送信 に重ならない（その行は常に全質問より下にある）
    mode = 'above';
    x = field.right - badge.width;
    y = field.top - gap - badge.height;

    if (y < T) {
      // 頭上に余地がない。横向き＋キーボードで可視領域が細い帯に
      // なった場合や、入力欄が可視領域の上端に張りついた場合。
      // → 可視領域の右上へ退避する。ここは必ず画面内に入る。
      //   長い textarea のカーソルは左下側にいるので衝突しにくい。
      mode = 'corner';
      x = R - badge.width;
      y = T;
    }
  }

  // 可視領域内に収める。可視領域がバッジより狭い場合は左上優先。
  return {
    x: clamp(x, L, Math.max(L, R - badge.width)),
    y: clamp(y, T, Math.max(T, B - badge.height)),
    mode,
  };
};

if (typeof module !== 'undefined' && module.exports) module.exports = FC;
