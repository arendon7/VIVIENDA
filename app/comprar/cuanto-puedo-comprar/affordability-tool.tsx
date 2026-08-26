"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PrecisionBadge, SourceFreshness } from "@/components/vivienda/signature-components";
import {
  BuyerAffordabilityError,
  calculateBuyerAffordability,
  type BuyerAffordabilityResult,
  type BuyerHousingScenario,
  type HousingCategory,
} from "@/domain/buyer-affordability/calculator";
import styles from "./affordability.module.css";

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const percent = new Intl.NumberFormat("es-CO", {
  style: "percent",
  maximumFractionDigits: 1,
});

const categoryLabel: Record<Exclude<HousingCategory, "unknown">, string> = {
  vis: "VIS",
  non_vis: "No VIS",
};

function money(value: number) {
  return cop.format(Math.round(value));
}

function parseMoney(value: string) {
  if (value.trim() === "") return Number.NaN;
  return Number(value);
}

function bindingCopy(constraint: BuyerHousingScenario["bindingConstraint"]) {
  if (constraint === "payment") return "Hoy te limita más la capacidad mensual del escenario.";
  if (constraint === "down_payment") return "Hoy te limita más la cuota inicial disponible.";
  if (constraint === "both") return "La capacidad mensual y la inicial llegan al mismo límite en este escenario.";
  return "Necesitamos más información para identificar el límite dominante.";
}

