import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import {
  STATUS_LABEL, STATUS_BADGE_CLASS, PRIORITY_LABEL, PRIORITY_BADGE_CLASS, ENFORCEMENT_LABEL,
  type ValidationRequest,
} from "@/lib/validation";

interface Props {
  items: ValidationRequest[];
  onOpen: (r: ValidationRequest) => void;
}

export function ValidationTable({ items, onOpen }: Props) {
  if (items.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12 border rounded-lg">
        Aucune demande de validation.
      </div>
    );
  }
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Titre</TableHead>
            <TableHead>Module</TableHead>
            <TableHead>Entité</TableHead>
            <TableHead>Demandeur</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Priorité</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((r) => (
            <TableRow key={r.id} className="cursor-pointer" onClick={() => onOpen(r)}>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {new Date(r.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
              </TableCell>
              <TableCell className="font-medium">{r.title}</TableCell>
              <TableCell><Badge variant="outline">{r.module}</Badge></TableCell>
              <TableCell className="text-sm">{r.entity_code ?? r.entity_label ?? "—"}</TableCell>
              <TableCell className="text-sm">{r.submitted_by_name ?? r.submitted_by_email ?? "—"}</TableCell>
              <TableCell>
                <Badge variant="outline" className={r.enforcement === "blocking" ? "border-orange-500/30 text-orange-600" : ""}>
                  {ENFORCEMENT_LABEL[r.enforcement]}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={PRIORITY_BADGE_CLASS[r.priority]}>{PRIORITY_LABEL[r.priority]}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={STATUS_BADGE_CLASS[r.status]}>{STATUS_LABEL[r.status]}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onOpen(r); }}>
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
