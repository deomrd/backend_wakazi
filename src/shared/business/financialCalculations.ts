import { Prisma } from "@prisma/client";

export interface CashExpectedInput {
  opening: Prisma.Decimal.Value;
  sales: Prisma.Decimal.Value;
  customerDebtPayments: Prisma.Decimal.Value;
  contributions: Prisma.Decimal.Value;
  manualIn: Prisma.Decimal.Value;
  expenses: Prisma.Decimal.Value;
  purchases: Prisma.Decimal.Value;
  supplierDebtPayments: Prisma.Decimal.Value;
  contributionWithdrawals: Prisma.Decimal.Value;
  refunds: Prisma.Decimal.Value;
  manualOut: Prisma.Decimal.Value;
}

export function calculateExpectedCash(input: CashExpectedInput): Prisma.Decimal {
  return new Prisma.Decimal(input.opening)
    .plus(input.sales)
    .plus(input.customerDebtPayments)
    .plus(input.contributions)
    .plus(input.manualIn)
    .minus(input.expenses)
    .minus(input.purchases)
    .minus(input.supplierDebtPayments)
    .minus(input.contributionWithdrawals)
    .minus(input.refunds)
    .minus(input.manualOut);
}

export function calculateInitialPayment(
  currentPaid: Prisma.Decimal.Value,
  laterPayments: Prisma.Decimal.Value[]
): Prisma.Decimal {
  const laterTotal = laterPayments.reduce<Prisma.Decimal>(
    (total, payment) => total.plus(payment),
    new Prisma.Decimal(0)
  );
  const initialPayment = new Prisma.Decimal(currentPaid).minus(laterTotal);

  return initialPayment.isNegative() ? new Prisma.Decimal(0) : initialPayment;
}

export function calculateNetProfit(input: {
  revenue: Prisma.Decimal.Value;
  refunds: Prisma.Decimal.Value;
  costOfGoods: Prisma.Decimal.Value;
  expenses: Prisma.Decimal.Value;
}): { netRevenue: Prisma.Decimal; grossProfit: Prisma.Decimal; netProfit: Prisma.Decimal } {
  const netRevenue = new Prisma.Decimal(input.revenue).minus(input.refunds);
  const grossProfit = netRevenue.minus(input.costOfGoods);
  return { netRevenue, grossProfit, netProfit: grossProfit.minus(input.expenses) };
}
