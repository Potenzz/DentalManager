import { Switch, Route } from "wouter";
import React, { Suspense, lazy } from "react";
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
const PreAuthorizationsPage = lazy(() => import("./pages/preauthorizations-page"));
const PaymentsPage = lazy(() => import("./pages/payments-page"));
const DocumentPage = lazy(() => import("./pages/documents-page"));
const NotFound = lazy(() => import("./pages/not-found"));

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={() => <Dashboard />} />
      <ProtectedRoute path="/appointments" component={() => <AppointmentsPage />} />
      <ProtectedRoute path="/patients" component={() => <PatientsPage />} />
      <ProtectedRoute path="/settings" component={() => <SettingsPage />} />
      <ProtectedRoute path="/claims" component={() => <ClaimsPage />} />
      <ProtectedRoute path="/preauthorizations" component={() => <PreAuthorizationsPage />} />
      <ProtectedRoute path="/payments" component={() => <PaymentsPage />} />
      <ProtectedRoute path="/documents" component={() => <DocumentPage/>}/>
      <Route path="/auth" component={() => <AuthPage />} />
      <Route component={() => <NotFound />} />
    </Switch>
  );
}


function App() {
  return (
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
  );
}

export default App;
