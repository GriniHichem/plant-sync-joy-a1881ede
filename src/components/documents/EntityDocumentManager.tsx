import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, FileText, Image, Trash2, Filter, Eye } from "lucide-react";
import { useEntityDocuments } from "@/hooks/useEntityDocuments";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { useToast } from "@/hooks/use-toast";

const ACCEPTED_TYPES = "image/jpeg,image/jpg,image/png,image/webp,application/pdf";
const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

function fileIcon(fileType: string) {
  if (fileType?.startsWith("image/")) return <Image className="h-5 w-5 text-blue-500" />;
  if (fileType?.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />;
  return <FileText className="h-5 w-5 text-muted-foreground" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1048576).toFixed(1)} Mo`;
}

function isAllowedFile(file: File): boolean {
  const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
  const mimeOk = ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type);
  const extOk = ACCEPTED_EXTENSIONS.includes(ext);
  return mimeOk || extOk;
}

interface Props {
  entityType: string;
  entityId: string;
  canEdit?: boolean;
}

export function EntityDocumentManager({ entityType, entityId, canEdit = true }: Props) {
  const { documents, categories, loading, uploading, uploadDocument, deleteDocument } = useEntityDocuments(entityType, entityId);
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [filterCategory, setFilterCategory] = useState("__all__");
  const fileRef = useRef<HTMLInputElement>(null);

  // Viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && !isAllowedFile(file)) {
      toast({
        title: "Format non autorisé",
        description: "Seuls les fichiers PDF et images (JPG, PNG, WEBP) sont acceptés.",
        variant: "destructive",
      });
      if (fileRef.current) fileRef.current.value = "";
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !categoryId) return;
    if (!isAllowedFile(selectedFile)) {
      toast({ title: "Format non autorisé", description: "Seuls PDF et images (JPG, PNG, WEBP).", variant: "destructive" });
      return;
    }
    await uploadDocument(selectedFile, categoryId, description);
    setSelectedFile(null);
    setCategoryId("");
    setDescription("");
    setDialogOpen(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const filtered = filterCategory === "__all__"
    ? documents
    : documents.filter((d: any) => d.category_id === filterCategory);

  // Viewable documents for navigation
  const viewableDocs = filtered.map((d: any) => ({
    file_url: d.file_url,
    file_name: d.file_name,
    file_type: d.file_type || "",
  }));

  const openViewer = (idx: number) => {
    setViewerIndex(idx);
    setViewerOpen(true);
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-9 w-[200px]">
              <SelectValue placeholder="Toutes les catégories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Toutes les catégories</SelectItem>
              {categories.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="text-xs">{filtered.length} document{filtered.length > 1 ? "s" : ""}</Badge>
        </div>

        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-9">
                <Upload className="h-4 w-4 mr-2" /> Ajouter un document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Fichier * <span className="text-xs text-muted-foreground font-normal">(PDF, JPG, PNG, WEBP)</span></Label>
                  <Input
                    ref={fileRef}
                    type="file"
                    accept={ACCEPTED_TYPES}
                    onChange={handleFileSelect}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Catégorie *</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="h-12"><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Description optionnelle..." />
                </div>
                <Button onClick={handleUpload} disabled={!selectedFile || !categoryId || uploading} className="w-full h-12">
                  {uploading ? "Envoi en cours..." : "Envoyer"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Aucun document</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc: any, idx: number) => (
            <Card key={doc.id} className="hover:border-primary/20 transition-colors">
              <CardContent className="p-3 flex items-center gap-3">
                {/* Clickable thumbnail */}
                <button onClick={() => openViewer(idx)} className="shrink-0 focus:outline-none focus:ring-2 focus:ring-primary rounded">
                  {doc.file_type?.startsWith("image/") ? (
                    <img src={doc.file_url} alt={doc.file_name} className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                      {fileIcon(doc.file_type)}
                    </div>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <button onClick={() => openViewer(idx)} className="text-left w-full focus:outline-none">
                    <p className="text-sm font-medium truncate hover:text-primary transition-colors">{doc.file_name}</p>
                  </button>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {(doc as any).document_categories?.name || "—"}
                    </Badge>
                    <span>{formatSize(doc.file_size)}</span>
                    <span>{new Date(doc.created_at).toLocaleDateString("fr-FR")}</span>
                  </div>
                  {doc.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{doc.description}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openViewer(idx)} title="Visualiser">
                    <Eye className="h-4 w-4" />
                  </Button>
                  {canEdit && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteDocument(doc)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Integrated document viewer */}
      {viewableDocs.length > 0 && (
        <DocumentViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          fileUrl={viewableDocs[viewerIndex]?.file_url || ""}
          fileName={viewableDocs[viewerIndex]?.file_name || ""}
          fileType={viewableDocs[viewerIndex]?.file_type || ""}
          documents={viewableDocs}
          currentIndex={viewerIndex}
          onIndexChange={setViewerIndex}
        />
      )}
    </div>
  );
}
