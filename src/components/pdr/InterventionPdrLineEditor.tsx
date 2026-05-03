import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { PdrPositionPicker, type PositionPickValue } from "./PdrPositionPicker";

export const CAUSE_OPTIONS: { value: string; label: string }[] = [
  { value: "usure_normale", label: "Usure normale" },
  { value: "casse", label: "Casse" },
  { value: "fuite", label: "Fuite" },
  { value: "preventif", label: "Préventif" },
  { value: "amelioration", label: "Amélioration" },
  { value: "non_conformite", label: "Non-conformité" },
  { value: "autre", label: "Autre" },
];

export interface InterventionPdrLine {
  pdr_id: string;
  quantite: number;
  position_id?: string | null;
  position_label?: string | null;
  compteur_fin?: number | null;
  compteur_max?: number | null;
  unite?: string | null;
  niveau?: "vert" | "orange" | "rouge" | null;
  cause_remplacement?: string | null;
  commentaire_technique?: string | null;
  compteur_initial_new?: number | null;
}

interface Props {
  pdrList: { id: string; reference: string; designation: string; stock_actuel: number }[];
  machineId?: string | null;
  equipementId?: string | null;
  onAdd: (line: InterventionPdrLine) => void;
}

export function InterventionPdrLineEditor({ pdrList, machineId, equipementId, onAdd }: Props) {
  const [pdrId, setPdrId] = useState("");
  const [qte, setQte] = useState("1");
  const [position, setPosition] = useState<PositionPickValue | null>(null);
  const [hasPositions, setHasPositions] = useState(false);
  const [cause, setCause] = useState<string>("");
  const [commentaire, setCommentaire] = useState<string>("");
  const [compteurInitial, setCompteurInitial] = useState<string>("0");

  const reset = () => {
    setPdrId(""); setQte("1"); setPosition(null);
    setHasPositions(false); setCause(""); setCommentaire(""); setCompteurInitial("0");
  };

  const handleAdd = () => {
    if (!pdrId) return;
    if (hasPositions && (!position || !cause)) return;
    onAdd({
      pdr_id: pdrId,
      quantite: parseInt(qte, 10) || 1,
      position_id: position?.position_id ?? null,
      position_label: position?.designation ?? null,
      compteur_fin: position?.compteur_actuel ?? null,
      compteur_max: position?.compteur_max ?? null,
      unite: position?.unite ?? null,
      niveau: position?.niveau ?? null,
      cause_remplacement: cause || null,
      commentaire_technique: commentaire || null,
      compteur_initial_new: position ? Number(compteurInitial) || 0 : null,
    });
    reset();
  };

  const disabled = !pdrId || (hasPositions && (!position || !cause));

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-col sm:flex-row">
        <Select value={pdrId} onValueChange={(v) => { setPdrId(v); setPosition(null); setHasPositions(false); }}>
          <SelectTrigger className="h-10 flex-1"><SelectValue placeholder="Sélectionner une pièce" /></SelectTrigger>
          <SelectContent>
            {pdrList.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.reference} — {p.designation} ({p.stock_actuel})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Input type="number" value={qte} onChange={(e) => setQte(e.target.value)} className="h-10 w-20" min="1" placeholder="Qté" />
        </div>
      </div>

      {pdrId && (
        <PdrPositionPicker
          pdrId={pdrId}
          machineId={machineId}
          equipementId={equipementId}
          value={position}
          onChange={setPosition}
          onAvailabilityChange={setHasPositions}
        />
      )}

      {hasPositions && position && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Cause de remplacement *</Label>
              <Select value={cause} onValueChange={setCause}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>
                  {CAUSE_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Compteur initial nouveau cycle</Label>
              <Input type="number" min={0} value={compteurInitial}
                onChange={(e) => setCompteurInitial(e.target.value)} className="h-10" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Commentaire technique</Label>
            <Textarea rows={2} value={commentaire} onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Observations, mode opératoire…" />
          </div>
        </>
      )}

      <Button variant="outline" size="sm" className="h-10 w-full" onClick={handleAdd} disabled={disabled}>
        <Plus className="h-4 w-4 mr-1" /> Ajouter cette pièce
      </Button>
    </div>
  );
}
