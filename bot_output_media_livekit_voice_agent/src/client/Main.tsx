// SUPPORTING — React DOM bootstrap for the Output Media page.
// No integration logic; mounts App into #root.

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
    throw new Error("Root element not found");
}

createRoot(rootElement).render(<App />);
