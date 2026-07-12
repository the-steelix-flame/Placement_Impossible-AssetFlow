import React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookingCalendar } from "./_components/BookingCalendar";
import { MyBookingsList } from "./_components/MyBookingsList";

export default function BookingsPage() {
  const [assetId, setAssetId] = React.useState("AF-0010");

  return (
    <div className="container mx-auto py-6">
      <PageHeader 
        title="Resource Booking" 
        description="Book shared assets like meeting rooms and vehicles."
      >
        <Button>New Booking</Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="col-span-1 md:col-span-1 space-y-2">
          <label className="text-sm font-medium">Select Resource</label>
          <Select value={assetId} onValueChange={setAssetId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a resource..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AF-0010">Conference Room A</SelectItem>
              <SelectItem value="AF-0011">Conference Room B</SelectItem>
              <SelectItem value="AF-0020">Company Van 1</SelectItem>
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
          <BookingCalendar assetId={assetId} />
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          <MyBookingsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
