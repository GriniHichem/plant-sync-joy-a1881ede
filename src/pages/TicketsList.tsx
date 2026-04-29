import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useNavWithFrom } from "@/hooks/useNavWithFrom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/gmao/StatusBadge";
import { Plus, Search, AlertTriangle, Download, RotateCcw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { exportToCsv } from "@/lib/exportCsv";
import { useIsMobile } from "@/hooks/use-mobile";
import { ResponsiveDialog } from "@/components/responsive/ResponsiveDialog";
import { FilterSheet } from "@/components/responsive/FilterSheet";
import { ticketCreateSchema, getFieldErrors, isValid } from "@/lib/formValidation";

export default function TicketsList() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [panneTypes, setPanneTypes] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavWithFrom();
  const { user } = useAuth();
  const { toast } = useToast();
  const { canCreate } = usePermissions();
  const isMobile = useIsMobile();

  const [newMachineId, setNewMachineId] = useState("");
  const [newPanneTypeId, setNewPanneTypeId] = useState("");
  const [newPriorite, setNewPriorite] = useState<string>("normale");
  const [newDescription, setNewDescription] = useState("");

  const loadTickets = async () => {
    const { data } = await supabase
      .from("tickets")
      .select("*, machines(designation, code)")
      .order("created_at", { ascending: false });
    setTickets(data || []);
  };

  useEffect(() => {
    loadTickets();
    supabase.from("machines").select("id, code, designation").eq("is_active", true).order("code").then(({ data }) => setMachines(data || []));
    supabase.from("panne_types").select("*").eq("is_active", true).then(({ data }) => setPanneTypes(data || []));
  }, []);

  const handleCreate = async () => {
    if (!newMachineId || !newDescription) {
      toast({ title: "Erreur", description: "Machine et description obligatoires", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("tickets").insert({
      machine_id: newMachineId,
      panne_type_id: newPanneTypeId || null,
      priorite: newPriorite as any,
      description: newDescription,
      declarant_id: user?.id,
      numero: "",
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ticket créé" });
      setDialogOpen(false);
      setNewDescription(""); setNewMachineId(""); setNewPanneTypeId(""); setNewPriorite("normale");
      loadTickets();
    }
  };

  const filtered = tickets.filter((t) => {
    const matchSearch = search === "" || t.numero?.toLowerCase().includes(search.toLowerCase()) || t.machines?.designation?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.statut === statusFilter;
    const matchPriority = priorityFilter === "all" || t.priorite === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
  };
  const activeFilterCount =
    (search.trim() ? 1 : 0) + (statusFilter !== "all" ? 1 : 0) + (priorityFilter !== "all" ? 1 : 0);

  const FiltersForm = () => (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Recherche</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="N° ou machine…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-11" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Statut</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="ouvert">Ouvert</SelectItem>
            <SelectItem value="pris_en_charge">Pris en charge</SelectItem>
            <SelectItem value="en_cours">En cours</SelectItem>
            <SelectItem value="resolu">Résolu</SelectItem>
            <SelectItem value="cloture">Clôturé</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Priorité</Label>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="critique">Critique</SelectItem>
            <SelectItem value="haute">Haute</SelectItem>
            <SelectItem value="normale">Normale</SelectItem>
            <SelectItem value="basse">Basse</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`flex items-center justify-between ${isMobile ? "flex-col items-stretch gap-2" : ""}`}>
        <div>
          <h1 className={`font-bold ${isMobile ? "text-lg" : "text-2xl"}`}>Tickets Maintenance</h1>
          <p className="text-muted-foreground text-sm">{tickets.length} tickets</p>
        </div>
        <div className="flex items-center gap-2">
          {!isMobile && (
            <Button variant="outline" size="sm" onClick={() => exportToCsv(filtered, [
              { key: "numero", label: "N°" },
              { key: "machines.designation", label: "Machine" },
              { key: "priorite", label: "Priorité" },
              { key: "statut", label: "Statut" },
              { key: "description", label: "Description" },
              { key: "heure_declaration", label: "Date", format: (v) => v ? new Date(v).toLocaleString("fr-FR") : "" },
              { key: "temps_arret_minutes", label: "Temps arrêt (min)" },
            ], "tickets")}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
          )}
          {canCreate("tickets") && (
            <Button
              size={isMobile ? "sm" : "default"}
              className={isMobile ? "h-11 w-full" : "h-12 px-6"}
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" /> {isMobile ? "Nouveau ticket" : "Nouveau ticket"}
            </Button>
          )}
          <ResponsiveDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            title="Nouveau ticket maintenance"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Machine *</Label>
                <Select value={newMachineId} onValueChange={setNewMachineId}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Sélectionner une machine" /></SelectTrigger>
                  <SelectContent>{machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.code} — {m.designation}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type de panne</Label>
                <Select value={newPanneTypeId} onValueChange={setNewPanneTypeId}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Optionnel" /></SelectTrigger>
                  <SelectContent>{panneTypes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priorité</Label>
                <Select value={newPriorite} onValueChange={setNewPriorite}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basse">Basse</SelectItem>
                    <SelectItem value="normale">Normale</SelectItem>
                    <SelectItem value="haute">Haute</SelectItem>
                    <SelectItem value="critique">Critique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Décrivez le problème..." className="min-h-[80px]" />
              </div>
              <Button onClick={handleCreate} className="w-full h-12">Créer le ticket</Button>
            </div>
          </ResponsiveDialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-2">
          {isMobile ? (
            <FilterSheet
              activeCount={activeFilterCount}
              onReset={activeFilterCount > 0 ? resetFilters : undefined}
              activeChips={[
                ...(search.trim() ? [{ key: "s", label: `« ${search} »`, onRemove: () => setSearch("") }] : []),
                ...(statusFilter !== "all" ? [{ key: "st", label: `Statut: ${statusFilter.replace("_", " ")}`, onRemove: () => setStatusFilter("all") }] : []),
                ...(priorityFilter !== "all" ? [{ key: "pr", label: `Priorité: ${priorityFilter}`, onRemove: () => setPriorityFilter("all") }] : []),
              ]}
            >
              <FiltersForm />
            </FilterSheet>
          ) : (
            <div className="flex gap-2 flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 w-[140px]"><SelectValue placeholder="Statut" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="ouvert">Ouvert</SelectItem>
                  <SelectItem value="pris_en_charge">Pris en charge</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="resolu">Résolu</SelectItem>
                  <SelectItem value="cloture">Clôturé</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-10 w-[130px]"><SelectValue placeholder="Priorité" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="critique">Critique</SelectItem>
                  <SelectItem value="haute">Haute</SelectItem>
                  <SelectItem value="normale">Normale</SelectItem>
                  <SelectItem value="basse">Basse</SelectItem>
                </SelectContent>
              </Select>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="h-10 px-3 text-muted-foreground" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Réinitialiser
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isMobile ? (
            /* Mobile: card list */
            <div className="divide-y">
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun ticket trouvé</p>
                </div>
              ) : filtered.map((t) => (
                <div key={t.id} className="p-3 active:bg-muted/50 cursor-pointer" onClick={() => navigate(`/tickets/${t.id}`)}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-sm">{t.numero}</span>
                    <StatusBadge type="priority" value={t.priorite} />
                  </div>
                  <p className="text-sm truncate">{t.machines?.designation || "—"}</p>
                  <div className="flex items-center justify-between mt-1">
                    <StatusBadge type="ticket" value={t.statut} />
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {new Date(t.heure_declaration).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Desktop/Tablet: table */
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Temps arrêt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />Aucun ticket trouvé
                    </TableCell>
                  </TableRow>
                ) : filtered.map((t) => (
                  <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/tickets/${t.id}`)}>
                    <TableCell className="font-mono font-medium">{t.numero}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{t.machines?.designation || "—"}</p>
                        <p className="text-xs text-muted-foreground">{t.machines?.code}</p>
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge type="priority" value={t.priorite} /></TableCell>
                    <TableCell><StatusBadge type="ticket" value={t.statut} /></TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{new Date(t.heure_declaration).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="tabular-nums">{t.temps_arret_minutes ? `${t.temps_arret_minutes} min` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
