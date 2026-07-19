// 文字数バッジの描画。Shadow DOM で Google の CSS から隔離する。
var FC = (globalThis.FC ||= {});

// バッジの見た目。
//
// prefers-color-scheme は使わない。あれは OS／ブラウザの設定しか教えて
// くれず、実際の背景色を教えてくれないため:
//   - フォームのテーマは「作成者」が選ぶもので、利用者の OS 設定とは無関係
//   - Android の Auto Dark Theme は無通知でページを暗転させる
//
// 代わりに、どんな背景でも読める 1 つの意匠にする（地図ラベルや動画の
// タイムスタンプと同じ手法）: 暗い半透明チップ＋白文字＋二重リング。
//   内側の明るいリング → 暗い背景から分離する
//   外側の暗いリング   → 明るい背景から分離する
// 白文字のコントラスト比: 白背景 5.17:1 (AA) / 黒背景 18.9:1 (AAA)
const BADGE_CSS = `
.badge {
  all: initial;
  position: fixed;
  top: 0;
  left: 0;
  display: block;
  box-sizing: border-box;
  direction: ltr;
  pointer-events: none;
  visibility: hidden;
  will-change: transform;

  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-weight: 500;
  font-size: var(--fc-font, 12px);
  line-height: 1;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;

  padding: 0.30em 0.55em;
  border-radius: 0.45em;
  min-width: 1.6em;
  text-align: center;
  white-space: nowrap;

  color: #fff;
  background: rgba(24, 26, 30, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.45);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35), 0 1px 4px rgba(0, 0, 0, 0.30);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
  -webkit-backdrop-filter: blur(3px) saturate(1.15);
  backdrop-filter: blur(3px) saturate(1.15);

  contain: layout style paint;
}

.badge.visible { visibility: visible; }

/* Windows ハイコントラスト */
@media (forced-colors: active) {
  .badge {
    forced-color-adjust: none;
    background: Canvas;
    color: CanvasText;
    border-color: CanvasText;
    box-shadow: none;
    text-shadow: none;
  }
}

/* 「動きを減らす」設定では位置の補間をしない（元々していないが明示） */
@media (prefers-reduced-motion: reduce) {
  .badge { transition: none; }
}
`;

let host = null;
let badge = null;
let lastText = null;

function ensureHost() {
  if (host && host.isConnected) return;

  if (!host) {
    host = document.createElement('div');
    // ホスト自体は「大きさゼロの入れ物」。position: fixed の座標系を
    // 壊さないよう、transform / filter / contain は絶対に付けない。
    host.style.cssText = [
      'all: initial !important',
      'position: fixed !important',
      'top: 0 !important',
      'left: 0 !important',
      'width: 0 !important',
      'height: 0 !important',
      'overflow: visible !important',
      'z-index: 2147483647 !important',
      // これが「Forms の操作を妨げない」の保証。見た目が重なっても
      // 次へ／送信 のタップを物理的に奪えない。
      'pointer-events: none !important',
    ].join(';');

    const root = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = BADGE_CSS;
    badge = document.createElement('div');
    badge.className = 'badge';
    root.append(style, badge);
  }

  // Google 側が body の子を消した場合に備えて入れ直す
  document.body.appendChild(host);
}

/** バッジの実測サイズ。表示前に測るため一時的に可視化する。 */
FC.measureBadge = function () {
  ensureHost();
  const wasVisible = badge.classList.contains('visible');
  if (!wasVisible) {
    badge.style.visibility = 'hidden';
    badge.classList.add('visible');
  }
  const rect = badge.getBoundingClientRect();
  if (!wasVisible) {
    badge.classList.remove('visible');
    badge.style.visibility = '';
  }
  return { width: rect.width, height: rect.height };
};

/** 文字数を反映する（変化がなければ DOM を触らない）。 */
FC.setCount = function (n) {
  ensureHost();
  const text = String(n);
  if (text !== lastText) {
    badge.textContent = text;
    lastText = text;
  }
};

/** 文字サイズを設定する。padding などは em なので追随する。 */
FC.setFontSize = function (px) {
  ensureHost();
  host.style.setProperty('--fc-font', px.toFixed(2) + 'px');
};

FC.showBadgeAt = function (x, y) {
  ensureHost();
  badge.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
  badge.classList.add('visible');
};

FC.hideBadge = function () {
  if (!badge) return;
  badge.classList.remove('visible');
};

// テスト・デバッグ用
FC._badgeElement = () => badge;
