import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, AlertCircle, CheckCircle2, XCircle, Play } from "lucide-react";
import type { PreflightResult } from "@/lib/ruleValidation";

interface PreflightProps { result: PreflightResult }
export function PreflightBanner({ result }: PreflightProps) {
  if (result.errors.length === 0 && result.warnings.length === 0) return null;
  return (
    <div className="space-y-2">
      {result.errors.map((e, i) => (
        <Alert key={`e-${i}`} variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{e}</AlertDescription>
        </Alert>
      ))}
      {result.warnings.map((w, i) => (
        <Alert key={`w-${i}`} className="py-2 border-orange-500/30 bg-orange-500/5">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-xs text-orange-700">{w}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

interface DryRunProps {
  sampleContext: Record<string, unknown>;
  onTest: (ctx: Record<string, unknown>) => boolean;
}
export function DryRunTester({ sampleContext, onTest }: DryRunProps) {
  const [text, setText] = useState(JSON.stringify(sampleContext, null, 2));
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  const run = () => {
    try {
      const ctx = text.trim() ? JSON.parse(text) : {};
      setResult({ ok: onTest(ctx) });
    } catch {
      setResult({ ok: false, error: "JSON invalide" });
    }
  };

  return (
    <div className="space-y-2 rounded-md border border-dashed p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Tester la règle avec un exemple</span>
        <Button variant="outline" size="sm" onClick={run}>
          <Play className="h-3.5 w-3.5 mr-1" /> Tester
        </Button>
      </div>
      <Textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="font-mono text-xs"
        placeholder='{"priority": "high"}'
      />
      {result && (
        <div className={`flex items-center gap-2 text-xs ${result.ok ? "text-success" : "text-destructive"}`}>
          {result.error ? (
            <><XCircle className="h-4 w-4" /> {result.error}</>
          ) : result.ok ? (
            <><CheckCircle2 className="h-4 w-4" /> La règle se déclencherait avec ces données.</>
          ) : (
            <><XCircle className="h-4 w-4" /> Conditions non satisfaites.</>
          )}
        </div>
      )}
    </div>
  );
}
