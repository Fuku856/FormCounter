// 設定画面。チェックボックス 2 つを chrome.storage.sync と同期するだけ。
//
// content script 側は storage.onChanged を購読しているので、
// ここで保存すれば開いているタブへ即座に反映される（仲介役は不要）。
(function () {
  const FC = globalThis.FC;

  const inputs = {
    countSpaces: document.getElementById('countSpaces'),
    countNewlines: document.getElementById('countNewlines'),
  };

  // 保存済みの設定を読み込んで反映する
  chrome.storage.sync.get(FC.STORAGE_KEY, (stored) => {
    const settings = FC.normalizeSettings(
      chrome.runtime.lastError ? null : stored && stored[FC.STORAGE_KEY]
    );
    inputs.countSpaces.checked = settings.countSpaces;
    inputs.countNewlines.checked = settings.countNewlines;
  });

  function save() {
    const settings = {
      countSpaces: inputs.countSpaces.checked,
      countNewlines: inputs.countNewlines.checked,
    };
    chrome.storage.sync.set({ [FC.STORAGE_KEY]: settings });
  }

  inputs.countSpaces.addEventListener('change', save);
  inputs.countNewlines.addEventListener('change', save);

  // 他のウィンドウで変更された場合にも追随する
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !changes[FC.STORAGE_KEY]) return;
    const settings = FC.normalizeSettings(changes[FC.STORAGE_KEY].newValue);
    inputs.countSpaces.checked = settings.countSpaces;
    inputs.countNewlines.checked = settings.countNewlines;
  });

  // 表示文言の国際化（HTML には日本語を直接書いてあるため、
  // 翻訳が用意されている場合だけ差し替える）
  const i18n = {
    title: 'extName',
    'label-spaces': 'optSpaces',
    'hint-spaces': 'optSpacesHint',
    'label-newlines': 'optNewlines',
    'hint-newlines': 'optNewlinesHint',
    note: 'popupNote',
  };
  for (const [id, key] of Object.entries(i18n)) {
    const el = document.getElementById(id);
    const text = chrome.i18n.getMessage(key);
    if (el && text) el.textContent = text;
  }
})();
