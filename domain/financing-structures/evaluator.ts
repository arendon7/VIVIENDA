export type OwnershipTimingPreference =
  | "title_from_purchase"
  | "open_to_option_later_if_terms_fit"
  | "no_strong_preference"
  | "unknown";

export type PaymentBehaviorPreference =
  | "nominal_peso_predictability"
  | "open_to_inflation_linked_variation"
  | "compare_both"
  | "unknown";

export type FinancingConstraintContext =
  | "payment"
  | "down_payment"
  | "both"
  | "unknown";

export type ExplorePriority =
  | "explore_first"
  | "compare"
  | "secondary"
  | "needs_information";

export type FinancingStructureCode = "mortgage_credit" | "housing_leasing";
export type FinancingDenominationCode = "pesos" | "uvr";
export type FinancingStructuresPrecision = "C0" | "C1";
export type ProvenanceKind = "public_reference" | "user_preference" | "user_context";

export type FinancingStructuresInput = {
  ownershipTimingPreference: OwnershipTimingPreference;
  paymentBehaviorPreference: PaymentBehaviorPreference;
  constraintContext?: FinancingConstraintContext;
};

export type FinancingStructureOption = {
  code: FinancingStructureCode;
  priority: ExplorePriority;
  title: string;
  explanation: string;
  referenceFact: string;
  factsToVerify: string[];
  reasonCodes: string[];
  provenance: {
    referenceFact: "public_reference";
    priority: "user_preference";
  };
};

export type FinancingDenominationOption = {
  code: FinancingDenominationCode;
  priority: ExplorePriority;
  title: string;
  explanation: string;
  referenceFact: string;
  factsToVerify: string[];
  reasonCodes: string[];
  provenance: {
    referenceFact: "public_reference";
    priority: "user_preference";
  };
};

export type FinancingContextNotice = {
  code: "down_payment_constraint" | "payment_constraint";
  text: string;
  provenance: "user_context";
};

export type FinancingStructuresResult = {
  precision: FinancingStructuresPrecision;
  structureOptions: FinancingStructureOption[];
  denominationOptions: FinancingDenominationOption[];
  quoteChecklist: string[];
  contextNotices: FinancingContextNotice[];
  methodology: "financing_structure_preference_router_v1_2026_08";
  boundaries: {
    isEligibility: false;
    isApproval: false;
    isApprovalProbability: false;
    isBankMatch: false;
    isMarketQuote: false;
    isCostRanking: false;
  };
};

const QUOTE_CHECKLIST = [
  "Entidad o proveedor y fecha/vigencia de la cotización",
  "Estructura contractual: crédito hipotecario o leasing habitacional",
  "Denominación: pesos o UVR",
  "Sistema exacto de amortización o comportamiento del canon",
  "Monto efectivamente financiado",
  "Porcentaje del valor del inmueble efectivamente financiado",
  "Tasa y convención exacta de la tasa",
  "Plazo",
  "Primera cuota o canon",
  "Seguros y forma de cobro",
  "Costos o cargos de una sola vez informados por el proveedor",
  "Condiciones de prepagos o pagos adicionales cuando apliquen",
  "En leasing: valor o porcentaje y momento de la opción de adquisición",
  "Efectivo total requerido antes y durante el cierre",
  "Documento o canal fuente de la cotización",
] as const;

function structurePriorities(
  preference: OwnershipTimingPreference,
): Record<FinancingStructureCode, ExplorePriority> {
  switch (preference) {
    case "title_from_purchase":
      return { mortgage_credit: "explore_first", housing_leasing: "secondary" };
    case "open_to_option_later_if_terms_fit":
    case "no_strong_preference":
      return { mortgage_credit: "compare", housing_leasing: "compare" };
    case "unknown":
      return { mortgage_credit: "needs_information", housing_leasing: "needs_information" };
  }
}

function denominationPriorities(
  preference: PaymentBehaviorPreference,
): Record<FinancingDenominationCode, ExplorePriority> {
  switch (preference) {
    case "nominal_peso_predictability":
      return { pesos: "explore_first", uvr: "secondary" };
    case "open_to_inflation_linked_variation":
    case "compare_both":
      return { pesos: "compare", uvr: "compare" };
    case "unknown":
      return { pesos: "needs_information", uvr: "needs_information" };
  }
}

