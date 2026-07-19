# FormCounter

Google フォームの自由記述欄に、リアルタイムの文字数を表示する Chrome 拡張機能。

フォーカスしている入力欄だけに、数字だけを半透明の背景つきで表示します。
入力した内容は保存も収集も外部送信もしません。

> 開発中です。要件は [PLAN.md](PLAN.md)、動作確認の手順は
> [docs/VERIFICATION.md](docs/VERIFICATION.md) を参照してください。

## 対応環境

- パソコン版 Google Chrome / Chromium 系ブラウザ
- 拡張機能に対応した Android 向け Chromium 系ブラウザ（Cromite など）

Chrome 111 以上が必要です。Firefox には対応していません。

## 開発版の導入

ビルドは不要です。

1. `chrome://extensions` を開く
2. 右上の「デベロッパー モード」をオンにする
3. 「パッケージ化されていない拡張機能を読み込む」でこのフォルダを選ぶ

ソースを編集したあとは、拡張機能カードの再読み込みボタンを押し、
**さらに Google フォームのタブも再読み込み**してください（content script は自動で入れ替わりません）。

## 文字数の数え方

**コードポイント数**で数えます。通常の日本語（かな・漢字・英数）では、
見た目の文字数と一致します。

設定で切り替えられます（初期値はどちらも「数えない」）。

| 設定 | 対象 |
| --- | --- |
| 空白を数える | 半角スペース、**全角スペース**、タブ、NBSP、各種の組版スペース |
| 改行を数える | 改行（1 つにつき 1 文字） |

### 既知のトレードオフ

- **合成絵文字は見た目より多く数えます。** 👨‍👩‍👧‍👦 は 7、👍🏽 は 2 と数えます
  （見た目どおり 1 と数えるには書記素クラスタ単位の判定が必要ですが、
  日本語の文章では結果が変わらないため採用していません）。
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
```

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

未定（現時点では非公開リポジトリ）。公開する場合に決めます。
