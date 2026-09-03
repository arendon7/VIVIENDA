export type LumpSumPrepayment = {
  month: number;
  amount: number;
};

export type ConstantPaymentInput = {
  principal: number;
  annualEffectiveRate: number;
  remainingMonths: number;
  recurringExtraPrincipal?: number;
  lumpSum?: LumpSumPrepayment;
};

export type AmortizationPeriod = {
  month: number;
  openingBalance: number;
  interest: number;
  scheduledPrincipal: number;
  scheduledPayment: number;
  extraPrincipal: number;
  endingBalance: number;
};

export type ConstantPaymentResult = {
  monthlyEffectiveRate: number;
  contractualPayment: number;
  payoffMonth: number;
  totalInterest: number;
  userExtraPrincipal: number;
  endingPrincipal: number;
  periods: AmortizationPeriod[];
};

export type PrepaymentComparison = {
  baseline: ConstantPaymentResult;
  scenario: ConstantPaymentResult;
  interestAvoided: number;
  termReductionMonths: number;
  userExtraPrincipal: number;
};

export type ImmediatePrepaymentChoiceInput = {
  principal: number;
  annualEffectiveRate: number;
  remainingMonths: number;
  lumpSumAmount: number;
};

export type ImmediatePrepaymentChoiceScenario = {
  scheduledPayment: number;
  payoffMonth: number;
  totalInterest: number;
  interestAvoided: number;
  termReductionMonths: number;
  paymentReduction: number;
  paymentReductionPercent: number;
};

export type ImmediatePrepaymentChoiceComparison = {
  baseline: ConstantPaymentResult;
  lumpSumAmount: number;
  principalAfterPrepayment: number;
  reduceTerm: ImmediatePrepaymentChoiceScenario;
  reducePayment: ImmediatePrepaymentChoiceScenario;
};

export class InvalidFinanceInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidFinanceInputError";
  }
}

export class NonAmortizingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NonAmortizingInputError";
  }
}

const EPSILON = 1e-7;
const MAX_PERIODS = 1200;

function requirePositive(name: string, value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new InvalidFinanceInputError(`${name} must be a finite positive number.`);
  }
}

function requireNonNegative(name: string, value: number) {
  if (!Number.isFinite(value) || value < 0) {
    throw new InvalidFinanceInputError(`${name} must be a finite non-negative number.`);
  }
}

export function annualEffectiveToMonthly(annualEffectiveRate: number) {
  requireNonNegative("annualEffectiveRate", annualEffectiveRate);
  return Math.pow(1 + annualEffectiveRate, 1 / 12) - 1;
}

export function constantPayment(
  principal: number,
  monthlyRate: number,
  months: number,
) {
  requirePositive("principal", principal);
  requireNonNegative("monthlyRate", monthlyRate);
  requirePositive("months", months);

  if (!Number.isInteger(months)) {
    throw new InvalidFinanceInputError("months must be an integer.");
  }

  if (monthlyRate === 0) return principal / months;

  return (
    (principal * monthlyRate) /
    (1 - Math.pow(1 + monthlyRate, -months))
  );
}

function simulateFixedScheduledPaymentPesoLoan(input: {
  principal: number;
  annualEffectiveRate: number;
  scheduledPayment: number;
}): ConstantPaymentResult {
  requirePositive("principal", input.principal);
  requireNonNegative("annualEffectiveRate", input.annualEffectiveRate);
  requirePositive("scheduledPayment", input.scheduledPayment);

  const monthlyEffectiveRate = annualEffectiveToMonthly(input.annualEffectiveRate);
  let balance = input.principal;
  let totalInterest = 0;
  const periods: AmortizationPeriod[] = [];

  for (let month = 1; balance > EPSILON; month += 1) {
    if (month > MAX_PERIODS) {
      throw new NonAmortizingInputError(
        "Simulation exceeded maximum supported periods.",
      );
    }

    const openingBalance = balance;
    const interest = openingBalance * monthlyEffectiveRate;

    if (input.scheduledPayment + EPSILON < interest) {
      throw new NonAmortizingInputError(
        "Scheduled payment is lower than accrued interest.",
      );
    }

    const plannedScheduledPrincipal = input.scheduledPayment - interest;
    const scheduledPrincipal = Math.min(
      openingBalance,
      Math.max(0, plannedScheduledPrincipal),
    );
    const scheduledPayment = interest + scheduledPrincipal;

    balance = Math.max(0, openingBalance - scheduledPrincipal);
    totalInterest += interest;

    periods.push({
      month,
      openingBalance,
      interest,
      scheduledPrincipal,
      scheduledPayment,
      extraPrincipal: 0,
      endingBalance: Math.max(0, balance),
    });
  }

  return {
    monthlyEffectiveRate,
    contractualPayment: input.scheduledPayment,
    payoffMonth: periods.length,
    totalInterest,
    userExtraPrincipal: 0,
    endingPrincipal: Math.max(0, balance),
    periods,
  };
}

