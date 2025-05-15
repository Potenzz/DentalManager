import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type ColorKey = "primary" | "secondary" | "success" | "warning" | "blue" | "teal" | "green" | "orange" | "rose" | "violet";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: ColorKey;
}

const colorMap: Record<ColorKey, { bg: string; text: string }> = {
  primary: { bg: "bg-primary bg-opacity-10", text: "text-primary" },
  secondary: { bg: "bg-teal-500 bg-opacity-10", text: "text-teal-500" },
  success: { bg: "bg-green-500 bg-opacity-10", text: "text-green-500" },
  warning: { bg: "bg-orange-500 bg-opacity-10", text: "text-orange-500" },
  blue: { bg: "bg-blue-100", text: "text-blue-600" },
  teal: { bg: "bg-teal-100", text: "text-teal-600" },
  green: { bg: "bg-green-100", text: "text-green-600" },
  orange: { bg: "bg-orange-100", text: "text-orange-600" },
  rose: { bg: "bg-rose-100", text: "text-rose-600" },
  violet: { bg: "bg-violet-100", text: "text-violet-600" },
};

export function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  const { bg, text } = colorMap[color] ?? colorMap.primary;

  return (
    <Card className="shadow-sm hover:shadow transition-shadow duration-200">
      <CardContent className="p-4 flex items-center space-x-4">
        <div className={`rounded-full p-3 ${bg} ${text}`}>
                    <Icon className="h-5 w-5" stroke="currentColor" />

        </div>
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <h3 className="text-xl font-medium">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}
