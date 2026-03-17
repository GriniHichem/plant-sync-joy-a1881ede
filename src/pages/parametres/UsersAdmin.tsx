import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Shield, Trash2, Users, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Constants } from "@/integrations/supabase/types";
import { EntityThumbnail } from "@/components/images/EntityThumbnail";
import { useEntityImages } from "@/hooks/useEntityImages";
import { EntityImageUploader } from "@/components/images/EntityImageUploader";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  resp_maintenance: "Resp. Maintenance",
  maintenancier: "Maintenancier",
  resp_production: "Resp. Production",
  chef_ligne: "Chef de ligne",
  operateur: "Opérateur",
  gestionnaire_magasin: "Gest. Magasin",
  bureau_methode: "Bureau Méthode",
};

export default function UsersAdmin() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [entityImages, setEntityImages] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selUserId, setSelUserId] = useState("");
  const [selRole, setSelRole] = useState("");
  const [photoUserId, setPhotoUserId] = useState<string | null>(null);

  const userImages = useEntityImages("user", photoUserId || undefined);

  const load = async () => {
    const [pRes, rRes, imgRes] = await Promise.all([
      supabase.from("profiles").select("*").order("last_name"),
      supabase.from("user_roles").select("*"),
      supabase.from("entity_images").select("*").eq("entity_type", "user").eq("is_primary", true),
    ]);
    setProfiles(pRes.data || []);
    setRoles(rRes.data || []);
    setEntityImages(imgRes.data || []);
  };

  useEffect(() => { load(); }, []);

  // Reload thumbnails when photo dialog closes
  useEffect(() => {
    if (!photoUserId) {
      load();
    }
  }, [photoUserId]);

  const getUserRoles = (userId: string) => roles.filter((r) => r.user_id === userId);

  const handleAddRole = async () => {
    if (!selUserId || !selRole) return;
    const existing = roles.find((r) => r.user_id === selUserId && r.role === selRole);
    if (existing) {
      toast({ title: "Rôle déjà attribué", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("user_roles").insert({ user_id: selUserId, role: selRole as any });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rôle ajouté" });
      setDialogOpen(false);
      setSelUserId("");
      setSelRole("");
      load();
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rôle retiré" });
      load();
    }
  };

  const filtered = profiles.filter((p) =>
    `${p.first_name} ${p.last_name} ${p.poste}`.toLowerCase().includes(search.toLowerCase())
  );

  if (!hasRole("admin")) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p>Accès réservé aux administrateurs</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/parametres")} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Utilisateurs & Rôles</h1>
          <p className="text-muted-foreground">{profiles.length} utilisateur(s)</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 px-6"><Plus className="h-4 w-4 mr-2" /> Attribuer un rôle</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Attribuer un rôle</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Utilisateur *</Label>
                <Select value={selUserId} onValueChange={setSelUserId}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id}>{p.first_name} {p.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rôle *</Label>
                <Select value={selRole} onValueChange={setSelRole}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {Constants.public.Enums.app_role.map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_LABELS[r] || r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddRole} className="w-full h-12">Attribuer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Input placeholder="Rechercher un utilisateur…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-12 max-w-md" />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Poste</TableHead>
                <TableHead>Rôles</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground"><Users className="h-8 w-8 mx-auto mb-2 opacity-30" />Aucun utilisateur</TableCell></TableRow>
              ) : filtered.map((p) => {
                const userRoles = getUserRoles(p.user_id);
                const img = entityImages.find((i: any) => i.entity_id === p.user_id);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="w-10 pr-0">
                      <button onClick={() => setPhotoUserId(p.user_id)} className="relative group">
                        <EntityThumbnail imageUrl={img?.image_url} alt={`${p.first_name} ${p.last_name}`} size="sm" rounded="full" />
                        <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <Camera className="h-3 w-3 text-white" />
                        </div>
                      </button>
                    </TableCell>
                    <TableCell className="font-medium">{p.first_name} {p.last_name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.poste || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {userRoles.length === 0 && <span className="text-xs text-muted-foreground">Aucun rôle</span>}
                        {userRoles.map((r: any) => (
                          <Badge key={r.id} variant="secondary" className="gap-1 pr-1">
                            {ROLE_LABELS[r.role] || r.role}
                            <button onClick={() => handleRemoveRole(r.id)} className="ml-1 hover:text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Photo upload dialog */}
      <Dialog open={!!photoUserId} onOpenChange={(open) => { if (!open) setPhotoUserId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Photo de profil</DialogTitle>
          </DialogHeader>
          {photoUserId && (
            <EntityImageUploader
              images={userImages.images}
              primaryImage={userImages.primaryImage}
              uploading={userImages.uploading}
              onUpload={userImages.uploadImage}
              onDelete={userImages.deleteImage}
              onSetPrimary={userImages.setPrimary}
              canEdit={true}
              maxImages={1}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
