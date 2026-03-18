import { useState } from "react";
import { ImageIcon, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageLightbox } from "./ImageLightbox";

interface Props {
  imageUrl?: string | null;
  alt?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  rounded?: "full" | "lg" | "md";
  enableLightbox?: boolean;
}

const SIZE_MAP = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
};

const ICON_SIZE = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-6 w-6",
};

const ROUND_MAP = {
  full: "rounded-full",
  lg: "rounded-lg",
  md: "rounded-md",
};

export function EntityThumbnail({ imageUrl, alt = "", size = "md", className, rounded = "md", enableLightbox = false }: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const handleClick = () => {
    if (enableLightbox && imageUrl) setLightboxOpen(true);
  };

  return (
    <>
      <div
        className={cn(
          SIZE_MAP[size], ROUND_MAP[rounded],
          "shrink-0 overflow-hidden bg-muted/50 border flex items-center justify-center relative group",
          enableLightbox && imageUrl && "cursor-pointer",
          className
        )}
        onClick={handleClick}
      >
        {imageUrl ? (
          <>
            <img src={imageUrl} alt={alt} className="w-full h-full object-cover" loading="lazy" />
            {enableLightbox && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <ZoomIn className="h-3 w-3 text-white" />
              </div>
            )}
          </>
        ) : (
          <ImageIcon className={cn(ICON_SIZE[size], "text-muted-foreground/30")} />
        )}
      </div>

      {enableLightbox && imageUrl && (
        <ImageLightbox
          images={[{ image_url: imageUrl, file_name: alt }]}
          currentIndex={0}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          onIndexChange={() => {}}
        />
      )}
    </>
  );
}
