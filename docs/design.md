# 設計

## モデル

MatchにはschemaVersion / matchId / createdAt / updatedAt / matchType / players / rule / games / status / winnerを保持します。
GameにはgameNumber / initialServingTeam / initialServer / initialReceiver / initialCourtState / initialTeamASide / rallyHistory / endChanges / finalScore / winnerを保持します。
RallyにはrallyNumber / winner / scoreAfter / serverBefore / receiverBefore / courtStateBefore / teamASideBefore / timestampを保持します。

Ruleはtarget / winBy / cap / gamesToWin / interval { at, seconds, betweenGamesSeconds } / ends { betweenGames, decidingGameAt }に分離しています。途中でルールを変更しません。

IndexedDBの`matches`ストアはmatchIdが主キー。`meta`ストアのactiveキーにはmatchId / flipped / pauseを保持します。試合と再開情報を同じトランザクションで保存し、トランザクション完了後に保存済みと表示します。

## 状態遷移

設定 → 試合中 → インターバル → 試合中 → ゲーム終了 → 次ゲーム設定 → 試合中、必要ゲーム数に到達すると試合終了です。
インターバルの開始時刻ではなく期限を保存するため、再読み込みしても残り時間が復元します。休憩終了は審判が操作します。

## サービス順

0–0では最初のサーバー・レシーバーが、それぞれの右コートを担当します。ダブルスのパートナーは左コートです。

- サーブ側が得点：そのペアの右・左担当を交換。同じ選手が次のサーブを行います。
- レシーブ側が得点：担当を交換せず、サービス権を移します。
- サーブ側得点が偶数なら右、奇数なら左。そのコートの担当者がサーバー、相手側の同じ論理コート担当者がレシーバーです。
- シングルスはサーブ側の偶奇に従って両者のコートを表示します。

右コートの表示位置は、画面左側チームが下、画面右側チームが上です。これにより対角のサーブになります。viewFlippedは計算済み座標を180度回転するだけです。

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
次のサーブ       A1 → B1       右から
        1点戻す     Redo      表示反転
```
