import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { languages, rtlLanguages } from "@/i18n";
import ThemeToggle from "@/components/ThemeToggle";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const current = languages.find((l) => l.code === i18n.language) || languages[0];

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    document.documentElement.dir = rtlLanguages.includes(code) ? "rtl" : "ltr";
    document.documentElement.lang = code;
    setOpen(false);
  };

  return (
    <div ref={ref} className="fixed top-4 left-4 z-50 flex items-center gap-2">
      <ThemeToggle />
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border/40 text-foreground text-xs font-medium hover:bg-muted transition-all duration-200"
      >
        <Globe className="w-3.5 h-3.5 text-primary" />
        <span>{current.flag} {current.name}</span>
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 w-56 max-h-80 overflow-y-auto rounded-xl bg-card border border-border/40 shadow-xl animate-fade-in">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors ${
                lang.code === i18n.language ? "bg-primary/10 text-primary font-medium" : "text-foreground"
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
