import test from 'node:test';
import assert from 'node:assert/strict';
import {loan,savings,area,csv,M2_PER_PYEONG} from '../dist/calc.js';
import {salary,tableTax} from '../dist/salary.js';

test('loan: zero interest, grace, one-month maturity and exact principal conservation',()=>{
  for(const principal of [1,10001,120000000])for(const months of [1,12,360,600])for(const method of ['equal','principal','bullet']){
    const r=loan({principal,months,rate:0,method});
    assert.equal(r.totalInterest,0);assert.equal(r.total,principal);
    assert.equal(r.schedule.reduce((n,x)=>n+x.principal,0),principal);
    assert.equal(r.schedule.at(-1).balance,0);
    assert.ok(r.schedule.every(x=>x.payment>=0&&x.balance>=0&&Number.isInteger(x.payment)));
  }
  const g=loan({principal:12000000,rate:12,months:14,grace:2,method:'principal'});
  assert.deepEqual(g.schedule.slice(0,2).map(x=>[x.principal,x.interest]),[[0,120000],[0,120000]]);
  assert.equal(g.schedule[2].principal,1000000);assert.equal(g.regular,1120000);
});
test('loan: independent analytical examples and ordering of total interest',()=>{
  const s={principal:12000000,rate:12,months:12};
  const b=loan({...s,method:'bullet'}),p=loan({...s,method:'principal'}),e=loan(s);
  assert.equal(b.totalInterest,1440000);assert.equal(b.last,12120000);
  assert.equal(p.totalInterest,780000);assert.equal(p.first,1120000);assert.equal(p.last,1010000);
  const payment=12000000*.01/(1-Math.pow(1.01,-12));
  assert.ok(Math.abs(e.first-payment)<=1);
  assert.ok(p.totalInterest<e.totalInterest&&e.totalInterest<b.totalInterest);
  assert.equal(loan({...s,months:1,method:'bullet'}).total,12120000);
});
test('savings: lump sum and beginning-of-month installment examples',()=>{
  const d=savings({amount:10000000,rate:3.6,months:12});
  assert.equal(d.grossInterest,360000);assert.equal(d.taxAmount,55440);assert.equal(d.total,10304560);
  const i=savings({mode:'installment',amount:100000,rate:12,months:12,tax:0});
  assert.equal(i.principal,1200000);assert.equal(i.grossInterest,78000);assert.equal(i.total,1278000);
  const c=savings({mode:'installment',amount:100000,rate:12,months:12,interest:'compound',tax:0});
  const theoretical=100000*1.01*(Math.pow(1.01,12)-1)/.01;
  assert.equal(c.total,Math.round(theoretical));
  const lump=savings({amount:10000000,rate:12,months:12,interest:'compound',tax:0});
  assert.equal(lump.total,Math.round(10000000*Math.pow(1.01,12)));
});
test('savings: goal reverse calculation meets target after tax at varied boundaries',()=>{
  for(const amount of [1,1000000,10000001,100000000000])for(const months of [1,12,60,600])for(const rate of [0,0.01,3.5,12])for(const interest of ['simple','compound'])for(const tax of [0,15.4,100]){
    const r=savings({mode:'goal',amount,months,rate,interest,tax});
    const forward=savings({mode:'installment',amount:r.monthly,months,rate,interest,tax});
    assert.equal(r.total,forward.total);assert.ok(r.total>=amount,JSON.stringify({amount,months,rate,interest,tax,total:r.total}));
    assert.ok(Number.isSafeInteger(r.monthly));
  }
});
test('salary: official table samples and lower-inclusive bracket behavior',()=>{
  assert.equal(tableTax(769999,1),0);
  assert.equal(tableTax(1059999,1),0);assert.equal(tableTax(1060000,1),1040);
  assert.equal(tableTax(2000000,1),19520);assert.equal(tableTax(2000000,2),14750);assert.equal(tableTax(2000000,3),6600);
  assert.equal(tableTax(3500000,1),127220);assert.equal(tableTax(3500000,2),102220);assert.equal(tableTax(3500000,3),62460);
  assert.equal(tableTax(10000000,1),1507400);assert.equal(tableTax(10000000,11),960840);
  assert.equal(tableTax(10000001,1),1532400.343);
  for(const edge of [14000000,28000000,30000000,45000000,87000000]){
    assert.ok(tableTax(edge+1,1)>=tableTax(edge,1));
    assert.ok(tableTax(edge+1,1)-tableTax(edge,1)<1);
  }
  assert.equal(tableTax(14000000,1),2904400);
  assert.equal(tableTax(28000000,1),8118000);
  assert.equal(tableTax(30000000,1),8902000);
  assert.equal(tableTax(45000000,1),14902000);
  assert.equal(tableTax(87000000,1),32542000);
});
test('salary: official insurance example, caps, child deductions and withholding',()=>{
  const a=salary({amount:2000000,mode:'monthly',nonTax:0});
  assert.equal(a.pension,95000);assert.equal(a.health,71900);assert.equal(a.care,9440);assert.equal(a.employment,18000);
  assert.equal(a.income,19520);assert.equal(a.local,1950);assert.equal(a.net,1784190);
  const max=salary({amount:10000000,mode:'monthly',nonTax:0});assert.equal(max.pensionBase,6590000);assert.equal(max.pension,313020);
  const low=salary({amount:300000,mode:'monthly',nonTax:0});assert.equal(low.pensionBase,410000);assert.equal(low.pension,19470);
  assert.equal(salary({amount:3500000,mode:'monthly',nonTax:0,family:2,children:1}).income,81390);
  assert.equal(salary({amount:3500000,mode:'monthly',nonTax:0,family:3,children:2}).income,16630);
  assert.equal(salary({amount:3500000,mode:'monthly',nonTax:0,family:4,children:3}).income,0);
  assert.equal(salary({amount:3500000,mode:'monthly',nonTax:0,withholding:80}).income,101770);
  assert.equal(salary({amount:1060000,mode:'monthly',nonTax:0,withholding:80}).income,0);
  const ann=salary({amount:50000000});assert.equal(ann.monthly,4166666);assert.equal(ann.net+ann.deductions,ann.monthly);assert.equal(ann.annualNet,ann.net*12);
});
test('area: conversion roundtrip and separate exclusive / supply unit prices',()=>{
  assert.equal(M2_PER_PYEONG,400/121);
  const r=area({size:84,price:840000000,supply:112});
  assert.equal(r.pyeong,25.41);assert.equal(r.efficiency,75);assert.equal(r.perM2,10000000);
  assert.equal(r.supplyPerPyeong,840000000/(112*121/400));assert.ok(r.supplyPerPyeong<r.perPyeong);
  assert.equal(area({size:r.pyeong,unit:'pyeong'}).m2,84);
  assert.equal(area({size:84}).supplyPerPyeong,0);
});
test('invalid and missing inputs fail safely rather than returning misleading amounts',()=>{
  for(const principal of [0,-1,NaN,Infinity,null,'',1.5])assert.throws(()=>loan({principal,rate:4,months:12}));
  for(const months of [0,1.5,601])assert.throws(()=>loan({principal:10000,rate:4,months}));
  assert.throws(()=>loan({principal:10000,rate:4,months:12,grace:12}));
  assert.throws(()=>savings({amount:100,rate:-1,months:12}));
  assert.throws(()=>savings({amount:1e11,rate:100,months:600,interest:'compound'}));
  assert.throws(()=>salary({amount:1000000,mode:'monthly',nonTax:1000000}));
  assert.throws(()=>salary({amount:4000000,mode:'monthly',family:1,children:1}));
  assert.throws(()=>area({size:84,supply:59}));assert.throws(()=>area({size:0}));assert.throws(()=>area({size:84,unit:'bad'}));
});
test('CSV preserves Korean, commas, quotes and line breaks',()=>{
  assert.equal(csv([['한국어','a,b','a"b','a\nb'],[1,2,3,4]]),'\ufeff"한국어","a,b","a""b","a\nb"\r\n"1","2","3","4"');
});

