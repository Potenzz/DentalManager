import { SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/layout/sidebar";
import { TopAppBar } from "@/components/layout/top-app-bar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex flex-col h-screen">
        {/* Fixed top bar */}
        <TopAppBar />

        {/* Main content area */}
        <div className="flex flex-1 pt-16 min-h-0 bg-gray-100">
          {/* Sidebar (collapsible on mobile) */}
          <Sidebar />

          {/* Page content */}
          <main className="flex-1 min-w-0 min-h-0 overflow-y-auto p-4">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
