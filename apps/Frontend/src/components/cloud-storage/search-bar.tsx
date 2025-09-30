import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Folder as FolderIcon,
  File as FileIcon,
  Search as SearchIcon,
  Clock as ClockIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Canonical query keys
 */
export const cloudSearchQueryKeyRoot = ["cloud-search"];

export const cloudSearchQueryKeyBase = (
  q: string,
  searchTarget: "filename" | "foldername" | "both",
  typeFilter: "any" | "images" | "pdf" | "video" | "audio",
  page: number
) => ["cloud-search", q, searchTarget, typeFilter, page];

type ResultRow = {
  id: number;
  name: string;
  mimeType?: string | null;
  folderId?: number | null;
  isComplete?: boolean;
  kind: "file" | "folder";
  fileSize?: string | number | null;
  createdAt?: string;
};

export default function CloudSearchBar({
  onOpenFolder = (id: number | null) => {},
  onSelectFile = (fileId: number) => {},
}: {
  onOpenFolder?: (id: number | null) => void;
  onSelectFile?: (fileId: number) => void;
}) {
  const [q, setQ] = useState("");
  const [searchTarget, setSearchTarget] = useState<
    "filename" | "foldername" | "both"
  >("filename"); // default filename
  const [typeFilter, setTypeFilter] = useState<
    "any" | "images" | "pdf" | "video" | "audio"
  >("any");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const debounceMs = 600;
  const [debouncedQ, setDebouncedQ] = useState(q);

  // debounce input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), debounceMs);
    return () => clearTimeout(t);
  }, [q, debounceMs]);

  function typeParamFromFilter(filter: string) {
    if (filter === "any") return undefined;
    if (filter === "images") return "image";
    if (filter === "pdf") return "application/pdf";
    return filter;
  }

  // fetcher used by useQuery
  async function fetchSearch(): Promise<{
    results: ResultRow[];
    total: number;
  }> {
    const query = debouncedQ ?? "";
    if (!query) return { results: [], total: 0 };

    const offset = (page - 1) * limit;
    const typeParam = typeParamFromFilter(typeFilter as string);

    // helper: call files endpoint
    async function callFiles() {
      const tQuery = typeParam ? `&type=${encodeURIComponent(typeParam)}` : "";
      const res = await apiRequest(
        "GET",
        `/api/cloud-storage/search/files?q=${encodeURIComponent(query)}${tQuery}&limit=${limit}&offset=${offset}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "File search failed");
      const mapped: ResultRow[] = (json.data || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        kind: "file",
        mimeType: d.mimeType,
        fileSize: d.fileSize,
        folderId: d.folderId ?? null,
        createdAt: d.createdAt,
      }));
      return { mapped, total: json.totalCount ?? mapped.length };
    }

    // helper: call folders endpoint
    async function callFolders() {
      const res = await apiRequest(
        "GET",
        `/api/cloud-storage/search/folders?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Folder search failed");
      const mapped: ResultRow[] = (json.data || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        kind: "folder",
        folderId: d.parentId ?? null,
      }));
      // enforce top-level folders only when searching folders specifically
      // (if the API already filters, this is harmless)
      return { mapped, total: json.totalCount ?? mapped.length };
    }

    // Decide which endpoints to call
    if (searchTarget === "filename") {
      const f = await callFiles();
      return { results: f.mapped, total: f.total };
    } else if (searchTarget === "foldername") {
      const fo = await callFolders();
      // filter top-level only (parentId === null)
      const topLevel = fo.mapped.filter((r) => r.folderId == null);
      return { results: topLevel, total: fo.total };
    } else {
      // both: call both and combine (folders first, then files), but keep page limit
      const [filesRes, foldersRes] = await Promise.all([
        callFiles(),
        callFolders(),
      ]);
      // folders restrict to top-level
      const foldersTop = foldersRes.mapped.filter((r) => r.folderId == null);
      const combined = [...foldersTop, ...filesRes.mapped].slice(0, limit);
      const combinedTotal = foldersRes.total + filesRes.total;
      return { results: combined, total: combinedTotal };
    }
  }

  // react-query: key depends on debouncedQ, searchTarget, typeFilter, page
  const queryKey = useMemo(
    () => cloudSearchQueryKeyBase(debouncedQ, searchTarget, typeFilter, page),
    [debouncedQ, searchTarget, typeFilter, page]
  );

  const { data, isFetching, error } = useQuery({
    queryKey,
    queryFn: fetchSearch,
    enabled: debouncedQ.length > 0,
    staleTime: 0,
  });

  // sync local UI state with query data
  const results = data?.results ?? [];
  const total = data?.total ?? 0;
  const loading = isFetching;
  const errMsg = error ? ((error as any)?.message ?? String(error)) : null;

  // persist recent terms & matches when new results arrive
  useEffect(() => {
    if (!debouncedQ) return;
    // recent terms
    try {
      const raw = localStorage.getItem("cloud_search_recent_terms");
      const prev: string[] = raw ? JSON.parse(raw) : [];
      const term = debouncedQ;
      const copy = [term, ...prev.filter((t) => t !== term)].slice(0, 10);
      localStorage.setItem("cloud_search_recent_terms", JSON.stringify(copy));
    } catch {}

    // recent matches snapshot
    try {
      const rawMatches = localStorage.getItem("cloud_search_recent_matches");
      const prevMatches: Record<string, ResultRow[]> = rawMatches
        ? JSON.parse(rawMatches)
        : {};
      const snapshot = results;
      const copy = { ...prevMatches, [debouncedQ]: snapshot };
      localStorage.setItem("cloud_search_recent_matches", JSON.stringify(copy));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, debouncedQ]);

  // load recentTerms & recentMatches from storage for initial UI
  const [recentTerms, setRecentTerms] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("cloud_search_recent_terms");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [recentMatches, setRecentMatches] = useState<
    Record<string, ResultRow[]>
  >(() => {
    try {
      const raw = localStorage.getItem("cloud_search_recent_matches");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // update recentTerms/recentMatches UI copies whenever localStorage changes (best-effort)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("cloud_search_recent_terms");
      setRecentTerms(raw ? JSON.parse(raw) : []);
    } catch {}
    try {
      const raw = localStorage.getItem("cloud_search_recent_matches");
      setRecentMatches(raw ? JSON.parse(raw) : {});
    } catch {}
  }, [data]); // refresh small UX cache when new data arrives

  // reset page when q or filters change (like before)
  useEffect(() => setPage(1), [debouncedQ, searchTarget, typeFilter]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit]
  );

  function onClear() {
    setQ("");
    // the query will auto-disable when debouncedQ is empty
  }

  return (
    <div className="bg-card p-4 rounded-2xl shadow-sm">
      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="flex items-center gap-2 flex-1">
          <SearchIcon className="h-5 w-5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search files and folders..."
            aria-label="Search files and folders"
            className="flex-1"
          />
          <Button variant="ghost" onClick={() => onClear()}>
            Clear
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select
            onValueChange={(v) => setSearchTarget(v as any)}
            value={searchTarget}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Search target" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="filename">Filename (default)</SelectItem>
              <SelectItem value="foldername">
                Folder name (top-level)
              </SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>

          <Select
            onValueChange={(v) => setTypeFilter(v as any)}
            value={typeFilter}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any type</SelectItem>
              <SelectItem value="images">Images</SelectItem>
              <SelectItem value="pdf">PDFs</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => setPage((p) => p)}>Search</Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="mb-2 text-sm font-semibold flex items-center gap-2">
            <ClockIcon className="h-4 w-4" /> Recent searches
          </h4>
          <div className="flex flex-wrap gap-2">
            {recentTerms.length ? (
              recentTerms.map((t) => (
                <motion.button
                  key={t}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-3 py-1 rounded-full bg-muted text-sm"
                  onClick={() => setQ(t)}
                >
                  {t}
                </motion.button>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">
                No recent searches
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold">Results</h4>

          <div className="bg-background rounded-md p-2 max-h-72 overflow-auto">
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-4 text-center text-sm"
                >
                  Searching...
                </motion.div>
              )}

              {!loading && errMsg && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-4 text-sm text-destructive"
                >
                  {errMsg}
                </motion.div>
              )}

              {!loading && !results.length && debouncedQ && !errMsg && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-4 text-sm text-muted-foreground"
                >
                  No results for "{debouncedQ}"
                </motion.div>
              )}

              {!loading &&
                results.map((r) => (
                  <motion.div
                    key={`${r.kind}-${r.id}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-2 rounded hover:bg-muted/50 flex items-center gap-3 cursor-pointer"
                    onClick={() => {
                      if (r.kind === "folder") onOpenFolder(r.id);
                      else onSelectFile(r.id);
                    }}
                  >
                    <div className="w-8 h-8 flex items-center justify-center rounded bg-muted">
                      {r.kind === "folder" ? (
                        <FolderIcon className="h-4 w-4" />
                      ) : (
                        <FileIcon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {r.kind === "file" ? (r.mimeType ?? "file") : "Folder"}
                      </div>
                    </div>
                    {r.kind === "file" && r.fileSize != null && (
                      <div className="text-xs text-muted-foreground">
                        {String(r.fileSize)}
                      </div>
                    )}
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {total} result(s)
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm">
                {page} / {totalPages}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
