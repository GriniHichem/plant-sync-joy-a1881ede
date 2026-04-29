import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface Props {
  title: string;
  subtitle: string;
}

export function QualitePlaceholder({ title, subtitle }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>

      <Card>
        <CardContent className="p-10 flex flex-col items-center justify-center text-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Construction className="h-6 w-6" />
          </div>
          <p className="font-medium">Module en préparation</p>
          <p className="text-sm text-muted-foreground max-w-md">
            Cette section sera disponible prochainement. La structure de base est en place,
            les fonctionnalités seront déployées dans une prochaine itération.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
