import {loan,savings,area,csv,M2_PER_PYEONG} from './calc.js';
import {salary} from './salary.js';
import {PAGE_INFO,LEARN,SOURCES} from './content.js';

const $ = id => document.getElementById(id);
const nf = new Intl.NumberFormat('ko-KR');
const fmt = n => nf.format(Math.round(n));
const dec = (n,d=2) => Number(n).toLocaleString('ko-KR',{maximumFractionDigits:d});
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={
  save:'<path d="M6 3h12v18l-6-4-6 4z"/>', lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',link:'<path d="m10 13 4-4m-7 5-2 2a3.5 3.5 0 0 0 5 5l4-4a3.5 3.5 0 0 0 0-5m-4 0a3.5 3.5 0 0 1 0-5l4-4a3.5 3.5 0 0 1 5 5l-2 2"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>', chart:'<path d="M4 3v17h17M8 16v-5m5 5V7m5 9V4"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',sliders:'<path d="M4 6h4m4 0h8M4 12h10m4 0h2M4 18h2m4 0h10"/><circle cx="10" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
  shield:'<path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6zM8 12l3 3 5-6"/>',target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  users:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4m1-17a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v4"/>',
  home:'<path d="m3 11 9-8 9 8M5 9v12h14V9M9 21v-8h6v8"/>',ruler:'<path d="m3 16 13-13 5 5L8 21zM13 6l3 3m-6 0 2 2m-5 1 3 3m-6 0 2 2"/>',
};
function icon(name){return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[name]||icons.info}</svg>`;}
function korean(n){
  if(!Number.isFinite(n)||n<0)return '';
  if(!n)return '0원';
  const a=Math.floor(n/1e8),b=Math.floor(n%1e8/1e4),c=Math.round(n%1e4);
  return [a?`${fmt(a)}억`:null,b?`${fmt(b)}만`:null,c?fmt(c):null].filter(Boolean).join(' ')+' 원';
}
function short(n){if(n>=1e8)return dec(n/1e8,1)+'억';if(n>=1e4)return dec(n/1e4,0)+'만';return fmt(n);}
const defaults={
  loan:{principal:300000000,rate:4.2,months:360,grace:0,method:'equal'},
  savings:{mode:'deposit',amount:10000000,rate:3.5,months:12,interest:'simple',tax:15.4,taxMode:'normal'},
  salary:{mode:'annual',amount:50000000,nonTax:200000,family:1,children:0,withholding:100},
  area:{size:84,unit:'m2',price:800000000,supply:0},
};
const states=structuredClone(defaults);
const views={loan:'chart',savings:'chart',salary:'deductions',area:'conversion'};
const methods={equal:'원리금균등',principal:'원금균등',bullet:'만기일시'};
const basePath=new URL('.',location.origin+location.pathname).pathname;
// GitHub project sites on the same origin must not share saved calculations.
const STORAGE='haneye-finance:v1'+(basePath==='/'?'':`:${basePath}`);
const conversions={salary:null,area:null};
let page='loan',lastResult=null,toastTimer,initialized=false;
function numeric(v){const t=String(v).replaceAll(',','').trim();return t===''?null:/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(t)?Number(t):NaN;}
function hydrate(name,incoming){
  const next={...defaults[name]};
  for(const key of Object.keys(next)) {
    if(incoming[key]===undefined)continue;
    if(typeof next[key]==='number') next[key]=numeric(incoming[key]);
    else if(typeof incoming[key]==='string'&&incoming[key].length<24)next[key]=incoming[key];
  }
  if(name==='loan'&&next.method==='bullet')next.grace=0;
  return next;
}
function route(){
  if(location.hash==='#main'&&initialized)return;
  const [name,query]=location.hash.slice(1).split('?');
  page=Object.hasOwn(defaults,name)?name:'loan';
  if(query){states[page]=hydrate(page,Object.fromEntries(new URLSearchParams(query)));conversions[page]=null;}
  renderPage();initialized=true;
}
function field(key,label,unit,{money=false,caption='',optional=false,presets=[],maxLength=17}={}){
  const v=states[page][key];
  const shown=v===null||!Number.isFinite(Number(v))?'':money&&Number.isInteger(v)?fmt(v):String(v);
  return `<div class="field"><label class="field-label" for="f-${key}">${label}${optional?'<small>선택</small>':''}</label><div class="value-input"><input id="f-${key}" data-field="${key}" ${money?'data-money="true"':''} ${optional?'data-optional="true"':''} type="text" inputmode="${money?'numeric':'decimal'}" autocomplete="off" spellcheck="false" maxlength="${maxLength}" value="${esc(shown)}" aria-describedby="hint-${key}"><span>${unit}</span></div><div class="input-caption" id="hint-${key}" data-hint="${key}">${money?korean(v):caption}</div>${presets.length?`<div class="presets">${presets.map(([val,text])=>`<button type="button" data-preset="${key}" data-value="${val}">${text}</button>`).join('')}</div>`:''}</div>`;
}
function segment(key,items,label){return `<div class="segmented" role="group" aria-label="${label}">${items.map(([v,t])=>`<button type="button" data-set="${key}" data-value="${v}" aria-pressed="${states[page][key]===v}" class="${states[page][key]===v?'active':''}">${t}</button>`).join('')}</div>`;}
function select(key,label,options,help=''){return `<div class="field"><label class="field-label" for="f-${key}">${label}</label><select id="f-${key}" class="select-field" data-field="${key}">${options.map(([v,t])=>`<option value="${v}" ${String(states[page][key])===String(v)?'selected':''}>${t}</option>`).join('')}</select>${help?`<p class="helper">${help}</p>`:''}</div>`;}
function renderForm(){
  const s=states[page];let html='';
  if(page==='loan')html=`${field('principal','대출금액','원',{money:true,presets:[[50000000,'5천만'],[100000000,'1억'],[300000000,'3억'],[500000000,'5억']]})}<div class="two-fields">${field('rate','연 금리','%',{caption:'고정금리 기준'})}${field('months','대출기간','개월',{caption:Number.isFinite(s.months)?`${dec(s.months/12,1)}년`:''})}</div><div class="field"><div class="field-label">상환방식</div><div class="method-options" role="group" aria-label="상환방식">${[['equal','매달 같은 금액'],['principal','갈수록 줄어드는 금액'],['bullet','만기에 원금 상환']].map(([v,sub])=>`<button data-set="method" data-value="${v}" class="method-option ${s.method===v?'active':''}" aria-pressed="${s.method===v}"><span><strong>${methods[v]}</strong><small>${sub}</small></span><span class="radio-dot" aria-hidden="true"></span></button>`).join('')}</div></div>${s.method==='bullet'?'<p class="helper">만기 전까지 이자만 내고, 마지막 달에 원금과 이자를 함께 갚아요.</p>':field('grace','거치기간','개월',{caption:'전체 대출기간에 포함 · 0이면 거치 없음',presets:[[0,'없음'],[12,'1년'],[24,'2년'],[36,'3년']]})}`;
  if(page==='savings')html=`${segment('mode',[['deposit','목돈 예금'],['installment','매달 적금'],['goal','목표액 만들기']],'저축 종류')}${field('amount',s.mode==='goal'?'세후 목표금액':s.mode==='installment'?'매월 저축액':'예치금액','원',{money:true,presets:s.mode==='installment'?[[100000,'10만'],[300000,'30만'],[500000,'50만'],[1000000,'100만']]:[[5000000,'500만'],[10000000,'1천만'],[30000000,'3천만'],[100000000,'1억']]})}<div class="two-fields">${field('rate','연 금리','%')}${field('months','저축기간','개월')}</div><div class="field-label">이자 계산</div>${segment('interest',[['simple','단리'],['compound','월복리']],'이자 계산 방식')}${select('taxMode','이자 과세',[['normal','일반과세 · 15.4%'],['free','비과세 · 0%'],['custom','세율 직접 입력']],s.taxMode==='free'?'비과세 상품 가입 요건을 충족한 경우에만 적용해 주세요.':'세후 만기액을 기준으로 결과를 보여드려요.')}${s.taxMode==='custom'?field('tax','적용 세율','%'):''}<p class="helper">${s.mode==='deposit'?'첫날 목돈을 한 번 예치하는 조건입니다.':'매월 초 같은 금액을 납입하는 조건입니다.'} 실제 상품의 일수 계산에 따라 차이가 날 수 있어요.</p>`;
  if(page==='salary')html=`${segment('mode',[['annual','연봉으로 입력'],['monthly','월급으로 입력']],'급여 입력 기준')}${field('amount',s.mode==='annual'?'세전 연봉':'세전 월급','원',{money:true,presets:s.mode==='annual'?[[30000000,'3천만'],[50000000,'5천만'],[70000000,'7천만'],[100000000,'1억']]:[[2500000,'250만'],[3000000,'300만'],[4000000,'400만'],[5000000,'500만']]})}${field('nonTax','월 비과세액','원',{money:true,presets:[[0,'없음'],[100000,'10만'],[200000,'20만']]})}<p class="helper">비과세액은 입력한 급여에 포함된 금액입니다. 식대 등 실제 비과세 요건에 해당하는 금액만 입력하세요.</p><div class="divider"></div><div class="two-fields">${select('family','공제대상 가족',Array.from({length:11},(_,i)=>[i+1,`${i+1}명${i===0?' (본인)':''}`]))}${select('children','8~20세 자녀',Array.from({length:11},(_,i)=>[i,`${i}명`]))}</div>${select('withholding','소득세 원천징수 비율',[[80,'80%'],[100,'100% · 기본'],[120,'120%']],'가족 수는 본인 포함, 자녀도 포함해 주세요. 비율은 월 원천징수액만 바꾸며 최종 연간 세금과는 달라요.')}<p class="helper">2026년 7월 이후 일반 직장가입자 기준 · 퇴직금 및 별도 상여 제외 · 월 균등 지급 가정</p>`;
  if(page==='area')html=`<div class="field-label">입력 단위</div>${segment('unit',[['m2','제곱미터 ㎡'],['pyeong','평']],'면적 입력 단위')}${field('size','전용면적',s.unit==='m2'?'㎡':'평',{presets:s.unit==='m2'?[[59,'59㎡'],[74,'74㎡'],[84,'84㎡'],[114,'114㎡']]:[[18,'18평'],[24,'24평'],[30,'30평'],[34,'34평']]})}<div class="divider"></div>${field('price','주택가격','원',{money:true,optional:true,presets:[[0,'가격 제외'],[500000000,'5억'],[800000000,'8억'],[1000000000,'10억']]})}${field('supply','공급면적','㎡',{optional:true,caption:'0이면 전용 기준으로만 계산'})}<p class="helper">공급면적은 매물·계약서에서 확인한 값을 입력하세요. 전용면적으로 공급면적을 추정하지 않습니다.</p>`;
  $('form-area').innerHTML=html;
}
function renderPage(){
  const [eyebrow,title,description,inputTitle]=PAGE_INFO[page];
  $('eyebrow').textContent=eyebrow;$('page-title').textContent=title;$('page-description').textContent=description;$('input-title').textContent=inputTitle;
  document.title=`${{loan:'대출이자',savings:'예금·적금',salary:'연봉 실수령액',area:'면적·평단가'}[page]} 계산기 | 한눈에 금융`;
  document.querySelectorAll('[data-page]').forEach(a=>{a.classList.toggle('active',a.dataset.page===page);if(a.dataset.page===page)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  $('learn-cards').innerHTML=LEARN[page].map(([i,t,p,more])=>`<article class="learn-card"><div class="learn-icon">${icon(i)}</div><h3>${t}</h3><p>${p}</p><details><summary>자세히 알아보기</summary><p>${more}</p></details></article>`).join('');
  renderForm();renderResults();
}
function hero(label,value,unit,badge,note,stats){return `<div class="result-hero"><div class="hero-top"><span class="hero-label">${label}</span><span class="hero-badge">${badge}</span></div><div class="big-result" role="status" aria-live="polite">${value}<span class="unit">${unit}</span></div><p class="hero-note">${note}</p><div class="hero-rule">${stats.map(([k,v,u='원'])=>`<div><span>${k}</span><strong>${v}</strong><em>${u}</em></div>`).join('')}</div></div>${actions()}`;}
function actions(){return `<div class="result-actions"><button class="action" data-action="save">${icon('save')}계산 저장</button><button class="action" data-action="share">${icon('link')}결과 링크</button><button class="action" data-action="csv">${icon('download')}CSV</button></div>`;}
function panel(tabs,body){return `<div class="result-panel"><div class="result-tabs" role="group" aria-label="결과 보기">${tabs.map(([v,t])=>`<button data-view="${v}" aria-pressed="${views[page]===v}" class="${views[page]===v?'active':''}">${t}</button>`).join('')}</div>${body}</div>`;}
function note(content){return `<div class="info-strip">${icon('info')}<p>${content}</p></div>`;}
function caption(text){return `<div class="chart-caption">${icon('info')}<span>${text}</span></div>`;}
function table(head,rows,footer=null){return `<div class="table-unit">금액 단위: 원</div><div class="table-wrap" tabindex="0" role="region" aria-label="계산 상세 표"><table><thead><tr>${head.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>i===0?`<th scope="row">${c}</th>`:`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>${footer?`<tfoot><tr>${footer.map(c=>`<td>${c}</td>`).join('')}</tr></tfoot>`:''}</table></div>`;}
function samples(schedule){const count=Math.min(12,schedule.length);return Array.from({length:count},(_,i)=>schedule[Math.round(i*(schedule.length-1)/Math.max(1,count-1))]);}
function bars(rows,first,second,title,labels){
  const sampled=samples(rows),max=Math.max(1,...sampled.map(r=>r[first]+r[second]));
  const x0=52,y0=176,w=500,h=142,step=w/sampled.length,bw=Math.min(27,step*.58);
  const guides=[0,.5,1].map(f=>`<line class="chart-grid" x1="${x0}" y1="${y0-h*f}" x2="${x0+w}" y2="${y0-h*f}"/><text x="${x0-8}" y="${y0-h*f+3}" text-anchor="end">${short(max*f)}</text>`).join('');
  const rects=sampled.map((r,i)=>{const x=x0+step*(i+.5)-bw/2,a=r[first]/max*h,b=r[second]/max*h;return `<g><title>${r.month}개월: ${labels[0]} ${fmt(r[first])}원, ${labels[1]} ${fmt(r[second])}원</title><rect x="${x}" y="${y0-a}" width="${bw}" height="${a}" rx="2" fill="#246a54"/><rect x="${x}" y="${y0-a-b}" width="${bw}" height="${b}" rx="2" fill="#c0dcb5"/><text x="${x+bw/2}" y="198" text-anchor="middle">${r.month}</text></g>`;}).join('');
  return `<div class="chart-head"><h3>${title}</h3><div class="legend"><span><i></i>${labels[0]}</span><span><i></i>${labels[1]}</span></div></div><svg class="chart" viewBox="0 0 570 216" role="img" aria-label="${title}. 처음과 마지막을 포함한 최대 12개 시점. 정확한 금액은 일정 표에서 확인할 수 있습니다.">${guides}<g class="chart-bars">${rects}</g><text x="553" y="215" text-anchor="end">개월</text></svg>`;
}
function loanResult(r){
  const s=states.loan, comparisons=Object.keys(methods).map(method=>loan({...s,method,grace:r.grace}));
  let out=hero(r.method==='bullet'?'매월 납부 이자':r.grace?'거치 후 첫 월 상환금':'첫 월 예상 상환금',fmt(r.method==='bullet'?r.schedule[0].interest:r.regular),'원',methods[r.method],`${korean(r.principal)} · 연 ${dec(r.rate)}% · ${r.months}개월${r.grace?` (거치 ${r.grace}개월 포함)`:''}`,[['대출 원금',fmt(r.principal)],['총 대출이자',fmt(r.totalInterest)],['총 상환금액',fmt(r.total)]]);
  let body='';
  if(views.loan==='table')body=table(['회차','상환금','원금','이자','잔여 원금'],r.schedule.map(x=>[`${x.month}회`,fmt(x.payment),fmt(x.principal),fmt(x.interest),fmt(x.balance)]),['합계',fmt(r.total),fmt(r.principal),fmt(r.totalInterest),'0'])+caption('상환금은 원금과 이자의 합계입니다. 마지막 회차에서 원 단위 잔액을 정산해요.');
  else if(views.loan==='compare'){
    const max=Math.max(1,...comparisons.map(x=>x.totalInterest));
    body=`<p class="panel-subtitle">같은 대출금·금리·전체 기간으로 비교합니다. 만기일시는 전 기간 이자만 납부합니다.</p><div class="compare-list">${comparisons.map(x=>`<div class="compare-card ${x.method===r.method?'selected':''}"><div class="compare-top">${methods[x.method]}${x.method===r.method?'<span class="pill">현재 선택</span>':`<button class="subtle-link" data-set="method" data-value="${x.method}">선택하기</button>`}</div><div class="compare-details"><div>${x.grace?'거치 후 첫 상환금':'첫 월 상환금'}<strong>${fmt(x.regular)}원</strong></div><div>마지막 월 상환금<strong>${fmt(x.last)}원</strong></div><div>총이자<strong>${fmt(x.totalInterest)}원</strong></div></div><div class="bar-track" aria-hidden="true"><i style="width:${x.totalInterest/max*100}%"></i></div></div>`).join('')}</div>`;
  }else body=bars(r.schedule,'principal','interest','시간에 따른 월 상환금',['원금','이자'])+caption(`${r.months>12?'처음과 마지막을 포함한 12개 시점을 표시합니다. 전체 내역은 ‘상환 일정’에서 확인하세요.':'매월 예상 상환금을 표시합니다.'} ${r.grace?`거치기간에는 월 ${fmt(r.first)}원을 내요.`:''}`);
  out+=panel([['chart','상환 흐름'],['compare','상환방식 비교'],['table','상환 일정']],body);
  const low=comparisons.reduce((a,b)=>a.totalInterest<=b.totalInterest?a:b);
  out+=note(r.method==='bullet'?`만기 마지막 달에는 <strong>${fmt(r.last)}원</strong>을 한 번에 갚아야 해요.`:r.totalInterest===0?'무이자 조건이에요. 상환방식에 따른 총이자 차이가 없습니다.':`이 조건에서 총이자가 가장 적은 방식은 <strong>${methods[low.method]}</strong>이에요.${r.totalInterest>low.totalInterest?` 현재 방식보다 총이자가 <strong>${korean(r.totalInterest-low.totalInterest)}</strong> 적어요.`:' 초반 상환 부담도 함께 비교해 보세요.'}`);
  out+=`<div class="scenario-row">${[-.5,.5].map(delta=>{const rate=Math.min(100,Math.max(0,r.rate+delta)),alt=loan({...s,rate}),diff=alt.totalInterest-r.totalInterest;return `<div class="scenario"><div><span>금리가 ${dec(rate)}%라면</span><strong>${r.method==='bullet'?'월 이자':'첫 상환금'} ${fmt(r.method==='bullet'?alt.schedule[0].interest:alt.regular)}원</strong></div><b>총이자 ${diff>0?'+':diff<0?'−':''}${short(Math.abs(diff))}원</b></div>`;}).join('')}</div>`;
  return out;
}
function savingsResult(r){
  const label=r.mode==='goal'?'목표를 위한 매월 저축액':'세후 예상 만기금액';
  let out=hero(label,fmt(r.mode==='goal'?r.monthly:r.total),'원',r.interest==='simple'?'단리':'월복리',`연 ${dec(r.rate)}% · ${r.months}개월 · 세율 ${dec(r.tax)}%`,[['납입 원금',fmt(r.principal)],['세후 이자',fmt(r.netInterest)],['이자에 대한 세금',fmt(r.taxAmount)]]);
  const body=views.savings==='table'?table(['개월','이번 납입액','누적 원금','누적 세전 이자','세전 잔액'],r.schedule.map(x=>[`${x.month}개월`,fmt(x.deposit),fmt(x.principal),fmt(x.interest),fmt(x.balance)]))+caption(`표의 잔액은 세전 금액입니다. 만기 이자 세금 ${fmt(r.taxAmount)}원을 빼면 ${fmt(r.total)}원을 받아요.`):bars(r.schedule,'principal','interest','쌓여가는 원금과 이자',['누적 원금','세전 이자'])+caption(`이자는 만기에 과세한다고 가정해요.${r.months>12?' 전체 기간 중 12개 시점을 표시합니다.':''} ${r.mode==='deposit'?'처음에 한 번 예치하는 조건입니다.':'매월 초 납입하므로 첫 납입액에는 전체 기간의 이자가 붙어요.'}`);
  out+=panel([['chart','저축 흐름'],['table','납입 일정']],body);
  out+=note(r.mode==='goal'?`매월 <strong>${fmt(r.monthly)}원</strong>을 저축하면 세후 만기액은 <strong>${fmt(r.total)}원</strong>이에요.`:`세전 이자 <strong>${fmt(r.grossInterest)}원</strong>에서 세금을 빼면, 실제 이자 수익은 <strong>${fmt(r.netInterest)}원</strong>이에요.`);
  out+=`<div class="mini-stats"><div class="mini-stat"><span>납입 원금 대비 수익</span><strong>${dec(r.netInterest/r.principal*100)}<small> %</small></strong></div><div class="mini-stat"><span>저축기간</span><strong>${r.months}<small> 개월</small></strong></div><div class="mini-stat"><span>${r.mode==='deposit'?'처음 예치액':'매월 저축액'}</span><strong>${short(r.monthly)}<small> 원</small></strong></div></div>`;
  return out;
}
const deductionLabels=[['pension','국민연금','근로자 4.75% · 소득 상·하한 적용'],['health','건강보험','근로자 3.595%'],['care','장기요양보험','건강보험료 × (0.9448% ÷ 7.19%)'],['employment','고용보험','근로자 0.9%'],['income','근로소득세','2026년 간이세액표'],['local','지방소득세','소득세의 10%']];
function salaryComparisons(){
  const s=states.salary,current=s.mode==='annual'?s.amount:s.amount*12;
  return [...new Set([24000000,30000000,40000000,50000000,60000000,70000000,80000000,100000000,120000000,150000000,current])].filter(x=>Number.isFinite(x)&&x>=12*(Number(s.nonTax)+1)).sort((a,b)=>a-b).map(amount=>salary({...s,mode:'annual',amount}));
}
function salaryResult(r){
  let out=hero('예상 월 실수령액',fmt(r.net),'원','2026년 기준',`비과세 포함 · 공제대상 가족 ${r.family}명 · 원천징수 ${r.withholding}%`,[['월 세전 급여',fmt(r.monthly)],['월 공제 합계',fmt(r.deductions)],['실수령액 연 환산',fmt(r.annualNet)]]);
  let body='';
  if(views.salary==='compare')body=`<p class="panel-subtitle">현재 비과세액·가족 수·원천징수 비율을 동일하게 적용합니다.</p>`+table(['세전 연봉','월 세전 급여','월 공제액','월 실수령액'],salaryComparisons().map(x=>[`${fmt(x.amount)}${x.amount===(r.mode==='annual'?r.amount:r.amount*12)?' ✓':''}`,fmt(x.monthly),fmt(x.deductions),`<strong>${fmt(x.net)}</strong>`]))+caption('현재 급여 조건은 ✓로 표시합니다. 현재 기준 월급의 단순 환산이며 연말정산 결과는 반영하지 않아요.');
  else body=`<div class="chart-head"><h3>월급에서 빠지는 금액</h3><span class="live-badge">근로자 부담분</span></div><div class="stacked-bar" role="img" aria-label="실수령액 ${fmt(r.net)}원, 사회보험 ${fmt(r.insurance)}원, 세금 ${fmt(r.income+r.local)}원"><span style="width:${Math.max(0,r.net)/r.monthly*100}%;background:#246a54"></span><span style="width:${r.insurance/r.monthly*100}%;background:#afcf9e"></span><span style="width:${(r.income+r.local)/r.monthly*100}%;background:#e4bd8c"></span></div><div class="legend"><span><i></i>실수령액</span><span><i></i>사회보험</span><span><i style="background:#e4bd8c"></i>세금</span></div><div class="deduction-list">${deductionLabels.map(([key,label,sub])=>`<div class="deduction-row"><span>${label}<small>${sub}</small></span><strong>${fmt(r[key])}원</strong></div>`).join('')}<div class="deduction-row total"><span>월 공제 합계</span><strong>${fmt(r.deductions)}원</strong></div></div>`;
  out+=panel([['deductions','공제 내역'],['compare','연봉별 비교']],body);
  out+=note(`소득세는 <strong>2026년 3월 시행 간이세액표</strong>, 국민연금 상·하한은 <strong>2026년 7월 기준</strong>이에요. 실제 신고 보수와 정산 내역에 따라 차이가 날 수 있습니다.`);
  return out;
}
function areaResult(r){
  const toM2=states.area.unit==='pyeong';
  let out=hero('같은 전용면적을 환산하면',dec(toM2?r.m2:r.pyeong),toM2?'㎡':'평','전용 기준',`${dec(r.m2)}㎡ = ${dec(r.pyeong)}평 · 표시값은 소수 둘째 자리까지`,[['전용면적',dec(r.m2),'㎡'],['전용 평수',dec(r.pyeong),'평'],['전용률',r.supply?dec(r.efficiency):'—',r.supply?'%':'']]);
  let body='';
  if(views.area==='table')body=`<p class="panel-subtitle">같은 전용면적의 단위 변환입니다. 공급 평형을 뜻하지 않아요.</p><div class="table-wrap"><table><thead><tr><th scope="col">전용면적 (㎡)</th><th scope="col">같은 면적 (평)</th></tr></thead><tbody>${[33,49,59,74,84,99,114,132,165].map(n=>`<tr><th scope="row">${n}㎡</th><td>${dec(n/M2_PER_PYEONG)}평</td></tr>`).join('')}</tbody></table></div>`;
  else body=`<div class="chart-head"><h3>전용면적과 가격</h3><span class="live-badge">같은 기준으로 비교</span></div><div class="area-visual"><div class="area-box" style="width:${Math.min(240,110+Math.sqrt(r.m2)*8)}px;height:${Math.min(150,70+Math.sqrt(r.m2)*5)}px"><strong>${dec(r.m2)}㎡</strong><span>전용 ${dec(r.pyeong)}평</span></div></div><p class="helper">면적 이해를 돕는 도식이며 실제 평면도나 축척이 아닙니다.</p><div class="deduction-list"><div class="deduction-row"><span>입력한 주택가격</span><strong>${r.price?fmt(r.price)+'원':'가격을 입력해 주세요'}</strong></div><div class="deduction-row"><span>전용면적 기준 평단가<small>주택가격 ÷ 전용 평수</small></span><strong>${r.price?fmt(r.perPyeong)+'원 / 평':'—'}</strong></div><div class="deduction-row"><span>전용 ㎡당 가격</span><strong>${r.price?fmt(r.perM2)+'원 / ㎡':'—'}</strong></div>${r.supply?`<div class="deduction-row"><span>입력한 공급면적</span><strong>${dec(r.supply)}㎡ · ${dec(r.supply/M2_PER_PYEONG)}평</strong></div><div class="deduction-row"><span>공급면적 기준 평단가<small>주택가격 ÷ 공급 평수</small></span><strong>${r.price?fmt(r.supplyPerPyeong)+'원 / 평':'—'}</strong></div>`:''}</div>`;
  out+=panel([['conversion','면적·평단가'],['table','자주 쓰는 면적']],body);
  out+=note(`<strong>전용 ${dec(r.m2)}㎡는 전용 ${dec(r.pyeong)}평</strong>이에요. 공급면적은 건물마다 다르므로 매물에 표시된 값을 별도로 입력해 주세요.`);
  return out;
}
function renderResults(){
  const s=states[page];
  if(page==='savings'){if(s.taxMode==='normal')s.tax=15.4;else if(s.taxMode==='free')s.tax=0;else if(s.taxMode!=='custom')s.tax=NaN;}
  try{
    const calculate={loan,savings,salary,area}[page];lastResult=calculate(s);
    $('input-error').hidden=true;
    $('results').innerHTML={loan:loanResult,savings:savingsResult,salary:salaryResult,area:areaResult}[page](lastResult);
  }catch(err){lastResult=null;$('input-error').textContent=err.message;$('input-error').hidden=false;$('results').innerHTML=`<div class="error-result">${icon('sliders')}입력 조건을 확인하면<br>계산 결과가 바로 표시돼요.</div>`;}
}
function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('show');toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
function openModal(title,body){$('modal-title').textContent=title;$('modal-body').innerHTML=body;if(!$('modal').open)$('modal').showModal();}
function savedItems(){
  try{
    const data=JSON.parse(localStorage.getItem(STORAGE)||'[]');
    if(!Array.isArray(data))return [];
    return data.filter(x=>{
      if(!x||typeof x.id!=='string'||!Object.hasOwn(defaults,x.page)||!x.state||typeof x.state!=='object')return false;
      // Discard malformed local records before their fields reach the UI.
      return Object.entries(defaults[x.page]).every(([key,value])=>
        typeof value==='number'?typeof x.state[key]==='number'&&Number.isFinite(x.state[key]):
        typeof x.state[key]==='string'&&x.state[key].length<24);
    }).slice(0,30);
  }catch{return [];}
}
function updateCount(){$('saved-count').textContent=savedItems().length;}
function save(){
  if(!lastResult)return;
  const items=savedItems(),serialized=JSON.stringify(states[page]);
  if(items.some(x=>x.page===page&&JSON.stringify(x.state)===serialized)){toast('같은 조건이 이미 저장돼 있어요.');return;}
  if(items.length>=30){toast('최대 30개까지 저장할 수 있어요. 기존 계산을 삭제해 주세요.');return;}
  try{
    const id=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
    items.unshift({id,page,state:{...states[page]},at:Date.now()});
    localStorage.setItem(STORAGE,JSON.stringify(items));updateCount();toast('이 브라우저에 계산을 저장했어요.');
  }catch{toast('브라우저의 저장 공간을 사용할 수 없어요. 결과 링크나 CSV를 이용해 주세요.');}
}
function savedTitle(item){
  const s=item.state;
  return {loan:()=>`대출 ${korean(s.principal)} · ${Object.hasOwn(methods,s.method)?methods[s.method]:'조건 확인'}`,savings:()=>`${s.mode==='deposit'?'예금':s.mode==='installment'?'적금':'목표 저축'} ${korean(s.amount)}`,salary:()=>`${s.mode==='annual'?'연봉':'월급'} ${korean(s.amount)}`,area:()=>`전용 ${dec(s.size)}${s.unit==='pyeong'?'평':'㎡'}`}[item.page]();
}
function showSaved(){const items=savedItems();openModal('저장한 계산',items.length?`<p>현재 브라우저에 저장한 조건입니다. 다시 열면 이 사이트의 현재 계산 기준을 적용합니다.</p>${items.map(x=>`<div class="saved-item"><button class="saved-load" data-load="${esc(x.id)}"><strong>${savedTitle(x)}</strong><small>${Number.isFinite(x.at)?new Date(x.at).toLocaleDateString('ko-KR'):''} 저장 · 눌러서 다시 계산</small></button><button class="icon-button" data-delete="${esc(x.id)}" aria-label="계산 삭제">삭제</button></div>`).join('')}`:`<div class="empty-state">${icon('save')}<strong>아직 저장한 계산이 없어요.</strong><p>결과 아래 ‘계산 저장’을 누르면<br>여기에서 다시 볼 수 있어요.</p></div>`);}
async function share(){
  const hash=`#${page}?${new URLSearchParams(states[page])}`;
  const url=location.origin+location.pathname+hash;
  try{await navigator.clipboard.writeText(url);toast('금액과 조건이 포함된 결과 링크를 복사했어요.');}
  catch{openModal('결과 링크 복사',`<p>아래 링크에는 입력한 금액과 조건이 포함됩니다. 공유할 상대를 확인해 주세요.</p><label class="field-label" for="copy-url">공유할 링크</label><input class="select-field" id="copy-url" readonly value="${esc(url)}"><p>링크를 선택해 복사하세요.</p>`);$('copy-url').select();}
}
function exportCsv(){
  const r=lastResult,s=states[page];if(!r)return;
  let rows=[['한눈에 금융',PAGE_INFO[page][3]],['계산 기준 확인일','2026-10-10'],['계산 조건',JSON.stringify(s)],[]];
  if(page==='loan')rows.push(['총이자',r.totalInterest],['총상환액',r.total],[],['회차','상환금(원)','원금(원)','이자(원)','잔여 원금(원)'],...r.schedule.map(x=>[x.month,x.payment,x.principal,x.interest,x.balance]));
  if(page==='savings')rows.push(['세후 만기액',r.total],['이자 세금',r.taxAmount],[],['개월','납입액(원)','누적 원금(원)','누적 세전 이자(원)','세전 잔액(원)'],...r.schedule.map(x=>[x.month,x.deposit,x.principal,x.interest,x.balance]));
  if(page==='salary')rows.push(['월 세전 급여',r.monthly],['월 비과세액',r.nonTax],...deductionLabels.map(([key,label])=>[label,r[key]]),['월 실수령액',r.net],['실수령액 연 환산',r.annualNet],[],['세전 연봉','월 세전 급여','월 공제액','월 실수령액'],...salaryComparisons().map(x=>[x.amount,x.monthly,x.deductions,x.net]));
  if(page==='area')rows.push(['전용면적(㎡)',r.m2],['전용면적(평)',r.pyeong],['주택가격(원)',r.price],['전용 평단가(원/평)',Math.round(r.perPyeong)],['전용 ㎡당 가격(원/㎡)',Math.round(r.perM2)],['공급면적(㎡)',r.supply||'미입력'],['공급 평단가(원/평)',r.supply?Math.round(r.supplyPerPyeong):'미입력'],['전용률(%)',r.supply?r.efficiency:'미입력']);
  const url=URL.createObjectURL(new Blob([csv(rows)],{type:'text/csv;charset=utf-8;'}));
  const a=document.createElement('a');a.href=url;a.download=`한눈에-${page}-${new Date().toISOString().slice(0,10)}.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('계산 내역을 CSV로 내려받았어요.');
}
function convertInput(field,unitField,nextUnit,convert){
  const s=states[page],memo=conversions[page];
  if(s[unitField]===nextUnit||!Number.isFinite(s[field]))return;
  if(memo&&memo.from===nextUnit&&memo.to===s[unitField]&&memo.converted===s[field]){
    s[field]=memo.original;conversions[page]=null;
  }else{
    const original=s[field],converted=convert(original);
    conversions[page]={from:s[unitField],to:nextUnit,original,converted};s[field]=converted;
  }
}
function changeSetting(key,value){
  const s=states[page];if(!Object.hasOwn(s,key))return;
  if(page==='salary'&&key==='mode')convertInput('amount','mode',value,n=>value==='monthly'?Math.floor(n/12):n*12);
  if(page==='savings'&&key==='mode'&&s.mode!==value)s.amount=value==='installment'?500000:10000000;
  if(page==='area'&&key==='unit')convertInput('size','unit',value,n=>Number((value==='pyeong'?n*121/400:n*400/121).toPrecision(15)));
  if(page==='loan'&&key==='method'&&value==='bullet')s.grace=0;
  s[key]=typeof defaults[page][key]==='number'?Number(value):value;
  renderForm();renderResults();
  const button=document.querySelector(`[data-set="${key}"][data-value="${value}"]`);if(button)button.focus({preventScroll:true});
}
$('form-area').addEventListener('input',e=>{
  const el=e.target,key=el.dataset.field;if(!key||el.tagName==='SELECT')return;
  let n=numeric(el.value);if(n===null&&el.dataset.optional)n=0;
  states[page][key]=n;
  if((page==='salary'&&key==='amount')||(page==='area'&&key==='size'))conversions[page]=null;
  if(el.dataset.money)$(`hint-${key}`).textContent=korean(n);
  if(page==='loan'&&key==='months')$('hint-months').textContent=Number.isFinite(n)?`${dec(n/12,1)}년`:'';
  renderResults();
});
$('form-area').addEventListener('change',e=>{
  const key=e.target.dataset.field;if(!key||e.target.tagName!=='SELECT')return;
  states[page][key]=typeof defaults[page][key]==='number'?Number(e.target.value):e.target.value;
  if(key==='taxMode'){renderForm();$('f-taxMode').focus({preventScroll:true});}renderResults();
});
$('form-area').addEventListener('focusout',e=>{
  const key=e.target.dataset.field;if(e.target.dataset.money&&Number.isInteger(states[page][key]))e.target.value=fmt(states[page][key]);
});
document.addEventListener('click',e=>{
  const btn=e.target.closest('button');if(!btn)return;
  if(btn.dataset.preset){const key=btn.dataset.preset;states[page][key]=Number(btn.dataset.value);conversions[page]=null;renderForm();renderResults();$(`f-${key}`).focus({preventScroll:true});}
  else if(btn.dataset.set)changeSetting(btn.dataset.set,btn.dataset.value);
  else if(btn.dataset.view){views[page]=btn.dataset.view;renderResults();document.querySelector(`[data-view="${btn.dataset.view}"]`)?.focus({preventScroll:true});}
  else if(btn.dataset.action==='save')save();
  else if(btn.dataset.action==='share')share();
  else if(btn.dataset.action==='csv')exportCsv();
  else if(btn.dataset.load){const item=savedItems().find(x=>x.id===btn.dataset.load);if(item){states[item.page]=hydrate(item.page,item.state);page=item.page;conversions[page]=null;history.replaceState(null,'',`#${page}`);$('modal').close();renderPage();$('page-title').scrollIntoView({block:'start',behavior:'smooth'});toast('저장한 조건을 불러왔어요.');}}
  else if(btn.dataset.delete){try{localStorage.setItem(STORAGE,JSON.stringify(savedItems().filter(x=>x.id!==btn.dataset.delete)));updateCount();showSaved();toast('계산을 삭제했어요.');}catch{toast('저장 공간을 사용할 수 없어요.');}}
});
$('reset').addEventListener('click',()=>{states[page]=structuredClone(defaults[page]);conversions[page]=null;history.replaceState(null,'',`#${page}`);renderForm();renderResults();toast('기본 조건으로 되돌렸어요.');});
$('saved-open').addEventListener('click',showSaved);
$('standards-open').addEventListener('click',()=>openModal('계산 기준과 출처',SOURCES));
$('sources-open').addEventListener('click',()=>openModal('계산 기준과 출처',SOURCES));
$('modal-close').addEventListener('click',()=>$('modal').close());
$('modal').addEventListener('click',e=>{if(e.target===$('modal')){const box=$('modal').getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)$('modal').close();}});
window.addEventListener('hashchange',route);
window.addEventListener('storage',updateCount);
$('saved-icon').innerHTML=icon('save');$('lock-icon').innerHTML=icon('lock');
updateCount();route();
