import React from "react";
import { format, addDays, startOfWeek } from "date-fns";

export function BookingCalendar() {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday

  const days = Array.from({ length: 5 }).map((_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 9 }).map((_, i) => i + 9); // 9am to 5pm

  return (
    <div className="flex flex-col h-[600px]">
      {/* Header */}
      <div className="grid grid-cols-6 border-b pb-2">
        <div className="p-2 text-center text-sm text-muted-foreground font-medium">Time</div>
        {days.map((day, i) => (
          <div key={i} className="p-2 text-center border-l">
            <div className="font-medium text-sm">{format(day, "EEE")}</div>
            <div className="text-2xl font-bold">{format(day, "d")}</div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-6 h-full relative">
          {/* Time axis */}
          <div className="flex flex-col">
            {hours.map((hour) => (
              <div key={hour} className="h-16 border-b text-right pr-4 py-2 text-xs text-muted-foreground">
                {hour}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, dIdx) => (
            <div key={dIdx} className="border-l flex flex-col relative">
              {hours.map((hour) => (
                <div key={hour} className="h-16 border-b hover:bg-accent/50 transition-colors cursor-pointer" />
              ))}
              
              {/* Mock event on Wednesday */}
              {dIdx === 2 && (
                <div className="absolute top-[64px] left-1 right-1 h-[64px] bg-emerald-100 border border-emerald-300 rounded-md p-1 shadow-sm overflow-hidden z-10 cursor-pointer hover:bg-emerald-200 transition-colors">
                  <div className="text-xs font-semibold text-emerald-800">10:00 - 11:00</div>
                  <div className="text-xs text-emerald-700 truncate">Q3 Planning</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
