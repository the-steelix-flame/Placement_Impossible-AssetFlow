"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const notifications = [
  { id: "notif-1", title: "AF-0114 allocation is due soon", time: "Today" },
  { id: "notif-2", title: "Maintenance request waiting approval", time: "Yesterday" },
];

export function NotificationBell() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" onClick={() => setOpen((current) => !current)} aria-label="Notifications">
        <Bell className="size-4" />
        <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive" />
      </Button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-lg border bg-card shadow-lg">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
          </div>
          <div className="divide-y">
            {notifications.map((notification) => (
              <div key={notification.id} className="px-4 py-3">
                <p className="text-sm font-medium">{notification.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{notification.time}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
