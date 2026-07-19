// テストケースの定義。ブラウザ（unit.html）と Node（run.js）の両方から使う。
//
// 不可視文字・追加面の文字は、ソース中に生の文字を置くと編集事故のもとなので、
// すべて String.fromCodePoint で明示的に組み立てる。
var FC_CASES = (function () {
  const FC = globalThis.FC;

  const IDEOGRAPHIC_SPACE = String.fromCodePoint(0x3000); // 全角スペース
  const NBSP = String.fromCodePoint(0x00a0);
  const THIN_SPACE = String.fromCodePoint(0x2009);
  const ZWSP = String.fromCodePoint(0x200b); // ゼロ幅スペース（\s に非含有）
  const ZWJ = String.fromCodePoint(0x200d);
  const TSUCHIYOSHI = String.fromCodePoint(0x20bb7); // 𠮷（追加面 = UTF-16 で2単位）
  const THUMBS_UP = String.fromCodePoint(0x1f44d);
  const SKIN_TONE = String.fromCodePoint(0x1f3fd);
  const FAMILY = [0x1f468, 0x1f469, 0x1f467, 0x1f466]
    .map((cp) => String.fromCodePoint(cp))
    .join(ZWJ); // 👨‍👩‍👧‍👦
  const VS16 = String.fromCodePoint(0xfe0f); // 異体字セレクタ（絵文字表示）
  const HEART = String.fromCodePoint(0x2764) + VS16; // ❤️
  const KEYCAP_ONE = '1' + VS16 + String.fromCodePoint(0x20e3); // 1️⃣
  const RI_J = String.fromCodePoint(0x1f1ef); // 地域表示記号 J（単体では国旗にならない）
  const RI_P = String.fromCodePoint(0x1f1f5); // 地域表示記号 P
  const FLAG_JP = RI_J + RI_P; // 🇯🇵
  const DAKUTEN = String.fromCodePoint(0x3099); // 結合濁点（絵文字ではない合成）

  const OFF = { countSpaces: false, countNewlines: false }; // 既定値
  const SPACES_ON = { countSpaces: true, countNewlines: false };
  const NEWLINES_ON = { countSpaces: false, countNewlines: true };
  const BOTH_ON = { countSpaces: true, countNewlines: true };

  const cases = [];

  // countCharacters のテスト
  const t = (name, text, settings, expected) =>
    cases.push({
      name,
      expected,
      run: () => FC.countCharacters(text, settings),
    });

  // 任意の式のテスト（前提の確認用）
  const raw = (name, run, expected) => cases.push({ name, expected, run });

  // --- 基本 ---
  t('空文字は 0', '', OFF, 0);
  t('null は 0', null, OFF, 0);
  t('undefined は 0', undefined, OFF, 0);
  t('日本語 5 文字', 'こんにちは', OFF, 5);
  t('ASCII 5 文字', 'hello', OFF, 5);
  t('漢字かなカナ混在', '今日はイイ天気', OFF, 7);

  // --- 半角スペース ---
  t('半角スペースを数えない（既定）', 'あ い', OFF, 2);
  t('半角スペースを数える', 'あ い', SPACES_ON, 3);
  t('連続する半角スペース', 'a   b', OFF, 2);

  // --- 全角スペース（日本語で最重要） ---
  t('全角スペースを数えない（既定）', 'あ' + IDEOGRAPHIC_SPACE + 'い', OFF, 2);
  t('全角スペースを数える', 'あ' + IDEOGRAPHIC_SPACE + 'い', SPACES_ON, 3);
  t('全角と半角の混在を数えない', 'あ ' + IDEOGRAPHIC_SPACE + ' い', OFF, 2);
  t('全角と半角の混在を数える', 'あ ' + IDEOGRAPHIC_SPACE + ' い', SPACES_ON, 5);

  // --- その他の空白文字 ---
  t('タブを数えない（既定）', 'あ\tい', OFF, 2);
  t('タブを数える', 'あ\tい', SPACES_ON, 3);
  t('NBSP を数えない（既定）', 'あ' + NBSP + 'い', OFF, 2);
  t('NBSP を数える', 'あ' + NBSP + 'い', SPACES_ON, 3);
  t('組版スペースを数えない（既定）', 'あ' + THIN_SPACE + 'い', OFF, 2);
  t('ゼロ幅スペースは空白として扱わない', 'あ' + ZWSP + 'い', OFF, 3);

  // --- 改行 ---
  t('改行を数えない（既定）', 'あ\nい', OFF, 2);
  t('改行を数える', 'あ\nい', NEWLINES_ON, 3);
  t('連続する改行を数えない', 'a\n\n\nb', OFF, 2);
  t('連続する改行を数える', 'a\n\n\nb', NEWLINES_ON, 5);
  // textarea の .value は仕様上 LF 正規化されるので \r\n は実際には現れないが、
  // 貼り付け経路の防御として \r も改行クラスに含めている。
  t('CRLF を数えない（既定）', 'あ\r\nい', OFF, 2);

  // --- 空白と改行は互いに素（除去順序が結果に影響しない） ---
  const MIXED = ' あ ' + IDEOGRAPHIC_SPACE + '\n い\t\n';
  t('混在: 両方数えない（既定）', MIXED, OFF, 2);
  t('混在: 空白だけ数える', MIXED, SPACES_ON, 7);
  t('混在: 改行だけ数える', MIXED, NEWLINES_ON, 4);
  t('混在: 両方数える', MIXED, BOTH_ON, 9);

  // --- コードポイント数（UTF-16 の length との差） ---
  // UTF-16 の .length は 2 を返すが、コードポイント数なので 1 になる
  raw('前提: 𠮷 の .length は 2', () => TSUCHIYOSHI.length, 2);
  t('追加面の漢字 𠮷 は 1 文字', TSUCHIYOSHI, OFF, 1);
  t('𠮷 を含む文は 3 文字', TSUCHIYOSHI + '野家', OFF, 3);

  // --- 絵文字は絵柄 1 つで 1 文字（何コードポイントでできていても） ---
  t('絵文字 1 つは 1 文字', THUMBS_UP, OFF, 1);
  t('肌色修飾つき絵文字は 1 文字', THUMBS_UP + SKIN_TONE, OFF, 1);
  t('ZWJ 合成絵文字（家族）は 1 文字', FAMILY, OFF, 1);
  t('異体字セレクタつき絵文字 ❤️ は 1 文字', HEART, OFF, 1);
  t('keycap 1️⃣ は 1 文字', KEYCAP_ONE, OFF, 1);
  t('国旗 🇯🇵 は 1 文字', FLAG_JP, OFF, 1);
  t('絵文字と日本語の混在', 'やった' + THUMBS_UP, OFF, 4);
  t('合成絵文字を並べる', FAMILY + HEART + KEYCAP_ONE, OFF, 3);
  t('絵文字と空白の混在（空白を数えない）', FAMILY + ' ' + HEART, OFF, 2);
  t('絵文字と空白の混在（空白を数える）', FAMILY + ' ' + HEART, SPACES_ON, 3);
  t('絵文字と改行の混在（改行を数える）', FAMILY + '\n' + HEART, NEWLINES_ON, 3);

  // --- 絵文字以外の合成は据え置き（コードポイント数のまま） ---
  t('結合濁点は合成せず 2 文字', 'か' + DAKUTEN, OFF, 2);

  // --- 空白の除去がクラスタを新しく作らないこと ---
  // 「除去してから分割」だと、空白で隔てられていた地域表示記号 2 つが
  // 隣接して国旗 1 つに化ける。分割してから分類することで防いでいる。
  t('空白を挟んだ地域表示記号は結合しない', RI_J + ' ' + RI_P, OFF, 2);
  t('空白を挟んだ地域表示記号（空白を数える）', RI_J + ' ' + RI_P, SPACES_ON, 3);
  t('改行を挟んだ地域表示記号は結合しない', RI_J + '\n' + RI_P, OFF, 2);
  t('隣接した地域表示記号は国旗 1 つ', FLAG_JP, OFF, 1);

  // --- 改行 1 つにつき 1 文字（README の表記どおり） ---
  // CRLF は書記素クラスタ 1 つなので、改行 1 つとして数える。
  t('CRLF を数えると 1 つの改行', 'あ\r\nい', NEWLINES_ON, 3);
  t('CRLF 連続を数える', 'a\r\n\r\nb', NEWLINES_ON, 4);

  // --- 設定オブジェクトが不正でも既定（数えない）に倒れる ---
  t('settings 省略時は数えない', 'あ い', undefined, 2);
  t('settings が空でも数えない', 'あ い', {}, 2);

  return cases;
})();

if (typeof module !== 'undefined' && module.exports) module.exports = FC_CASES;
