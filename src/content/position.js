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
 * 画面に応じた寸法を決める。
 *
 * 計算するのは文字サイズ 1 つだけで、余白・角丸・最小幅は CSS の em が
 * 派生させる。JS 側で持つ数値を 1 つに絞るための構成。
 *
 * CSS の clamp()/vw だけで済まない理由:
 * vw はレイアウトビューポート基準なので、Android の既定
 * （interactive-widget=resizes-visual）ではキーボードが開いても変化しない。
 * つまり一番反応してほしい条件に対して CSS 単位は盲目になる。
 * 位置決めでどうせ JS が要るので、同じ view から文字サイズも導いて整合させる。
 *
 * @param {{left:number,top:number,right:number,bottom:number}} view 可視領域
 * @param {boolean} coarse 粗いポインタ（指）かどうか
 * @returns {{font:number, gap:number, edge:number}}
 */
FC.computeTokens = function (view, coarse) {
  const width = view.right - view.left;
  const height = view.bottom - view.top;

  // 画面幅ではなく入力デバイスで基準を決める。
  // 幅が狭いだけの PC ウィンドウは依然として PC なので。
  const base = coarse ? 13 : 11.5; // PLAN.md「パソコンでは小さく表示する」

  // 幅による補正。PC では拡大しない（上限 1.0）。
  const wf = clamp(width / 380, 0.85, coarse ? 1.12 : 1.0);

  // 横向き＋キーボードで可視領域が細い帯になったときは少し小さくする
  const hf = height < 260 ? 0.85 : 1;

  const font = clamp(base * wf * hf, 9, 15);

  return {
    font,
    gap: clamp(font * 0.5, 4, 8),
    edge: clamp(font * 0.7, 6, 12),
  };
};

/**
 * 入力欄が可視領域に少しでも見えているか。
 *
 * computePlacement は最後に必ず座標を可視領域内へ clamp する。これは
 * 「バッジを画面内に収める」ための正しい処理だが、欄が画面の外にある場合には
 * 画面外の座標を画面の端へ引き戻してしまう。その結果、スクロールで欄が
 * 流れ去ったあともバッジが端に貼り付き、無関係な質問の上に残る。
 * 配置を計算する前にここで弾く。
 *
 * 一部でも見えていれば true。欄の上端だけが画面に残っている状態でも
 * 文字数は意味を持つので、完全に外れた場合だけ false にする。
 *
 * @param {{top:number,right:number,bottom:number,left:number}} args.field 入力欄の矩形
 * @param {{left:number,top:number,right:number,bottom:number}} args.view 可視領域
 * @returns {boolean}
 */
FC.isFieldVisible = function ({ field, view }) {
  return (
    field.bottom > view.top &&
    field.top < view.bottom &&
    field.right > view.left &&
    field.left < view.right
  );
};

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
