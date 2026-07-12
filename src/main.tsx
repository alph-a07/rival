import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles/design-tokens.css";
import { ThemeProvider } from "./theme/ThemeProvider";
import App from "./app/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
