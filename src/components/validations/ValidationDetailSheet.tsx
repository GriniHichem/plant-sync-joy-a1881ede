import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, ExternalLink, Ban } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  STATUS_LABEL, STATUS_BADGE_CLASS, PRIORITY_LABEL, PRIORITY_BADGE_CLASS, ENFORCEMENT_LABEL,
  approveValidationRequest, rejectValidationRequest, cancelValidationRequest,
  type ValidationRequest,
} from "@/lib/validation";
import { useValidationPermissions } from "@/hooks/useValidationPermissions";
import { useAuth } from "@/contexts/AuthContext";
import { buildEntityUrl } from "@/lib/notifications";

interface Props {
  request: ValidationRequest | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdated: () => void;
}

export function ValidationDetailSheet({ request, open, onOpenChange, onUpdated }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const perm = useValidationPermissions();
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (!request) return null;
  const isOwner = user?.id === request.submitted_by_user_id;
  const isPending = request.status === "submitted" || request.status === "pending_post_hoc";

  const handleApprove = async () => {
    setBusy(true);
    const ok = await approveValidationRequest(request.id, comment || undefined);
    setBusy(false);
    if (ok) { toast({ title: "Demande approuvée" }); onUpdated(); onOpenChange(false); setComment(""); }
    else toast({ title: "Erreur", variant: "destructive" });
  };
  const handleReject = async () => {
    if (!reason.trim()) { toast({ title: "Motif requis", variant: "destructive" }); return; }
    setBusy(true);
    const ok = await rejectValidationRequest(request.id, reason);
    setBusy(false);
    if (ok) { toast({ title: "Demande rejetée" }); onUpdated(); onOpenChange(false); setReason(""); }
    else toast({ title: "Erreur", variant: "destructive" });
  };
  const handleCancel = async () => {
    setBusy(true);
    const ok = await cancelValidationRequest(request.id);
    setBusy(false);
    if (ok) { toast({ title: "Demande annulée" }); onUpdated(); onOpenChange(false); }
    else toast({ title: "Erreur", variant: "destructive" });
  };

  const entityUrl = request.action_url || buildEntityUrl(request.entity_type ?? undefined, request.entity_id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{request.title}</SheetTitle>
          <SheetDescription>{request.description || "—"}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={STATUS_BADGE_CLASS[request.status]}>{STATUS_LABEL[request.status]}</Badge>
            <Badge variant="outline" className={PRIORITY_BADGE_CLASS[request.priority]}>Priorité : {PRIORITY_LABEL[request.priority]}</Badge>
            <Badge variant="outline" className={request.enforcement === "blocking" ? "border-orange-500/30 text-orange-600" : ""}>
              Mode : {ENFORCEMENT_LABEL[request.enforcement]}
            </Badge>
            <Badge variant="outline">Module : {request.module}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Demandeur :</span> {request.submitted_by_name ?? request.submitted_by_email ?? "—"}</div>
            <div><span className="text-muted-foreground">Type :</span> {request.request_type}</div>
            <div><span className="text-muted-foreground">Entité :</span> {request.entity_code ?? request.entity_label ?? "—"}</div>
            <div><span className="text-muted-foreground">Action :</span> {request.requested_action}</div>
            <div><span className="text-muted-foreground">Créé :</span> {new Date(request.created_at).toLocaleString("fr-FR")}</div>
            {request.applied_at && (
              <div><span className="text-muted-foreground">Appliqué :</span> {new Date(request.applied_at).toLocaleString("fr-FR")}</div>
            )}
          </div>

          {request.justification && (
            <div>
              <p className="text-sm font-medium">Justification</p>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{request.justification}</p>
            </div>
          )}

          {request.changed_fields && request.changed_fields.length > 0 && (
            <div>
              <p className="text-sm font-medium">Champs modifiés</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {request.changed_fields.map((f) => <Badge key={f} variant="secondary">{f}</Badge>)}
              </div>
            </div>
          )}

          {request.validation_comment && (
            <div>
              <p className="text-sm font-medium text-success">Commentaire validation</p>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{request.validation_comment}</p>
            </div>
          )}
          {request.rejection_reason && (
            <div>
              <p className="text-sm font-medium text-destructive">Motif de rejet</p>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{request.rejection_reason}</p>
            </div>
          )}

          {entityUrl && (
            <Button variant="outline" size="sm" onClick={() => { onOpenChange(false); navigate(entityUrl); }}>
              <ExternalLink className="h-4 w-4 mr-2" /> Ouvrir l'entité liée
            </Button>
          )}

          {perm.view_technical_details && (request.old_values || request.proposed_values) && (
            <details className="border rounded p-3 text-xs">
              <summary className="cursor-pointer font-medium">Détails techniques</summary>
              <div className="mt-2 space-y-2">
                {request.old_values && (
                  <div><p className="font-medium">Ancienne valeur</p><pre className="bg-muted p-2 rounded overflow-auto">{JSON.stringify(request.old_values, null, 2)}</pre></div>
                )}
                {request.proposed_values && (
                  <div><p className="font-medium">Valeur proposée</p><pre className="bg-muted p-2 rounded overflow-auto">{JSON.stringify(request.proposed_values, null, 2)}</pre></div>
                )}
              </div>
            </details>
          )}

          <Separator />

          {isPending && (perm.approve || perm.reject) && (
            <div className="space-y-3">
              {perm.approve && (
                <div>
                  <Textarea placeholder="Commentaire de validation (optionnel)" value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
                  <Button className="mt-2 w-full" onClick={handleApprove} disabled={busy}>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Approuver
                  </Button>
                </div>
              )}
              {perm.reject && (
                <div>
                  <Textarea placeholder="Motif de rejet (obligatoire)" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
                  <Button variant="destructive" className="mt-2 w-full" onClick={handleReject} disabled={busy}>
                    <XCircle className="h-4 w-4 mr-2" /> Rejeter
                  </Button>
                </div>
              )}
            </div>
          )}

          {isPending && isOwner && perm.cancel && (
            <Button variant="outline" className="w-full" onClick={handleCancel} disabled={busy}>
              <Ban className="h-4 w-4 mr-2" /> Annuler ma demande
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
