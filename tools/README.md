# tools：曲を足すための道具

ページ本体には要らないファイルです（GitHub Pages では読み込まれません）。Python 3 で動きます。

```
pip install lilypond mido      # LilyPond 2.25 と MIDI 読み書き
```

| ファイル | 役目 |
| --- | --- |
| `ly2midi.py` | Mutopia の `.ly` をコピーして `convert-ly` で書式を新しくし、`\score` を `\unfoldRepeats` で包んで MIDI にする |
| `mid2notes.py` | MIDI → `[(秒, 長さ, 音高, トラック, 強さ)]` |
| `encode.py` | 役割（1=旋律, 2=低音, 0=伴奏, 3=打楽器）を決めて、ページの音符データ（base64）にする |
| `notes.py` | ページの音符データを読み戻す（確認用） |
| `verify.py` | 入っている曲を Mutopia の楽譜から作り直して、音が楽譜どおりか比べる |
| `analyze_mood.py` | 全曲の気分を分析して `moods.js` を書き出す。**曲を足したら必ず実行** |
| `build_pd_batch.py` | Public Domain の楽譜をまとめて変換する例（日本の俗謡・スーザなど） |
| `build_brandenburg.py` | ブランデンブルク協奏曲の変換（テンポの補正つき） |
| `arrange_one_ongen.py` | 持ち込みの MIDI（one ongen）をトラックごとに役割分けした例 |
| `build_cc.py` | 最初の CC 曲8曲を作ったときのもの。**そのまま実行すると `music-cc.js` を上書きして、あとから足した曲（ブランデンブルク第1番）と CC BY 3.0 の定義が消える**ので、使うときは追記する形に直すこと |

Mutopia の楽譜は GitHub の `MutopiaProject/MutopiaProject` を sparse checkout して使います（環境変数 `MUTOPIA` に置き場所を入れる）。

```
git clone --depth 1 --filter=blob:none --sparse https://github.com/MutopiaProject/MutopiaProject work/mutopia
git -C work/mutopia sparse-checkout set --no-cone 'ftp/JoplinS/**'
```

楽譜のライセンスは `.ly` の `license` / `copyright` 欄で確かめる。Public Domain → `music.js`、CC → `music-cc.js`（`lic`・`by`・`src` を付ける）。