export function simulateConstantPaymentPesoLoan(
  input: ConstantPaymentInput,
): ConstantPaymentResult {
  requirePositive("principal", input.principal);
  requireNonNegative("annualEffectiveRate", input.annualEffectiveRate);
  requirePositive("remainingMonths", input.remainingMonths);

  if (!Number.isInteger(input.remainingMonths)) {
    throw new InvalidFinanceInputError("remainingMonths must be an integer.");
  }

  const recurringExtraPrincipal = input.recurringExtraPrincipal ?? 0;
  requireNonNegative("recurringExtraPrincipal", recurringExtraPrincipal);

  if (input.lumpSum) {
    requirePositive("lumpSum.amount", input.lumpSum.amount);
    requirePositive("lumpSum.month", input.lumpSum.month);
    if (!Number.isInteger(input.lumpSum.month)) {
      throw new InvalidFinanceInputError("lumpSum.month must be an integer.");
    }
  }

  const monthlyEffectiveRate = annualEffectiveToMonthly(
    input.annualEffectiveRate,
  );
  const contractualPayment = constantPayment(
    input.principal,
    monthlyEffectiveRate,
    input.remainingMonths,
  );

  let balance = input.principal;
  let totalInterest = 0;
  let userExtraPrincipal = 0;
  const periods: AmortizationPeriod[] = [];

  for (let month = 1; balance > EPSILON; month += 1) {
    if (month > MAX_PERIODS) {
      throw new NonAmortizingInputError(
        "Simulation exceeded maximum supported periods.",
      );
    }

    const openingBalance = balance;
    const interest = openingBalance * monthlyEffectiveRate;

    if (contractualPayment + EPSILON < interest) {
      throw new NonAmortizingInputError(
        "Scheduled payment is lower than accrued interest.",
      );
    }

    const plannedScheduledPrincipal = contractualPayment - interest;
    const scheduledPrincipal = Math.min(
      openingBalance,
      Math.max(0, plannedScheduledPrincipal),
    );
    const scheduledPayment = interest + scheduledPrincipal;

    balance = Math.max(0, openingBalance - scheduledPrincipal);
    totalInterest += interest;

    let extraPrincipal = 0;

    if (input.lumpSum?.month === month && balance > EPSILON) {
      const applied = Math.min(balance, input.lumpSum.amount);
      balance -= applied;
      extraPrincipal += applied;
    }

    if (recurringExtraPrincipal > 0 && balance > EPSILON) {
      const applied = Math.min(balance, recurringExtraPrincipal);
      balance -= applied;
      extraPrincipal += applied;
    }

    userExtraPrincipal += extraPrincipal;

    periods.push({
      month,
      openingBalance,
      interest,
      scheduledPrincipal,
      scheduledPayment,
      extraPrincipal,
      endingBalance: Math.max(0, balance),
    });
  }

  return {
    monthlyEffectiveRate,
    contractualPayment,
    payoffMonth: periods.length,
    totalInterest,
    userExtraPrincipal,
    endingPrincipal: Math.max(0, balance),
    periods,
  };
}

export function compareConstantPaymentPrepayment(
  input: ConstantPaymentInput,
): PrepaymentComparison {
  const baseline = simulateConstantPaymentPesoLoan({
    principal: input.principal,
    annualEffectiveRate: input.annualEffectiveRate,
    remainingMonths: input.remainingMonths,
  });

  const scenario = simulateConstantPaymentPesoLoan(input);

  return {
    baseline,
    scenario,
    interestAvoided: baseline.totalInterest - scenario.totalInterest,
    termReductionMonths: baseline.payoffMonth - scenario.payoffMonth,
    userExtraPrincipal: scenario.userExtraPrincipal,
  };
}

export function compareImmediatePartialPrepaymentChoices(
  input: ImmediatePrepaymentChoiceInput,
): ImmediatePrepaymentChoiceComparison {
  requirePositive("lumpSumAmount", input.lumpSumAmount);
  requirePositive("principal", input.principal);

  if (input.lumpSumAmount >= input.principal) {
    throw new InvalidFinanceInputError(
      "lumpSumAmount must be lower than principal for a partial-prepayment choice comparison.",
    );
  }

  const baseline = simulateConstantPaymentPesoLoan({
    principal: input.principal,
    annualEffectiveRate: input.annualEffectiveRate,
    remainingMonths: input.remainingMonths,
  });
  const principalAfterPrepayment = input.principal - input.lumpSumAmount;

  const reduceTermResult = simulateFixedScheduledPaymentPesoLoan({
    principal: principalAfterPrepayment,
    annualEffectiveRate: input.annualEffectiveRate,
    scheduledPayment: baseline.contractualPayment,
  });

  const reducePaymentResult = simulateConstantPaymentPesoLoan({
    principal: principalAfterPrepayment,
    annualEffectiveRate: input.annualEffectiveRate,
    remainingMonths: input.remainingMonths,
  });

  const reducePaymentAmount = baseline.contractualPayment - reducePaymentResult.contractualPayment;

  return {
    baseline,
    lumpSumAmount: input.lumpSumAmount,
    principalAfterPrepayment,
    reduceTerm: {
      scheduledPayment: baseline.contractualPayment,
      payoffMonth: reduceTermResult.payoffMonth,
      totalInterest: reduceTermResult.totalInterest,
      interestAvoided: baseline.totalInterest - reduceTermResult.totalInterest,
      termReductionMonths: baseline.payoffMonth - reduceTermResult.payoffMonth,
      paymentReduction: 0,
      paymentReductionPercent: 0,
    },
    reducePayment: {
      scheduledPayment: reducePaymentResult.contractualPayment,
      payoffMonth: reducePaymentResult.payoffMonth,
      totalInterest: reducePaymentResult.totalInterest,
      interestAvoided: baseline.totalInterest - reducePaymentResult.totalInterest,
      termReductionMonths: baseline.payoffMonth - reducePaymentResult.payoffMonth,
      paymentReduction: reducePaymentAmount,
      paymentReductionPercent: reducePaymentAmount / baseline.contractualPayment,
    },
  };
}
