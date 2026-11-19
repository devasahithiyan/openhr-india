// Illustrative Indian payroll calculations for the demo.
// Rates are simplified sample values, not tax or legal advice.
// The real app keeps these in versioned config by financial year and state.

import type { Employee, IndianState } from "./data";

export const PF_WAGE_CEILING = 15000;
export const ESI_GROSS_LIMIT = 21000;

export type Regime = "new" | "old";

export interface Declarations {
  sec80C: number; // max 1,50,000
  sec80D: number; // health insurance, simplified cap 25,000
}

export interface Payslip {
  basic: number;
  hra: number;
  special: number;
  gross: number;
  pf: number;
  esi: number;
  pt: number;
  tds: number;
  totalDeductions: number;
  net: number;
  employerPf: number;
  employerEsi: number;
}

export function professionalTax(state: IndianState, gross: number, month: number): number {
  switch (state) {
    case "Karnataka":
      return gross >= 25000 ? 200 : 0;
    case "Maharashtra":
      if (gross > 10000) return month === 2 ? 300 : 200;
      if (gross > 7500) return 175;
      return 0;
    case "Tamil Nadu":
      // Levied half-yearly; shown here as a monthly equivalent.
      if (gross > 12500) return 208;
      if (gross > 10000) return 171;
      return 0;
  }
}

function slabTax(income: number, slabs: [number, number][]): number {
  let tax = 0;
  let lower = 0;
  for (const [upper, rate] of slabs) {
    if (income <= lower) break;
    tax += (Math.min(income, upper) - lower) * rate;
    lower = upper;
  }
  return tax;
}

export function annualTax(annualGross: number, regime: Regime, decl: Declarations): { taxable: number; tax: number } {
  if (regime === "new") {
    const taxable = Math.max(0, annualGross - 75000);
    let tax = slabTax(taxable, [
      [400000, 0],
      [800000, 0.05],
      [1200000, 0.1],
      [1600000, 0.15],
      [2000000, 0.2],
      [2400000, 0.25],
      [Infinity, 0.3],
    ]);
    // Section 87A rebate up to 12 lakh, with marginal relief just above it.
    if (taxable <= 1200000) tax = 0;
    else tax = Math.min(tax, taxable - 1200000);
    return { taxable, tax: Math.round(tax * 1.04) };
  }
  const deductions = 50000 + Math.min(decl.sec80C, 150000) + Math.min(decl.sec80D, 25000);
  const taxable = Math.max(0, annualGross - deductions);
  let tax = slabTax(taxable, [
    [250000, 0],
    [500000, 0.05],
    [1000000, 0.2],
    [Infinity, 0.3],
  ]);
  if (taxable <= 500000) tax = 0;
  return { taxable, tax: Math.round(tax * 1.04) };
}

export function computePayslip(e: Employee, month = 11): Payslip {
  const gross = e.monthlyGross;
  const basic = Math.round(gross * 0.5);
  const hra = Math.round(basic * 0.4);
  const special = gross - basic - hra;
  const pfWage = Math.min(basic, PF_WAGE_CEILING);
  const pf = Math.round(pfWage * 0.12);
  const esiApplies = gross <= ESI_GROSS_LIMIT;
  const esi = esiApplies ? Math.ceil(gross * 0.0075) : 0;
  const pt = professionalTax(e.state, gross, month);
  const { tax } = annualTax(gross * 12, e.regime, e.declarations);
  const tds = Math.round(tax / 12);
  const totalDeductions = pf + esi + pt + tds;
  return {
    basic,
    hra,
    special,
    gross,
    pf,
    esi,
    pt,
    tds,
    totalDeductions,
    net: gross - totalDeductions,
    employerPf: pf,
    employerEsi: esiApplies ? Math.ceil(gross * 0.0325) : 0,
  };
}

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
export const rupees = (n: number) => `₹${inr.format(n)}`;
export const indian = (n: number) => inr.format(n);

const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ones[n];
  return `${tens[Math.floor(n / 10)]}${n % 10 ? "-" + ones[n % 10] : ""}`;
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? `${ones[h]} Hundred` : "", rest ? twoDigits(rest) : ""].filter(Boolean).join(" ");
}

/** Indian numbering in words: crore, lakh, thousand. */
export function inWords(amount: number): string {
  let n = Math.round(amount);
  if (n === 0) return "Rupees Zero Only";
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (n) parts.push(threeDigits(n));
  return `Rupees ${parts.join(" ")} Only`;
}
