import { useSearchParams } from "react-router-dom";
import { Calendar as CalendarIcon, Clock, Video } from "lucide-react";
import { useCallback, useMemo } from "react";
import { Button } from "./components/ui/Button";
import { useCalendar } from "./hooks/use-calendar";
import { useCalendarEvents } from "./hooks/use-calendar-events";
import { CalendarType } from "../schemas/CalendarSchema";
import { CalendarEventType } from "../schemas/CalendarEventSchema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/Tabs";
import { Calendar } from "./components/ui/Calendar";
import { ScrollArea } from "./components/ui/ScrollArea";

function App() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("platform_email");
  const { calendars } = useCalendar({ email });
  console.log(calendars);

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
    (c) => c.platform === "google_calendar"
  );
  const outlookCalendars = calendars.filter(
    (c) => c.platform === "microsoft_outlook"
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
            {platform.label} ({platform.calendars.length})
          </TabsTrigger>
        ))}
      </TabsList>

      {platforms.map((platform) => (
        <TabsContent key={platform.id} value={platform.id}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
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
      0
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
      // Create dates at local midnight for the selected date.
      // Then it will be converted to UTC using toISOString() (e.g., midnight PST -> 08:00 UTC)
      setSearchParams(
        new URLSearchParams({
          ...Object.fromEntries(searchParams.entries()),
          start_time__gte: new Date(
            new Date(date).setHours(0, 0, 0, 0)
          ).toISOString(),
          start_time__lte: new Date(
            new Date(date).setHours(23, 59, 59, 999)
          ).toISOString(),
        })
      );
    },
    [searchParams, setSearchParams]
  );

  const lastStatus = useMemo(
    () => calendar.status_changes.at(-1),
    [calendar.status_changes]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Left Column - Calendar Details */}
      <div className="flex flex-col gap-4">
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  {calendar.platform_email}
                </CardTitle>
                <CardDescription>
                  {calendar.status_changes.length} status change
                  {calendar.status_changes.length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`size-2 rounded-full ${
                    lastStatus?.status === "connected"
                      ? "bg-green-500"
                      : lastStatus?.status === "connecting"
                      ? "bg-yellow-500"
                      : "bg-gray-400"
                  }`}
                />
                <span className="text-sm text-gray-600 capitalize">
                  {lastStatus?.status || "Unknown"}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">
                Status History
              </h4>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {[...calendar.status_changes].reverse().map((change, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-2 rounded-full ${
                          change.status === "connected"
                            ? "bg-green-500"
                            : change.status === "connecting"
                            ? "bg-yellow-500"
                            : "bg-gray-400"
                        }`}
                      />
                      <span className="capitalize">{change.status}</span>
                    </div>
                    <span className="text-gray-500 text-xs">
                      {new Date(change.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Events List */}
      <div className="flex flex-col gap-4">
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
  const { calendar_events } = useCalendarEvents({
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
          {calendar_events.length} event
          {calendar_events.length !== 1 ? "s" : ""} scheduled
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px]">
          {calendar_events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <CalendarIcon className="size-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No events for this day</p>
            </div>
          ) : (
            <div className="space-y-2 pr-4">
              {calendar_events.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-col gap-1 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium truncate flex-1">
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
