import { useState, useRef, useCallback } from "react";
import { Upload, Image as ImageIcon } from "lucide-react";
import { validateImageUpload } from "@/lib/sanitize";
import { toast } from "sonner";

interface UploadZoneProps {
  onImageUpload: (file: File) => void;
  isLoading: boolean;
}

const UploadZone = ({ onImageUpload, isLoading }: UploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file?.type.startsWith("image/")) {
        const err = validateImageUpload(file);
        if (err) { toast.error(err); return; }
        onImageUpload(file);
      }
    },
    [onImageUpload]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const err = validateImageUpload(file);
      if (err) { toast.error(err); return; }
      onImageUpload(file);
    }
  };

  return (
    <div
      className={`upload-zone ${isDragging ? "dragging" : ""} ${isLoading ? "pointer-events-none opacity-60" : ""}`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      <div className="flex flex-col items-center gap-4">
        {isLoading ? (
          <>
            <div className="w-12 h-12 border-2 border-olive/30 border-t-olive rounded-full animate-spin" />
            <p className="text-muted-foreground text-lg">جاري تحليل الصورة...</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              {isDragging ? (
                <ImageIcon className="w-7 h-7 text-olive" />
              ) : (
                <Upload className="w-7 h-7 text-muted-foreground" />
              )}
            </div>
            <div className="text-center space-y-1">
              <p className="text-foreground text-lg font-medium">
                اسحب الصورة هنا او اضغط للرفع
              </p>
              <p className="text-muted-foreground text-sm">
                PNG, JPG, WEBP — حتى 10 ميغابايت
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UploadZone;
