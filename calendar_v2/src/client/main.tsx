import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";
import DashboardWrapper from "./components/modules/DashboardWrapper";
import { Toaster } from "./components/ui/Sonner";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Toaster />
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/dashboard/*" element={<DashboardRoutes />} />
          <Route
            path="*"
            element={<Navigate replace to="/dashboard/calendar" />}
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);

function DashboardRoutes() {
  return (
    <DashboardWrapper>
      <Routes>
        <Route path="calendar" element={<App />} />
        <Route
          path="*"
          element={<Navigate replace to="/dashboard/calendar" />}
        />
      </Routes>
    </DashboardWrapper>
  );
}