test('area validates equivalent physical limits and tolerates binary rounding at 100% efficiency',()=>{
  for(const size of [0.01,59.7,84,1000000]){
    const r=area({size,price:0,supply:size});
    const converted=area({size:r.pyeong,unit:'pyeong',supply:size});
    assert.ok(Math.abs(converted.m2-size)<1e-8);
  }
  assert.throws(()=>area({size:.00999}));assert.throws(()=>area({size:.003,unit:'pyeong'}));
  assert.throws(()=>area({size:302501,unit:'pyeong'}));assert.throws(()=>area({size:84,price:123.4}));
});

test('salary rejects amounts outside the ordinary workplace-insurance model',()=>{
  assert.throws(()=>salary({amount:1000,mode:'monthly',nonTax:0}),/추정 보험료보다/);
  assert.ok(salary({amount:300000,mode:'monthly',nonTax:0}).net>0);
});

test('blank and nonnumeric values cannot silently become a zero rate or amount',()=>{
  for(const rate of [' ',false,[],null,Infinity,NaN])assert.throws(()=>loan({principal:1000000,months:12,rate}));
});

test('deterministic mixed savings scenarios still meet the after-tax target',()=>{
  let seed=83421;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<2000;i++){
    const options={mode:'goal',amount:Math.ceil(rand()*1e7),rate:Math.round(rand()*20000)/1000,months:1+Math.floor(rand()*120),tax:[0,15.4,9.5,100][Math.floor(rand()*4)],interest:rand()<.5?'simple':'compound'};
    assert.ok(savings(options).total>=options.amount,JSON.stringify(options));
  }
});
