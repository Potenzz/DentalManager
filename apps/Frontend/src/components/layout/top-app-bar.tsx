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
import { SidebarTrigger } from "@/components/ui/sidebar";

export function TopAppBar() {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();

  const handleLogout = () => logoutMutation.mutate();
  const getInitials = (username: string) =>
    username.substring(0, 2).toUpperCase();

  return (
    <header className="bg-white shadow-sm z-30 fixed top-0 left-0 right-0">
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center">
          {/* both desktop + mobile triggers */}
          <SidebarTrigger className="mr-2" />

          <div className="p-4 border-gray-200 flex items-center space-x-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-primary"
            >
              <path d="M12 14c-1.65 0-3-1.35-3-3V5c0-1.65 1.35-3 3-3s3 1.35 3 3v6c0 1.65-1.35 3-3 3Z" />
              <path d="M19 14v-4a7 7 0 0 0-14 0v4" />
              <path d="M12 19c-5 0-8-2-9-5.5m18 0c-1 3.5-4 5.5-9 5.5Z" />
            </svg>

            <h1 className="text-lg font-medium text-primary">DentalConnect</h1>
          </div>
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
