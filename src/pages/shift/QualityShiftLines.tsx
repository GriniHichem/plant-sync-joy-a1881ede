import { Link, useNavigate } from "react-router-dom";
import { useActiveShift } from "@/contexts/ActiveShiftContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Factory, ArrowLeft } from "lucide-react";

/**
 * Quick view of lines covered by the active quality shift.
 * Each line links to the full synoptic for context.
 */
export default function QualityShiftLines() {
  const { qualityShift } = useActiveShift();
  const navigate = useNavigate();

  if (!qualityShift) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="p-6 text-center text-muted-foreground">Aucun shift qualité actif.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/qualite/shift")}>
        <ArrowLeft className="h-4 w-4 mr-1.5" /> Retour shift
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Factory className="h-5 w-5 text-primary" /> Lignes couvertes ({qualityShift.lines.length})
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {qualityShift.production_shift_ids.length} shift(s) production rattaché(s).
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {qualityShift.lines.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune ligne assignée à ce shift.</p>
          )}
          {qualityShift.lines.map((l) => (
            <Link
              key={l.id}
              to={`/lignes/${l.id}`}
              className="flex items-center justify-between gap-3 p-3 rounded-lg border hover:bg-muted/40 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-mono font-bold text-sm">{l.code}</p>
                <p className="text-xs text-muted-foreground truncate">{l.designation}</p>
              </div>
              <Badge variant="outline">Synoptique →</Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
