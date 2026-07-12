"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useApiQuery, useApiMutation, queryClient } from "@/hooks/useApiQuery";
import { fetchApi } from "@/lib/api";
import type { Notification } from "@/lib/types";

function timeAgo(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.round(diffMs / 60_000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: notifications = [] } = useApiQuery<Notification[]>(["notifications"], "/notifications");
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markRead = useApiMutation<Notification, string>(
    (id) => fetchApi<Notification>(`/notifications/${id}/read`, { method: "POST" }),
    { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }) }
  );

  const markAllRead = useApiMutation<{ message: string }, void>(
    "/notifications/read-all",
    "POST",
    { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }) }
  );

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" onClick={() => setOpen((current) => !current)} aria-label="Notifications">
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-destructive" />
        ) : null}
      </Button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-lg border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unreadCount > 0 ? (
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => markAllRead.mutate()}
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-80 divide-y overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications yet.</div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  className="block w-full px-4 py-3 text-left hover:bg-muted disabled:opacity-60"
                  onClick={() => !notification.is_read && markRead.mutate(notification.id)}
                >
                  <p className={`text-sm ${notification.is_read ? "text-muted-foreground" : "font-medium"}`}>
                    {notification.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{timeAgo(notification.created_at)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
