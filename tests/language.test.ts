import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {translate,translations,loadLanguage} from '../i18n/messages.ts';
test('translation substitutes values without translating player names',()=>{
 const params={server:'John',receiver:'Bob',side:'Right'};
 assert.equal(translate('en','{server}が{side}サービスコートから{receiver}にサーブ',params),'John serves from the Right service court to Bob');
 assert.equal(translate('ja','{count} ラリー',{count:7}),'7 ラリー');
 assert.equal(translate('en','コート'),'Court');assert.equal(translate('ja','コート'),'コート');
});
test('every static translation key in the UI has an English translation with matching placeholders',()=>{
 const files=['app/page.tsx','ui/court.tsx','ui/score-cards.tsx','ui/score-sheet.tsx','ui/setup.tsx','ui/participant-editor.tsx','ui/history.tsx','ui/game-set.tsx','ui/match-summary.tsx','ui/oss-licenses.tsx'];
 let count=0;for(const file of files){const sf=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  function check(node:ts.Node){if(ts.isCallExpression(node)&&node.expression.getText(sf)==='t'&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])){const key=node.arguments[0].text;assert.ok(translations[key],`Missing translation: ${key}`);count++;}ts.forEachChild(node,check)}check(sf);
 }
 assert.ok(count>100);
 const placeholders=(s:string)=>[...s.matchAll(/\{(\w+)\}/g)].map(x=>x[1]).sort();
 for(const [ja,en] of Object.entries(translations))assert.deepEqual(placeholders(ja),placeholders(en),ja);
});
test('first visit uses Japanese only for a Japanese browser language',()=>{
 for(const locale of ['ja','ja-JP','JA-jp'])assert.equal(loadLanguage(undefined,locale),'ja');
 for(const locale of ['en-US','en-GB','fr-FR','zh-CN','ko-KR','javanese',''])assert.equal(loadLanguage(undefined,locale),'en');
 assert.equal(loadLanguage(),'en');
});
test('a saved language overrides the browser language',()=>{
 assert.equal(loadLanguage({getItem:()=> 'en'},'ja-JP'),'en');
 assert.equal(loadLanguage({getItem:()=> 'ja'},'en-US'),'ja');
});
test('missing, invalid and unavailable storage fall back to the browser language',()=>{
 for(const locale of ['ja-JP','fr-FR']){
  const expected=locale==='ja-JP'?'ja':'en';
  assert.equal(loadLanguage({getItem:()=>null},locale),expected);
  assert.equal(loadLanguage({getItem:()=> 'invalid'},locale),expected);
  assert.equal(loadLanguage({getItem:()=>{throw new Error('blocked')}},locale),expected);
 }
});
