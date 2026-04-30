import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useActiveShift } from "@/contexts/ActiveShiftContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Save, ArrowLeft } from "lucide-react";
import { logAudit } from "@/lib/audit";

const SEVERITIES = [
  { value: "minor", label: "Mineure" },
  { value: "major", label: "Majeure" },
  { value: "critical", label: "Critique" },
];

const NC_TYPES = [
  { value: "produit", label: "Produit" },
  { value: "process", label: "Process" },
  { value: "matiere", label: "Matière première" },
  { value: "emballage", label: "Emballage" },
  { value: "autre", label: "Autre" },
];

export default function QualityShiftNc() {
  const { qualityShift } = useActiveShift();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [ofs, setOfs] = useState<any[]>([]);
  const [ofId, setOfId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("minor");
  const [ncType, setNcType] = useState("produit");
  const [batchNumber, setBatchNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!qualityShift) return;
    const lineIds = qualityShift.lines.map((l) => l.id);
    if (lineIds.length === 0) { setOfs([]); return; }
    supabase
      .from("ordres_fabrication")
      .select("id, numero, line_id, product_id")
      .in("line_id", lineIds)
      .eq("statut", "en_cours" as any)
      .order("numero")
      .then(({ data }) => setOfs(data ?? []));
  }, [qualityShift]);

  if (!qualityShift) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="p-6 text-center text-muted-foreground">Aucun shift qualité actif.</CardContent>
      </Card>
    );
  }

  async function handleSubmit() {
    if (!qualityShift) return;
    if (!title.trim()) { toast({ title: "Titre requis", variant: "destructive" }); return; }
    if (!ofId) { toast({ title: "OF requis", variant: "destructive" }); return; }

    const of = ofs.find((o) => o.id === ofId);

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("quality_non_conformities" as any)
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          nc_type: ncType,
          severity,
          status: "open",
          of_id: ofId,
          product_id: of?.product_id ?? null,
          production_line_id: of?.line_id ?? null,
          batch_number: batchNumber.trim() || null,
          declared_by: user?.id,
          detected_at: new Date().toISOString(),
          // Auto-context:
          quality_shift_id: qualityShift.id,
          team_id: qualityShift.shift_team_id,
          shift_id: qualityShift.production_shift_ids[0] ?? null,
        } as any)
        .select("id, nc_number")
        .single();
      if (error) throw error;

      await logAudit({
        action_type: "create",
        module: "qualite" as any,
        entity_type: "quality_non_conformity",
        entity_id: (data as any).id,
        entity_label: (data as any).nc_number,
        action_label: "NC déclarée (kiosque shift)",
        new_values: { quality_shift_id: qualityShift.id, of_id: ofId, severity, nc_type: ncType },
      });

      toast({ title: "NC enregistrée", description: (data as any).nc_number });
      navigate("/qualite/shift");
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/qualite/shift")}>
        <ArrowLeft className="h-4 w-4 mr-1.5" /> Retour shift
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-warning" /> Déclarer une non-conformité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>OF concerné *</Label>
            <Select value={ofId} onValueChange={setOfId}>
              <SelectTrigger className="min-h-[48px] mt-1"><SelectValue placeholder="Choisir un OF" /></SelectTrigger>
              <SelectContent>
                {ofs.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.numero}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Titre *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="min-h-[48px]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type *</Label>
              <Select value={ncType} onValueChange={setNcType}>
                <SelectTrigger className="min-h-[48px] mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NC_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sévérité *</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="min-h-[48px] mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>N° lot / batch</Label>
            <Input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} className="min-h-[48px]" />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full min-h-[52px]">
            <Save className="h-5 w-5 mr-2" /> {submitting ? "Enregistrement..." : "Déclarer la NC"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
