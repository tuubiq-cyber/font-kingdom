import { useRef, useCallback } from "react";
import { Crosshair } from "lucide-react";

interface ColorPickerProps {
  label: string;
  value: string;
  imageSrc: string;
  onChange: (color: string) => void;
}

const ColorPicker = ({ label, value, imageSrc, onChange }: ColorPickerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const x = Math.round(((e.clientX - rect.left) / rect.width) * canvas.width);
      const y = Math.round(((e.clientY - rect.top) / rect.height) * canvas.height);

      const pixel = ctx.getImageData(x, y, 1, 1).data;
      const hex = `#${pixel[0].toString(16).padStart(2, "0")}${pixel[1].toString(16).padStart(2, "0")}${pixel[2].toString(16).padStart(2, "0")}`;
      onChange(hex);
    },
    [onChange]
  );

  const drawImage = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crosshair className="w-3.5 h-3.5 text-primary" />
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md border border-border shadow-sm"
            style={{ backgroundColor: value }}
          />
          <span className="text-xs text-muted-foreground font-mono" dir="ltr">
            {value}
          </span>
        </div>
      </div>

      <div className="relative rounded-lg overflow-hidden border border-border cursor-crosshair group">
        <img
          ref={imgRef}
          src={imageSrc}
          alt=""
          className="hidden"
          crossOrigin="anonymous"
          onLoad={drawImage}
        />
        <canvas
          ref={canvasRef}
          onClick={handleImageClick}
          className="w-full h-24 object-contain bg-muted"
          style={{ imageRendering: "pixelated" }}
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-background/20 backdrop-blur-[1px]">
          <span className="text-[10px] text-foreground bg-background/70 px-2 py-1 rounded-md">
            اضغط لالتقاط اللون
          </span>
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;
