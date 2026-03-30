import { useEffect, useState } from "react";
import { ScanLine, Sparkles, CheckCircle2 } from "lucide-react";

interface ScanProgressProps {
  stage: "uploading" | "analyzing" | "done";
}

const stages = [
  { key: "uploading", label: "رفع الصورة", icon: ScanLine },
  { key: "analyzing", label: "تحليل الخطوط العربية", icon: Sparkles },
];

const ScanProgress = ({ stage }: ScanProgressProps) => {
  const [progress, setProgress] = useState(0);

  const currentIdx = stage === "done" ? 3 : stages.findIndex((s) => s.key === stage);

  useEffect(() => {
    const targets: Record<string, number> = {
      uploading: 20,
      analyzing: 60,
      generating: 85,
      done: 100,
    };
    const target = targets[stage] ?? 0;
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= target) {
          clearInterval(timer);
          return target;
        }
        return p + 1;
      });
    }, 40);
    return () => clearInterval(timer);
  }, [stage]);

  return (
    <div className="w-full max-w-md mx-auto space-y-6 py-8">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-olive rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-muted-foreground text-xs text-center">{progress}%</p>
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-3">
        {stages.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === currentIdx;
          const isDone = i < currentIdx;

          return (
            <div
              key={s.key}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 ${
                isActive
                  ? "bg-olive/10 text-olive"
                  : isDone
                  ? "text-olive/60"
                  : "text-muted-foreground/40"
              }`}
            >
              <div className="relative">
                <Icon className={`w-4 h-4 ${isActive ? "animate-pulse" : ""}`} />
              </div>
              <span className="text-sm font-medium">{s.label}</span>
              {isDone && (
                <CheckCircle2 className="w-3.5 h-3.5 text-olive/60 mr-auto" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScanProgress;
