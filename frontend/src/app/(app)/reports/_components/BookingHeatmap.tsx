"use client";

import { useMemo } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { useApiQuery } from "@/hooks/useApiQuery";
import type { BookingHeatmapEntry } from "@/lib/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const RAMP = ["#cde2fb", "#86b6ef", "#3987e5", "#184f95"];

function levelColor(count: number, max: number) {
  if (count === 0) return null;
  if (max <= 1) return RAMP[3];
  const ratio = count / max;
  if (ratio > 0.75) return RAMP[3];
  if (ratio > 0.5) return RAMP[2];
  if (ratio > 0.25) return RAMP[1];
  return RAMP[0];
}

export function BookingHeatmap() {
  const { data = [], isLoading, isError } = useApiQuery<BookingHeatmapEntry[]>(
    ["reports", "booking-heatmap"],
    "/reports/booking-heatmap"
  );

  const { grid, max } = useMemo(() => {
    const map = new Map<string, number>();
    let maxCount = 0;
    for (const entry of data) {
      map.set(`${entry.weekday}-${entry.hour}`, entry.count);
      if (entry.count > maxCount) maxCount = entry.count;
    }
    return { grid: map, max: maxCount };
  }, [data]);

  if (isLoading) {
    return <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">Loading...</div>;
  }
  if (isError) {
    return <div className="flex h-80 items-center justify-center text-sm text-destructive">Could not load this report.</div>;
  }
  if (!data.length) {
    return (
      <div className="flex h-80 items-center justify-center">
        <EmptyState title="No bookings yet" description="The heatmap fills in once resources start getting booked." />
      </div>
    );
  }

  return (
    <div className="h-80 overflow-auto">
      <div className="inline-block min-w-full">
        <div className="flex">
          <div className="w-10 shrink-0" />
          <div className="flex flex-1 gap-[2px]">
            {HOURS.map((hour) => (
              <div key={hour} className="flex-1 text-center text-[10px] text-muted-foreground">
                {hour % 3 === 0 ? hour : ""}
              </div>
            ))}
          </div>
        </div>
        {WEEKDAYS.map((label, weekday) => (
          <div key={label} className="mt-[2px] flex items-center">
            <div className="w-10 shrink-0 text-xs text-muted-foreground">{label}</div>
            <div className="flex flex-1 gap-[2px]">
              {HOURS.map((hour) => {
                const count = grid.get(`${weekday}-${hour}`) ?? 0;
                const color = levelColor(count, max);
                return (
                  <div
                    key={hour}
                    className="group relative flex-1 aspect-square rounded-[3px] border border-black/5 dark:border-white/5"
                    style={{ backgroundColor: color ?? undefined }}
                  >
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background group-hover:block">
                      {label} {String(hour).padStart(2, "0")}:00 — {count} booking{count === 1 ? "" : "s"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Fewer</span>
          <div className="h-3 w-3 rounded-[3px] border border-black/5 dark:border-white/5" />
          {RAMP.map((hex) => (
            <div key={hex} className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: hex }} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
