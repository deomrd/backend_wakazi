const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateExpectedCash, calculateInitialPayment, calculateNetProfit } = require("../dist/shared/business/financialCalculations.js");

test("calcule la caisse attendue avec toutes les entrées et sorties", () => {
  const result = calculateExpectedCash({
    opening: 100,
    sales: 800,
    customerDebtPayments: 120,
    contributions: 50,
    manualIn: 30,
    expenses: 90,
    purchases: 200,
    supplierDebtPayments: 40,
    contributionWithdrawals: 20,
    refunds: 60,
    manualOut: 10,
  });
  assert.equal(result.toFixed(2), "680.00");
});

test("calcule chiffre d'affaires net, marge brute et bénéfice net", () => {
  const result = calculateNetProfit({ revenue: 1500, refunds: 100, costOfGoods: 800, expenses: 250 });
  assert.equal(result.netRevenue.toFixed(2), "1400.00");
  assert.equal(result.grossProfit.toFixed(2), "600.00");
  assert.equal(result.netProfit.toFixed(2), "350.00");
});

test("isole le paiement initial sans recompter les règlements de dette", () => {
  const result = calculateInitialPayment(100, [20, 30]);
  assert.equal(result.toFixed(2), "50.00");
});

test("protège les rapports contre un historique de paiements incohérent", () => {
  const result = calculateInitialPayment(20, [30]);
  assert.equal(result.toFixed(2), "0.00");
});
