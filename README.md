# とおくの窓

ドット絵の景色を眺めながら、著作権の切れた曲をずっと流し続けるWebページです。
[終末ニュース](https://github.com/kakkun15/shuumatsu-news) の派生で、こちらは怖がらせる側ではなく、落ち着く側の窓です。

- 曲は 103 曲（約262分）。うち8曲は、楽譜を入力した人の表示が必要な曲（Creative Commons）です。録音は使わず、楽譜の音符からブラウザの中で音を作ります
- 音色は「やさしい」「オルゴール」「ファミコン」から選べます（おまかせなら曲ごとに変わります）
- 景色は12か所。時間帯（時計に合わせる／朝・昼・夕方・夜）と天気（晴れ・くもり・雨・雪・霧）で見た目が変わります
- 景色ごとに焚き火・川・風・波などの環境音が鳴ります
- ファイルを置くだけで動きます。サーバーもアカウントも要りません
- 「みんなの窓」で、アバターを景色に置いたり、友だちと同じ景色に集まってチャットしたりできます（使うときだけ外につながります）

## 景色

| 景色 | 中身 |
| --- | --- |
| 森の焚き火 | テントと焚き火。火の粉と煙、夜はフクロウの目が光る |
| せせらぎ | 滝から流れる川。魚が跳ね、昼はトンボ、夜は蛍 |
| 誰もいない街角 | ヨーロッパの古い通り。夜は窓と街灯がともり、猫が通る |
| 雪だるまの丘 | ゆきころバトルの別の日。子どもたちが雪玉を転がして雪だるまを作り続ける（夜は雪だるまだけ） |
| 誰も来ない山頂 | 雲海の上の岩の頂。ケルンとはためく布、タカ |
| 空に浮かぶ街 | 浮島の街と滝、輪のある星、飛行船。晴れた夜はオーロラ |
| どこかの住宅街 | 日本の住宅街。電柱と電線、自販機、塀の上の猫、ときどき電車と踏切 |
| ルート沿いの小さな町 | アメリカの田舎道。ダイナーとモーテルのネオン、車と回転草 |
| 砂の海 | 砂丘とオアシス、遠くを行く隊商。夜は天の川 |
| 風の草原 | 風車と一本の木、羊、雲の影、揺れる草 |
| 緑に還った街 | 人がいなくなって緑に覆われた街。シカ、チョウ、光の筋 |
| 海辺の灯台 | 崖の灯台と砂浜。夜は灯台の光が回る |

## 使い方

`index.html` を開いて「はじめる」を押すだけです。はじめて開いたときは音を小さめにしてあり、「試しに鳴らす」で大きさを確かめてから始められます。画面をタップすると操作の帯が出ます。

- ⏮ ▶ ⏭：前の曲・再生／一時停止・次の曲
- 🖼：次の景色へ
- 👥：みんなの窓（アバター・部屋・チャット）
- ⚙：設定（音色、再生のしかた、時間帯、天気、流す曲の選択など）。設定の外側（左の空いているところ）を押すと閉じます
- キーボード：スペースで再生／一時停止、→ か n で次の曲、s で次の景色

スマホではブラウザの「ホーム画面に追加」から開くと全画面になります。

### 再生のしかた

| 方式 | しくみ | 向いている使い方 |
| --- | --- | --- |
| ふつう | ブラウザの音声機能（Web Audio）で直接鳴らす | 画面をつけて眺めるとき |
| バックグラウンド | 曲をいったん音声ファイル（WAV）にしてから `<audio>` で流す。ロック画面の操作にも対応 | 移動中など、画面を消して聴くとき |

バックグラウンドは、iPhone のように画面を消すと Web Audio が止まりやすい端末向けです。ただし **iPhone・iPad の実機ではまだ確かめていません**。曲の切り替わりで止まる場合は教えてください。

### 自分の端末だけに保存されるもの

設定はブラウザの localStorage に保存されます。外には送りません。

## みんなの窓（アバターと部屋）

👥 を押すと開きます。

- **アバター**：作りたい人だけ。体格（ちいさい・ふつう・おおきい）・向き（右・左）・髪型・髪の色・肌・服と「すること」（PC作業・ゲーム・読書・絵を描く・お茶・ひと休み・スマホ・手をふる・散歩・ぼーっと立つ）を選べます。自分のアバターは指（マウス）でつかんで動かせます。「置く場所を選ぶ」でタップした場所へ歩いていかせることもできます。向きを変えれば、向かい合って作業できます。ひとりのときも置けます。設定はこの端末だけに保存されます。
- **部屋**：「部屋を作る」と4文字の番号ができます。友だちが「番号で入る」と、同じ景色（ホストの景色・時間帯・天気）の中にアバターが並び、画面左下のチャット欄で話せます（「ー」でたためます）。ほかの人のアバターは、動かした先へ歩いていきます。8人まで。曲はそれぞれの端末で流れます。

### つながり方（かんたん）

部屋を作ると、4文字の番号（合言葉）ができます。友だちがその番号を入れると、おたがいのブラウザが**直接**つながります。直接つながるまでの「待ち合わせ」だけ、無料の案内所（PeerJS のサーバー）を使います。つながったあとは、アバターの場所や話したことは、案内所を通らずに相手へ届きます。回線によって直接つながれないときは、PeerJS の中継所を通ります（そのときも中身は暗号化されています）。

話したことはどこにも保存されません。部屋を出ると消えます。

**気をつけること**：直接つながるしくみなので、同じ部屋の人どうしには、おたがいの IP アドレス（ネット上の住所のようなもの）が伝わります。番号は知っている人とだけ共有してください。部屋を作った人（ホスト）が画面を閉じたり部屋を出たりすると、部屋はなくなります。

### つながり方（くわしく）

- **通信**：WebRTC のデータチャネル。中身は DTLS で暗号化されます。ライブラリは [PeerJS](https://peerjs.com/) 1.5.5（MIT ライセンス、unpkg から読み込み）。部屋の機能を使うまでは読み込みません。
- **シグナリング**：接続情報（SDP と ICE 候補）の交換に PeerJS の公開サーバー `0.peerjs.com` を使います。ホストは部屋の番号から決まる ID（`tooku-no-mado-XXXX`）で登録し、ゲストはその ID へ接続を申し込みます。
- **NAT 越え**：PeerJS の既定の設定どおり、STUN（`stun.l.google.com`）で直接の経路を探し、だめなときは PeerJS の TURN サーバー（`eu-0` / `us-0.turn.peerjs.com`）で中継します。
- **形**：スター型。ホストが全員とつながり、届いたものをほかの人へ配ります。最大8人。ホストが抜けると部屋は終わります。
- **送るもの**：アバターの見た目と位置（画面に対する割合 0〜1）、チャット（80文字まで）、ホストの景色・天気・時刻・乱数の種（同じ景色を描くため）。曲や音は送りません。
- **受け取ったものの扱い**：ホストは送り主を実際の接続相手で見分け、値の種類と長さを確かめてから配ります。送る回数にも上限があります。画面には文字としてだけ表示します（HTML として解釈しません）。
- **IP アドレス**：ICE 候補にはグローバル IP アドレスが含まれるため、同じ部屋の人には見えます。チャットの記録は各端末のメモリの中だけで、保存も送信もしません。

## ファイル

| ファイル | 中身 |
| --- | --- |
| `index.html` | 画面と操作 |
| `music.js` | 曲の音符データ（開始・長さ・音の高さ・役割と強さ）。Public Domain の曲だけ |
| `music-mine.js` | 持ち込みの曲（作者から受け取った MIDI をアレンジしたもの） |
| `music-cc.js` | 表示が必要な曲（Creative Commons）の音符データ。元の楽譜のライセンスを引き継ぐ |
| `synth.js` | 音の合成。Web Worker の中で動く |
| `player.js` | 再生（ふつう／バックグラウンド）、選曲、環境音 |
| `engine.js` | 空・時間帯・天気・光などの描画の土台 |
| `art.js` | 木・岩・鳥・蛍などの部品と、景色の登録 |
| `scenes-a.js` `scenes-b.js` `scenes-c.js` | 12の景色 |
| `stage.js` | 画面の大きさ合わせ、景色の切り替え、部屋で景色を合わせる |
| `avatar.js` | アバターの絵と、景色の上に置く処理 |
| `room.js` | みんなの窓の通信（PeerJS） |
| `prefs.js` | 設定の保存 |

確認用に、URL の後ろに `?scene=river&hour=18&weather=rain` のように付けると、景色・時刻・天気を固定して開けます。

## 曲と権利について

- 録音は一切含みません。`music.js` と `music-cc.js` に入っているのは音符の並びだけで、音はブラウザの中で合成しています。
- 曲そのものは、すべて作曲者の没後80年以上が過ぎた作品か、作者不詳の古い民謡です。
- 曲の著作権が切れていても、楽譜の入力データには入力した人の権利が残ることがあります。そのため、`music.js` の曲は [Mutopia Project](https://www.mutopiaproject.org/) のうち、入力者が **Public Domain と明記した楽譜**だけを使いました。Creative Commons の楽譜から作った曲は `music-cc.js` に分けています（下の「表示が必要な曲」）。Mutopia の説明では、Public Domain の楽譜は印刷・変更・配布・演奏を制限なく行えます（<https://www.mutopiaproject.org/legal.html>）。
- 楽譜（LilyPond 形式）を LilyPond 2.25 で MIDI に変換し、繰り返しを展開してから音符データにしました。古い書式で変換できなかった部分は、音に関係しない見た目の指定（強弱の文字、ページの飾りなど）だけを外しています。
- 楽譜を入力・公開してくださった方々に感謝します。

### 終末ニュースから持ってきた曲

出どころは [終末ニュースの README](https://github.com/kakkun15/shuumatsu-news#曲と権利について) と同じです。

| 曲 | 作曲者 | 長さ | 音符データの出どころ |
| --- | --- | --- | --- |
| 主よ、人の望みの喜びよ | バッハ | 3:14 | このページ用に作った5声の縮約（下記） |
| G線上のアリア | バッハ | 2:07 | Mutopia Project `BachJS/BWV1068/bach_air_bmv_1068`（入力：Mike Blackstock） |
| トッカータとフーガ ニ短調 | バッハ | 9:32 | Mutopia Project `BachJS/BWV565/ToccataFugue`（入力：Anonymous） |
| 平均律 第1巻 前奏曲 ハ長調 | バッハ | 2:20 | Mutopia Project `BachJS/BWV846/wtk1-prelude1`（入力：Tobias Erbsland） |
| 無伴奏チェロ組曲 第1番 前奏曲 | バッハ | 2:09 | Mutopia Project `BachJS/BWV1007/bwv1007`（入力：Andreas Scherer） |
| インベンション 第13番 | バッハ | 1:07 | Mutopia Project `BachJS/BWV784/bach-invention-13`（入力：Allen Garvin） |
| メヌエット ト長調 | ペツォールト（伝バッハ） | 0:46 | Mutopia Project `BachJS/BWVAnh114/anna-magdalena-04`（入力：Allen Garvin） |
| 羊は安らかに草を食み | バッハ | 3:08 | Mutopia Project `BachJS/BWV208/Sheep`（入力：Jeremy Visser） |
| 平均律 第1巻 前奏曲 ハ短調 | バッハ | 1:19 | Mutopia Project `BachJS/BWV847/bwv847a`（入力：Davide Castellone） |
| エリーゼのために | ベートーヴェン | 2:10 | Mutopia Project `BeethovenLv/WoO59/fur_Elise_WoO59`（入力：Stelios Samelis） |
| 悲愴ソナタ 第2楽章 | ベートーヴェン | 4:03 | Mutopia Project `BeethovenLv/O13/pathetique-2`（入力：Chris Sawer） |
| 歓喜の歌 | ベートーヴェン | 0:48 | Mutopia Project `BeethovenLv/ode`（入力：Peter Chubb） |
| トルコ行進曲 | モーツァルト | 4:14 | Mutopia Project `MozartWA/KV331/KV331_3_RondoAllaTurca`（入力：Rune Zedeler and Chris Sawer） |
| アイネ・クライネ・ナハトムジーク 第1楽章 | モーツァルト | 5:20 | Mutopia Project `MozartWA/KV525/eine-kleine-nachtmusik-mvt1`（入力：Anonymous） |
| 雨だれの前奏曲 | ショパン | 4:57 | Mutopia Project `ChopinFF/O28/Chop-28-15`（入力：Magnus Lewis-Smith） |
| 前奏曲 第4番 ホ短調 | ショパン | 1:48 | Mutopia Project `ChopinFF/O28/Chop-28-4`（入力：Magnus Lewis-Smith） |
| 前奏曲 第7番 イ長調 | ショパン | 0:40 | Mutopia Project `ChopinFF/O28/Chop-28-7`（入力：Magnus Lewis-Smith） |
| 子犬のワルツ | ショパン | 1:30 | Mutopia Project `ChopinFF/O64/chopin_valse_op64_no1`（入力：Magnus Lewis-Smith） |
| 幻想即興曲 | ショパン | 4:14 | Mutopia Project `ChopinFF/O66/chopin_fantaisie-impromptu`（入力：Guy D. Lederfein） |
| 革命のエチュード | ショパン | 2:05 | Mutopia Project `ChopinFF/O10/op-10-12-wfi`（入力：Roland Goretzki） |
| トロイメライ | シューマン | 2:18 | Mutopia Project `SchumannR/O15/SchumannOp15No07`（入力：Ying-Chun Liu） |
| 見知らぬ国と人々について | シューマン | 0:46 | Mutopia Project `SchumannR/O15/SchumannOp15No01`（入力：Ying-Chun Liu） |
| アヴェ・マリア | シューベルト | 7:10 | Mutopia Project `SchubertF/D839/SchubertF-D839_AveMaria`（入力：Ph. Raynaud） |
| 楽興の時 第3番 | シューベルト | 1:57 | Mutopia Project `SchubertF/D780/MomentsNo3`（入力：Claude Chaudron） |
| 即興曲 作品90-3 | シューベルト | 5:50 | Mutopia Project `SchubertF/D899/SchubertF-D899-3-Impromptu`（入力：Ph. Raynaud） |
| シューベルトの子守歌 | シューベルト | 0:47 | Mutopia Project `SchubertF/D498/schubert_wiegen_lied`（入力：Shogo Mori） |
| ます | シューベルト | 2:10 | Mutopia Project `SchubertF/D550/forelle`（入力：Maurizio Tomasi） |
| ジムノペディ 第1番 | サティ | 2:46 | Mutopia Project `SatieE/gymnopedie_1`（入力：Evin Robertson） |
| ジムノペディ 第3番 | サティ | 3:00 | Mutopia Project `SatieE/gymnopedie_3`（入力：Evin Robertson） |
| 月の光 | ドビュッシー | 5:22 | Mutopia Project `DebussyC/L75/debussy_Ste_Bergamesq_Clair`（入力：Keith OHara） |
| アラベスク 第1番 | ドビュッシー | 3:16 | Mutopia Project `DebussyC/L66/debussy_Arabesque_1`（入力：Keith OHara） |
| 山の魔王の宮殿にて | グリーグ | 2:25 | Mutopia Project `GriegE/O46/Dans_l_antre_du_roi_de_la_montagne`（入力：Coyau） |
| オーセの死 | グリーグ | 3:36 | Mutopia Project `GriegE/O46/02-lamortdase`（入力：Deborah Lowrey） |
| アニトラの踊り | グリーグ | 1:44 | Mutopia Project `GriegE/O46/03-anitrasdance`（入力：Deborah Lowrey） |
| トロルドハウゲンの婚礼の日 | グリーグ | 6:06 | Mutopia Project `GriegE/O65/troldhaugen`（入力：David Whipple） |
| 朝の祈り | チャイコフスキー | 1:10 | Mutopia Project `TchaikovskyPI/O39/01MorningPrayer`（入力：Rem Zolotykh） |
| 木の兵隊の行進 | チャイコフスキー | 0:40 | Mutopia Project `TchaikovskyPI/O39/05MarchOfTheWoodenSoldiers`（入力：Anonymous） |
| 古いフランスの歌 | チャイコフスキー | 0:55 | Mutopia Project `TchaikovskyPI/O39/16OldFrenchSong`（入力：David McNamara） |
| 四季より 1月「炉端にて」 | チャイコフスキー | 4:17 | Mutopia Project `TchaikovskyPI/O37/Tschaikowsky-op37.1`（入力：Till Rettig） |
| ブラームスの子守歌 | ブラームス | 0:53 | Mutopia Project `BrahmsJ/O49/Wiegenlied`（入力：森 章吾） |
| ワルツ 第15番 | ブラームス | 1:20 | Mutopia Project `BrahmsJ/O39/waltz-op39-15`（入力：Brian D. Rude） |
| ジ・エンターテイナー | ジョプリン | 4:13 | Mutopia Project `JoplinS/entertainer`（入力：Chris Sawer） |
| メープル・リーフ・ラグ | ジョプリン | 2:24 | Mutopia Project `JoplinS/maple`（入力：Chris Sawer） |
| 素直な心 | ブルグミュラー | 0:40 | Mutopia Project `BurgmullerJFF/O100/25EF-01`（入力：Bas Wassink） |
| アラベスク | ブルグミュラー | 0:29 | Mutopia Project `BurgmullerJFF/O100/25EF-02`（入力：Bas Wassink） |
| 無邪気 | ブルグミュラー | 0:30 | Mutopia Project `BurgmullerJFF/O100/25EF-05`（入力：Bas Wassink） |
| バラード | ブルグミュラー | 1:23 | Mutopia Project `BurgmullerJFF/O100/25EF-15`（入力：Bas Wassink） |
| ドリー組曲より 子守歌 | フォーレ | 2:45 | Mutopia Project `FaureG/O56/faure_dolly_berceuse`（入力：Mike Blackstock） |
| 木星の聖歌（サクステッド） | ホルスト | 0:54 | Mutopia Project `HolstGT/Thaxted`（入力：Peter Chubb） |
| アメイジング・グレイス | 賛美歌 | 0:56 | Mutopia Project `Anonymous/new_britain`（入力：Steve Dunlop） |
| グリーンスリーブス | イングランド民謡 | 0:48 | Mutopia Project `Traditional/GreensleevesAcc`（入力：Ralf Axel Gehlert） |
| ソナチネ 作品36-1 | クレメンティ | 3:10 | Mutopia Project `ClementiM/O36/sonatina-1`（入力：Brian D. Rude） |
| ハレルヤ | ヘンデル | 3:08 | Mutopia Project `HandelGF/hallelujah`（入力：Joshua Koo） |
| すべては終わりぬ（Hard Times） | フォスター | 1:20 | Mutopia Project `FosterSC/hardtimes`（入力：Stan Sanderson） |
| メヌエット 変ホ長調 | ベートーヴェン | 3:16 | Mutopia Project `BeethovenLv/WoO82/menuett_WoO82`（入力：Stelios Samelis） |
| パッヘルベルのカノン | パッヘルベル | 2:04 | このページ用に手で打ち込んだ3声版 |

（ほかに、終末ニュースの表にある残りの曲もそのまま入っています。詳しくは上のリンク先を見てください。）

### ゆきころバトルから持ってきた曲

出どころは [ゆきころバトルの README](https://github.com/kakkun15/yukikoro-battle) と同じです（原曲の旋律を新しく打ち込んだもの・権利の切れた楽譜から写したもの・ゲームのためのオリジナル曲）。

| 曲 | 作曲者 | 長さ |
| --- | --- | --- |
| 怒りの日（ヴェルディ） | ヴェルディ | 1:30 |
| ジングルベル | ピアポント | 1:27 |
| そりすべり（モーツァルト） | モーツァルト | 1:43 |
| 雪合戦マーチ | ゆきころバトル | 1:31 |
| ふぶきの坂道 | ゆきころバトル | 1:41 |
| 雪の宿 | ゆきころバトル | 1:23 |
| きよしこの夜 | グルーバー | 1:43 |

### 新しく足した曲

| 曲 | 作曲者 | 長さ | 音符データの出どころ |
| --- | --- | --- | --- |
| ジムノペディ 第2番 | サティ | 2:52 | Mutopia Project `SatieE/gymnopedie_2`（入力：Evin Robertson） |
| ワルツ 第10番 ロ短調 | ショパン | 2:52 | Mutopia Project `ChopinFF/O69/w10-h-moll-cfi`（入力：Roland Goretzki） |
| 前奏曲 第6番 ロ短調 | ショパン | 1:41 | Mutopia Project `ChopinFF/O28/Chop-28-6`（入力：Magnus Lewis-Smith） |
| 前奏曲 第20番 ハ短調 | ショパン | 1:14 | Mutopia Project `ChopinFF/O28/Chop-28-20`（入力：Magnus Lewis-Smith） |
| ヴェネツィアの舟歌 第2番 | メンデルスゾーン | 2:46 | Mutopia Project `Mendelssohn-BartholdyF/O30/LiederOhneWorte_-_Op30_No6`（入力：Ryan Prince） |
| ベシーナ | ジョプリン | 4:23 | Mutopia Project `JoplinS/bethena`（入力：Magnus Lewis-Smith） |
| ソレース | ジョプリン | 4:06 | Mutopia Project `JoplinS/solace`（入力：Magnus Lewis-Smith） |
| サンフラワー・スロー・ドラッグ | ジョプリン | 4:13 | Mutopia Project `JoplinS/sun-flower-slow-drag`（入力：Daniel Škarda） |
| 前奏曲 ハ短調 BWV999 | バッハ | 1:35 | Mutopia Project `BachJS/BWV999/Bach_Prelude_BWV999`（入力：Jakob Bagterp） |
| ピアノソナタ第11番 第1楽章 主題 | モーツァルト | 1:55 | Mutopia Project `MozartWA/KV331/KV331_1_1_tema`（入力：Stelios Samelis） |
| きらきら星変奏曲（ギター二重奏） | モーツァルト | 8:52 | Mutopia Project `MozartWA/KV265/guitar-duo-complete`（入力：Jeffrey Olson） |
| 野ばら | シューベルト | 1:29 | Mutopia Project `SchubertF/D257/SchubertF-D257-Heidenroeslein`（入力：Ph. Raynaud） |
| 音楽に寄す | シューベルト | 3:56 | Mutopia Project `SchubertF/D547/AnDieMusik`（入力：Ph. Raynaud） |
| 君こそは憩い | シューベルト | 4:55 | Mutopia Project `SchubertF/D776/SchubertF-D776_DuBistDieRuh`（入力：Ph. Raynaud） |
| 我が母の教えたまいし歌 | ドヴォルザーク | 1:40 | Mutopia Project `DvorakA/O55/dvorak-als-die-alte-mutter`（入力：Daniel Johnson） |
| 夢のあとに | フォーレ | 2:23 | Mutopia Project `FaureG/O7/apres`（入力：Tak-Shing Chan） |
| シシリエンヌ（ギター） | フォーレ | 1:00 | Mutopia Project `FaureG/O78/faure-sicilienne-guitare-doigtee`（入力：Federico Bruni） |
| 間奏曲 作品118-2 | ブラームス | 4:39 | Mutopia Project `BrahmsJ/O118/intermezzo`（入力：Aron Fay） |
| 牧歌 | ブルグミュラー | 1:05 | Mutopia Project `BurgmullerJFF/O100/25EF-03`（入力：Bas Wassink） |
| 清い流れ | ブルグミュラー | 0:33 | Mutopia Project `BurgmullerJFF/O100/25EF-07`（入力：Bas Wassink） |
| 優美 | ブルグミュラー | 0:43 | Mutopia Project `BurgmullerJFF/O100/25EF-08`（入力：Bas Wassink） |
| やさしい花 | ブルグミュラー | 1:15 | Mutopia Project `BurgmullerJFF/O100/25EF-10`（入力：Bas Wassink） |
| 別れ | ブルグミュラー | 0:53 | Mutopia Project `BurgmullerJFF/O100/25EF-12`（入力：Bas Wassink） |
| なぐさめ | ブルグミュラー | 1:05 | Mutopia Project `BurgmullerJFF/O100/25EF-13`（入力：Bas Wassink） |
| 甘い嘆き | ブルグミュラー | 1:00 | Mutopia Project `BurgmullerJFF/O100/25EF-16`（入力：Bas Wassink） |
| ラグリマ | タレガ | 1:35 | Mutopia Project `TarregaF/lagrima-duo`（入力：Jeffrey Olson） |
| 月光 第1楽章（タレガ編） | ベートーヴェン | 6:02 | Mutopia Project `TarregaF/claro-de-luna`（入力：Jeffrey Olson） |
| ロマンス 作品36 | サン＝サーンス | 4:39 | Mutopia Project `Saint-SaensC/O36/SaintSaensRomance`（入力：Jay Anderson） |
| 美しき島 | パーセル | 0:48 | Mutopia Project `PurcellH/FairestIsle`（入力：Sebastian Brosig） |
| 来たれ、ふたたび | ダウランド | 0:31 | Mutopia Project `DowlandJ/ALS17/ComeAgain`（入力：Peter Chubb） |
| 桜見よとて | 日本古謡 | 1:00 | Mutopia Project `Traditional/JPM037-Sakura-Miyotote`（入力：patrick stanistreet） |

「月光 第1楽章」はタレガがギター用に編曲した版です（タレガは1909年没）。

### 持ち込みの曲

| 曲 | 作者 | 長さ | 中身 |
| --- | --- | --- | --- |
| one ongen | kakkun15 | 2:17 | 作者から受け取った MIDI（8トラック・オーケストラ風）を、このページの音色で鳴るように組み直したもの。主旋律・低音の和音・刻みとアルペジオ・対旋律・打楽器に役割を分け、強弱を少しならしています |

### 怖めの曲をやわらかく

設定の「怖めの曲をやわらかく」（はじめからオン）にすると、怒りの日（ヴェルディ）・山の魔王の宮殿にて・トッカータとフーガ・革命のエチュード・前奏曲 第20番・オーセの死・ふぶきの坂道の7曲を、音の並びは変えずに、強弱の差を小さく、地鳴りのような低い音を1オクターブ上に、低音のオクターブ重ねを1つに、大きな太鼓とシンバルをやめ、少しゆっくり、オルゴールかやさしい音色で流します。

### 表示が必要な曲（Creative Commons）

この8曲は、Mutopia Project の楽譜のうち、入力者が Creative Commons のライセンスで公開しているものから作りました。使うには、入力者の名前とライセンスを表示する必要があります。

- 画面では、曲の一覧で曲名の横に「CC BY-SA 3.0」などの印が出ます。印を押すと、入力者・ライセンス・元の楽譜へのリンク・加えた変更が出ます。再生中は、曲名の下に小さく入力者とライセンスが出ます。
- 設定の「表示が必要な曲も流す」をオフにすると、この8曲は流れません（流している途中なら、すぐ次の曲に移ります）。録画や配信で表示を入れられないときに使ってください。
- 変更点：どの曲も、楽譜（LilyPond 形式）を LilyPond 2.25 で MIDI に変換し、繰り返しを展開して、音符の並び（開始・長さ・音の高さ・役割と強さ）にしました。「家路」は下の表のとおり抜粋です。
- BY-SA（継承）の曲は、変換したデータも同じライセンスで公開する条件があります。そのため `music-cc.js` の音符データは、各曲の元のライセンスのまま公開しています。ほかのファイル（再生のしくみ・景色・Public Domain の曲）には、これらのライセンスはかかりません。
- 録画した音を公開するときも、下の表の入力者とライセンスを書いてください。

| 曲 | 作曲者 | 長さ | 元の楽譜（入力者） | ライセンス | 変更 |
| --- | --- | --- | --- | --- | --- |
| 月光 第1楽章 | ベートーヴェン | 5:07 | Mutopia Project [`BeethovenLv/O27/moonlight`](https://www.mutopiaproject.org/ftp/BeethovenLv/O27/moonlight/)（Stewart Holmes） | [CC BY-SA 2.5](https://creativecommons.org/licenses/by-sa/2.5/) | MIDI化 |
| ノクターン 第2番 変ホ長調 | ショパン | 3:22 | Mutopia Project [`ChopinFF/O9/chopin_nocturne_op9_n2`](https://www.mutopiaproject.org/ftp/ChopinFF/O9/chopin_nocturne_op9_n2/)（Renato Biolcati Rinaldi） | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | MIDI化 |
| 美しく青きドナウ（主題） | J.シュトラウス2世 | 0:39 | Mutopia Project [`StraussJJ/O314/blue_danube`](https://www.mutopiaproject.org/ftp/StraussJJ/O314/blue_danube/)（Nikos Kouremenos） | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | MIDI化（元の楽譜が、主題だけをハ長調にした易しい版） |
| 家路（新世界より 第2楽章） | ドヴォルザーク | 3:25 | Mutopia Project [`DvorakA/O95/Sym9`](https://www.mutopiaproject.org/ftp/DvorakA/O95/Sym9/)（Keith OHara） | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | MIDI化。冒頭から最初の部分の終わり（45小節目あたり）までの抜粋 |
| グノシエンヌ 第1番 | サティ | 3:17 | Mutopia Project [`SatieE/Gnossienne/no_1`](https://www.mutopiaproject.org/ftp/SatieE/Gnossienne/no_1/)（Knute Snortum） | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | MIDI化 |
| ゴルトベルク変奏曲 アリア | バッハ | 3:12 | Mutopia Project [`BachJS/BWV988/bwv-988-aria`](https://www.mutopiaproject.org/ftp/BachJS/BWV988/bwv-988-aria/)（JD Erickson） | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | MIDI化 |
| ピアノソナタ K.545 第1楽章 | モーツァルト | 4:25 | Mutopia Project [`MozartWA/KV545/K545-1`](https://www.mutopiaproject.org/ftp/MozartWA/KV545/K545-1/)（Alejandro Sierra） | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | MIDI化 |
| カノン（3つのヴァイオリンと通奏低音・原曲版） | パッヘルベル | 4:05 | Mutopia Project [`PachelbelJ/Canon_per_3_Violini_e_Basso`](https://www.mutopiaproject.org/ftp/PachelbelJ/Canon_per_3_Violini_e_Basso/)（Michael Fischer v. Mollard） | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | MIDI化 |
