import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Brain,
  Database,
  CheckCircle,
  Clock,
  BarChart3,
  ArrowRight,
  LogOut,
  Trash2,
  Search,
  Layers,
  Users,
  TrendingUp,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface DatasetEntry {
  id: string;
  font_name: string;
  sample_image_url: string;
  metadata_json: any;
  visual_hash: string | null;
  verified_by_admin: boolean | null;
  created_at: string;
}

interface QueueEntry {
  id: string;
  assigned_font_name: string | null;
  admin_download_url: string | null;
  status: string;
  user_confirmation: boolean | null;
  created_at: string;
  resolved_at: string | null;
}

const ModelBrain = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const [datasetEntries, setDatasetEntries] = useState<DatasetEntry[]>([]);
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "dataset" | "history">("overview");


  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [dsRes, qRes] = await Promise.all([
        supabase.from("font_dataset").select("*").order("created_at", { ascending: false }),
        supabase.from("manual_identification_queue").select("*").order("created_at", { ascending: false }),
      ]);
      if (!dsRes.error) setDatasetEntries(dsRes.data as unknown as DatasetEntry[]);
      if (!qRes.error) setQueueEntries(qRes.data as unknown as QueueEntry[]);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleDeleteEntry = async (id: string) => {
    const { error } = await supabase.from("font_dataset").delete().eq("id", id);
    if (error) {
      toast.error("فشل الحذف");
      return;
    }
    setDatasetEntries((prev) => prev.filter((e) => e.id !== id));
    toast.success("تم حذف العينة");
  };

  // Statistics
  const stats = useMemo(() => {
    const totalSamples = datasetEntries.length;
    const verifiedSamples = datasetEntries.filter((e) => e.verified_by_admin).length;
    const withHash = datasetEntries.filter((e) => e.visual_hash).length;
    const uniqueFonts = new Set(datasetEntries.map((e) => e.font_name)).size;

    const totalRequests = queueEntries.length;
    const resolvedRequests = queueEntries.filter((e) => e.status === "resolved").length;
    const confirmedByUser = queueEntries.filter((e) => e.user_confirmation === true).length;
    const rejectedByUser = queueEntries.filter((e) => e.user_confirmation === false).length;

    const accuracy = resolvedRequests > 0 ? Math.round((confirmedByUser / resolvedRequests) * 100) : 0;

    // Font frequency
    const fontCounts: Record<string, number> = {};
    datasetEntries.forEach((e) => {
      fontCounts[e.font_name] = (fontCounts[e.font_name] || 0) + 1;
    });
    const topFonts = Object.entries(fontCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Sources breakdown
    const sources: Record<string, number> = {};
    datasetEntries.forEach((e) => {
      const src = e.metadata_json?.source || "manual_training";
      sources[src] = (sources[src] || 0) + 1;
    });

    // Categories
    const categories: Record<string, number> = {};
    datasetEntries.forEach((e) => {
      const cat = e.metadata_json?.category || "غير مصنف";
      categories[cat] = (categories[cat] || 0) + 1;
    });

    return {
      totalSamples,
      verifiedSamples,
      withHash,
      uniqueFonts,
      totalRequests,
      resolvedRequests,
      confirmedByUser,
      rejectedByUser,
      accuracy,
      topFonts,
      sources,
      categories,
    };
  }, [datasetEntries, queueEntries]);

  const filteredDataset = useMemo(() => {
    if (!searchQuery) return datasetEntries;
    const q = searchQuery.toLowerCase();
    return datasetEntries.filter((e) => e.font_name.toLowerCase().includes(q));
  }, [datasetEntries, searchQuery]);

  const sourceLabel = (src: string) => {
    const map: Record<string, string> = {
      manual_review: "مراجعة يدوية",
      user_confirmed: "تأكيد مستخدم",
      manual_training: "تدريب يدوي",
    };
    return map[src] || src;
  };

  const categoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      naskh: "نسخ", kufi: "كوفي", thuluth: "ثلث", diwani: "ديواني",
      ruqah: "رقعة", nastaliq: "نستعليق", modern: "حديث", display: "عرض",
    };
    return map[cat] || cat;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <header className="py-6 border-b border-border">
        <div className="container max-w-4xl mx-auto px-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            عقل النموذج
          </h1>
          <div className="flex items-center gap-2">
            <Link to="/train" className="btn-outline flex items-center gap-2 text-sm px-3 py-2">
              التدريب
            </Link>
            <Link to="/admin/queue" className="btn-outline flex items-center gap-2 text-sm px-3 py-2">
              الطابور
            </Link>
            <Link to="/admin" className="btn-outline flex items-center gap-2 text-sm px-3 py-2">
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button onClick={signOut} className="btn-outline text-sm px-3 py-2 text-destructive">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {[
            { key: "overview" as const, label: "نظرة عامة", icon: BarChart3 },
            { key: "dataset" as const, label: "بيانات التدريب", icon: Database },
            { key: "history" as const, label: "سجل الطلبات", icon: Clock },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6 animate-fade-in">
                {/* Key Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "عينات التدريب", value: stats.totalSamples, icon: Database },
                    { label: "خطوط فريدة", value: stats.uniqueFonts, icon: Layers },
                    { label: "نسبة الدقة", value: `${stats.accuracy}%`, icon: TrendingUp },
                    { label: "اجمالي الطلبات", value: stats.totalRequests, icon: Users },
                  ].map((s, i) => (
                    <div key={i} className="font-card flex flex-col items-center gap-2 py-4">
                      <s.icon className="w-5 h-5 text-primary" />
                      <span className="text-2xl font-bold text-foreground">{s.value}</span>
                      <span className="text-xs text-muted-foreground">{s.label}</span>
                    </div>
                  ))}
                </div>

                {/* Detailed Stats */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Accuracy breakdown */}
                  <div className="font-card space-y-3">
                    <h3 className="text-foreground font-semibold text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      جودة النموذج
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">عينات موثقة</span>
                        <span className="text-foreground font-medium">{stats.verifiedSamples}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">بصمات بصرية</span>
                        <span className="text-foreground font-medium">{stats.withHash}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">طلبات محلولة</span>
                        <span className="text-foreground font-medium">{stats.resolvedRequests}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">تأكيدات المستخدمين</span>
                        <span className="text-foreground font-medium">{stats.confirmedByUser}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">رفض المستخدمين</span>
                        <span className="text-foreground font-medium">{stats.rejectedByUser}</span>
                      </div>
                      {/* Accuracy bar */}
                      <div className="pt-2">
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${stats.accuracy}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 text-center">
                          نسبة رضا المستخدمين: {stats.accuracy}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Top Fonts */}
                  <div className="font-card space-y-3">
                    <h3 className="text-foreground font-semibold text-sm flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      اكثر الخطوط تكرارا
                    </h3>
                    {stats.topFonts.length === 0 ? (
                      <p className="text-muted-foreground text-xs text-center py-4">لا توجد بيانات</p>
                    ) : (
                      <div className="space-y-2">
                        {stats.topFonts.map(([name, count]) => (
                          <div key={name} className="flex items-center gap-2">
                            <span className="text-sm text-foreground flex-1 truncate">{name}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary/60 rounded-full"
                                  style={{
                                    width: `${(count / (stats.topFonts[0]?.[1] || 1)) * 100}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-6 text-left">{count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sources & Categories */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="font-card space-y-3">
                    <h3 className="text-foreground font-semibold text-sm">مصادر البيانات</h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(stats.sources).map(([src, count]) => (
                        <span
                          key={src}
                          className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full"
                        >
                          {sourceLabel(src)}: {count}
                        </span>
                      ))}
                      {Object.keys(stats.sources).length === 0 && (
                        <p className="text-muted-foreground text-xs">لا توجد بيانات</p>
                      )}
                    </div>
                  </div>

                  <div className="font-card space-y-3">
                    <h3 className="text-foreground font-semibold text-sm">التصنيفات</h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(stats.categories).map(([cat, count]) => (
                        <span
                          key={cat}
                          className="text-xs bg-accent text-accent-foreground px-2.5 py-1 rounded-full"
                        >
                          {categoryLabel(cat)}: {count}
                        </span>
                      ))}
                      {Object.keys(stats.categories).length === 0 && (
                        <p className="text-muted-foreground text-xs">لا توجد بيانات</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dataset Tab */}
            {activeTab === "dataset" && (
              <div className="space-y-4 animate-fade-in">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث في بيانات التدريب..."
                    className="w-full bg-muted border border-border rounded-lg pr-10 pl-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>

                <p className="text-muted-foreground text-xs">
                  {filteredDataset.length} عينة {searchQuery && `(تصفية من ${datasetEntries.length})`}
                </p>

                <div className="space-y-2">
                  {filteredDataset.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 bg-card border border-border/50 rounded-lg px-4 py-3"
                    >
                      <img
                        src={entry.sample_image_url}
                        alt={entry.font_name}
                        className="w-12 h-12 rounded-lg object-cover bg-muted border border-border"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground font-medium text-sm truncate">{entry.font_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{sourceLabel(entry.metadata_json?.source || "manual_training")}</span>
                          <span>·</span>
                          <span>{entry.visual_hash ? "بصمة ✓" : "بدون بصمة"}</span>
                          <span>·</span>
                          <span>{new Date(entry.created_at).toLocaleDateString("ar-SA")}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {entry.verified_by_admin && (
                          <CheckCircle className="w-4 h-4 text-primary" />
                        )}
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredDataset.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-8">لا توجد عينات</p>
                  )}
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === "history" && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-muted-foreground text-xs">{queueEntries.length} طلب اجمالي</p>
                <div className="space-y-2">
                  {queueEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 bg-card border border-border/50 rounded-lg px-4 py-3"
                    >
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          entry.status === "resolved"
                            ? entry.user_confirmation === true
                              ? "bg-primary"
                              : entry.user_confirmation === false
                              ? "bg-destructive"
                              : "bg-primary/50"
                            : "bg-muted-foreground"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-sm truncate">
                          {entry.assigned_font_name || "قيد المراجعة"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.created_at).toLocaleDateString("ar-SA")}
                          {entry.resolved_at &&
                            ` → ${new Date(entry.resolved_at).toLocaleDateString("ar-SA")}`}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                          entry.status === "resolved"
                            ? entry.user_confirmation === true
                              ? "bg-primary/10 text-primary"
                              : entry.user_confirmation === false
                              ? "bg-destructive/10 text-destructive"
                              : "bg-primary/10 text-primary/70"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {entry.status === "resolved"
                          ? entry.user_confirmation === true
                            ? "مؤكد"
                            : entry.user_confirmation === false
                            ? "مرفوض"
                            : "بانتظار الرد"
                          : "معلق"}
                      </span>
                    </div>
                  ))}
                  {queueEntries.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-8">لا يوجد سجل</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default ModelBrain;
