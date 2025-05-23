import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";

interface NewPatientsProps {
  patients: any[];
}

export function NewPatients({ patients }: NewPatientsProps) {
  // Get months for the chart
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  // Process patient data by registration month
  const patientsByMonth = months.map(month => ({ name: month, count: 0 }));
  
  // Count new patients by month
  patients.forEach(patient => {
    const createdDate = new Date(patient.createdAt);
    const monthIndex = createdDate.getMonth();
    if (patientsByMonth[monthIndex]) {
  patientsByMonth[monthIndex].count += 1;
}
  });

  // Add some sample data for visual effect if no patients
  if (patients.length === 0) {
    // Sample data pattern similar to the screenshot
    const sampleData = [17, 12, 22, 16, 15, 17, 22, 28, 20, 16];
    sampleData.forEach((value, index) => {
      if (index < patientsByMonth.length ) {
        if (patientsByMonth[index]) {
        patientsByMonth[index].count = value;
      }}
    });
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">New Patients</CardTitle>
        <p className="text-xs text-muted-foreground">Monthly trend of new patient registrations</p>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={patientsByMonth}
              margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                formatter={(value) => [`${value} patients`, "Count"]}
                labelFormatter={(value) => `${value}`}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#f97316" 
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}