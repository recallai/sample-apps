import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import "./index.css";
import { Toaster } from "./components/ui/Sonner";
import { LiveAvatarContextProvider } from "./contexts/LiveAvatarContext";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <Toaster />
        <QueryClientProvider client={queryClient}>
            <LiveAvatarContextProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<App />} />
                    </Routes>
                </BrowserRouter>
            </LiveAvatarContextProvider>
        </QueryClientProvider>
    </React.StrictMode>,
);
