"use client";

import { LogOut, Menu, Search, UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { ROLE_LABELS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { useMe } from "@/hooks/useMe";

function titleFromPath(pathname: string) {
  const segment = pathname.split("/").filter(Boolean)[0] ?? "dashboard";
  return segment.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function Topbar({ onOpenCommand }: { onOpenCommand: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: me } = useMe();

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
          <Menu className="size-4" />
        </Button>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">AssetFlow</p>
          <h2 className="truncate text-lg font-semibold">{titleFromPath(pathname)}</h2>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" className="hidden min-w-56 justify-start text-muted-foreground md:inline-flex" onClick={onOpenCommand}>
          <Search className="size-4" />
          <span className="truncate">Search assets, people, screens</span>
        </Button>
        <NotificationBell />
        <div className="hidden items-center gap-3 rounded-lg border px-3 py-1.5 sm:flex">
          <UserRound className="size-4 text-muted-foreground" />
          <div className="max-w-40">
            <p className="truncate text-sm font-medium">{me?.full_name ?? "Signed in"}</p>
            <p className="truncate text-xs text-muted-foreground">{me?.role ? ROLE_LABELS[me.role] : "Loading"}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}
