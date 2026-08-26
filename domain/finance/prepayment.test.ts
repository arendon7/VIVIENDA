import { describe, expect, it } from "vitest";
import {
  compareConstantPaymentPrepayment,
  simulateConstantPaymentPesoLoan,
} from "./prepayment";

const baselineInput = {
  principal: 200_000_000,
  annualEffectiveRate: 0.12,
  remainingMonths: 180,
};

function expectWithin(actual: number, expected: number, tolerance: number) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

describe("fixed-peso constant-payment prepayment engine", () => {
  it("matches TV-PESOS-ANN-001 baseline", () => {
    const result = simulateConstantPaymentPesoLoan(baselineInput);

    expectWithin(result.monthlyEffectiveRate, 0.009488792934583046, 1e-12);
    expectWithin(result.contractualPayment, 2_321_974.68, 1);
    expect(result.payoffMonth).toBe(180);
    expectWithin(result.totalInterest, 217_955_442.33, 5);
    expect(Math.abs(result.endingPrincipal)).toBeLessThan(1);
  });

  it("matches TV-PESOS-ANN-002 recurring COP 200k", () => {
    const comparison = compareConstantPaymentPrepayment({
      ...baselineInput,
      recurringExtraPrincipal: 200_000,
    });

    expect(comparison.scenario.payoffMonth).toBe(148);
    expect(comparison.termReductionMonths).toBe(32);
    expectWithin(comparison.scenario.totalInterest, 172_874_680.53, 5);
    expectWithin(comparison.interestAvoided, 45_080_761.81, 10);
    expect(comparison.userExtraPrincipal).toBe(29_400_000);
  });

  it("matches TV-PESOS-ANN-003 one-time COP 20m at month 1", () => {
    const comparison = compareConstantPaymentPrepayment({
      ...baselineInput,
      lumpSum: { month: 1, amount: 20_000_000 },
    });

    expect(comparison.scenario.payoffMonth).toBe(142);
    expect(comparison.termReductionMonths).toBe(38);
    expectWithin(comparison.scenario.totalInterest, 147_765_955.87, 5);
    expectWithin(comparison.interestAvoided, 70_189_486.47, 10);
    expect(comparison.userExtraPrincipal).toBe(20_000_000);
  });

  it("matches TV-PESOS-ANN-004 recurring COP 500k and caps final extra", () => {
    const comparison = compareConstantPaymentPrepayment({
      ...baselineInput,
      recurringExtraPrincipal: 500_000,
    });

    expect(comparison.scenario.payoffMonth).toBe(119);
    expect(comparison.termReductionMonths).toBe(61);
    expectWithin(comparison.scenario.totalInterest, 133_547_164.78, 5);
    expectWithin(comparison.interestAvoided, 84_408_277.56, 10);
    expect(comparison.userExtraPrincipal).toBe(59_000_000);
    expect(comparison.scenario.endingPrincipal).toBe(0);
  });

  it("caps a lump sum larger than the remaining balance", () => {
    const result = simulateConstantPaymentPesoLoan({
      principal: 10_000_000,
      annualEffectiveRate: 0.12,
      remainingMonths: 120,
      lumpSum: { month: 1, amount: 50_000_000 },
    });

    expect(result.payoffMonth).toBe(1);
    expect(result.endingPrincipal).toBe(0);
    expect(result.userExtraPrincipal).toBeLessThan(10_000_000);
  });

  it("supports a zero-interest edge case without annuity division errors", () => {
    const result = simulateConstantPaymentPesoLoan({
      principal: 12_000_000,
      annualEffectiveRate: 0,
      remainingMonths: 12,
    });

    expect(result.contractualPayment).toBe(1_000_000);
    expect(result.totalInterest).toBe(0);
    expect(result.payoffMonth).toBe(12);
  });

  it("rejects zero or negative principal/term inputs", () => {
    expect(() => simulateConstantPaymentPesoLoan({
      principal: 0,
      annualEffectiveRate: 0.12,
      remainingMonths: 12,
    })).toThrow();

    expect(() => simulateConstantPaymentPesoLoan({
      principal: 1_000_000,
      annualEffectiveRate: 0.12,
      remainingMonths: 0,
    })).toThrow();
  });
});
