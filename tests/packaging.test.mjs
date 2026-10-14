import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const dist=fileURLToPath(new URL('../dist/',import.meta.url));
const html=readFileSync(join(dist,'index.html'),'utf8');
test('entry assets resolve under GitHub root, project path and index.html',()=>{
  const assets=[...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/g)].map(m=>m[1]);
  assert.ok(assets.length>=3);
  for(const address of ['https://user.github.io/','https://user.github.io/haneye-finance/','https://user.github.io/haneye-finance/index.html']){
    const base=new URL('.',address);
    for(const asset of assets){
      assert.ok(asset.startsWith('./'),`asset must be relative: ${asset}`);
      const target=new URL(asset,address);
      assert.equal(target.origin,base.origin);assert.ok(target.pathname.startsWith(base.pathname));
      assert.ok(existsSync(join(dist,target.pathname.slice(base.pathname.length))));
    }
  }
});
test('all browser modules use local existing dependencies; no site-hosted runtime is required',()=>{
  const modules=readdirSync(dist).filter(f=>f.endsWith('.js'));
  for(const file of modules){
    const source=readFileSync(join(dist,file),'utf8');
    for(const match of source.matchAll(/\bimport\s+[^;]+?\s+from\s+['"]([^'"]+)['"]/g)){
      assert.ok(match[1].startsWith('./'),`${file}: external JS import`);
      const path=resolve(dirname(join(dist,file)),match[1]);assert.ok(path.startsWith(dist));assert.ok(existsSync(path));
    }
    assert.doesNotMatch(source,/appgprj_|git\.chatgpt-team\.site|Authorization:\s*Bearer|siwc_bypass/);
  }
  assert.ok(existsSync(join(dist,'.nojekyll')));
});
test('static HTML has distinct ids and the expected accessible shell',()=>{
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length);assert.match(html,/<html lang="ko">/);
  assert.match(html,/<meta name="viewport"/);assert.match(html,/<noscript>/);
  for(const id of ['form-area','results','input-error','modal','toast'])assert.ok(ids.includes(id));
});
