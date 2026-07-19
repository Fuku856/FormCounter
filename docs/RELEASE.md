# リリース手順

配布物は **zip** です。展開したフォルダを
「パッケージ化されていない拡張機能を読み込む」で指定して使います。

`.crx` を配らない理由は [なぜ zip なのか](#なぜ-zip-なのか) を参照してください。

## 手順

### 1. バージョンを上げる

```sh
node tests/run.js
node tools/check-manifest.js
node tools/bump-version.js 0.2.0
git commit -am "v0.2.0"
git push
```

### 2. Actions からリリースを実行する

[Actions → Release](https://github.com/Fuku856/FormCounter/actions/workflows/release.yml)
→ **Run workflow**

| | 選ぶもの |
| --- | --- |
| 新しくリリースする | Use workflow from: `main` / tag: `v0.2.0`（ワークフローが作成します） |
| 既存タグでやり直す | Use workflow from: そのタグ / tag: 同じ名前（zip を差し替えます） |

タグを手で打つ必要はありません。入力したタグが無ければ、実行対象のコミットに
注釈付きタグを作成して push します。

### 3. 確認

- [ ] Release に `formcounter-0.2.0.zip` が添付されている
- [ ] 展開したフォルダを読み込んで、Google フォームで動く
      （[docs/VERIFICATION.md](VERIFICATION.md)）

## 端末への導入・更新

zip を展開したフォルダを `chrome://extensions` の
「パッケージ化されていない拡張機能を読み込む」で指定します。
一度読み込めば Chrome を再起動しても残ります。

更新するときは、**同じフォルダの中身を新しい zip の中身で置き換えてから**
拡張機能カードの再読み込みボタンを押してください。フォルダのパスが変わると
別の拡張として扱われ、設定が引き継がれません。

## つまずきやすいところ

- **タグと `manifest.json` の version がズレるとワークフローが失敗します。**
  `bump-version.js` を通していれば起きません。
- **タグを先に push してからバージョンを上げると噛み合いません。**
  順序は「version を上げて push」→「Actions を実行」です。

## なぜ zip なのか

Chrome は Web Store 外の `.crx` を、インストール自体は受け付けるものの
直後に無効化し、標準プロファイルでは再有効化できません
（「この拡張機能は Chrome Web Store で提供されていません」の警告とともに
トグルが灰色になります）。ポリシーによる強制インストールは
Active Directory / Azure AD 参加または Chrome Enterprise Core 登録が条件で、
個人の Windows Home では使えません。

そのため自動更新は諦め、zip + 手動リロードにしています。
自動更新が必要になったら、Chrome ウェブストアへの**限定公開**が現実的な選択肢です
（初回登録料 $5、検索には出ずリンクを知る人だけがインストールできる）。
