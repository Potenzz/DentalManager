import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Calendar, Settings, FileCheck, ClipboardCheck, CreditCard } from "lucide-react";

import { cn } from "@/lib/utils";

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export function Sidebar({ isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const [location] = useLocation();

  const navItems = [
    {
      name: "Dashboard",
      path: "/",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      name: "Appointments",
      path: "/appointments",
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      name: "Patients",
      path: "/patients",
      icon: <Users className="h-5 w-5" />,
    },
    {
      name: "Claims",
      path: "/claims",
      icon: <FileCheck className="h-5 w-5" />,
    },
    {
      name: "Pre-authorizations",
      path: "/preauthorizations",
      icon: <ClipboardCheck className="h-5 w-5" />,
    },
    {
      name: "Payments",
      path: "/payments",
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      name: "Settings",
      path: "/settings",
      icon: <Settings className="h-5 w-5" />,
    },
  ];

  return (
    <div
      className={cn(
        "bg-white w-64 border-r border-gray-200 shadow-sm z-10 fixed h-full md:static",
        isMobileOpen ? "block" : "hidden md:block"
      )}
    >
      <div className="p-4 border-b border-gray-200 flex items-center space-x-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-primary">
          <path d="M12 14c-1.65 0-3-1.35-3-3V5c0-1.65 1.35-3 3-3s3 1.35 3 3v6c0 1.65-1.35 3-3 3Z" />
          <path d="M19 14v-4a7 7 0 0 0-14 0v4" />
          <path d="M12 19c-5 0-8-2-9-5.5m18 0c-1 3.5-4 5.5-9 5.5Z" />
        </svg>
        <h1 className="text-lg font-medium text-primary">DentalConnect</h1>
      </div>
      
      <div className="p-2">
        
        <nav>
          {navItems.map((item) => (
            <div key={item.path}>
              <Link 
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
              >
                <div className={cn(
                  "flex items-center space-x-3 p-2 rounded-md pl-3 mb-1 transition-colors cursor-pointer",
                  location === item.path 
                    ? "text-primary font-medium border-l-2 border-primary" 
                    : "text-gray-600 hover:bg-gray-100"
                )}>
                  {item.icon}
                  <span>{item.name}</span>
                </div>
              </Link>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