function structureExplanation(code: FinancingStructureCode, preference: OwnershipTimingPreference): string {
  if (preference === "unknown") {
    return code === "mortgage_credit"
      ? "Primero define si para ti es importante adquirir la propiedad desde la compra o si estás dispuesto a comparar una estructura con opción de adquisición posterior."
      : "Primero define si aceptarías que la entidad conserve la propiedad durante el contrato hasta un eventual ejercicio de la opción de adquisición.";
  }

  if (preference === "title_from_purchase") {
    return code === "mortgage_credit"
      ? "Está más alineado con tu preferencia de adquirir la propiedad desde la compra y respaldar la financiación con hipoteca."
      : "Está menos alineado con tu preferencia declarada porque en leasing la propiedad permanece en la entidad durante el contrato hasta la eventual transferencia por ejercicio de la opción.";
  }

  if (preference === "open_to_option_later_if_terms_fit") {
    return code === "mortgage_credit"
      ? "Sigue abierto para comparar: aceptar una opción de adquisición posterior no vuelve al leasing automáticamente mejor que un crédito hipotecario."
      : "Sigue abierto para comparar porque aceptas su estructura de propiedad, pero faltan condiciones comerciales reales para decidir entre alternativas.";
  }

  return code === "mortgage_credit"
    ? "No declaraste una preferencia fuerte sobre el momento de la propiedad, así que conviene mantener el crédito hipotecario para comparación."
    : "No declaraste una preferencia fuerte sobre el momento de la propiedad, así que conviene mantener el leasing para comparación.";
}

function denominationExplanation(
  code: FinancingDenominationCode,
  preference: PaymentBehaviorPreference,
): string {
  if (preference === "unknown") {
    return code === "pesos"
      ? "Define primero si priorizas previsibilidad nominal en pesos o si estás dispuesto a comparar una obligación cuyo valor en pesos puede variar con la UVR."
      : "Antes de priorizar UVR, confirma si entiendes y aceptas que su valor está ligado al IPC y que los valores expresados en pesos pueden variar.";
  }

  if (preference === "nominal_peso_predictability") {
    return code === "pesos"
      ? "Es la denominación más alineada con tu preferencia de previsibilidad nominal en pesos. La cotización real debe indicar el sistema exacto de amortización."
      : "Está menos alineada con tu preferencia porque la UVR está ligada al IPC y los valores expresados en pesos pueden variar. Esto no significa que UVR sea más costosa en todos los casos.";
  }

  if (preference === "open_to_inflation_linked_variation") {
    return code === "pesos"
      ? "Sigue abierta para comparar. Aceptar variación ligada a inflación no hace que UVR sea automáticamente superior a una alternativa en pesos."
      : "Sigue abierta para comparar porque aceptas evaluar variación ligada a UVR/IPC, pero hace falta una cotización concreta para comparar costo y flujo de caja.";
  }

  return code === "pesos"
    ? "Quieres comparar ambos comportamientos, así que pesos debe permanecer abierto hasta tener cotizaciones comparables."
    : "Quieres comparar ambos comportamientos, así que UVR debe permanecer abierto hasta tener cotizaciones comparables.";
}

function structureReasonCodes(
  code: FinancingStructureCode,
  preference: OwnershipTimingPreference,
): string[] {
  if (preference === "unknown") return ["ownership_preference_missing"];
  if (preference === "title_from_purchase") {
    return code === "mortgage_credit"
      ? ["immediate_title_preference_aligned"]
      : ["later_acquisition_option_conflicts_with_preference"];
  }
  if (preference === "open_to_option_later_if_terms_fit") {
    return code === "mortgage_credit"
      ? ["mortgage_remains_open_without_quote"]
      : ["later_acquisition_option_accepted", "commercial_terms_still_required"];
  }
  return ["no_strong_ownership_preference"];
}

function denominationReasonCodes(
  code: FinancingDenominationCode,
  preference: PaymentBehaviorPreference,
): string[] {
  if (preference === "unknown") return ["payment_behavior_preference_missing"];
  if (preference === "nominal_peso_predictability") {
    return code === "pesos"
      ? ["nominal_peso_predictability_aligned"]
      : ["inflation_linked_variation_conflicts_with_preference"];
  }
  if (preference === "open_to_inflation_linked_variation") {
    return code === "pesos"
      ? ["pesos_remains_open_without_quote"]
      : ["inflation_linked_variation_accepted", "commercial_terms_still_required"];
  }
  return ["explicit_compare_both_preference"];
}

