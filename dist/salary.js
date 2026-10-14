import { assertRange } from './calc.js';
import { TAX_TABLE, TEN_MILLION_TAX } from './tax-table.js';

// Statutory table: Income Tax Act Enforcement Decree, Annex 2 (2026-02-27).
// Insurance parameters: ordinary workplace employee, July–December 2026.
export const RULES = Object.freeze({
  pensionRate: 0.0475, pensionMin: 410000, pensionMax: 6590000,
  healthRate: 0.03595, healthMin: 280528, healthMax: 127725730,
  careRatio: 0.9448 / 7.19, employmentRate: 0.009,
  taxEffective: '2026-03-01', pensionEffective: '2026-07-01',
});
export const floor10 = n => Math.floor((n + 1e-7) / 10) * 10;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export function tableTax(monthlyTaxable, family=1) {
  const pay=assertRange(monthlyTaxable,0,1_000_000_000,'과세 월급');
  family=assertRange(family,1,11,'공제대상 가족 수',true);
  if(pay < 770000) return 0;
  if(pay < 10000000) {
    // Each lower bound is inclusive and upper bound is exclusive.
    let lo=0, hi=TAX_TABLE.length-1;
    while(lo<=hi) {
      const mid=(lo+hi)>>1, row=TAX_TABLE[mid];
      if(pay<row[0]) hi=mid-1;
      else if(pay>=row[1]) lo=mid+1;
      else return row[family+1];
    }
    throw new Error('간이세액표에서 해당 급여 구간을 찾지 못했어요.');
  }
  let extra=0;
  if(pay>87000000) extra=31034600+(pay-87000000)*0.45;
  else if(pay>45000000) extra=13394600+(pay-45000000)*0.42;
  else if(pay>30000000) extra=7394600+(pay-30000000)*0.4;
  else if(pay>28000000) extra=6610600+(pay-28000000)*0.98*0.4;
  else if(pay>14000000) extra=1397000+(pay-14000000)*0.98*0.38;
  else if(pay>10000000) extra=25000+(pay-10000000)*0.98*0.35;
  return TEN_MILLION_TAX[family-1]+extra;
}
export function salary({amount, mode='annual', nonTax=200000, family=1, children=0, withholding=100}) {
  amount=assertRange(amount,1,12_000_000_000,'세전 급여',true);
  if(!['annual','monthly'].includes(mode)) throw new Error('급여 입력 기준을 선택해 주세요.');
  const monthly=Math.floor(mode==='annual'?amount/12:amount);
  if(monthly>1_000_000_000) throw new Error('월 급여는 10억 원 이하로 입력해 주세요.');
  nonTax=assertRange(nonTax,0,Math.max(0,monthly-1),'월 비과세액',true);
  if(monthly<1) throw new Error('월 급여가 1원 이상이 되도록 입력해 주세요.');
  family=assertRange(family,1,11,'공제대상 가족 수',true);
  children=assertRange(children,0,family-1,'8~20세 자녀 수',true);
  withholding=Number(withholding);
  if(![80,100,120].includes(withholding)) throw new Error('원천징수 비율을 확인해 주세요.');
  const taxable=monthly-nonTax;
  const pensionBase=clamp(Math.floor(taxable/1000)*1000,RULES.pensionMin,RULES.pensionMax);
  const healthBase=clamp(taxable,RULES.healthMin,RULES.healthMax);
  const pension=floor10(pensionBase*RULES.pensionRate);
  const health=floor10(healthBase*RULES.healthRate);
  const care=floor10(health*RULES.careRatio);
  const employment=floor10(taxable*RULES.employmentRate);
  const beforeChildren=tableTax(taxable,family);
  const childCredit=children===0?0:children===1?20830:45830+(children-2)*33330;
  let income=floor10(Math.max(0,beforeChildren-childCredit)*withholding/100);
  if(income<1000) income=0;
  const local=floor10(income/10);
  const insurance=pension+health+care+employment;
  const deductions=insurance+income+local;
  const net=monthly-deductions;
  if(net<0) throw new Error('입력 급여가 추정 보험료보다 작아요. 가입 제외·감면 여부를 확인해 주세요.');
  return {amount,mode,monthly,nonTax,taxable,family,children,withholding,pensionBase,
    pension,health,care,employment,income,local,insurance,deductions,net,annualNet:net*12};
}
