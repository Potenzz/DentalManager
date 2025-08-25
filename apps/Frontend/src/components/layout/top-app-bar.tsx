import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { NotificationsBell } from "@/components/layout/notification-bell";

interface TopAppBarProps {
  toggleMobileMenu: () => void;
}

export function TopAppBar({ toggleMobileMenu }: TopAppBarProps) {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden mr-2"
            onClick={toggleMobileMenu}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="md:hidden text-lg font-medium text-primary">
            DentalConnect
          </h1>
        </div>

        <div className="hidden md:flex md:flex-1 items-center justify-center">
          {/* Search bar removed */}
        </div>

        <div className="flex items-center space-x-3">
          <NotificationsBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative p-0 h-8 w-8 rounded-full"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" alt={user?.username} />
                  <AvatarFallback className="bg-primary text-white">
                    {user?.username ? getInitials(user.username) : "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>{user?.username}</DropdownMenuItem>
              <DropdownMenuItem>My Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation("/settings")}>
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