function contextNotices(context: FinancingConstraintContext | undefined): FinancingContextNotice[] {
  if (context === "down_payment") {
    return [{
      code: "down_payment_constraint",
      text: "Tu inicial es hoy una restricción relevante. Pide a cada entidad el porcentaje realmente financiable y el efectivo total requerido. VIVIENDA no supone que leasing financie más que crédito hipotecario.",
      provenance: "user_context",
    }];
  }

  if (context === "payment") {
    return [{
      code: "payment_constraint",
      text: "Tu capacidad mensual es hoy una restricción relevante. Compara la cuota o canon real, seguros, costos recurrentes y comportamiento de la obligación; no solo el porcentaje financiado.",
      provenance: "user_context",
    }];
  }

  if (context === "both") {
    return [
      {
        code: "down_payment_constraint",
        text: "Tu inicial también limita el escenario. Pide el porcentaje realmente financiable y el efectivo total requerido; VIVIENDA no presume que leasing financie más.",
        provenance: "user_context",
      },
      {
        code: "payment_constraint",
        text: "Tu capacidad mensual también limita el escenario. Compara cuota o canon, seguros, costos recurrentes y comportamiento de la obligación.",
        provenance: "user_context",
      },
    ];
  }

  return [];
}

export function evaluateFinancingStructures(input: FinancingStructuresInput): FinancingStructuresResult {
  const structurePriority = structurePriorities(input.ownershipTimingPreference);
  const denominationPriority = denominationPriorities(input.paymentBehaviorPreference);

  const structureOptions: FinancingStructureOption[] = [
    {
      code: "mortgage_credit",
      priority: structurePriority.mortgage_credit,
      title: "Crédito hipotecario",
      explanation: structureExplanation("mortgage_credit", input.ownershipTimingPreference),
      referenceFact: "Financia la adquisición mediante un préstamo respaldado por una hipoteca sobre el inmueble.",
      factsToVerify: [
        "Porcentaje y monto efectivamente financiado",
        "Tasa, plazo y sistema de amortización",
        "Primera cuota, seguros y costos informados por la entidad",
      ],
      reasonCodes: structureReasonCodes("mortgage_credit", input.ownershipTimingPreference),
      provenance: { referenceFact: "public_reference", priority: "user_preference" },
    },
    {
      code: "housing_leasing",
      priority: structurePriority.housing_leasing,
      title: "Leasing habitacional",
      explanation: structureExplanation("housing_leasing", input.ownershipTimingPreference),
      referenceFact: "La entidad conserva la propiedad durante el contrato y la transferencia depende del ejercicio y pago de la opción de adquisición pactada.",
      factsToVerify: [
        "Porcentaje y monto efectivamente financiado",
        "Canon, tasa o convención aplicable y plazo",
        "Valor o porcentaje de la opción de adquisición, seguros y costos",
      ],
      reasonCodes: structureReasonCodes("housing_leasing", input.ownershipTimingPreference),
      provenance: { referenceFact: "public_reference", priority: "user_preference" },
    },
  ];

  const denominationOptions: FinancingDenominationOption[] = [
    {
      code: "pesos",
      priority: denominationPriority.pesos,
      title: "Pesos",
      explanation: denominationExplanation("pesos", input.paymentBehaviorPreference),
      referenceFact: "Existen sistemas aprobados de financiación de vivienda denominados en pesos; el comportamiento exacto depende del sistema de amortización y de la oferta concreta.",
      factsToVerify: [
        "Sistema exacto de amortización",
        "Tasa EA y plazo",
        "Cuota inicial y evolución contractual de las cuotas",
      ],
      reasonCodes: denominationReasonCodes("pesos", input.paymentBehaviorPreference),
      provenance: { referenceFact: "public_reference", priority: "user_preference" },
    },
    {
      code: "uvr",
      priority: denominationPriority.uvr,
      title: "UVR",
      explanation: denominationExplanation("uvr", input.paymentBehaviorPreference),
      referenceFact: "La UVR está ligada al IPC; aunque la obligación se expresa en unidades, su equivalente en pesos cambia con el valor de la UVR y con el sistema pactado.",
      factsToVerify: [
        "Sistema exacto de amortización en UVR",
        "Tasa remuneratoria sobre UVR y plazo",
        "Escenarios de cuota y saldo expresados en pesos bajo supuestos explícitos",
      ],
      reasonCodes: denominationReasonCodes("uvr", input.paymentBehaviorPreference),
      provenance: { referenceFact: "public_reference", priority: "user_preference" },
    },
  ];

  const precision: FinancingStructuresPrecision =
    input.ownershipTimingPreference === "unknown" && input.paymentBehaviorPreference === "unknown"
      ? "C0"
      : "C1";

  return {
    precision,
    structureOptions,
    denominationOptions,
    quoteChecklist: [...QUOTE_CHECKLIST],
    contextNotices: contextNotices(input.constraintContext),
    methodology: "financing_structure_preference_router_v1_2026_08",
    boundaries: {
      isEligibility: false,
      isApproval: false,
      isApprovalProbability: false,
      isBankMatch: false,
      isMarketQuote: false,
      isCostRanking: false,
    },
  };
}
