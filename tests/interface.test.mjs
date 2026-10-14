// Controller integration tests using a small DOM adapter. These verify real
// application event handlers, not browser layout, rendering, or native dialogs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';

class Element {
  constructor(tag='div',attrs='',owner=null){
    this.tagName=tag.toUpperCase();this.dataset={};this.attrs={};this.events={};this.children=[];this.owner=owner;this.value='';this.hidden=false;this.open=false;this._html='';
    for(const match of attrs.matchAll(/([\w-]+)="([^"]*)"/g)){
      const [,key,v]=match;this.attrs[key]=v;
      if(key==='id')this.id=v;if(key==='value')this.value=v;
      if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;
    }
    this.classList={toggle(){},add(){},remove(){}};
    nodes.push(this);
  }
  set innerHTML(value){
    this._html=value;
    const removeChildren=p=>{for(const c of p.children){removeChildren(c);nodes.splice(nodes.indexOf(c),1);}p.children=[];};
    removeChildren(this);
    for(const m of value.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi))if(/\b(id|data-[\w-]+)=/.test(m[2]))this.children.push(new Element(m[1],m[2],this));
  }
  get innerHTML(){return this._html;}
  addEventListener(type,fn){(this.events[type]??=[]).push(fn);}
  setAttribute(k,v){this.attrs[k]=v;}
  removeAttribute(k){delete this.attrs[k];}
  closest(tag){return this.tagName===tag.toUpperCase()?this:null;}
  focus(){this.focused=true;} select(){this.selected=true;} scrollIntoView(){}
  showModal(){this.open=true;} close(){this.open=false;}
  getBoundingClientRect(){return {left:10,right:600,top:10,bottom:600};}
  append(el){this.children.push(el);} remove(){nodes.splice(nodes.indexOf(this),1);}
  click(){if(this.tagName==='A'){downloads.push({href:this.href,name:this.download});}else click(this);}
}
const nodes=[],downloads=[],storage=new Map(),windowEvents={};
const documentElement=new Element('document');
const document={
  getElementById:id=>nodes.find(n=>n.id===id)||null,
  querySelectorAll:selector=>{const [,key,value]=selector.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/)||[];return nodes.filter(n=>key&&Object.hasOwn(n.attrs,key)&&(value===undefined||n.attrs[key]===value));},
  querySelector:selector=>document.querySelectorAll(selector)[0]||null,
  createElement:tag=>new Element(tag),
  addEventListener:(type,fn)=>documentElement.addEventListener(type,fn),
  body:new Element('body'),title:'',
};
documentElement.innerHTML=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
let copied='';
Object.assign(globalThis,{document,location:{hash:'#main',origin:'https://example.test',pathname:'/haneye-finance/'},window:{addEventListener:(type,fn)=>{(windowEvents[type]??=[]).push(fn);}},history:{replaceState:(_,__,hash)=>{location.hash=hash;}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}});
Object.defineProperty(globalThis,'navigator',{value:{clipboard:{writeText:async text=>{copied=text;}}},configurable:true});
const realSetTimeout=globalThis.setTimeout;
globalThis.setTimeout=(fn,ms)=>{const timer=realSetTimeout(fn,ms);timer.unref();return timer;};
const $=document.getElementById;
function emit(el,type,event){for(const fn of el.events[type]||[])fn(event);}
function click(el){assert.ok(el,'button must exist');emit(el,'click',{target:el});emit(documentElement,'click',{target:el});}
function button(key,value){return nodes.find(n=>n.tagName==='BUTTON'&&(key==='set'?n.dataset.set&&n.dataset.value===value:n.dataset[key]===value));}
function input(key,value){const el=$(`f-${key}`);assert.ok(el,`${key} input must exist`);el.value=String(value);emit($('form-area'),'input',{target:el});}
function change(key,value){const el=$(`f-${key}`);assert.ok(el,`${key} select must exist`);el.value=String(value);emit($('form-area'),'change',{target:el});}
function route(hash){location.hash=hash;for(const fn of windowEvents.hashchange||[])fn();}
function result(){return $('results').innerHTML;}

