import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  FileCheck,
  Shield,
  CreditCard,
  FolderOpen,
  Database,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { useSidebar } from "@/components/ui/sidebar";

const WIDTH_ANIM_MS = 100;

export function Sidebar() {
  const [location] = useLocation();
  const { state, openMobile, setOpenMobile } = useSidebar(); // "expanded" | "collapsed"

  // Delay label visibility until the width animation completes
  const [showLabels, setShowLabels] = useState(state !== "collapsed");
  useEffect(() => {
    let timer: number | undefined;

    if (state === "expanded") {
      timer = window.setTimeout(() => setShowLabels(true), WIDTH_ANIM_MS);
    } else {
      setShowLabels(false);
    }

    return () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [state]);

  const navItems = useMemo(
    () => [
      {
        name: "Dashboard",
        path: "/dashboard",
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
        name: "Insurance Eligibility",
        path: "/insurance-eligibility",
        icon: <Shield className="h-5 w-5" />,
      },
      {
        name: "Claims/PreAuth",
        path: "/claims",
        icon: <FileCheck className="h-5 w-5" />,
      },
      {
        name: "Payments",
        path: "/payments",
        icon: <CreditCard className="h-5 w-5" />,
      },
      {
        name: "Documents",
        path: "/documents",
        icon: <FolderOpen className="h-5 w-5" />,
      },
      {
        name: "Reports",
        path: "/reports",
        icon: <FileText className="h-5 w-5" />,
      },
      {
        name: "Backup Database",
        path: "/database-management",
        icon: <Database className="h-5 w-5" />,
      },
      {
        name: "Settings",
        path: "/settings",
        icon: <Settings className="h-5 w-5" />,
      },
    ],
    []
  );

  return (
    <div
      className={cn(
        // original look
        "bg-white border-r border-gray-200 shadow-sm z-20",
        // clip during width animation to avoid text peeking
        "overflow-hidden will-change-[width]",
        // animate width only
        "transition-[width] duration-200 ease-in-out",
        // MOBILE: overlay below topbar (h = 100vh - 4rem)
        openMobile
          ? "fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 block md:hidden"
          : "hidden md:block",
        // DESKTOP: participates in row layout
        "md:static md:top-auto md:h-auto md:flex-shrink-0",
        state === "collapsed" ? "md:w-16" : "md:w-64"
      )}
    >
      <div className="p-2">
        <nav role="navigation" aria-label="Main">
          {navItems.map((item) => (
            <div key={item.path}>
              <Link to={item.path} onClick={() => setOpenMobile(false)}>
                <div
                  className={cn(
                    "flex items-center space-x-3 p-2 rounded-md pl-3 mb-1 transition-colors cursor-pointer",
                    location === item.path
                      ? "text-primary font-medium border-l-2 border-primary"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {item.icon}
                  {/* show label only after expand animation completes */}
                  {showLabels && (
                    <span className="whitespace-nowrap select-none">
                      {item.name}
                    </span>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
