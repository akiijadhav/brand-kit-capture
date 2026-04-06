import { useState } from "react";
import type { SwatchEntry } from "@/lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 4;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatEntryName(entry: { object_name: string; created_at: string | null }): string {
  const raw = entry.created_at ?? null;
  const date = raw ? new Date(raw) : null;
  if (date && !isNaN(date.getTime())) {
    return date.toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true,
    });
  }
  return entry.object_name.replace("swatches/", "").replace("typography/", "");
}

interface GalleryProps {
  entries: SwatchEntry[];
  loading: boolean;
  title: string;
}

export default function Gallery({ entries, loading, title }: GalleryProps) {
  const [page, setPage] = useState(0);
  const [copiedName, setCopiedName] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="w-full text-center py-4">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (entries.length === 0) return null;

  const totalPages = Math.ceil(entries.length / PAGE_SIZE);
  const paged = entries.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const copyUrl = async (url: string, name: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedName(name);
    setTimeout(() => setCopiedName(null), 2000);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">
          {title} ({entries.length})
        </h3>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground tabular-nums w-12 text-center">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages - 1}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {paged.map((entry) => (
          <div
            key={entry.object_name}
            className="bg-card rounded-xl border border-border overflow-hidden shadow-sm"
          >
            <div className="relative">
              <img
                src={entry.view_url}
                alt={entry.object_name}
                className="w-full h-auto"
              />
              {entry.size != null && (
                <span className="absolute top-2 right-2 text-[10px] font-mono bg-black/60 text-white px-1.5 py-0.5 rounded">
                  {formatFileSize(entry.size)}
                </span>
              )}
            </div>
            <div className="px-3 py-2 flex items-center justify-between gap-2">
              <span
                className="text-xs text-muted-foreground truncate flex-1"
                title={entry.object_name}
              >
                {formatEntryName(entry)}
              </span>
              <button
                onClick={() => copyUrl(entry.view_url, entry.object_name)}
                className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground transition-colors shrink-0"
              >
                {copiedName === entry.object_name ? "Copied!" : "Copy URL"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
