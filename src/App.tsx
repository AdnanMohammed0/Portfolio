import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PortfolioProvider } from '@/hooks/usePortfolio';
import { AuthProvider } from '@/hooks/useAuth';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { Spinner } from '@/components/primitives';
import HomePage from '@/pages/HomePage';
import { usePageViews } from '@/hooks/usePageViews';

// The public detail page and the entire admin bundle load on demand.
const ProjectDetailPage = lazy(() => import('@/pages/ProjectDetailPage'));
const AdminRoutes = lazy(() => import('@/admin/AdminRoutes'));

/** Must sit inside the router, since it reads the current location. */
function RouteTracker() {
  usePageViews();
  return null;
}

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner />
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <PortfolioProvider>
            <RouteTracker />
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/work/:slug" element={<ProjectDetailPage />} />
                <Route path="/admin/*" element={<AdminRoutes />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </PortfolioProvider>
        </AuthProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}
