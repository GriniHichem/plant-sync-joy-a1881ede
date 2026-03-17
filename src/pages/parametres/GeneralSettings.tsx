import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Save, TestTube, Mail, Server, Eye, EyeOff, Loader2, CheckCircle2, XCircle, ArrowLeft, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SettingRow {
  id: string;
  key: string;
  value: string;
  label: string;
  description: string;
  is_secret: boolean;
}

const SMTP_KEYS = [
  "smtp_host", "smtp_port", "smtp_user", "smtp_password",
  "smtp_from_email", "smtp_from_name", "app_name",
];

export default function GeneralSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [original, setOriginal] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Test email dialog
  const [testOpen, setTestOpen] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testSubject, setTestSubject] = useState("Test email - Configuration SMTP");
  const [sending, setSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const { data, error } = await supabase
      .from("app_settings")
      .select("*")
      .in("key", SMTP_KEYS);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else if (data) {
      setSettings(data as SettingRow[]);
      const v: Record<string, string> = {};
      for (const s of data) {
        v[s.key] = s.value;
      }
      setValues(v);
      setOriginal({ ...v });
    }
    setLoading(false);
  }

  const hasChanges = JSON.stringify(values) !== JSON.stringify(original);

  async function handleSave() {
    setSaving(true);
    try {
      for (const s of settings) {
        if (values[s.key] !== original[s.key]) {
          const { error } = await supabase
            .from("app_settings")
            .update({ value: values[s.key], updated_at: new Date().toISOString() })
            .eq("id", s.id);
          if (error) throw error;
        }
      }
      toast({ title: "Configuration sauvegardée" });
      setOriginal({ ...values });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestEmail() {
    if (!testTo) return;
    setSending(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          to: testTo,
          subject: testSubject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, hsl(221, 83%, 53%), hsl(250, 95%, 64%)); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: #fff; margin: 0; font-size: 24px;">✅ Configuration SMTP réussie</h1>
              </div>
              <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: 0;">
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                  Cet email confirme que votre configuration SMTP fonctionne correctement.
                </p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                  <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Serveur</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${values.smtp_host || "—"}</td></tr>
                  <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Port</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${values.smtp_port || "—"}</td></tr>
                  <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Expéditeur</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${values.smtp_from_name || "—"} &lt;${values.smtp_from_email || values.smtp_user || "—"}&gt;</td></tr>
                  <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Application</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${values.app_name || "—"}</td></tr>
                </table>
                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
                  Email envoyé depuis ${values.app_name || "l'application"} • ${new Date().toLocaleString("fr-FR")}
                </p>
              </div>
            </div>
          `,
          text: `Configuration SMTP réussie. Serveur: ${values.smtp_host}, Port: ${values.smtp_port}`,
          is_test: true,
        },
      });

      if (error) throw error;
      const result = data as { success?: boolean; error?: string; message?: string };
      if (result?.success) {
        setTestResult({ ok: true, msg: result.message || "Email envoyé avec succès !" });
      } else {
        setTestResult({ ok: false, msg: result?.error || "Échec de l'envoi" });
      }
    } catch (e: any) {
      setTestResult({ ok: false, msg: e.message || "Erreur réseau" });
    } finally {
      setSending(false);
    }
  }

  function renderField(key: string) {
    const setting = settings.find((s) => s.key === key);
    if (!setting) return null;
    const isPassword = setting.is_secret;
    const show = showPasswords[key];

    return (
      <div key={key} className="space-y-1.5">
        <Label htmlFor={key} className="text-sm font-medium">{setting.label}</Label>
        <div className="relative">
          <Input
            id={key}
            type={isPassword && !show ? "password" : "text"}
            value={values[key] || ""}
            onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))}
            placeholder={setting.description}
            className="h-10 pr-10"
          />
          {isPassword && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-8 w-8 p-0"
              onClick={() => setShowPasswords((p) => ({ ...p, [key]: !p[key] }))}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{setting.description}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const smtpConfigured = !!(values.smtp_host && values.smtp_user && values.smtp_password);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/parametres")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Paramètres généraux</h1>
          <p className="text-muted-foreground">Configuration de l'application et des emails</p>
        </div>
      </div>

      {/* App name */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Application
          </CardTitle>
          <CardDescription>Nom et identité de l'application</CardDescription>
        </CardHeader>
        <CardContent>
          {renderField("app_name")}
        </CardContent>
      </Card>

      {/* SMTP */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Server className="h-5 w-5 text-primary" />
                Configuration SMTP
              </CardTitle>
              <CardDescription>Connexion au serveur de messagerie pour l'envoi d'emails</CardDescription>
            </div>
            <Badge variant={smtpConfigured ? "default" : "secondary"}>
              {smtpConfigured ? "Configuré" : "Non configuré"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField("smtp_host")}
            <div className="space-y-1.5">
              <Label htmlFor="smtp_port" className="text-sm font-medium">Port SMTP</Label>
              <Select
                value={values.smtp_port || "587"}
                onValueChange={(v) => setValues((p) => ({ ...p, smtp_port: v }))}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="587">587 (TLS / STARTTLS)</SelectItem>
                  <SelectItem value="465">465 (SSL)</SelectItem>
                  <SelectItem value="25">25 (Non sécurisé)</SelectItem>
                  <SelectItem value="2525">2525 (Alternatif)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Port du serveur SMTP</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField("smtp_user")}
            {renderField("smtp_password")}
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField("smtp_from_email")}
            {renderField("smtp_from_name")}
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">💡 Conseils pour une bonne délivrabilité :</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Utilisez un email avec un domaine vérifié (SPF, DKIM, DMARC configurés)</li>
              <li>Gmail : activez les « App Passwords » dans les paramètres de sécurité</li>
              <li>Outlook/Office 365 : utilisez smtp.office365.com port 587</li>
              <li>OVH : ssl0.ovh.net port 465 ou 587</li>
              <li>Évitez d'envoyer depuis des adresses gratuites (@gmail.com) en production</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={handleSave} disabled={!hasChanges || saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Sauvegarder
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setTestTo(user?.email || "");
            setTestResult(null);
            setTestOpen(true);
          }}
          disabled={!smtpConfigured || hasChanges}
          className="gap-2"
        >
          <TestTube className="h-4 w-4" />
          Envoyer un email test
        </Button>
        {hasChanges && (
          <p className="text-sm text-destructive self-center">⚠️ Sauvegardez avant de tester</p>
        )}
      </div>

      {/* Test email dialog */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Envoyer un email test
            </DialogTitle>
            <DialogDescription>
              Un email sera envoyé via votre configuration SMTP pour vérifier que tout fonctionne.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Destinataire</Label>
              <Input
                type="email"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="votre@email.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sujet</Label>
              <Input
                value={testSubject}
                onChange={(e) => setTestSubject(e.target.value)}
              />
            </div>

            {testResult && (
              <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                testResult.ok
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}>
                {testResult.ok ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
                <span>{testResult.msg}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTestOpen(false)}>Fermer</Button>
            <Button onClick={handleTestEmail} disabled={sending || !testTo} className="gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {sending ? "Envoi en cours..." : "Envoyer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
