# リリース手順

`v*` タグを push すると [Release ワークフロー](../.github/workflows/release.yml) が
`.crx` に署名して Release に添付し、Chrome の自動更新用 `update.xml` を
GitHub Pages へ配信します。

## 最初に一度だけ必要な準備

### 1. 署名鍵をつくる（作成済み）

> この鍵は既に `~/Documents/keys/formcounter.pem` に作成され、
> `manifest.json` の `key` も設定済みです。拡張 ID は
> `jmeanflomhfbflmmgkjekaggnepilapl`。
> 以下は鍵を作り直す必要が生じたときの手順です。


拡張 ID は署名鍵の公開鍵から決まります。**同じ鍵を使い続けないと ID が変わり、
別の拡張として扱われて `chrome.storage` の設定が失われます。**

```sh
openssl genrsa 2048 > formcounter.pem   # リポジトリの外に置くこと
node tools/crx-id.js formcounter.pem
```

- 出力された `key` の値を `manifest.json` の `key` に入れる
  （これが無いと `check-manifest.js` が通りません）
- `formcounter.pem` はパスワードマネージャ等にバックアップする。
  **紛失すると同じ拡張 ID を維持できません**

### 2. GitHub 側の設定

- Secrets に `CRX_PRIVATE_KEY` を追加し、`formcounter.pem` の中身を貼る
- Settings → Pages → Source を **GitHub Actions** にする
- リポジトリが public であること。Chrome は `update.xml` と `.crx` を
  **未認証で**取りに行くため、private では自動更新が成立しません

## 毎回のリリース

```sh
node tests/run.js
node tools/check-manifest.js
node tools/bump-version.js 0.2.0
git commit -am "v0.2.0"
git tag v0.2.0
git push --follow-tags
```

そのあと確認するもの:

- [ ] Actions の Release ワークフローが成功している
- [ ] Release に `formcounter-0.2.0.crx` が添付されている
- [ ] <https://fuku856.github.io/FormCounter/update.xml> の `version` が新しい値になっている
- [ ] `chrome://extensions` の「更新」ボタンで、手元の拡張がそのバージョンに上がる

## つまずきやすいところ

- **タグと `manifest.json` の version がズレるとワークフローが失敗します。**
  `bump-version.js` を通していれば起きません。
- **バージョンを上げ忘れると更新が配られません。** Chrome はバージョンが
  増えたときだけ更新します。ワークフローは成功するので気づきにくい失敗です。
- **`update.xml` は Release より後に配信されます。** 逆順だと Chrome が
  まだ存在しない `.crx` を取りに行くことがあるためです。
