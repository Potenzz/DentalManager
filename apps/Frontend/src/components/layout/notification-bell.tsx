import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Notification } from "@repo/db/types";
import { formatDateToHumanReadable} from "@/utils/dateUtils";

const PAGE_SIZE = 5;

export function NotificationsBell() {
  const { toast } = useToast();

  // dialog / pagination state (client-side over fetched 20)
  const [open, setOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState(0); // 0..N (each page size 5)

  // ------- Single load (no polling): fetch up to 20 latest notifications -------
  const listQuery = useQuery({
    queryKey: ["/notifications"],
    queryFn: async (): Promise<Notification[]> => {
      const res = await apiRequest("GET", "/api/notifications");
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const all = listQuery.data ?? [];
  const unread = useMemo(() => all.filter((n) => !n.read), [all]);
  const unreadCount = unread.length;

  // latest unread for spotlight
  const latestUnread = unread[0] ?? null;

  // client-side dialog pagination over the fetched 20
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const currentPageItems = useMemo(() => {
    const start = pageIndex * PAGE_SIZE;
    return all.slice(start, start + PAGE_SIZE);
  }, [all, pageIndex]);

  // ------- mutations -------
  const markRead = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/notifications/${id}/read`);
      if (!res.ok) throw new Error("Failed to mark as read");
    },
    onMutate: async (id) => {
      // optimistic update in cache
      await queryClient.cancelQueries({ queryKey: ["/notifications"] });
      const prev = queryClient.getQueryData<Notification[]>(["/notifications"]);
      if (prev) {
        queryClient.setQueryData(
          ["/notifications"],
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
      }
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["/notifications"], ctx.prev);
      toast({
        title: "Error",
        description: "Failed to update notification",
        variant: "destructive",
      });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/notifications/read-all");
      if (!res.ok) throw new Error("Failed to mark all as read");
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["/notifications"] });
      const prev = queryClient.getQueryData<Notification[]>(["/notifications"]);
      if (prev) {
        queryClient.setQueryData(
          ["/notifications"],
          prev.map((n) => ({ ...n, read: true }))
        );
      }
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["/notifications"], ctx.prev);
      toast({
        title: "Error",
        description: "Failed to mark all as read",
        variant: "destructive",
      });
    },
  });

  // when opening dialog, reset to first page
  const onOpenChange = async (v: boolean) => {
    setOpen(v);
    if (v) {
      setPageIndex(0);
      await listQuery.refetch();
    }
  };

  return (
    <div className="relative">
      {/* Bell + unread badge */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <button
            aria-label="Notifications"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 transition"
          >
            <Bell className="h-6 w-6 text-gray-700" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-5 h-5 items-center justify-center rounded-full text-xs font-semibold bg-red-600 text-white px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </DialogTrigger>

        {/* Dialog (client-side pagination over the 20 we already fetched) */}
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Notifications</DialogTitle>
          </DialogHeader>

          {listQuery.isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : all.length === 0 ? (
            <p className="text-sm text-gray-500">No notifications yet.</p>
          ) : (
            <>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {currentPageItems.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start justify-between gap-3 rounded-lg border p-3 hover:bg-gray-50 transition"
                  >
                    <div className="flex-1">
                      <p className="text-sm">{n.message}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatDateToHumanReadable(n.createdAt)}
                      </p>
                    </div>
                    {!n.read ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => markRead.mutate(Number(n.id))}
                        disabled={markRead.isPending}
                      >
                        {markRead.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-1" />
                        )}
                        Mark read
                      </Button>
                    ) : (
                      <span className="text-xs text-gray-400">Read</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pageIndex === 0}
                  onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                >
                  Prev
                </Button>
                <div className="text-xs text-gray-500">
                  Page {pageIndex + 1} / {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pageIndex >= totalPages - 1}
                  onClick={() => setPageIndex((p) => p + 1)}
                >
                  Next
                </Button>
              </div>

              <div className="mt-2 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                >
                  {markAllRead.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Mark all as read
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Spotlight: ONE latest unread (animates in; collapses when marked read) */}
      <AnimatePresence>
        {latestUnread && (
          <motion.div
            key={latestUnread.id}
            initial={{ opacity: 0, scale: 0.9, y: -6, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.95, y: -6, filter: "blur(6px)" }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="absolute z-50 top-12 right-0 w-[min(92vw,28rem)]"
          >
            <div className="relative overflow-hidden rounded-2xl border shadow-xl bg-white">
              {/* animated halo */}
              <motion.div
                initial={{ opacity: 0.15, scale: 0.8 }}
                animate={{ opacity: [0.15, 0.35, 0.15], scale: [0.8, 1, 0.8] }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="pointer-events-none absolute inset-0 bg-yellow-200"
                style={{ mixBlendMode: "multiply" }}
              />
              <div className="relative p-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    {/* ping dot */}
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500" />
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      {latestUnread.message}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatDateToHumanReadable(latestUnread.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => markRead.mutate(Number(latestUnread.id))}
                    disabled={markRead.isPending}
                  >
                    {markRead.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-1" />
                    )}
                    Mark as read
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
