import type { Rule, Score, Team } from './model.ts';
export const RULE_21: Rule = {
  id: '21', name: '21点制', target: 21, winBy: 2, cap: 30, gamesToWin: 2,
  interval: { at: 11, seconds: 60, betweenGamesSeconds: 120 },
  ends: { betweenGames: true, decidingGameAt: 11 },
};
export const RULE_15: Rule = {
  id: '15', name: '15点制', target: 15, winBy: 2, cap: 21, gamesToWin: 2,
  interval: { at: 8, seconds: 60, betweenGamesSeconds: 120 },
  ends: { betweenGames: true, decidingGameAt: 8 },
};
export function validateRule(rule: Rule): void {
  if (!rule || typeof rule.id !== 'string' || typeof rule.name !== 'string' || rule.id.length > 40 || rule.name.length > 80 || !rule.interval || !rule.ends) throw new Error('ルールの形式が不正です。');
  for (const [label, value, max] of [['基本得点',rule.target,99],['点差',rule.winBy,99],['最大得点',rule.cap,199],['獲得ゲーム数',rule.gamesToWin,5]] as const) {
    if (!Number.isInteger(value) || value < 1 || value > max) throw new Error(`${label}の設定を確認してください。`);
  }
  if (rule.cap < rule.target) throw new Error('最大得点は基本得点以上にしてください。');
  for (const value of [rule.interval.at, rule.ends.decidingGameAt]) {
    if (value !== null && (!Number.isInteger(value) || value < 1 || value >= rule.target)) throw new Error('休憩・エンド交替の得点は、基本得点未満にしてください。');
  }
  for (const value of [rule.interval.seconds, rule.interval.betweenGamesSeconds]) {
    if (!Number.isInteger(value) || value < 0 || value > 600) throw new Error('休憩時間は0〜600秒で設定してください。');
  }
  if (typeof rule.ends.betweenGames !== 'boolean') throw new Error('エンド交替設定が不正です。');
}
export function gameWinner(score: Score, rule: Rule): Team | null {
  for (const team of ['A','B'] as const) {
    const other = team === 'A' ? 'B' : 'A';
    if (score[team] >= rule.cap || (score[team] >= rule.target && score[team] - score[other] >= rule.winBy)) return team;
  }
  return null;
}
