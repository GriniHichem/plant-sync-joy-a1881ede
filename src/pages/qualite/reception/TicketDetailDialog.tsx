import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Calendar, Clock, Download, ImageOff, Loader2, MapPin, User, Package, Truck, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { formatDuration, formatHm, formatKgInt, formatTonnesInt, isOverdue } from "@/lib/reception";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  row: any | null;
}

export function TicketDetailDialog({ open, onOpenChange, row }: Props) {
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<Array<{ slot: number; url: string | null; uploaded_at: string }>>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !row?.id) { setPhotos([]); return; }
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("reception_ticket_photos" as any)
          .select("slot, storage_path, uploaded_at")
          .eq("ticket_id", row.id)
          .order("slot");
        const rows = (data ?? []) as any[];
        const withUrls = await Promise.all(
          rows.map(async (r) => {
            const { data: s } = await supabase.storage
              .from("reception-photos")
              .createSignedUrl(r.storage_path, 300);
            return { slot: r.slot, url: s?.signedUrl ?? null, uploaded_at: r.uploaded_at };
          }),
        );
        if (!cancel) setPhotos(withUrls);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [open, row?.id]);

  const fmtDT = (v?: string | null) =>
    v ? new Date(v).toLocaleString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }) : "—";

  if (!row) return null;
  const overdue = isOverdue(row.duree_minutes);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-5 py-4">
            <DialogTitle className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="font-mono text-xs text-muted-foreground">#{row.numero}</div>
                <div className="text-lg font-semibold truncate">{row.produit ?? "—"}</div>
                <div className="text-xs text-muted-foreground font-normal flex items-center gap-1 mt-0.5">
                  <Truck className="h-3 w-3" /> {row.fournisseur ?? "—"}
                  {row.wilaya && <><span>·</span><MapPin className="h-3 w-3" /> {row.wilaya}</>}
                  {row.region && <span className="text-muted-foreground/70">({row.region})</span>}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                {row.etat_pesee === "pese"
                  ? <Badge variant="secondary">Pesé</Badge>
                  : <Badge>En attente</Badge>}
                {overdue && (
                  <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Hors délai</Badge>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="p-5 space-y-5">
            {/* Chronologie */}
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chronologie</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border p-3 bg-muted/20">
                <InfoRow icon={Calendar} label="Date" value={row.date_ticket ?? "—"} />
                <InfoRow icon={Clock} label="Créneau" value={`${formatHm(row.heure_debut)} → ${formatHm(row.heure_fin)}`} suffix={
                  <span className={overdue ? "text-destructive font-medium" : "text-muted-foreground"}>
                    {formatDuration(row.duree_minutes)}
                  </span>
                } />
                <InfoRow icon={User} label="Créé par" value={row.created_by_name ?? "—"} />
                <InfoRow icon={User} label="Clôturé par" value={row.cloture_by_name ?? "—"} />
                <InfoRow icon={Clock} label="Clôturé le" value={fmtDT(row.cloture_at)} className="sm:col-span-2" />
              </div>
            </section>

            {/* Pesée */}
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pesée</h3>
              <div className="grid grid-cols-3 gap-2">
                <WeightCard label="Brut" kg={row.poids_brut_kg} />
                <WeightCard label={`Abattement${row.taux_abattement != null ? ` (${Number(row.taux_abattement).toFixed(1)}%)` : ""}`} kg={row.poids_abattement_kg} />
                <WeightCard label="Net" kg={row.poids_net_kg} emphasize />
              </div>
            </section>

            {/* Campagne */}
            {row.campagne && (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Campagne</h3>
                <div className="rounded-lg border p-3 bg-muted/20 flex items-center gap-2 flex-wrap">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="font-medium">{row.campagne}</span>
                </div>
              </section>
            )}

            {/* Photos */}
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Photos ({photos.length}/3)
              </h3>
              {loading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement…
                </div>
              ) : photos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground rounded-lg border border-dashed">
                  <ImageOff className="h-8 w-8 mb-2" />
                  Aucune photo enregistrée
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {photos.map((p) => (
                    <div key={p.slot} className="border rounded-lg overflow-hidden bg-muted/20">
                      {p.url ? (
                        <div className="relative group">
                          <button
                            type="button"
                            onClick={() => setLightbox(p.url)}
                            className="block w-full"
                          >
                            <img src={p.url} alt={`Photo ${p.slot}`} className="w-full aspect-[4/3] object-cover" />
                            <ZoomIn className="absolute top-2 right-2 h-4 w-4 text-white drop-shadow opacity-80 group-hover:opacity-100" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); downloadPhoto(p.url!, `ticket-${row.numero}-photo-${p.slot}.jpg`); }}
                            className="absolute top-2 left-2 h-7 w-7 rounded-md bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition"
                            title="Télécharger"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="aspect-[4/3] flex items-center justify-center text-muted-foreground">
                          <ImageOff className="h-6 w-6" />
                        </div>
                      )}
                      <div className="px-2 py-1.5 text-[11px] flex items-center justify-between bg-muted/40">
                        <span className="font-medium">Photo {p.slot}</span>
                        <span className="text-muted-foreground">{fmtDT(p.uploaded_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {lightbox && (
        <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
          <DialogContent className="max-w-6xl p-2 bg-black/95">
            <img src={lightbox} alt="Photo agrandie" className="w-full h-auto max-h-[85vh] object-contain" />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function InfoRow({ icon: Icon, label, value, suffix, className }: any) {
  return (
    <div className={`flex items-center gap-2 text-sm ${className ?? ""}`}>
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label} :</span>
      <span className="font-medium truncate">{value}</span>
      {suffix && <span className="ml-auto text-xs">{suffix}</span>}
    </div>
  );
}

function WeightCard({ label, kg, emphasize }: { label: string; kg?: number | null; emphasize?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${emphasize ? "bg-primary/5 border-primary/30" : "bg-muted/20"}`}>
      <div className="text-[11px] text-muted-foreground truncate">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${emphasize ? "text-primary" : ""}`}>{formatKgInt(kg)}</div>
      <div className="text-[11px] text-muted-foreground tabular-nums">≈ {formatTonnesInt(kg)}</div>
    </div>
  );
}