test('four calculator flows, invalid inputs, deep links, local save and CSV',async()=>{
  await import('../dist/app.js');
  assert.match(result(),/원리금균등/);assert.match(result(),/300,000,000/);
  click(button('view','table'));assert.match(result(),/360회/);
  input('months',1);click(button('set','bullet'));
  assert.match(result(),/매월 납부 이자/);assert.match(result(),/1,050,000<span/);assert.match(result(),/301,050,000/);
  input('principal','');assert.equal($('input-error').hidden,false);assert.match(result(),/입력 조건/);
  input('principal','1,000,000');assert.equal($('input-error').hidden,true);
  click(button('action','save'));assert.equal($('saved-count').textContent,1);
  click(button('action','save'));assert.equal($('saved-count').textContent,1);
  click($('saved-open'));assert.equal($('modal').open,true);assert.match($('modal-body').innerHTML,/대출 100만 원/);
  click($('modal-close'));
  click(button('action','share'));await delay(0);assert.match(copied,/#loan\?/);assert.match(copied,/principal=1000000/);
  assert.match(copied,/^https:\/\/example.test\/haneye-finance\/#loan/);
  click(button('action','csv'));assert.match(downloads.at(-1).name,/loan.*csv/);
  const loanCSV=await (await fetch(downloads.at(-1).href)).text();assert.match(loanCSV,/상환금\(원\)/);assert.match(loanCSV,/1003500/);

  route('#savings');assert.match(result(),/10,296,100/);
  click(button('set','goal'));assert.match(result(),/매월 저축액/);assert.match(result(),/820,179/);
  click(button('set','compound'));assert.match(result(),/월복리/);
  change('taxMode','custom');assert.ok($('f-tax'));input('tax',10);assert.match(result(),/세율 10%/);
  click(button('view','table'));assert.match(result(),/12개월/);
  click(button('action','csv'));assert.match(downloads.at(-1).name,/savings.*csv/);

  route('#salary');assert.match(result(),/3,571,586/);assert.match(result(),/국민연금/);
  change('children',1);assert.equal($('input-error').hidden,false);
  change('family',2);assert.equal($('input-error').hidden,true);
  click(button('view','compare'));assert.match(result(),/150,000,000/);
  click(button('set','monthly'));assert.equal($('f-amount').value,'4,166,666');
  click(button('action','csv'));assert.match(downloads.at(-1).name,/salary.*csv/);

  route('#area');assert.match(result(),/25.41/);assert.match(result(),/전용면적 기준 평단가/);
  input('supply',112);assert.match(result(),/공급면적 기준 평단가/);assert.match(result(),/>75<\/strong>/);
  input('supply',59);assert.equal($('input-error').hidden,false);
  input('supply','');assert.equal($('input-error').hidden,true);
  click(button('set','pyeong'));assert.equal($('f-size').value,'25.41');assert.match(result(),/>84<span/);
  click(button('action','csv'));assert.match(downloads.at(-1).name,/area.*csv/);

  route('#loan?principal=12000000&rate=12&months=12&grace=0&method=principal');assert.match(result(),/1,120,000/);
  route('#loan?principal=%3Cscript%3E');assert.equal($('input-error').hidden,false);assert.doesNotMatch(result(),/<script>/);
  click($('saved-open'));const load=nodes.find(n=>n.dataset.load);click(load);assert.match(result(),/1,000,000/);assert.equal($('modal').open,false);
  click($('saved-open'));const del=nodes.find(n=>n.dataset.delete);click(del);assert.equal($('saved-count').textContent,0);
  click($('modal-close'));click($('sources-open'));assert.match($('modal-body').innerHTML,/2026년 10월 10일/);assert.match($('modal-body').innerHTML,/law.go.kr/);
  click($('modal-close'));
});

test('bullet selection clears stale grace and imported bullet links are normalized',()=>{
  route('#loan?principal=300000000&rate=4.2&months=360&grace=24&method=equal');
  assert.equal($('f-grace').value,'24');click(button('set','bullet'));input('months',6);
  assert.equal($('input-error').hidden,true);assert.match(result(),/매월 납부 이자/);
  route('#loan?principal=1000000&rate=5&months=6&grace=12&method=bullet');
  assert.equal($('input-error').hidden,true);click(button('view','compare'));
  assert.match(result(),/상환방식 비교/);click(button('set','principal'));
  assert.equal($('f-grace').value,'0');assert.equal($('input-error').hidden,true);
});

test('annual / monthly toggles preserve original input until the amount is edited',()=>{
  route('#salary?amount=50000000&mode=annual');
  for(let i=0;i<10;i++){
    click(button('set','monthly'));assert.equal($('f-amount').value,'4,166,666');
    click(button('set','annual'));assert.equal($('f-amount').value,'50,000,000');
  }
  click(button('set','monthly'));input('amount',4000000);click(button('set','annual'));
  assert.equal($('f-amount').value,'48,000,000');
  route('#main');assert.match(document.title,/연봉/);assert.equal($('f-amount').value,'48,000,000');
});

test('area conversions preserve original decimal inputs and both physical boundaries',()=>{
  for(const size of [0.01,59.123456789,84,1000000]){
    route(`#area?size=${size}&unit=m2&price=0&supply=0`);
    for(let i=0;i<10;i++){
      click(button('set','pyeong'));assert.equal($('input-error').hidden,true);
      click(button('set','m2'));assert.equal(Number($('f-size').value),size);assert.equal($('input-error').hidden,true);
    }
  }
  route('#area?size=59.7&unit=m2&supply=59.7');click(button('set','pyeong'));
  assert.equal($('input-error').hidden,true);
});

test('decimal and small scientific inputs survive result links and saved conditions',async()=>{
  route('#loan?principal=1000000&months=12&rate=0.5');input('rate','.5');
  assert.equal($('input-error').hidden,true);input('rate','0.0000000000001');
  click(button('action','share'));await delay(0);assert.match(copied,/rate=1e-13/);
  route(copied.slice(copied.indexOf('#')));assert.equal($('input-error').hidden,true);
  click(button('action','save'));click($('saved-open'));click(nodes.find(n=>n.dataset.load));
  assert.equal($('input-error').hidden,true);
});

test('malformed storage is filtered, paths are isolated, and unavailable storage is reported',()=>{
  const key='haneye-finance:v1:/haneye-finance/';
  storage.set('haneye-finance:v1:/other-project/',storage.get(key));storage.delete(key);
  for(const fn of windowEvents.storage)fn();assert.equal($('saved-count').textContent,0);
  storage.set(key,JSON.stringify([{id:'bad',page:'loan',state:{principal:{toString:0}}}]));
  click($('saved-open'));assert.match($('modal-body').innerHTML,/아직 저장한 계산/);click($('modal-close'));
  storage.set(key,'invalid JSON');for(const fn of windowEvents.storage)fn();assert.equal($('saved-count').textContent,0);
  const original=localStorage.setItem;localStorage.setItem=()=>{throw new Error('Storage disabled');};
  route('#loan');click(button('action','save'));assert.match($('toast').textContent,/저장 공간을 사용할 수 없어요/);
  localStorage.setItem=original;storage.delete(key);
});

test('clipboard failure opens a copyable path-aware fallback link',async()=>{
  const original=navigator.clipboard.writeText;
  navigator.clipboard.writeText=async()=>{throw new Error('Clipboard disabled');};
  route('#area?size=84');click(button('action','share'));await delay(0);
  assert.equal($('modal').open,true);assert.ok($('copy-url').selected);
  assert.match($('copy-url').value,/https:\/\/example.test\/haneye-finance\/#area/);
  click($('modal-close'));navigator.clipboard.writeText=original;
});
