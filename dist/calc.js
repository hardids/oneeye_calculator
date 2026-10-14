export const M2_PER_PYEONG = 400 / 121;
const finite = (v) => Number.isFinite(Number(v));
export function assertRange(value, min, max, label, integer=false) {
  const n = Number(value);
  if (!['number','string'].includes(typeof value) || String(value).trim() === '' || !finite(value) || n < min || n > max || (integer && !Number.isInteger(n))) throw new Error(`${label}: ${min.toLocaleString('ko-KR',{maximumFractionDigits:8})}~${max.toLocaleString('ko-KR',{maximumFractionDigits:8})}${integer ? ' 사이의 정수' : ' 범위'}를 입력해 주세요.`);
  return n;
}
export function loan({principal, rate, months, grace=0, method='equal'}) {
  principal=assertRange(principal,1,100_000_000_000,'대출금',true);
  rate=assertRange(rate,0,100,'연 금리');
  months=assertRange(months,1,600,'대출기간(개월)',true);
  if (!['equal','principal','bullet'].includes(method)) throw new Error('상환방식을 선택해 주세요.');
  grace = method === 'bullet' ? 0 : assertRange(grace,0,months-1,'거치기간(개월)',true);
  const r=rate/1200, n=months-grace;
  const installment = r === 0 ? principal/n : principal*r/(-Math.expm1(-n*Math.log1p(r)));
  const schedule=[]; let balance=principal;
  for(let m=1;m<=months;m++) {
    const interest=Math.round(balance*r);
    let capital=0;
    if(method==='bullet') capital=m===months?balance:0;
    else if(m>grace) capital=m===months?balance:Math.min(balance,Math.max(0,Math.round(method==='equal'?installment-interest:principal/n)));
    balance-=capital;
    schedule.push({month:m,payment:capital+interest,principal:capital,interest,balance});
  }
  const totalInterest=schedule.reduce((a,b)=>a+b.interest,0);
  return {schedule,totalInterest,total:principal+totalInterest,first:schedule[0].payment,regular:schedule[grace].payment,last:schedule.at(-1).payment,principal,months,rate,method,grace};
}
export function savings({mode='deposit',amount,rate,months,interest='simple',tax=15.4}) {
  amount=assertRange(amount,1,100_000_000_000,mode==='goal'?'목표금액':'금액',true);
  rate=assertRange(rate,0,100,'연 금리'); months=assertRange(months,1,600,'저축기간(개월)',true); tax=assertRange(tax,0,100,'세율');
  if(!['deposit','installment','goal'].includes(mode)||!['simple','compound'].includes(interest)) throw new Error('계산 조건을 확인해 주세요.');
  const r=rate/1200;
  const f=interest==='simple'?r*months*(months+1)/2:(r===0?0:(1+r)*Math.expm1(months*Math.log1p(r))/r-months);
  const monthly=mode==='goal'?Math.ceil(amount/(months+f*(1-tax/100))):amount;
  const schedule=[]; let contributed=0,earned=0,balance=0;
  for(let month=1;month<=months;month++) {
    const deposit=mode==='deposit'?(month===1?amount:0):monthly;
    contributed+=deposit; balance+=deposit;
    const added=(interest==='compound'?balance:contributed)*r;
    earned+=added; balance=contributed+earned;
    schedule.push({month,deposit,principal:contributed,interest:Math.round(earned),balance:Math.round(balance)});
  }
  const grossInterest=Math.round(earned), taxAmount=Math.floor(grossInterest*tax/100), netInterest=grossInterest-taxAmount;
  if (!Number.isSafeInteger(contributed+grossInterest)) throw new Error('예상 금액이 계산 가능한 범위를 넘어요. 금리 또는 기간을 줄여 주세요.');
  return {mode,amount,rate,months,interest,tax,monthly,principal:contributed,grossInterest,taxAmount,netInterest,total:contributed+netInterest,schedule};
}
export function area({size,unit='m2',price=0,supply=0}) {
  if(!['m2','pyeong'].includes(unit)) throw new Error('면적 단위를 확인해 주세요.');
  // Apply the same physical limits regardless of the selected display unit.
  const factor=unit==='pyeong'?121/400:1;
  size=assertRange(size,0.01*factor,1_000_000*factor,`전용면적(${unit==='pyeong'?'평':'㎡'})`);
  price=assertRange(price,0,1_000_000_000_000,'주택가격',true); supply=assertRange(supply,0,1_000_000,'공급면적');
  const m2=unit==='pyeong'?size*400/121:size, pyeong=m2*121/400;
  if(supply>0&&supply<m2-1e-8) throw new Error('공급면적은 전용면적보다 작을 수 없어요.');
  return {m2,pyeong,price,perPyeong:price?price/pyeong:0,perM2:price?price/m2:0,supply,efficiency:supply?m2/supply*100:0,supplyPerPyeong:supply&&price?price/(supply/M2_PER_PYEONG):0};
}
export function csv(rows) { return '\ufeff'+rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n'); }
