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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Shield, Trash2, Users, Camera, Pencil, UserPlus } from "lucide-react";
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
  responsable_si: "Responsable SI",
  auditeur: "Auditeur",
  controleur_qualite: "Contrôleur Qualité",
  responsable_controle_qualite: "Resp. Contrôle Qualité",
  directeur_qualite: "Directeur Qualité",
};

export default function UsersAdmin() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [entityImages, setEntityImages] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  // Role dialog
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selUserId, setSelUserId] = useState("");
  const [selRole, setSelRole] = useState("");

  // Photo dialog
  const [photoUserId, setPhotoUserId] = useState<string | null>(null);
  const userImages = useEntityImages("user", photoUserId || undefined);

  // Edit profile dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<any>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPoste, setEditPoste] = useState("");

  // Create user dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPoste, setNewPoste] = useState("");
  const [newRole, setNewRole] = useState("");
  const [creating, setCreating] = useState(false);

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

  useEffect(() => {
    if (!photoUserId) load();
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
      setRoleDialogOpen(false);
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

  const openEditDialog = (profile: any) => {
    setEditProfile(profile);
    setEditFirstName(profile.first_name || "");
    setEditLastName(profile.last_name || "");
    setEditPoste(profile.poste || "");
    setEditDialogOpen(true);
  };

  const handleUpdateProfile = async () => {
    if (!editProfile) return;
    const { error } = await supabase.from("profiles").update({
      first_name: editFirstName,
      last_name: editLastName,
      poste: editPoste,
    }).eq("user_id", editProfile.user_id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profil mis à jour" });
      setEditDialogOpen(false);
      setEditProfile(null);
      load();
    }
  };

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword || !newFirstName || !newLastName) {
      toast({ title: "Veuillez remplir tous les champs obligatoires", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: newEmail,
          password: newPassword,
          first_name: newFirstName,
          last_name: newLastName,
          poste: newPoste || null,
          role: newRole || null,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({
        title: "Utilisateur créé",
        description: (data as any)?.warning ?? `${newEmail} est actif et prêt à se connecter.`,
      });
      setCreateDialogOpen(false);
      setNewEmail(""); setNewPassword(""); setNewFirstName("");
      setNewLastName(""); setNewPoste(""); setNewRole("");
      load();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setCreating(false);
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
        <div className="flex gap-2">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-12 px-6"><UserPlus className="h-4 w-4 mr-2" /> Créer un utilisateur</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un utilisateur</DialogTitle>
                <DialogDescription>Le nouvel utilisateur recevra un email de confirmation.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Prénom *</Label>
                    <Input value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom *</Label>
                    <Input value={newLastName} onChange={(e) => setNewLastName(e.target.value)} className="h-12" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="h-12" placeholder="nom@entreprise.com" />
                </div>
                <div className="space-y-2">
                  <Label>Mot de passe *</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-12" minLength={6} placeholder="Min. 6 caractères" />
                </div>
                <div className="space-y-2">
                  <Label>Poste</Label>
                  <Input value={newPoste} onChange={(e) => setNewPoste(e.target.value)} className="h-12" placeholder="Ex: Technicien maintenance" />
                </div>
                <div className="space-y-2">
                  <Label>Rôle initial</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger className="h-12"><SelectValue placeholder="Aucun (à attribuer plus tard)" /></SelectTrigger>
                    <SelectContent>
                      {Constants.public.Enums.app_role.map((r) => (
                        <SelectItem key={r} value={r}>{ROLE_LABELS[r] || r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateUser} disabled={creating} className="w-full h-12">
                  {creating ? "Création..." : "Créer l'utilisateur"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-12 px-6"><Plus className="h-4 w-4 mr-2" /> Attribuer un rôle</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Attribuer un rôle</DialogTitle>
                <DialogDescription>Sélectionnez un utilisateur et le rôle à attribuer.</DialogDescription>
              </DialogHeader>
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
                <TableHead className="w-20">Actions</TableHead>
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
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(p)} title="Modifier le profil">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit profile dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le profil</DialogTitle>
            <DialogDescription>Modifiez les informations de l'utilisateur.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Prénom</Label>
                <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="h-12" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Poste</Label>
              <Input value={editPoste} onChange={(e) => setEditPoste(e.target.value)} className="h-12" placeholder="Ex: Technicien maintenance" />
            </div>
            <Button onClick={handleUpdateProfile} className="w-full h-12">Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo upload dialog */}
      <Dialog open={!!photoUserId} onOpenChange={(open) => { if (!open) setPhotoUserId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Photo de profil</DialogTitle>
            <DialogDescription>Ajoutez ou modifiez la photo de profil.</DialogDescription>
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
