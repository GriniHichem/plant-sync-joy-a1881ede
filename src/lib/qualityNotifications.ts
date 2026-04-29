// Centralized helpers for quality.* notification events.
// All events go through the rule-aware triggerNotification helper, which
// handles deduplication and rule matching transparently.

import { triggerNotification, type NotificationSeverity } from "@/lib/notifications";

const QUALITE_MODULE = "qualite" as any;

export type QualityEventType =
  | "quality.nc_created"
  | "quality.nc_critical"
  | "quality.nc_blocked_lot"
  | "quality.action_assigned"
  | "quality.action_overdue"
  | "quality.check_out_of_tolerance"
  | "quality.of_quality_pending"
  | "quality.recipe_version_approved"
  | "quality.bom_version_changed";

interface BaseRef {
  entity_id: string;
  entity_code?: string | null;
  entity_label?: string | null;
}

export async function notifyNcCreated(nc: BaseRef & { severity: string | null }) {
  await triggerNotification({
    module: QUALITE_MODULE,
    event_type: "quality.nc_created",
    entity_type: "quality_non_conformity",
    entity_id: nc.entity_id,
    entity_code: nc.entity_code ?? null,
    entity_label: nc.entity_label ?? null,
    title: "Nouvelle non-conformité",
    message: `${nc.entity_code ?? "NC"} – ${nc.entity_label ?? ""}`.trim(),
    severity: "info",
    action_url: `/qualite/non-conformites?focus=${nc.entity_id}`,
    conditionData: { severity: nc.severity },
  });

  if (nc.severity === "high" || nc.severity === "critical") {
    await triggerNotification({
      module: QUALITE_MODULE,
      event_type: "quality.nc_critical",
      entity_type: "quality_non_conformity",
      entity_id: nc.entity_id,
      entity_code: nc.entity_code ?? null,
      entity_label: nc.entity_label ?? null,
      title: "NC critique",
      message: `${nc.entity_code ?? "NC"} – sévérité ${nc.severity}`,
      severity: "high" as NotificationSeverity,
      action_url: `/qualite/non-conformites?focus=${nc.entity_id}`,
    });
  }
}

export async function notifyNcBlockedLot(nc: BaseRef) {
  await triggerNotification({
    module: QUALITE_MODULE,
    event_type: "quality.nc_blocked_lot",
    entity_type: "quality_non_conformity",
    entity_id: nc.entity_id,
    entity_code: nc.entity_code ?? null,
    entity_label: nc.entity_label ?? null,
    title: "Lot bloqué par décision qualité",
    message: `${nc.entity_code ?? "NC"} – lot bloqué`,
    severity: "high" as NotificationSeverity,
    action_url: `/qualite/non-conformites?focus=${nc.entity_id}`,
  });
}

export async function notifyCheckOutOfTolerance(check: BaseRef & { of_label?: string | null }) {
  await triggerNotification({
    module: QUALITE_MODULE,
    event_type: "quality.check_out_of_tolerance",
    entity_type: "quality_check",
    entity_id: check.entity_id,
    entity_label: check.entity_label ?? null,
    title: "Contrôle hors tolérance",
    message: `${check.entity_label ?? "Contrôle"}${check.of_label ? ` – ${check.of_label}` : ""}`,
    severity: "medium" as NotificationSeverity,
    action_url: "/qualite/controles",
  });
}

export async function notifyOfQualityPending(of: BaseRef) {
  await triggerNotification({
    module: QUALITE_MODULE,
    event_type: "quality.of_quality_pending",
    entity_type: "of",
    entity_id: of.entity_id,
    entity_code: of.entity_code ?? null,
    entity_label: of.entity_label ?? null,
    title: "OF en attente qualité",
    message: of.entity_code ?? "OF",
    severity: "medium" as NotificationSeverity,
    action_url: `/qualite/tracabilite?focus=${of.entity_id}`,
  });
}

export async function notifyRecipeApproved(recipe: BaseRef & { version?: string | number | null }) {
  await triggerNotification({
    module: QUALITE_MODULE,
    event_type: "quality.recipe_version_approved",
    entity_type: "recipe",
    entity_id: recipe.entity_id,
    entity_label: recipe.entity_label ?? null,
    title: "Version recette approuvée",
    message: `${recipe.entity_label ?? "Recette"}${recipe.version ? ` v${recipe.version}` : ""}`,
    severity: "info",
    action_url: "/gpao/recipes",
  });
}

export async function notifyBomChanged(bom: BaseRef & { version?: string | number | null; new_status: string }) {
  await triggerNotification({
    module: QUALITE_MODULE,
    event_type: "quality.bom_version_changed",
    entity_type: "bom",
    entity_id: bom.entity_id,
    entity_label: bom.entity_label ?? null,
    title: "Nomenclature modifiée",
    message: `${bom.entity_label ?? "BOM"}${bom.version ? ` v${bom.version}` : ""} → ${bom.new_status}`,
    severity: "info",
    action_url: "/qualite/recettes-nomenclatures",
    conditionData: { new_status: bom.new_status },
  });
}

export async function notifyActionsOverdue(count: number) {
  if (count <= 0) return;
  await triggerNotification({
    module: QUALITE_MODULE,
    event_type: "quality.action_overdue",
    entity_type: "quality_action",
    entity_id: "global",
    title: "Actions qualité en retard",
    message: `${count} action(s) qualité en retard`,
    severity: "medium" as NotificationSeverity,
    action_url: "/qualite/actions",
    deduplication_key: `quality.action_overdue:${new Date().toISOString().slice(0, 10)}`,
  });
}
