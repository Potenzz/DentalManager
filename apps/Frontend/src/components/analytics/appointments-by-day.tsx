import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";

interface AppointmentsByDayProps {
  appointments: any[];
}

export function AppointmentsByDay({ appointments }: AppointmentsByDayProps) {
  // Data processing for appointments by day
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  
  // Initialize counts for each day
  const countsByDay = daysOfWeek.map(day => ({ day, count: 0 }));
  
  // Count appointments by day of week
  appointments.forEach(appointment => {
    const date = new Date(appointment.date);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ...
    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust to make Monday first
    countsByDay[dayIndex].count += 1;
  });

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Appointments by Day</CardTitle>
        <p className="text-xs text-muted-foreground">Distribution of appointments throughout the week</p>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={countsByDay}
              margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} />
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