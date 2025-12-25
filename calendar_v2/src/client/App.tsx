import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  Trash2,
  Loader2,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { CalendarType } from "../schemas/CalendarArtifactSchema";
import type { CalendarEventType } from "../schemas/CalendarEventArtifactSchema";
import { Button } from "./components/ui/Button";
import { Calendar } from "./components/ui/Calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./components/ui/Dialog";
import { ScrollArea } from "./components/ui/ScrollArea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/Tabs";
import { useCalendar } from "./hooks/use-calendar";
import { useCalendarEvents } from "./hooks/use-calendar-events";
import { useDeleteCalendar } from "./hooks/use-delete-calendar";

function App() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("platform_email");
  const { calendars } = useCalendar({ email });

  return (
    <>
      {calendars?.length ? (
        <CalendarList calendars={calendars} />
      ) : (
        <div className="flex items-center justify-center min-h-[60vh]">
          <ConnectCalendar />
        </div>
      )}
    </>
  );
}

export default App;

function ConnectCalendar() {
  return (
    <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-lg border shadow-sm max-w-md">
      <div className="flex items-center justify-center size-12 bg-gray-100 rounded-full">
        <CalendarIcon className="size-6 text-gray-600" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold">No calendars connected</h2>
        <p className="text-sm text-gray-500 mt-1">
          Connect your calendar to start scheduling bots for your meetings.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 w-full">
        <Button
          className="flex-1"
          variant="outline"
          onClick={() => {
            window.location.href =
              "/api/calendar/oauth?platform=google_calendar";
          }}
        >
          Connect Google
        </Button>
        <Button
          className="flex-1"
          variant="outline"
          onClick={() => {
            window.location.href =
              "/api/calendar/oauth?platform=microsoft_outlook";
          }}
        >
          Connect Outlook
        </Button>
      </div>
    </div>
  );
}

