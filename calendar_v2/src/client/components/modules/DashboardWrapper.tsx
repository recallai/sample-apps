import {
  Bell,
  Calendar,
  FileText,
  Home,
  Menu,
  Settings,
  Search,
  Users,
  Video,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../../utils/cn";

const SidebarItems = [ 
  { icon: Home, label: "Dashboard", href: "#sample-link" },
  { icon: Calendar, label: "Calendars", href: "/dashboard/calendars" },
  { icon: Video, label: "Meetings", href: "#sample-link-meetings" },
  { icon: FileText, label: "Notes", href: "#sample-link-notes" },
  { icon: Users, label: "Contacts", href: "#sample-link-contacts" },
  { icon: Settings, label: "Settings", href: "#sample-link-settings" },
];

function DashboardWrapper({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-14 bg-white border-b z-50 px-4">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-md md:hidden"
            >
              {sidebarOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </button>
            <div className="flex items-center gap-2">
              <div className="size-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="size-4 text-white" />
              </div>
              <span className="font-semibold text-lg hidden sm:block">
                Calendar V2 Sample App
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-9 pr-4 py-1.5 text-sm border rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-md relative">
              <Bell className="size-5 text-gray-600" />
              <span className="absolute top-1 right-1 size-2 bg-red-500 rounded-full" />
            </button>
            <div className="size-8 bg-gray-200 rounded-full" />
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-14 left-0 bottom-0 w-56 bg-white border-r z-40 transition-transform md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="p-3 space-y-1">
          {SidebarItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100",
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="pt-14 md:pl-56">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

export default DashboardWrapper;
