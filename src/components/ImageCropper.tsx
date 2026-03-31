import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Crop as CropIcon, Check } from "lucide-react";

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
}

const ImageCropper = ({ imageSrc, onCropComplete }: ImageCropperProps) => {
  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    x: 25,
    y: 25,
    width: 50,
    height: 50,
  });
  const imgRef = useRef<HTMLImageElement>(null);

  const getCroppedBlob = useCallback(async () => {
    const image = imgRef.current;
    if (!image) return;

    const canvas = document.createElement("canvas");
    const pixelCrop: PixelCrop = {
      unit: "px",
      x: (crop.x / 100) * image.naturalWidth,
      y: (crop.y / 100) * image.naturalHeight,
      width: (crop.width / 100) * image.naturalWidth,
      height: (crop.height / 100) * image.naturalHeight,
    };

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    canvas.toBlob((blob) => {
      if (blob) onCropComplete(blob);
    }, "image/png");
  }, [crop, onCropComplete]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CropIcon className="w-4 h-4 text-primary" />
        <span>حدد الكلمة او الكلمتين المراد التعرف عليها</span>
      </div>

      <div className="rounded-xl overflow-hidden border border-border bg-muted flex justify-center">
        <ReactCrop crop={crop} onChange={(_, pc) => setCrop(pc)} minWidth={20} minHeight={20}>
          <img
            ref={imgRef}
            src={imageSrc}
            alt="صورة للقص"
            className="max-h-80 w-auto"
            crossOrigin="anonymous"
          />
        </ReactCrop>
      </div>

      <button onClick={getCroppedBlob} className="btn-primary w-full flex items-center justify-center gap-2">
        <Check className="w-4 h-4" />
        تاكيد القص
      </button>
    </div>
  );
};

export default ImageCropper;
