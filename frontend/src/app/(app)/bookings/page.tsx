"use client";

import React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookingCalendar } from "./_components/BookingCalendar";
import { MyBookingsList } from "./_components/MyBookingsList";
import { useApiQuery } from "@/hooks/useApiQuery";
import type { Asset } from "@/lib/types";

export default function BookingsPage() {
  const [assetId, setAssetId] = React.useState("");
  const { data: bookableAssets = [], isLoading, isError } = useApiQuery<Asset[]>(["assets", "bookable"], "/assets?is_bookable=true");
  const activeAssetId = assetId || bookableAssets[0]?.id || "";

  return (
    <div className="container mx-auto py-6">
      <PageHeader 
        title="Resource Booking" 
        description="Book shared assets like meeting rooms and vehicles."
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="col-span-1 md:col-span-1 space-y-2">
          <label className="text-sm font-medium">Select Resource</label>
          <Select value={activeAssetId} onValueChange={(value) => value && setAssetId(value)} disabled={isLoading || isError || !bookableAssets.length}>
            <SelectTrigger>
              <SelectValue placeholder="Select a resource..." />
            </SelectTrigger>
            <SelectContent>
              {bookableAssets.map((asset) => (
                <SelectItem key={asset.id} value={asset.id}>
                  {asset.asset_tag} - {asset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="list">My Bookings</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar" className="border rounded-md p-4 bg-card">
          {activeAssetId ? (
            <BookingCalendar assetId={activeAssetId} />
          ) : (
            <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">No bookable assets available.</div>
          )}
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          <MyBookingsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
