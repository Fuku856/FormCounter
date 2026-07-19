// manifest.json の静的チェック（依存ゼロ）。
//   node tools/check-manifest.js
//
// Chrome に読み込む前に「参照先のファイルが実在するか」「_locales の
// メッセージが揃っているか」を確かめる。読み込み時エラーの大半はこれで防げる。
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const errors = [];
const rel = (p) => path.relative(root, p).replace(/\\/g, '/');

function mustExist(relPath, label) {
  const full = path.join(root, relPath);
  if (!fs.existsSync(full)) errors.push(`${label}: ${relPath} が存在しません`);
}

// --- manifest.json 本体 ---
const manifestPath = path.join(root, 'manifest.json');
let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (e) {
  console.error(`manifest.json を解析できません: ${e.message}`);
  process.exit(1);
}

if (manifest.manifest_version !== 3) errors.push('manifest_version は 3 である必要があります');

// --- 自己ホスト配布（tools/crx-id.js と docs/RELEASE.md を参照） ---
// key が無いと、パッケージ化されていない拡張機能として読み込んだ開発機だけ
// 拡張 ID が変わり、.crx 版と設定を共有できなくなる。気づきにくいので弾く。
if (manifest.update_url && !manifest.key) {
  errors.push('update_url を使うなら key も必要です（node tools/crx-id.js <鍵.pem> で取得）');
}

// --- アイコン ---
for (const [size, p] of Object.entries(manifest.icons || {})) {
  mustExist(p, `icons.${size}`);
}
for (const [size, p] of Object.entries((manifest.action && manifest.action.default_icon) || {})) {
  mustExist(p, `action.default_icon.${size}`);
}

// --- content scripts ---
(manifest.content_scripts || []).forEach((cs, i) => {
  (cs.js || []).forEach((p) => mustExist(p, `content_scripts[${i}].js`));
  (cs.css || []).forEach((p) => mustExist(p, `content_scripts[${i}].css`));
  if (!cs.matches || cs.matches.length === 0) {
    errors.push(`content_scripts[${i}]: matches が空です`);
  }
});

// --- popup ---
if (manifest.action && manifest.action.default_popup) {
  mustExist(manifest.action.default_popup, 'action.default_popup');
}

// --- 国際化 ---
const usedMessages = new Set();
JSON.stringify(manifest).replace(/__MSG_([A-Za-z0-9_]+)__/g, (_, name) => usedMessages.add(name));

if (manifest.default_locale) {
  const localesDir = path.join(root, '_locales');
  const defaultDir = path.join(localesDir, manifest.default_locale);
  if (!fs.existsSync(defaultDir)) {
    errors.push(`default_locale "${manifest.default_locale}" に対応する _locales フォルダがありません`);
  } else {
    for (const locale of fs.readdirSync(localesDir)) {
      const msgPath = path.join(localesDir, locale, 'messages.json');
      if (!fs.existsSync(msgPath)) {
        errors.push(`_locales/${locale}/messages.json がありません`);
        continue;
      }
      let messages;
      try {
        messages = JSON.parse(fs.readFileSync(msgPath, 'utf8'));
      } catch (e) {
        errors.push(`_locales/${locale}/messages.json を解析できません: ${e.message}`);
        continue;
      }
      for (const name of usedMessages) {
        if (!messages[name]) errors.push(`_locales/${locale}/messages.json に "${name}" がありません`);
      }
    }
  }
} else if (usedMessages.size > 0) {
  errors.push('__MSG_*__ を使っていますが default_locale が未設定です');
}

// --- 権限が最小限か（PLAN.md のプライバシー要件） ---
const ALLOWED_PERMISSIONS = new Set(['storage']);
for (const p of manifest.permissions || []) {
  if (!ALLOWED_PERMISSIONS.has(p)) {
    errors.push(`権限 "${p}" は想定外です（設計上 storage のみ）`);
  }
}
if (manifest.host_permissions) {
  errors.push('host_permissions は使わない設計です');
}

// --- 出力 ---
if (errors.length) {
  for (const e of errors) console.error(`NG  ${e}`);
  console.error(`\n${errors.length} 件の問題`);
  process.exit(1);
}
console.log(`OK  ${rel(manifestPath)} — 参照先のファイルと翻訳はすべて揃っています`);
