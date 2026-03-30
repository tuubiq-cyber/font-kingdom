import { useState, useRef } from "react";
import { Search, Image, X } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  onImageSearch: (file: File) => void;
}

const SearchBar = ({ onSearch, onImageSearch }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type.startsWith("image/")) onImageSearch(file);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="flex-1 relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن خط بالاسم..."
          className="w-full bg-muted border border-border rounded-lg pr-10 pl-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-olive/50 focus:border-olive/50 transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageChange}
      />
      <button
        type="button"
        onClick={() => imageInputRef.current?.click()}
        className="btn-outline flex items-center gap-2 text-sm px-4 py-2.5 shrink-0"
        title="بحث بالصورة"
      >
        <Image className="w-4 h-4" />
        <span className="hidden sm:inline">بحث بصورة</span>
      </button>
    </form>
  );
};

export default SearchBar;
