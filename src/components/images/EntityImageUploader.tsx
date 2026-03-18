import { useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, Star, Trash2, Loader2, ImageIcon, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { type EntityImage } from "@/hooks/useEntityImages";
import { ImageLightbox } from "./ImageLightbox";

interface Props {
  images: EntityImage[];
  primaryImage: EntityImage | null;
  uploading: boolean;
  onUpload: (file: File, isPrimary?: boolean) => Promise<any>;
  onDelete: (image: EntityImage) => Promise<void>;
  onSetPrimary: (image: EntityImage) => Promise<void>;
  canEdit?: boolean;
  maxImages?: number;
  maxSizeMb?: number;
  className?: string;
}

export function EntityImageUploader({
  images, primaryImage, uploading, onUpload, onDelete, onSetPrimary,
  canEdit = true, maxImages = 6, maxSizeMb, className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const url = URL.createObjectURL(file);
    setPreview(url);
    setPreviewFile(file);
  };

  const confirmUpload = async () => {
    if (!previewFile) return;
    await onUpload(previewFile, images.length === 0);
    clearPreview();
  };

  const clearPreview = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPreviewFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Primary image display */}
      <div className="relative group rounded-xl overflow-hidden border bg-muted/30 aspect-[16/9] max-h-48 flex items-center justify-center">
        {preview ? (
          <>
            <img src={preview} alt="Prévisualisation" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-3">
              <Button size="sm" onClick={confirmUpload} disabled={uploading} className="gap-1.5">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Enregistrer
              </Button>
              <Button size="sm" variant="outline" onClick={clearPreview} className="gap-1.5 bg-white/10 border-white/30 text-white hover:bg-white/20">
                <X className="h-4 w-4" /> Annuler
              </Button>
            </div>
          </>
        ) : primaryImage ? (
          <>
            <img
              src={primaryImage.image_url}
              alt="Image principale"
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => openLightbox(0)}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openLightbox(0)} className="gap-1.5 bg-white/10 border-white/30 text-white hover:bg-white/20">
                  <ZoomIn className="h-4 w-4" /> Agrandir
                </Button>
                {canEdit && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} className="gap-1.5 bg-white/10 border-white/30 text-white hover:bg-white/20">
                      <Camera className="h-4 w-4" /> Changer
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onDelete(primaryImage)} className="gap-1.5 bg-red-500/20 border-red-400/30 text-white hover:bg-red-500/40">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div
            className={cn(
              "w-full h-full flex flex-col items-center justify-center cursor-pointer transition-colors",
              dragOver ? "bg-primary/10 border-primary" : "hover:bg-muted/50",
              !canEdit && "cursor-default"
            )}
            onClick={() => canEdit && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); if (canEdit) setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={canEdit ? handleDrop : undefined}
          >
            <ImageIcon className="h-8 w-8 text-muted-foreground/40 mb-2" />
            {canEdit ? (
              <>
                <p className="text-sm text-muted-foreground">Glissez ou cliquez</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  JPG, PNG, WebP • Max {maxSizeMb ?? 5} Mo
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune image</p>
            )}
          </div>
        )}
      </div>

      {/* Secondary images gallery */}
      {(images.length > 1 || (canEdit && images.length > 0 && images.length < maxImages)) && (
        <div className="flex gap-2 flex-wrap">
          {images.filter(i => !i.is_primary).map((img, idx) => (
            <div key={img.id} className="relative group w-20 h-20 rounded-lg overflow-hidden border shrink-0">
              <img
                src={img.image_url}
                alt={img.file_name}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => openLightbox(idx + 1)}
              />
              {canEdit && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 gap-0.5">
                  <button onClick={() => onSetPrimary(img)} className="p-1 rounded text-white hover:text-amber-300" title="Définir comme principale">
                    <Star className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => onDelete(img)} className="p-1 rounded text-white hover:text-red-300" title="Supprimer">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
          {canEdit && images.length < maxImages && (
            <button
              onClick={() => inputRef.current?.click()}
              className="w-20 h-20 rounded-lg border border-dashed flex items-center justify-center text-muted-foreground hover:bg-muted/50 hover:border-primary/40 transition-colors shrink-0"
            >
              <Upload className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Lightbox */}
      <ImageLightbox
        images={images}
        currentIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}
