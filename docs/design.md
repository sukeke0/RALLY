# 設計

## モデル

MatchにはschemaVersion / matchId / createdAt / updatedAt / matchType / players / teamNames（旧データでは省略可） / rule / games / status / winnerを保持します。
GameにはgameNumber / initialServingTeam / initialServer / initialReceiver / initialCourtState / initialTeamASide / rallyHistory / endChanges / finalScore / winnerを保持します。
RallyにはrallyNumber / winner / scoreAfter / serverBefore / receiverBefore / courtStateBefore / teamASideBefore / timestampを保持します。

Ruleはtarget / winBy / cap / gamesToWin / interval { at, seconds, betweenGamesSeconds } / ends { betweenGames, decidingGameAt }に分離しています。途中でルールを変更しません。

IndexedDBの`matches`ストアはmatchIdが主キー。`meta`ストアのactiveキーにはmatchIdを保持します。試合と再開情報を同じトランザクションで保存し、トランザクション完了後に保存済みと表示します。

## 状態遷移

設定 → 試合中 → インターバル → 試合中 → ゲーム終了 → 次ゲーム設定 → 試合中、必要ゲーム数に到達すると試合終了です。
休憩タイマーや休憩による入力停止はありません。旧データのpauseとflippedは読み込み時に除外します。Ruleのintervalは旧保存データ・JSONとの互換性のため保持し、新規試合では無効値を使用します。

## サービス順

0–0では最初のサーバー・レシーバーが、それぞれの右コートを担当します。ダブルスのパートナーは左コートです。

- サーブ側が得点：そのペアの右・左担当を交換。同じ選手が次のサーブを行います。
- レシーブ側が得点：担当を交換せず、サービス権を移します。
- サーブ側得点が偶数なら右、奇数なら左。そのコートの担当者がサーバー、相手側の同じ論理コート担当者がレシーバーです。
- シングルスはサーブ側の偶奇に従って両者のコートを表示します。

右コートの表示位置は、画面左側チームが下、画面右側チームが上です。これにより対角のサーブになります。viewFlippedは選手の計算済み座標を180度回転するだけです。審判マーカーは常に中央下側に固定します。

## Undo / Redo

Undoは最終ラリーを取り除き、初期状態から再生します。自動のエンド交替・サービス順・勝敗を同時に再計算します。空の次ゲームがあるときは、そのゲームを除き前ゲームの最終ラリーを戻します。取り消した状態をRedoスタックに保持し、別の得点を入れるとRedoを破棄します。Redoスタックは現在のタブ内だけで有効です。

手動エンド交替は発生したラリー境界をGame.endChangesに記録します。ゲーム間と最終ゲーム途中の自動交替はルールから再現します。

## 保存と持ち出し

JSON形式は `{format:"rally-scoreboard",version:1,exportedAt,matches:[...]}` です。初期配置から各得点を再計算し、スコア・サービス順・配置・勝敗が一致する場合だけ読み込みます。上限サイズとゲーム数・ラリー数を検証します。UIから読み込む場合はmatchIdを再採番してコピーとして保存します。

## ワイヤーフレーム

```text
RALLY                   保存状態  履歴  設定
GAME 01                ダブルス・21点制
┌─────────────────┬─────────────────┐
│ Team A / 選手名 │ Team B / 選手名 │
│        0        │        0        │
│ 獲得ゲーム  ○○  │ 獲得ゲーム  ○○  │
└─────────────────┴─────────────────┘
得点経過                  横スクロール
A │ 1 │   │ 2 │ …
B │   │ 1 │   │ …
サービスコート
┌─────────────────┬─────────────────┐
│        A2       │  B1（レシーブ） │
│                 NET               │
│  A1（サーブ）   │        B2       │
└─────────────────┴─────────────────┘
                  審判
             戻る             進む
```

## 名前の編集

設定からチーム名と選手名を変更できます。選手ID・得点履歴・サービス順は変わりません。Redoに保持された試合にも同じ名前を反映し、得点の取り消し・やり直しで名前が古い表示に戻らないようにしています。teamNamesがない旧データはTeam A / Team Bを表示し、そのまま再開できます。

