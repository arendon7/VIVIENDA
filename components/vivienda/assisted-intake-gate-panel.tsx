import type {
  AssistedIntakeGate,
  AssistedIntakeGateStatus,
} from "@/domain/assisted-execution/intake-gate";

const statusLabels: Record<AssistedIntakeGateStatus, string> = {
  local_preparation_required: "Preparación local pendiente",
  platform_activation_required: "Plataforma segura no habilitada",
  real_case_required: "Expediente real pendiente",
  data_authorization_required: "Autorización de datos pendiente",
  service_agreement_required: "Alcance del servicio pendiente",
  secure_upload_ready: "Ingreso seguro habilitable",
};

function yesNo(value: boolean) {
  return value ? "Sí" : "No";
}

export function AssistedIntakeGatePanel({ gate }: { gate: AssistedIntakeGate }) {
  return (
    <section
      className="surface"
      style={{ marginTop: 22, padding: 20 }}
      aria-labelledby="assisted-intake-gate-title"
      data-assisted-intake-gate={gate.status}
      data-secure-upload-may-be-offered={String(gate.secureUploadMayBeOffered)}
    >
      <div className="section-header">
        <div>
          <p className="eyebrow">Siguiente frontera · ingreso documental seguro</p>
          <h3 id="assisted-intake-gate-title">Qué tendría que estar habilitado antes de recibir tus documentos.</h3>
          <p className="section-copy">
            Organizar tus soportes no autoriza a Casa con Criterio a recibirlos. Este control separa la preparación local de una futura carga autenticada y trazable.
          </p>
        </div>
        <span className="status-chip">{statusLabels[gate.status]}</span>
      </div>

      <div className="metric-grid" style={{ marginTop: 20 }} aria-label="Precondiciones del ingreso documental">
        <div><span className="metric-label">Inventario local listo</span><strong>{yesNo(gate.evidenceInventoryReady)}</strong></div>
        <div><span className="metric-label">Plataforma segura habilitada</span><strong>{yesNo(gate.platformReady)}</strong></div>
        <div><span className="metric-label">Expediente real</span><strong>{yesNo(gate.realCaseCreated)}</strong></div>
        <div><span className="metric-label">Autorización de datos</span><strong>{yesNo(gate.dataAuthorizationRecorded)}</strong></div>
        <div><span className="metric-label">Alcance del servicio aceptado</span><strong>{yesNo(gate.serviceAgreementAccepted)}</strong></div>
        <div><span className="metric-label">Carga segura ofrecible</span><strong>{yesNo(gate.secureUploadMayBeOffered)}</strong></div>
      </div>

      <div className="result-callout" style={{ marginTop: 18 }} role="status">
        <strong>Siguiente requisito</strong>
        <p className="section-copy">{gate.nextRequirement}</p>
      </div>

      {gate.status === "platform_activation_required" ? (
        <div className="surface-warning" style={{ marginTop: 18 }}>
          <strong>La carga segura todavía no está habilitada en este entorno.</strong>
          <p>
            El runtime actual falla cerrado mientras no existan proveedores reales de identidad, persistencia, almacenamiento y controles server-side. No mostramos un botón que aparentaría recibir documentos cuando esa capacidad todavía no existe.
          </p>
        </div>
      ) : null}

      {gate.secureUploadMayBeOffered ? (
        <div className="surface-warning" style={{ marginTop: 18 }}>
          <strong>Gate listo no significa archivo recibido.</strong>
          <p>
            Aun cuando todas las precondiciones sean verdaderas, esta vista solo autoriza ofrecer el siguiente paso. La carga, persistencia y verificación deben ocurrir por operaciones separadas y trazables.
          </p>
        </div>
      ) : null}
    </section>
  );
}
