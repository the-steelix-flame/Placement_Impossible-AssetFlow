"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/shared/AppSidebar";
import { AuthGate } from "@/components/shared/AuthGate";
import { CommandPalette } from "@/components/shared/CommandPalette";
import { Topbar } from "@/components/shared/Topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <AuthGate>
      <div className="flex min-h-screen bg-background">
        <AppSidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            onOpenCommand={() => setCommandOpen(true)}
            onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
          />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
        <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      </div>
    </AuthGate>
  );
}
