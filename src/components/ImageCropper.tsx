import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Crop as CropIcon, Check, RotateCcw, ZoomIn, ZoomOut, Move } from "lucide-react";

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
}

const ImageCropper = ({ imageSrc, onCropComplete }: ImageCropperProps) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      const initialCrop = centerCrop(
        makeAspectCrop({ unit: "%", width: 60 }, aspect ?? width / height, width, height),
        width,
        height
      );
      setCrop(initialCrop);
    },
    [aspect]
  );

  const getCroppedBlob = useCallback(async () => {
    const image = imgRef.current;
    if (!image || !completedCrop) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const canvas = document.createElement("canvas");
    const pw = completedCrop.width * scaleX;
    const ph = completedCrop.height * scaleY;

    canvas.width = pw;
    canvas.height = ph;
    const ctx = canvas.getContext("2d")!;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      pw,
      ph,
      0,
      0,
      pw,
      ph
    );

    canvas.toBlob(
      (blob) => {
        if (blob) onCropComplete(blob);
      },
      "image/png",
      1
    );
  }, [completedCrop, onCropComplete]);

  const handleZoom = (dir: "in" | "out") => {
    setZoom((prev) => {
      const next = dir === "in" ? prev + 0.25 : prev - 0.25;
      return Math.max(0.5, Math.min(3, next));
    });
  };

  const resetCrop = () => {
    setZoom(1);
    setAspect(undefined);
    setCrop(undefined);
    setCompletedCrop(undefined);
  };

  const hasCrop = completedCrop && completedCrop.width > 0 && completedCrop.height > 0;

  return (
    <div className="space-y-4 opacity-0 animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CropIcon className="w-4 h-4 text-primary" />
          <span>حدد الكلمة او الكلمتين المراد التعرف عليها</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between bg-card border border-border/50 rounded-lg px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleZoom("out")}
            disabled={zoom <= 0.5}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
            title="تصغير"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted-foreground font-mono w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => handleZoom("in")}
            disabled={zoom >= 3}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
            title="تكبير"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {/* Aspect ratio toggles */}
          {[
            { label: "حر", value: undefined },
            { label: "1:1", value: 1 },
            { label: "16:9", value: 16 / 9 },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setAspect(opt.value)}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                aspect === opt.value
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={resetCrop}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="اعادة ضبط"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Crop area */}
      <div className="rounded-xl overflow-hidden border border-border bg-muted/50 flex justify-center relative">
        <div
          className="overflow-auto max-h-[400px] w-full flex justify-center"
          style={{ cursor: zoom > 1 ? "grab" : "default" }}
        >
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
            minWidth={20}
            minHeight={20}
            className="max-w-full"
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="صورة للقص"
              onLoad={onImageLoad}
              className="max-w-full h-auto transition-transform duration-200"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "center center",
              }}
              crossOrigin="anonymous"
            />
          </ReactCrop>
        </div>

        {/* Zoom hint */}
        {zoom === 1 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md px-2 py-1 text-[10px] text-muted-foreground">
            <Move className="w-3 h-3" />
            استخدم التكبير لتفاصيل ادق
          </div>
        )}
      </div>

      {/* Preview of cropped area */}
      {hasCrop && imgRef.current && (
        <div className="flex items-center gap-3 bg-card border border-border/50 rounded-lg p-3">
          <div className="text-xs text-muted-foreground flex-1">
            المنطقة المحددة: {Math.round(completedCrop.width)}×{Math.round(completedCrop.height)} بكسل
          </div>
        </div>
      )}

      {/* Confirm */}
      <button
        onClick={getCroppedBlob}
        disabled={!hasCrop}
        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Check className="w-4 h-4" />
        تاكيد القص
      </button>
    </div>
  );
};

export default ImageCropper;
