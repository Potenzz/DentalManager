import { Switch, Route, Redirect } from "wouter";
import React, { lazy, Suspense } from "react";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import Dashboard from "./pages/dashboard";
import LoadingScreen from "./components/ui/LoadingScreen";

const AuthPage = lazy(() => import("./pages/auth-page"));
const AppointmentsPage = lazy(() => import("./pages/appointments-page"));
const PatientsPage = lazy(() => import("./pages/patients-page"));
const SettingsPage = lazy(() => import("./pages/settings-page"));
const ClaimsPage = lazy(() => import("./pages/claims-page"));
const PaymentsPage = lazy(() => import("./pages/payments-page"));
const InsuranceEligibilityPage = lazy(
  () => import("./pages/insurance-eligibility-page")
);
const DocumentPage = lazy(() => import("./pages/documents-page"));
const DatabaseManagementPage = lazy(
  () => import("./pages/database-management-page")
);
const ReportsPage = lazy(() => import("./pages/reports-page"));
const NotFound = lazy(() => import("./pages/not-found"));

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={() => <Redirect to="/patients" />} />

      <ProtectedRoute path="/dashboard" component={() => <Dashboard />} />
      <ProtectedRoute
        path="/appointments"
        component={() => <AppointmentsPage />}
      />
      <ProtectedRoute path="/patients" component={() => <PatientsPage />} />
      <ProtectedRoute path="/settings" component={() => <SettingsPage />} />
      <ProtectedRoute path="/claims" component={() => <ClaimsPage />} />
      <ProtectedRoute
        path="/insurance-eligibility"
        component={() => <InsuranceEligibilityPage />}
      />
      <ProtectedRoute path="/payments" component={() => <PaymentsPage />} />
      <ProtectedRoute path="/documents" component={() => <DocumentPage />} />
      <ProtectedRoute
        path="/database-management"
        component={() => <DatabaseManagementPage />}
      />
      <ProtectedRoute path="/reports/" component={() => <ReportsPage />} />
      <Route path="/auth" component={() => <AuthPage />} />
      <Route component={() => <NotFound />} />
    </Switch>
  );
}

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Suspense fallback={<LoadingScreen />}>
              <Router />
            </Suspense>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
