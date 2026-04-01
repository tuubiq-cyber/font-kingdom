import { useState, useEffect } from "react";
import { getQueueImageUrl } from "@/lib/storageUtils";

interface QueueImageProps {
  src: string;
  alt?: string;
  className?: string;
  onClick?: (e?: React.MouseEvent) => void;
}

/**
 * Image component that resolves queue image paths to signed URLs.
 * Handles both legacy public URLs and new private bucket paths.
 */
export default function QueueImage({ src, alt = "", className = "", onClick }: QueueImageProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string>("");

  useEffect(() => {
    if (!src || src === "text_query") return;

    let cancelled = false;
    getQueueImageUrl(src).then((url) => {
      if (!cancelled) setResolvedUrl(url);
    });
    return () => { cancelled = true; };
  }, [src]);

  if (!resolvedUrl) {
    return (
      <div className={`bg-muted animate-pulse ${className}`} />
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt={alt}
      className={className}
      onClick={onClick}
    />
  );
}
