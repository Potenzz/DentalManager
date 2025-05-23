import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface AppointmentsByDayProps {
  appointments: any[];
}

export function AppointmentsByDay({ appointments }: AppointmentsByDayProps) {
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const countsByDay = daysOfWeek.map((day) => ({ day, count: 0 }));

  // Get current date and set time to start of day (midnight)
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Calculate Monday of the current week
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, ...
  const diffToMonday = day === 0 ? -6 : 1 - day; // adjust if Sunday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  // Sunday of the current week
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  // Filter appointments only from this week (Monday to Sunday)
  const appointmentsThisWeek = appointments.filter((appointment) => {
    if (!appointment.date) return false;

    const date = new Date(appointment.date);
    // Reset time to compare just the date
    date.setHours(0, 0, 0, 0);

    return date >= monday && date <= sunday;
  });

  // Count appointments by day for current week
  appointmentsThisWeek.forEach((appointment) => {
    const date = new Date(appointment.date);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ...
    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday=0, Sunday=6
    if (countsByDay[dayIndex]) {
      countsByDay[dayIndex].count += 1;
    }
  });


  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          Appointments by Day
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Distribution of appointments throughout the week
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={countsByDay}
              margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="day"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(value) => [`${value} appointments`, "Count"]}
                labelFormatter={(value) => `${value}`}
              />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
