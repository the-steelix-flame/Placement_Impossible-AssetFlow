import React from "react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { useBookings, useCreateBooking } from "./useBookings";
import { ConflictApiError } from "@/lib/api";
import { OverlapNotice } from "./OverlapNotice";

export function BookingCalendar({ assetId }: { assetId: string }) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday

  const days = Array.from({ length: 5 }).map((_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 9 }).map((_, i) => i + 9); // 9am to 5pm

  const dateFrom = days[0].toISOString();
  const dateTo = addDays(days[4], 1).toISOString();
  const { data: bookings = [], isLoading } = useBookings(assetId, dateFrom, dateTo);

  const createBooking = useCreateBooking();
  const [conflictData, setConflictData] = React.useState<{ starts_at: string; ends_at: string } | null>(null);

  const handleSlotClick = (day: Date, hour: number) => {
    setConflictData(null);
    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(day);
    end.setHours(hour + 1, 0, 0, 0);

    createBooking.mutate(
      {
        asset_id: assetId,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
      },
      {
        onError: (err) => {
          if (err instanceof ConflictApiError && err.conflictData.next_slot) {
            setConflictData(err.conflictData.next_slot);
          }
        }
      }
    );
  };

  const handleAcceptSlot = (slot: { starts_at: string; ends_at: string }) => {
    createBooking.mutate({
      asset_id: assetId,
      starts_at: slot.starts_at,
      ends_at: slot.ends_at,
    });
    setConflictData(null);
  };

  return (
    <div className="flex flex-col h-[600px]">
      {conflictData && (
        <OverlapNotice 
          nextSlot={conflictData} 
          onAcceptSlot={handleAcceptSlot} 
          onCancel={() => setConflictData(null)} 
        />
      )}
      {isLoading ? <div className="mb-3 rounded-lg border bg-card p-3 text-sm text-muted-foreground">Loading bookings...</div> : null}
      
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
                <div 
                  key={hour} 
                  className="h-16 border-b hover:bg-accent/50 transition-colors cursor-pointer" 
                  onClick={() => handleSlotClick(day, hour)}
                />
              ))}
              
              {/* Render bookings */}
              {bookings.filter(b => isSameDay(new Date(b.starts_at), day)).map(booking => {
                const startHour = new Date(booking.starts_at).getHours();
                const endHour = new Date(booking.ends_at).getHours();
                const duration = endHour - startHour;
                
                // If outside 9-5 range, skip rendering for mock simplicity
                if (startHour < 9 || startHour > 17) return null;

                const top = (startHour - 9) * 64;
                const height = duration * 64;

                return (
                  <div 
                    key={booking.id}
                    className="absolute left-1 right-1 bg-emerald-100 border border-emerald-300 rounded-md p-1 shadow-sm overflow-hidden z-10 hover:bg-emerald-200 transition-colors pointer-events-none"
                    style={{ top: `${top}px`, height: `${height}px` }}
                  >
                    <div className="text-xs font-semibold text-emerald-800">
                      {format(new Date(booking.starts_at), "h:mm a")} - {format(new Date(booking.ends_at), "h:mm a")}
                    </div>
                    <div className="text-xs text-emerald-700 truncate">{booking.purpose || "Booked"}</div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
