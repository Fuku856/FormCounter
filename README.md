# FormCounter

Google フォームの自由記述欄に、リアルタイムの文字数を表示する Chrome 拡張機能。

フォーカスしている入力欄だけに、数字だけを半透明の背景つきで表示します。
入力した内容は保存も収集も外部送信もしません。

> 開発中です。要件は [PLAN.md](PLAN.md)、動作確認の手順は
> [docs/VERIFICATION.md](docs/VERIFICATION.md) を参照してください。

## 対応環境

- パソコン版 Google Chrome / Chromium 系ブラウザ
- 拡張機能に対応した Android 向け Chromium 系ブラウザ（Cromite など）

Chrome 112 以上が必要です。Firefox には対応していません。

## インストール

ビルドは不要です。[Releases](https://github.com/Fuku856/FormCounter/releases) から
`formcounter-*.zip` を取得して展開するか、このリポジトリを clone してください。

1. `chrome://extensions` を開く
2. 右上の「デベロッパー モード」をオンにする
3. 「パッケージ化されていない拡張機能を読み込む」でそのフォルダを選ぶ

一度読み込めば Chrome を再起動しても残ります。更新するときは、同じフォルダの
中身を新しいものに置き換えてから再読み込みボタンを押してください
（パスが変わると別の拡張として扱われ、設定が引き継がれません）。

`.crx` は配布していません。Chrome が Web Store 外の `.crx` を
インストール直後に無効化し、再有効化できないためです。
詳しくは [docs/RELEASE.md](docs/RELEASE.md#なぜ-zip-なのか) を参照してください。

ソースを編集したあとは、拡張機能カードの再読み込みボタンを押し、
**さらに Google フォームのタブも再読み込み**してください（content script は自動で入れ替わりません）。

## 文字数の数え方

**コードポイント数**で数えます。通常の日本語（かな・漢字・英数）では、
見た目の文字数と一致します。

ただし**絵文字は絵柄 1 つを無条件で 1 文字**として数えます。中身が何コードポイントで
できていても関係ありません（👨‍👩‍👧‍👦 も 👍🏽 も ❤️ も 1️⃣ も 🇯🇵 も、それぞれ 1 文字）。

設定で切り替えられます（初期値はどちらも「数えない」）。

| 設定 | 対象 |
| --- | --- |
| 空白を数える | 半角スペース、**全角スペース**、タブ、NBSP、各種の組版スペース |
| 改行を数える | 改行（1 つにつき 1 文字） |

### 既知のトレードオフ

- **絵文字以外の合成は見た目より多く数えます。** 「か」＋結合濁点は 2 と数えます
  （絵文字だけを 1 文字にまとめる方針のため。日本語の通常の入力では結合文字は
  ほぼ現れません）。
- **Google フォーム自身の「回答の検証 → 最大文字数」とは一致しない場合があります。**
  一致させることは目的にしていません。
- 日本語入力の**変換中（未確定）の文字も数えます。** 画面に見えているためです。

## プライバシー

- 入力内容は読み取って**その場で文字数（整数）に変換し、破棄**します。
- 保存するのは設定の真偽値 2 つだけです（`chrome.storage.sync`）。
- ネットワーク通信を行うコードはありません。バックグラウンドの
  service worker も持ちません。
- 権限は `storage` のみ。`host_permissions` は使いません。

## 開発

依存パッケージはありません。

```sh
node tests/run.js                # ユニットテスト（Node）
node tools/check-manifest.js     # manifest の参照先・翻訳の欠落を検出
node tools/make-icons.js         # アイコン PNG を再生成
node tools/make-popup-preview.js # 設定画面のプレビューを生成
node tools/bump-version.js 0.2.0 # manifest の version を上げる
```

リリース手順は [docs/RELEASE.md](docs/RELEASE.md) を参照してください。

ブラウザで実行する場合は `tests/unit.html` を開いてください。
`tests/fixtures/form.html` は content script をそのまま読み込む動作確認用の
ページで、Google フォームの**構造**（ARIA）だけを再現しています。

設定画面は `chrome://extensions` 経由でないと `chrome.storage` が無く動かず、
`(pointer: coarse)` も PC では再現できません。`make-popup-preview.js` は
CSS を inline 展開した PC 版・スマホ版を出力するので、見た目だけは
ブラウザで確認できます。

### 構成

```
manifest.json
src/common/   defaults.js（設定）  counter.js（文字数カウント・純粋関数）
src/content/  content script 一式
src/popup/    設定画面
tests/        cases.js（テストケース）  run.js（Node）  unit.html（ブラウザ）
tools/        make-icons.js
```

content script は `"type": "module"` に対応しないため、`import` は使わず、
`manifest.json` の `js` 配列に依存順で並べ、分離ワールドの `globalThis.FC`
名前空間を共有しています。

## ライセンス

MIT License
