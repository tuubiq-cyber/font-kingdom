import { useEffect, useState } from "react";
import { ScanLine, Sparkles, CheckCircle2, Database, Globe, Brain, BarChart3, Fingerprint } from "lucide-react";

type ScanStage = "normalizing" | "hashing" | "comparing" | "dataset" | "ai" | "web" | "ranking";

interface ScanProgressProps {
  stage: ScanStage | "uploading" | "analyzing" | "done";
}

const stages: { key: string; label: string; icon: React.ElementType }[] = [
  { key: "normalizing", label: "تحليل الصورة وتحسينها", icon: ScanLine },
  { key: "hashing", label: "انشاء البصمة البصرية", icon: Fingerprint },
  { key: "comparing", label: "مقارنة مع مكتبة الخطوط", icon: Database },
  { key: "dataset", label: "فحص ارشيف المملكة المدرب", icon: Brain },
  { key: "ai", label: "تحليل بالذكاء الاصطناعي", icon: Sparkles },
  { key: "web", label: "بحث عالمي عبر الويب", icon: Globe },
  { key: "ranking", label: "ترتيب النتائج", icon: BarChart3 },
];

const stageOrder = stages.map((s) => s.key);

const ScanProgress = ({ stage }: ScanProgressProps) => {
  const [progress, setProgress] = useState(0);

  // Map legacy stages
  const mappedStage =
    stage === "uploading" ? "normalizing" :
    stage === "analyzing" ? "ai" :
    stage === "done" ? "done" : stage;

  const currentIdx = mappedStage === "done" ? stages.length : stageOrder.indexOf(mappedStage);

  useEffect(() => {
    const target = mappedStage === "done" ? 100 : Math.round(((currentIdx + 0.5) / stages.length) * 100);
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= target) {
          clearInterval(timer);
          return target;
        }
        return p + 1;
      });
    }, 30);
    return () => clearInterval(timer);
  }, [mappedStage, currentIdx]);

  return (
    <div className="w-full max-w-md mx-auto space-y-5 py-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <p className="text-foreground font-semibold text-sm">جاري فحص ارشيف المملكة...</p>
        <p className="text-muted-foreground text-xs">{progress}%</p>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-1.5">
        {stages.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === currentIdx;
          const isDone = i < currentIdx;

          return (
            <div
              key={s.key}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : isDone
                  ? "text-primary/50"
                  : "text-muted-foreground/30"
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-primary/50 shrink-0" />
              ) : (
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "animate-pulse" : ""}`} />
              )}
              <span className="text-xs font-medium">{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScanProgress;
