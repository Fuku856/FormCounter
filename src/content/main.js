// content script の入口。イベント配線と更新ループ。
//
// この PR ではパソコン向けの配置まで。可視領域はレイアウトビューポートを
// 使い、文字サイズは固定。visualViewport への追随とレスポンシブな
// サイズ調整は次の PR で入れる。
(function () {
  const FC = globalThis.FC;

  const FONT_SIZE = 11.5; // PC 向け固定値（PLAN.md「小さく表示する」）
  const GAP = 6;
  const EDGE = 8;

  let settings = FC.DEFAULTS;
  let field = null; // 現在フォーカスしている入力欄
  let resizeObserver = null;
  let ticking = false;

  // --- 設定 ---------------------------------------------------------------

  // chrome.storage が無い環境（テスト用の fixture ページなど）では
  // 既定値のまま動かす。拡張機能として読み込まれていれば必ず存在する。
  const storage = typeof chrome !== 'undefined' && chrome.storage ? chrome.storage : null;

  if (storage) {
    storage.sync.get(FC.STORAGE_KEY, (stored) => {
      if (chrome.runtime.lastError) return; // 取得できなければ既定値のまま
      settings = FC.normalizeSettings(stored && stored[FC.STORAGE_KEY]);
      schedule();
    });

    storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync' || !changes[FC.STORAGE_KEY]) return;
      settings = FC.normalizeSettings(changes[FC.STORAGE_KEY].newValue);
      schedule(); // 開いているタブへ即座に反映
    });
  }

  // fixture ページから設定を差し替えて挙動を確かめるための入口
  FC._setSettings = function (next) {
    settings = FC.normalizeSettings(next);
    schedule();
  };

  // テスト用。requestAnimationFrame は非表示のタブでは発火しないため、
  // 自動テストからは更新を同期的に呼べる必要がある。
  FC._updateNow = () => update();

  // --- 可視領域 -----------------------------------------------------------

  function currentView() {
    return {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
    };
  }

  // --- 更新ループ ---------------------------------------------------------

  function schedule() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      update();
    });
  }

  function update() {
    if (!field) return;

    // 入力欄が DOM から外れた（セクション移動など）
    if (!field.isConnected) {
      detach();
      return;
    }

    const rect = field.getBoundingClientRect();
    // 大きさ 0 は「非表示になった」とみなす
    if (rect.width === 0 && rect.height === 0) {
      FC.hideBadge();
      return;
    }

    // 可視領域が潰れている場合は描画しない。
    // all_frames: true なので、大きさ 0 や非表示の iframe に注入される
    // ことがある。ここで防がないと、意味のない座標にバッジが出てしまう。
    const view = currentView();
    if (view.right - view.left <= 0 || view.bottom - view.top <= 0) {
      FC.hideBadge();
      return;
    }

    // 数値の反映を先に行う。桁数が変わるとバッジの幅が変わるため、
    // 実測はそのあとでなければならない。
    FC.setFontSize(FONT_SIZE);
    FC.setCount(FC.countCharacters(field.value, settings));

    const placement = FC.computePlacement({
      field: rect,
      view,
      badge: FC.measureBadge(),
      gap: GAP,
      edge: EDGE,
      singleLine: field.tagName === 'INPUT',
    });

    FC.showBadgeAt(placement.x, placement.y);
  }

  // --- フォーカスの出入り -------------------------------------------------

  function attach(el) {
    if (field === el) return;
    detach();
    field = el;

    // input だけでは拾えない変更（下書きの復元など）もあるが、
    // update() が毎回 value を読み直すので実害はない。
    field.addEventListener('input', schedule);

    // textarea の自動伸長に追随する
    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(schedule);
      resizeObserver.observe(field);
    }

    schedule();
  }

  function detach() {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (field) {
      field.removeEventListener('input', schedule);
      field = null;
    }
    FC.hideBadge();
  }

  document.addEventListener(
    'focusin',
    (e) => {
      if (FC.isFreeTextAnswer(e.target)) attach(e.target);
      else detach();
    },
    true
  );

  document.addEventListener(
    'focusout',
    (e) => {
      if (e.target === field) detach();
    },
    true
  );

  // --- 再配置のきっかけ ---------------------------------------------------

  const passive = { passive: true };

  // capture にすることで、任意の祖先のスクロールを拾える
  // （scroll は要素からバブルしないが、capture では通過する）
  document.addEventListener('scroll', schedule, { passive: true, capture: true });
  window.addEventListener('resize', schedule, passive);
  window.addEventListener('orientationchange', schedule, passive);
  document.addEventListener('visibilitychange', schedule, passive);

  // ページ表示時点で既にフォーカスがある場合（BFCache からの復帰など）
  if (FC.isFreeTextAnswer(document.activeElement)) attach(document.activeElement);
})();
