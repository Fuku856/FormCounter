// 設定の既定値と保存キー。
//
// このファイルは content script（分離ワールド）と popup の両方から
// 同一のファイルとして読み込まれる。content script は "type": "module" に
// 非対応なので import は使えず、分離ワールドの globalThis へぶら下げる。
// 分離ワールドの globalThis はページ側の JavaScript からは見えない。
var FC = (globalThis.FC ||= {});

FC.STORAGE_KEY = 'settings';

// PLAN.md「初期設定では、空白と改行を数えない」
FC.DEFAULTS = Object.freeze({
  countSpaces: false,
  countNewlines: false,
});

// 保存済みの値に既定値を補う。想定外のキーは捨てる。
FC.normalizeSettings = function (stored) {
  const s = stored || {};
  return {
    countSpaces: typeof s.countSpaces === 'boolean' ? s.countSpaces : FC.DEFAULTS.countSpaces,
    countNewlines: typeof s.countNewlines === 'boolean' ? s.countNewlines : FC.DEFAULTS.countNewlines,
  };
};
