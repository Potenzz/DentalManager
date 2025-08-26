import AppLayout from "@/components/layout/app-layout";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { useAuth } from "@/hooks/use-auth";
import { Suspense } from "react";
import { Redirect, Route } from "wouter";

type ComponentLike = React.ComponentType; // works for both lazy() and regular components

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: ComponentLike;
}) {
  const { user, isLoading } = useAuth();

  return (
    <Route path={path}>
      {/* While auth is resolving: keep layout visible and show a small spinner in the content area */}
      {isLoading ? (
        <AppLayout>
          <LoadingScreen />
        </AppLayout>
      ) : !user ? (
        <Redirect to="/auth" />
      ) : (
        // Authenticated: render page inside layout. Lazy pages load with an in-layout spinner.
        <AppLayout>
          <Suspense fallback={<LoadingScreen />}>
            <Component />
          </Suspense>
        </AppLayout>
      )}
    </Route>
  );
}
