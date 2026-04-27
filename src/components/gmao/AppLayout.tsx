import { Outlet } from "react-router-dom";
import { AppTopBar } from "./AppTopBar";

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      <AppTopBar />
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
