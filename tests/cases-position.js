// computePlacement のテストケース。
//
// この関数は純粋なので、偽の view を渡すだけで「ソフトウェアキーボードで
// 可視領域が縮んだ状態」を再現できる。PC の DevTools はキーボードを
// 模倣しないため、ここがモバイル挙動を検証できる唯一の場所になる。
var FC_CASES_POSITION = (function () {
  const FC = globalThis.FC;
  const cases = [];

  // 入力欄の矩形を組み立てる（getBoundingClientRect 相当）
  const rect = (left, top, width, height) => ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  });

  const view = (width, height, top = 0, left = 0) => ({
    left,
    top,
    right: left + width,
    bottom: top + height,
  });

  const BADGE = { width: 28, height: 18 };
  const GAP = 6;
  const EDGE = 8;

  function place(field, v, singleLine = true, badge = BADGE, gap = GAP, edge = EDGE) {
    return FC.computePlacement({ field, view: v, badge, gap, edge, singleLine });
  }

  const t = (name, run, expected) => cases.push({ name, run, expected });

  // --- PC: 入力欄の外側・右 -----------------------------------------------

  {
    // 1280x800、欄は左 300 幅 600、短答（高さ 40）
    const f = rect(300, 200, 600, 40);
    const v = view(1280, 800);
    const p = place(f, v);
    t('PC 短答: モードは outside', () => p.mode, 'outside');
    t('PC 短答: 欄の右端の外側に置く', () => p.x, 906); // 900 + gap 6
    t('PC 短答: 上下中央', () => p.y, 211); // 200 + (40-18)/2
  }

  {
    // 段落（textarea）は下端そろえ。伸長しても常に下端に追随する。
    const f = rect(300, 200, 600, 120);
    const p = place(f, view(1280, 800), false);
    t('PC 段落: モードは outside', () => p.mode, 'outside');
    t('PC 段落: 下端そろえ', () => p.y, 302); // 320 - 18
  }

  {
    // 短答が背の高い見た目でも（Forms の余白次第）上下中央のままであること。
    // 高さの閾値で推測していた頃はここで段落と誤判定していた。
    const f = rect(300, 200, 600, 56);
    const p = place(f, view(1280, 800), true);
    t('PC 短答: 背が高くても上下中央', () => p.y, 219); // 200 + (56-18)/2
  }

  {
    // 右に余白がぎりぎり足りる: 必要なのは badge.width + gap = 34
    const f = rect(0, 100, 1280 - EDGE - 34, 40);
    const p = place(f, view(1280, 800));
    t('右余白がちょうど足りれば outside', () => p.mode, 'outside');
  }

  {
    // 1px 足りなければ真上に切り替わる
    const f = rect(0, 100, 1280 - EDGE - 34 + 1, 40);
    const p = place(f, view(1280, 800));
    t('右余白が 1px 足りなければ above', () => p.mode, 'above');
  }

  // --- スマートフォン縦: 入力欄の真上 -------------------------------------

  {
    // 360x640、欄は画面幅いっぱい（左右 16 の余白）
    const f = rect(16, 300, 328, 44);
    const v = view(360, 640);
    const p = place(f, v);
    t('スマホ縦: モードは above', () => p.mode, 'above');
    t('スマホ縦: 欄の右端そろえ', () => p.x, 316); // 344 - 28
    t('スマホ縦: 欄の真上', () => p.y, 276); // 300 - 6 - 18
  }

  {
    // キーボードが開いて可視領域が 360x340 に縮んだ状態。
    // 欄はキーボードの上に自動スクロールされて y=180 にいる。
    const f = rect(16, 180, 328, 44);
    const v = view(360, 340);
    const p = place(f, v);
    t('スマホ縦+キーボード: above のまま', () => p.mode, 'above');
    t('スマホ縦+キーボード: 欄の真上', () => p.y, 156);
    t('スマホ縦+キーボード: 可視領域内に収まる', () => p.y + BADGE.height <= v.bottom - EDGE, true);
  }

  // --- 横向き＋キーボード: 可視領域が細い帯 --------------------------------

  {
    // 640x360 の端末でキーボードが 220px。可視領域は高さ 140 の帯。
    // 段落欄は帯より高く、上端は帯の外（負の座標）にある。
    const f = rect(40, -20, 560, 150);
    const v = view(640, 140);
    const p = place(f, v);
    t('横向き+キーボード: corner へ退避', () => p.mode, 'corner');
    t('横向き+キーボード: 可視領域の右上', () => p.x, 604); // 632 - 28
    t('横向き+キーボード: 可視領域の上端', () => p.y, 8);
    t('横向き+キーボード: キーボードに隠れない', () => p.y + BADGE.height <= v.bottom - EDGE, true);
  }

  {
    // 帯の中に収まる短い欄なら、横向きでも真上に置ける
    const f = rect(40, 60, 560, 40);
    const v = view(640, 140);
    const p = place(f, v);
    t('横向き: 頭上に余地があれば above', () => p.mode, 'above');
    t('横向き: 欄の真上', () => p.y, 36); // 60 - 6 - 18
  }

  // --- visualViewport のオフセット（ピンチ／ブラウザ UI） ------------------

  {
    // 可視領域が下に 100px ずれている状態
    const f = rect(16, 300, 328, 44);
    const v = view(360, 400, 100);
    const p = place(f, v);
    t('view.top のオフセットを尊重する', () => p.y >= v.top + EDGE, true);
    t('view.bottom を超えない', () => p.y + BADGE.height <= v.bottom - EDGE, true);
  }

  // --- 端に張りついた場合のクランプ ---------------------------------------

  {
    // 欄が可視領域の上端に張りついている → 真上に置けず corner へ
    const f = rect(16, 0, 328, 44);
    const v = view(360, 640);
    const p = place(f, v);
    t('欄が上端に張りつくと corner', () => p.mode, 'corner');
    t('corner でも上端の余白を確保', () => p.y, 8);
  }

  {
    // 可視領域がバッジより狭い異常ケースでも NaN や負の暴走をしない
    const f = rect(0, 0, 10, 10);
    const v = view(20, 20);
    const p = place(f, v);
    t('極端に狭くても x は有限', () => Number.isFinite(p.x), true);
    t('極端に狭くても y は有限', () => Number.isFinite(p.y), true);
    t('極端に狭いと左上に寄せる', () => p.x, 8);
  }

  // --- 常に画面内に収まること（総当たり） ---------------------------------

  {
    // いろいろな組み合わせで、必ず可視領域の内側に収まることを確認する
    let allInside = true;
    const views = [view(1280, 800), view(360, 640), view(360, 340), view(640, 140), view(320, 568)];
    const fields = [
      rect(16, -50, 328, 200),
      rect(16, 0, 328, 44),
      rect(16, 100, 328, 44),
      rect(300, 200, 600, 40),
      rect(0, 500, 300, 300),
    ];
    for (const v of views) {
      for (const f of fields) {
        const p = place(f, v);
        const insideX = p.x >= v.left && p.x + BADGE.width <= v.right;
        const insideY = p.y >= v.top && p.y + BADGE.height <= v.bottom;
        if (!insideX || !insideY) allInside = false;
      }
    }
    t('全組み合わせで可視領域内に収まる', () => allInside, true);
  }

  return cases;
})();

if (typeof module !== 'undefined' && module.exports) module.exports = FC_CASES_POSITION;