function CalendarList({ calendars }: { calendars: CalendarType[] }) {
  const googleCalendars = calendars.filter(
    (c) => c.platform === "google_calendar",
  );
  const outlookCalendars = calendars.filter(
    (c) => c.platform === "microsoft_outlook",
  );

  const platforms = [
    {
      id: "google_calendar",
      label: "Google Calendar",
      calendars: googleCalendars,
    },
    {
      id: "microsoft_outlook",
      label: "Microsoft Outlook",
      calendars: outlookCalendars,
    },
  ].filter((p) => p.calendars.length > 0);

  const defaultTab = platforms[0]?.id || "google_calendar";

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList>
        {platforms.map((platform) => (
          <TabsTrigger key={platform.id} value={platform.id}>
            {platform.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {platforms.map((platform) => (
        <TabsContent key={platform.id} value={platform.id}>
          <div className="flex flex-col gap-6 mt-4">
            {platform.calendars.map((calendar) => (
              <CalendarDetails key={calendar.id} calendar={calendar} />
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

function CalendarDetails({ calendar }: { calendar: CalendarType }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { deleteCalendar, isDeleting } = useDeleteCalendar({
    calendarId: calendar.id,
  });

  // Helper to get local midnight as UTC ISO string
  const getLocalMidnightAsUTC = useCallback((dayOffset: number = 0) => {
    const now = new Date();
    // Create a date at local midnight, then convert to UTC via toISOString()
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + dayOffset,
      0,
      0,
      0,
      0,
    ).toISOString();
  }, []);

  const selectedStartDate = useMemo(() => {
    const param = searchParams.get("start_time__gte");
    if (param) return param;
    // Default to local midnight today (expressed in UTC)
    return getLocalMidnightAsUTC(0);
  }, [searchParams, getLocalMidnightAsUTC]);

  const selectedEndDate = useMemo(() => {
    const param = searchParams.get("start_time__lte");
    if (param) return param;
    // Default to local midnight tomorrow (expressed in UTC)
    return getLocalMidnightAsUTC(1);
  }, [searchParams, getLocalMidnightAsUTC]);

  const handleDateSelect = useCallback(
    (date: Date) => {
      // Create dates at local midnight for the selected date and next day
      const y = date.getFullYear();
      const m = date.getMonth();
      const d = date.getDate();
      const startDate = new Date(y, m, d, 0, 0, 0, 0);
      const endDate = new Date(y, m, d + 1, 0, 0, 0, 0);

      setSearchParams(
        new URLSearchParams({
          ...Object.fromEntries(searchParams.entries()),
          start_time__gte: startDate.toISOString(),
          start_time__lte: endDate.toISOString(),
        }),
      );
    },
    [searchParams, setSearchParams],
  );

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Left Column - Calendar Details */}
      <div className="flex flex-col gap-4 min-w-[320px] shrink-0">
        {/* Calendar Date Picker */}
        <Card>
          <CardContent className="p-4 flex justify-center">
            <Calendar
              mode="single"
              required
              selected={
                selectedStartDate ? new Date(selectedStartDate) : undefined
              }
              onSelect={handleDateSelect}
            />
          </CardContent>
        </Card>

        {/* Calendar Status Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col w-full">
              <div className="flex items-center justify-between w-full gap-3">
                <CardTitle className="text-base">
                  {calendar.platform_email}
                </CardTitle>

                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="size-4" />
                </Button>

                <Dialog
                  open={showDeleteDialog}
                  onOpenChange={setShowDeleteDialog}
                >
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Disconnect Calendar</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to disconnect{" "}
                        <span className="font-medium">
                          {calendar.platform_email}
                        </span>
                        ? This will stop syncing events from this calendar.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowDeleteDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={isDeleting}
                        onClick={() => {
                          deleteCalendar();
                          setShowDeleteDialog(false);
                        }}
                      >
                        {isDeleting ? "Disconnecting..." : "Disconnect"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">
                Status History
              </h4>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {[...calendar.status_changes].reverse().map((change, index) => {
                  const isConnected = change.status === "connected";
                  return (
                    <div
                      key={index}
                      className={`flex items-center justify-between text-sm py-1.5 px-2 rounded ${
                        isConnected ? "bg-green-50" : "bg-gray-50"
                      }`}
                    >
                      <span
                        className={`capitalize ${
                          isConnected
                            ? "text-green-700 font-medium"
                            : "text-gray-400"
                        }`}
                      >
                        {change.status}
                      </span>
                      <span
                        className={`text-xs ${
                          isConnected ? "text-green-600" : "text-gray-400"
                        }`}
                      >
                        {new Date(change.created_at).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Events List */}
      <div className="flex flex-col gap-4 flex-1 min-w-0">
        <CalendarEventsList
          calendar={calendar}
          startTimeGte={selectedStartDate}
          startTimeLte={selectedEndDate}
        />
      </div>
    </div>
  );
}

function CalendarEventsList({
  calendar,
  startTimeGte,
  startTimeLte,
}: {
  calendar: CalendarType;
  startTimeGte: string;
  startTimeLte: string;
}) {
  const latestStatus = calendar.status_changes.at(0)?.status;
  const isConnecting = latestStatus === "connecting";

  const { calendarEvents, isPending } = useCalendarEvents({
    calendarId: calendar.id,
    startTimeGte: startTimeGte,
    startTimeLte: startTimeLte,
  });

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getEventTitle = (event: CalendarEventType) => {
    // Try to extract title from raw data
    if (event.raw?.summary) return event.raw.summary;
    if (event.raw?.subject) return event.raw.subject;
    return "Untitled Event";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="size-4" />
          Events for{" "}
          {startTimeGte
            ? new Date(startTimeGte).toLocaleDateString()
            : "all time"}
        </CardTitle>
        <CardDescription>
          {isConnecting
            ? "Syncing calendar..."
            : `${calendarEvents.length} event${
                calendarEvents.length !== 1 ? "s" : ""
              } scheduled`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] lg:h-[500px]">
          {isConnecting ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Loader2 className="size-8 text-yellow-500 mb-3 animate-spin" />
              <p className="text-sm font-medium text-gray-700">
                Connecting calendar...
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Please reload the page in a few seconds
              </p>
            </div>
          ) : isPending ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Loader2 className="size-8 text-blue-500 mb-3 animate-spin" />
              <p className="text-sm font-medium text-gray-700">
                Loading events...
              </p>
            </div>
          ) : calendarEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <CalendarIcon className="size-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No events for this day</p>
            </div>
          ) : (
            <div className="space-y-3 pr-4">
              {calendarEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-col gap-1.5 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium flex-1">
                      {getEventTitle(event)}
                    </h4>
                    {event.bots.length > 0 && (
                      <span className="shrink-0 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        Bot scheduled
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatTime(event.start_time)} -{" "}
                      {formatTime(event.end_time)}
                    </span>
                    {event.meeting_url && (
                      <span className="flex items-center gap-1">
                        <Video className="size-3" />
                        Has meeting link
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
