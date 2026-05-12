export function estimateMonthlyPayment(price: number, downPayment: number, months: number, annualRate = 0.20) {
  const principal = Math.max(price - downPayment, 0);
  const monthlyRate = annualRate / 12;
  if (principal <= 0) return 0;
  const payment = (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
  return Math.round(payment);
}

export const TERMS = [12, 18, 24, 36, 48, 60] as const;
