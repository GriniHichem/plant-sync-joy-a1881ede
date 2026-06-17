import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileCode, Upload } from "lucide-react";
import { exportAccessControl, generateMigrationSql, downloadJson, downloadSql } from "@/lib/accessControlExport";
import { toast } from "sonner";
import { useState } from "react";

export default function PortabilityTab() {
  const [busy, setBusy] = useState(false);

  async function doExport(asSql: boolean) {
    setBusy(true);
    try {
      const snap = await exportAccessControl();
      if (asSql) {
        downloadSql(generateMigrationSql(snap));
        toast.success("Migration SQL téléchargée");
      } else {
        downloadJson(snap);
        toast.success("Export JSON téléchargé");
      }
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Portabilité & Self-hosting</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Exportez la configuration complète des permissions et rôles, ou générez une migration SQL prête à appliquer
            sur une instance Supabase auto-hébergée.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => doExport(false)} disabled={busy}>
              <Download className="h-4 w-4 mr-2" />Export JSON complet
            </Button>
            <Button variant="outline" onClick={() => doExport(true)} disabled={busy}>
              <FileCode className="h-4 w-4 mr-2" />Générer migration SQL
            </Button>
            <Button variant="outline" disabled title="Bientôt disponible">
              <Upload className="h-4 w-4 mr-2" />Importer (à venir)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Guide self-hosting</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Pour migrer vers votre propre infrastructure :</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Provisionnez une instance Supabase (cloud ou auto-hébergée).</li>
            <li>Appliquez les migrations <code>supabase/migrations/*.sql</code> via la CLI Supabase.</li>
            <li>Configurez les variables : <code>VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>.</li>
            <li>Déployez les edge functions (<code>supabase functions deploy</code>).</li>
            <li>Importez le SQL généré ici pour restaurer permissions et rôles.</li>
          </ol>
          <p className="text-muted-foreground">Voir <code>MANUAL.md</code> pour la procédure complète.</p>
        </CardContent>
      </Card>
    </div>
  );
}
