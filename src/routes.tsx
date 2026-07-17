import { createBrowserRouter } from "react-router-dom";
import { MarketingShell } from "@/shells/MarketingShell/MarketingShell";
import { AppShell } from "@/shells/AppShell/AppShell";
import { FlowShell } from "@/shells/AppShell/FlowShell";

// Temporary placeholder components
const MarketingHome = () => <h1>Marketing Home</h1>;
const AppDashboard = () => <h1>App Dashboard</h1>;
const FlowOnboarding = () => <h1>Onboarding Flow (Full Screen)</h1>;
const NotFound = () => <h1>404 - Lost in Space</h1>;

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MarketingShell />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <MarketingHome /> },
      // other marketing routes (about, pricing, etc.) go here
    ],
  },
  {
    path: "/app",
    element: <AppShell />,
    children: [
      { index: true, element: <AppDashboard /> },
      // other authenticated app routes go here
    ],
  },
  {
    path: "/flow",
    element: <FlowShell />,
    children: [
      { path: "onboarding", element: <FlowOnboarding /> },
      // other full-screen flows (auth, modals, wizards) go here
    ],
  },
]);
