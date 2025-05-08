import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
}

export function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  const getBackgroundColorClass = (color: string) => {
    switch(color) {
      case 'primary':
        return 'bg-primary bg-opacity-10 text-primary';
      case 'secondary':
        return 'bg-teal-500 bg-opacity-10 text-teal-500';
      case 'success':
        return 'bg-green-500 bg-opacity-10 text-green-500';
      case 'warning':
        return 'bg-orange-500 bg-opacity-10 text-orange-500';
      default:
        return 'bg-primary bg-opacity-10 text-primary';
    }
  };

  return (
    <Card className="shadow-sm hover:shadow transition-shadow duration-200">
      <CardContent className="p-4 flex items-center space-x-4">
        <div className={`rounded-full ${getBackgroundColorClass(color)} p-3`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <h3 className="text-xl font-medium">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}
