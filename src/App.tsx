import { lazy, Suspense, type ReactNode } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { RequireAuth, RequireGuest } from '@/components/layout/guards';
import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';

// Everything below is only needed once a specific route is visited, so it's
// split into its own chunk instead of shipping in the initial bundle every
// visitor downloads before they've even logged in. Login/NotFound stay
// eager above since a first-ever load almost always lands on one of them
// (either directly, or via RequireAuth/RequireGuest redirecting there).
const CompleteProfile = lazy(() => import('@/pages/CompleteProfile'));
const Feed = lazy(() => import('@/pages/Feed'));
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail'));
const CreateProject = lazy(() => import('@/pages/CreateProject'));
const LookingForTeam = lazy(() => import('@/pages/LookingForTeam'));
const Events = lazy(() => import('@/pages/Events'));
const EventDetail = lazy(() => import('@/pages/EventDetail'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const UserProfile = lazy(() => import('@/pages/UserProfile'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const ModerationReports = lazy(() => import('@/pages/moderation/Reports'));

// Small inline spinner instead of a full-screen one: this sits *inside*
// AppShell (which is not lazy), so the navbar/footer stay mounted and only
// the content area shows a loading state while a route chunk downloads.
function RouteLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-600 border-t-transparent" />
    </div>
  );
}

// Wraps a lazy page in its own Suspense boundary so navigating between two
// lazy routes doesn't make the previous page's content vanish while the
// next chunk loads — only ever the incoming page's own slot shows a spinner.
function Page({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteLoader />}>{children}</Suspense>;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RequireGuest>
            <Login />
          </RequireGuest>
        }
      />
      <Route
        path="/complete-profile"
        element={
          <RequireAuth>
            <Page>
              <CompleteProfile />
            </Page>
          </RequireAuth>
        }
      />
      <Route
        path="/feed"
        element={
          <RequireAuth>
            <AppShell>
              <Page>
                <Feed />
              </Page>
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/projects/new"
        element={
          <RequireAuth>
            <AppShell>
              <Page>
                <CreateProject />
              </Page>
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/projects/:id"
        element={
          <RequireAuth>
            <AppShell>
              <Page>
                <ProjectDetail />
              </Page>
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/projects/:id/edit"
        element={
          <RequireAuth>
            <AppShell>
              <Page>
                <CreateProject />
              </Page>
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/users/:id"
        element={
          <RequireAuth>
            <AppShell>
              <Page>
                <UserProfile />
              </Page>
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/events"
        element={
          <RequireAuth>
            <AppShell>
              <Page>
                <Events />
              </Page>
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/events/:id"
        element={
          <RequireAuth>
            <AppShell>
              <Page>
                <EventDetail />
              </Page>
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/looking-for-team"
        element={
          <RequireAuth>
            <AppShell>
              <Page>
                <LookingForTeam />
              </Page>
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <AppShell>
              <Page>
                <Dashboard />
              </Page>
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/moderation/reports"
        element={
          <RequireAuth>
            <AppShell>
              <Page>
                <ModerationReports />
              </Page>
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/privacy"
        element={
          <Page>
            <PrivacyPolicy />
          </Page>
        }
      />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppShell>
              <Page>
                <Feed />
              </Page>
            </AppShell>
          </RequireAuth>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}