export function AffordabilityTool() {
  const [income, setIncome] = useState("");
  const [debts, setDebts] = useState("0");
  const [downPayment, setDownPayment] = useState("0");
  const [category, setCategory] = useState<HousingCategory>("unknown");
  const [c1, setC1] = useState<BuyerAffordabilityResult | null>(null);
  const [showModel, setShowModel] = useState(false);
  const [ratePercent, setRatePercent] = useState("");
  const [termYears, setTermYears] = useState("20");
  const [otherHousingCosts, setOtherHousingCosts] = useState("");
  const [c2, setC2] = useState<BuyerAffordabilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const activeResult = c2 ?? c1;

  useEffect(() => {
    if (activeResult) resultHeadingRef.current?.focus();
  }, [activeResult]);

  const baseInput = useMemo(() => ({
    netHouseholdIncomeMonthly: parseMoney(income),
    currentMonthlyDebtPayments: parseMoney(debts),
    availableDownPayment: parseMoney(downPayment),
    housingCategory: category,
  }), [category, debts, downPayment, income]);

  function calculateC1() {
    setError(null);
    setC2(null);
    setShowModel(false);
    try {
      const result = calculateBuyerAffordability(baseInput);
      setC1(result);
    } catch (cause) {
      setC1(null);
      if (cause instanceof BuyerAffordabilityError) {
        setError(cause.code === "invalid_net_income"
          ? "Necesitamos un ingreso mensual mayor que cero para calcular el benchmark."
          : cause.message);
      } else {
        setError("No pudimos calcular este escenario. Revisa los datos e inténtalo de nuevo.");
      }
    }
  }

  function calculateC2() {
    setError(null);
    const rate = Number(ratePercent);
    const years = Number(termYears);
    const monthlyCosts = otherHousingCosts.trim() === "" ? undefined : Number(otherHousingCosts);

    if (!Number.isFinite(rate) || rate <= 0) {
      setError("Ingresa una tasa EA mayor que 0 para modelar este escenario.");
      return;
    }
    if (!Number.isInteger(years) || years < 5 || years > 30) {
      setError("Esta versión modela entre 5 y 30 años. Prueba un plazo dentro de ese rango.");
      return;
    }
    if (monthlyCosts !== undefined && (!Number.isFinite(monthlyCosts) || monthlyCosts < 0)) {
      setError("Los costos mensuales adicionales no pueden ser negativos.");
      return;
    }

    try {
      const result = calculateBuyerAffordability({
        ...baseInput,
        financing: {
          mode: "pesos_fixed_constant",
          annualEffectiveRate: rate / 100,
          termMonths: years * 12,
          ...(monthlyCosts === undefined ? {} : { monthlyNonCreditHousingCosts: monthlyCosts }),
        },
      });
      setC2(result);
    } catch (cause) {
      if (cause instanceof BuyerAffordabilityError) setError(cause.message);
      else setError("No pudimos modelar este escenario. Revisa la tasa y el plazo.");
    }
  }

  function editBase() {
    setC1(null);
    setC2(null);
    setShowModel(false);
    setError(null);
  }

  return (
    <div className={`shell ${styles.page}`}>
      <section className={styles.intro}>
        <p className="eyebrow">Comprar vivienda</p>
        <h1>¿Qué rango de vivienda tiene sentido planear?</h1>
        <p className="lede">
          Empieza con cuatro datos. Primero calculamos una referencia de planificación; solo después, si quieres, modelamos un escenario con una tasa y un plazo que tú suministres.
        </p>
        <p className="trust-line">No pedimos nombre, cédula, correo, teléfono ni consulta a centrales para darte el primer resultado.</p>
      </section>

      {!c1 ? (
        <section className={`surface ${styles.formCard}`} aria-labelledby="buyer-input-heading">
          <div className={styles.formHeader}>
            <PrecisionBadge level="C1" />
            <div>
              <h2 id="buyer-input-heading">Tu punto de partida</h2>
              <p className="section-copy">Usa valores mensuales aproximados. No estamos evaluando una solicitud bancaria.</p>
            </div>
          </div>

          <div className={styles.fields}>
            <div className="field-group">
              <label className="field-label" htmlFor="buyer-income">Ingreso neto mensual del hogar</label>
              <span className="field-hint" id="buyer-income-hint">Lo que recibe el hogar después de descuentos, de forma aproximada.</span>
              <input className="field-control" id="buyer-income" inputMode="numeric" min="1" type="number" aria-describedby="buyer-income-hint buyer-error" placeholder="10000000" value={income} onChange={(event) => setIncome(event.target.value)} />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="buyer-debts">Cuotas mensuales de otras deudas</label>
              <span className="field-hint" id="buyer-debts-hint">Tarjetas, vehículo, consumo, libranzas u otras obligaciones recurrentes.</span>
              <input className="field-control" id="buyer-debts" inputMode="numeric" min="0" type="number" aria-describedby="buyer-debts-hint buyer-error" value={debts} onChange={(event) => setDebts(event.target.value)} />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="buyer-down-payment">Cuota inicial disponible</label>
              <span className="field-hint" id="buyer-down-hint">Efectivo o recursos que destinarías al precio. Esta versión no descuenta gastos de cierre.</span>
              <input className="field-control" id="buyer-down-payment" inputMode="numeric" min="0" type="number" aria-describedby="buyer-down-hint buyer-error" value={downPayment} onChange={(event) => setDownPayment(event.target.value)} />
            </div>

            <fieldset className="field-group">
              <legend className="field-label">¿La vivienda sería VIS?</legend>
              <p className="field-hint">Si no lo sabes, mostramos ambas referencias sin adivinar la clasificación.</p>
              <div className="choice-list">
                {([
                  ["non_vis", "No VIS"],
                  ["vis", "VIS"],
                  ["unknown", "No estoy seguro"],
                ] as Array<[HousingCategory, string]>).map(([value, label]) => (
                  <label className="radio-card" key={value}>
                    <input type="radio" name="buyer-category" value={value} checked={category === value} onChange={() => setCategory(value)} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {error ? <p className={styles.error} id="buyer-error" role="alert">{error}</p> : <span id="buyer-error" className="sr-only">Sin errores</span>}

          <div className={styles.formActions}>
            <button className="button button-primary" type="button" onClick={calculateC1}>Calcular mi rango</button>
          </div>
        </section>
      ) : null}

      {activeResult ? (
        <div aria-live="polite" className={styles.results}>
          {!c2 ? (
            <section className={`surface ${styles.resultHero}`} aria-labelledby="c1-result-heading">
              <div className={styles.resultTopline}>
                <PrecisionBadge level="C1" />
                <span>Estimación de planificación</span>
              </div>
              <h2 ref={resultHeadingRef} tabIndex={-1} id="c1-result-heading">Tu primer rango de planificación</h2>
              <div className={styles.primaryNumber}>
                <span>Cuota mensual para planear</span>
                <strong>{money(activeResult.planning.planningHousingPaymentRoom)}</strong>
              </div>
              {activeResult.planning.planningHousingPaymentRoom === 0 ? (
                <p className={styles.warning}>Con el benchmark de planificación actual no queda espacio mensual para una nueva cuota de vivienda.</p>
              ) : (
                <p className="section-copy">Es el espacio que queda bajo el benchmark educativo del 30% de endeudamiento recurrente total después de las otras cuotas declaradas.</p>
              )}
              <div className={styles.factRow}>
                <div><span>Endeudamiento actual declarado</span><strong>{percent.format(activeResult.planning.currentDebtRatio)}</strong></div>
                <div><span>Benchmark de planificación</span><strong>30%</strong></div>
                <div><span>Cuota inicial declarada</span><strong>{money(baseInput.availableDownPayment)}</strong></div>
              </div>
            </section>
          ) : (
            <section className={`surface ${styles.resultHero}`} aria-labelledby="c2-result-heading">
              <div className={styles.resultTopline}>
                <PrecisionBadge level="C2" />
                <span>Escenario modelado · pesos · cuota constante</span>
              </div>
              <h2 ref={resultHeadingRef} tabIndex={-1} id="c2-result-heading">Con estas suposiciones, este es tu rango modelado.</h2>
              {c2.scenarios.length === 1 ? (
                <div className={styles.primaryNumber}>
                  <span>Techo del escenario modelado</span>
                  <strong>{money(c2.scenarios[0]?.modeledPropertyCeiling ?? 0)}</strong>
                  <em>{bindingCopy(c2.scenarios[0]?.bindingConstraint)}</em>
                </div>
              ) : (
                <p className={styles.warning}>Como no confirmaste si es VIS, mantenemos dos escenarios separados. No tratamos ninguno como el aplicable todavía.</p>
              )}
              <div className={styles.factRow}>
                <div><span>Presupuesto mensual modelado para crédito</span><strong>{money(c2.financing?.modeledCreditPaymentBudget ?? 0)}</strong></div>
                <div><span>Principal modelado</span><strong>{money(c2.scenarios[0]?.modeledPrincipal ?? 0)}</strong></div>
                <div><span>Tasa usada</span><strong>{ratePercent}% EA</strong></div>
                <div><span>Plazo usado</span><strong>{termYears} años</strong></div>
              </div>
            </section>
          )}

          <section className={styles.scenarioSection} aria-labelledby="scenario-heading">
            <div className={styles.sectionHeading}>
              <div>
                <p className="eyebrow">Estructura</p>
                <h2 id="scenario-heading">Qué limita cada escenario</h2>
              </div>
            </div>
            <div className={styles.scenarioGrid}>
              {activeResult.scenarios.map((scenario) => (
                <article className={`surface ${styles.scenarioCard}`} key={scenario.housingCategory}>
                  <div className={styles.scenarioTitle}>
                    <strong>{categoryLabel[scenario.housingCategory]}</strong>
                    <span>Referencia LTV máx. {percent.format(scenario.maxLtv)}</span>
                  </div>
                  {!c2 ? (
                    <>
                      <span className={styles.valueLabel}>Referencia estructural por inicial</span>
                      <strong className={styles.scenarioValue}>{money(scenario.propertyCeilingFromDownPayment)}</strong>
                      <p>Este valor usa solamente tu inicial y el LTV regulatorio máximo. Todavía no comprueba si una cuota cabe en tus ingresos.</p>
                    </>
                  ) : (
                    <>
                      <span className={styles.valueLabel}>Techo modelado</span>
                      <strong className={styles.scenarioValue}>{money(scenario.modeledPropertyCeiling ?? 0)}</strong>
                      <p>{bindingCopy(scenario.bindingConstraint)}</p>
                      <dl className={styles.miniLedger}>
                        <div><dt>Crédito + efectivo</dt><dd>{money(scenario.propertyCeilingFromCreditAndCash ?? 0)}</dd></div>
                        <div><dt>Límite por inicial/LTV</dt><dd>{money(scenario.propertyCeilingFromDownPayment)}</dd></div>
                      </dl>
                    </>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className={`surface ${styles.truthPanel}`} aria-labelledby="truth-heading">
            <div>
              <p className="eyebrow">Dos referencias distintas</p>
              <h2 id="truth-heading">30% para planear no es lo mismo que 40% regulatorio.</h2>
              <p className="section-copy">VIVIENDA usa 30% como benchmark educativo de endeudamiento total sobre ingreso neto declarado. La regulación vigente limita la primera cuota del crédito de vivienda al 40% de ingresos familiares acreditables. Ese 40% no es nuestra recomendación de sostenibilidad.</p>
            </div>
            <SourceFreshness source="Metodología v0.13 + referencia regulatoria Colombia" cutoff="26 ago 2026">
              <p>Sin ingreso familiar acreditable explícito no calculamos un techo regulatorio personalizado.</p>
            </SourceFreshness>
          </section>

          {!c2 && !showModel ? (
            <section className={styles.nextStep} aria-labelledby="model-next-heading">
              <div>
                <p className="eyebrow">Más precisión</p>
                <h2 id="model-next-heading">¿Quieres probar una tasa y un plazo concretos?</h2>
                <p className="section-copy">No usamos una tasa automática de mercado. Tú suministras el escenario que quieres probar.</p>
              </div>
              <div className={styles.inlineActions}>
                <button className="button button-primary" type="button" onClick={() => setShowModel(true)}>Modelar con tasa y plazo</button>
                <button className="button button-secondary" type="button" onClick={editBase}>Editar mis datos</button>
              </div>
            </section>
          ) : null}

          {!c2 && showModel ? (
            <section className={`surface ${styles.modelCard}`} aria-labelledby="model-heading">
              <div className={styles.formHeader}>
                <PrecisionBadge level="C2" />
                <div>
                  <h2 id="model-heading">Construye un escenario</h2>
                  <p className="section-copy">Usa una tasa de una cotización, simulador o escenario que quieras probar. No estamos mostrando una tasa de mercado automática en esta versión.</p>
                </div>
              </div>
              <div className={styles.modelFields}>
                <div className="field-group">
                  <label className="field-label" htmlFor="buyer-rate">Tasa efectiva anual del escenario (%)</label>
                  <input className="field-control" id="buyer-rate" inputMode="decimal" min="0.01" step="0.01" type="number" placeholder="11.7" value={ratePercent} onChange={(event) => setRatePercent(event.target.value)} />
                </div>
                <div className="field-group">
                  <label className="field-label" htmlFor="buyer-term">Plazo del escenario (años)</label>
                  <input className="field-control" id="buyer-term" inputMode="numeric" min="5" max="30" step="1" type="number" value={termYears} onChange={(event) => setTermYears(event.target.value)} />
                </div>
                <div className="field-group">
                  <label className="field-label" htmlFor="buyer-costs">Otros costos mensuales de vivienda (opcional)</label>
                  <span className="field-hint">Administración u otros costos recurrentes que quieras reservar antes de destinar dinero a la cuota del crédito.</span>
                  <input className="field-control" id="buyer-costs" inputMode="numeric" min="0" type="number" placeholder="300000" value={otherHousingCosts} onChange={(event) => setOtherHousingCosts(event.target.value)} />
                </div>
              </div>
              {error ? <p className={styles.error} role="alert">{error}</p> : null}
              <div className={styles.inlineActions}>
                <button className="button button-primary" type="button" onClick={calculateC2}>Ver escenario modelado</button>
                <button className="button button-secondary" type="button" onClick={() => setShowModel(false)}>Volver a C1</button>
              </div>
            </section>
          ) : null}

          {c2 ? (
            <section className={styles.nextStep} aria-labelledby="c2-next-heading">
              <div>
                <p className="eyebrow">Siguiente decisión</p>
                <h2 id="c2-next-heading">Usa el límite dominante para decidir qué probar después.</h2>
                <p className="section-copy">Si limita la cuota, revisa obligaciones o prueba otro precio/escenario confirmado. Si limita la inicial, prueba más ahorro o un precio objetivo distinto. No recomendamos automáticamente alargar el plazo.</p>
              </div>
              <div className={styles.inlineActions}>
                <button className="button button-primary" type="button" onClick={() => { setC2(null); setShowModel(true); }}>Probar otro escenario</button>
                <button className="button button-secondary" type="button" onClick={editBase}>Editar datos base</button>
              </div>
            </section>
          ) : null}

          <section className={styles.disclaimer} aria-label="Lo que este resultado no significa">
            <strong>Lo que este resultado no significa</strong>
            <p>No es aprobación bancaria, oferta, probabilidad de aprobación ni recomendación de compra. No consulta score, centrales de riesgo ni productos de una entidad.</p>
            <p>Más adelante podrás guardar este análisis en Mi Vivienda y completar tu perfil progresivamente; v0.13 todavía no activa cuenta ni persistencia.</p>
          </section>
        </div>
      ) : null}
    </div>
  );
}