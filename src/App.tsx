import { lazy, Suspense, type ReactNode } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { AllowGuest, RequireAuth, RequireGuest } from '@/components/layout/guards';
import { useAuth } from '@/contexts/useAuth';
import NotFound from '@/pages/NotFound';

// Everything below is only needed once a specific route is visited, so it's
// split into its own chunk instead of shipping in the initial bundle. Only
// NotFound stays eager; Login is lazy too, since it carries the form
// libraries and most first visits now land on the landing page.
const Login = lazy(() => import('@/pages/Login'));
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
const Terms = lazy(() => import('@/pages/Terms'));
const ModerationReports = lazy(() => import('@/pages/moderation/Reports'));
const ModerationEventDrafts = lazy(() => import('@/pages/moderation/EventDrafts'));
const ModerationStats = lazy(() => import('@/pages/moderation/Stats'));
const InvitePage = lazy(() => import('@/pages/InvitePage'));
const Schools = lazy(() => import('@/pages/Schools'));
const Home = lazy(() => import('@/pages/Home'));

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

// Signed-in pages: account required, redirects to login (and back after).
function Private({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>
        <Page>{children}</Page>
      </AppShell>
    </RequireAuth>
  );
}

// Browsable without an account — guests get the anonymized/public data and
// sign-up prompts on any action (see useAuthGate).
function Public({ children }: { children: ReactNode }) {
  return (
    <AllowGuest>
      <AppShell>
        <Page>{children}</Page>
      </AppShell>
    </AllowGuest>
  );
}

// "/" is the landing page for visitors and the feed for everyone signed in.
function HomeOrFeed() {
  const { user } = useAuth();
  return user ? <Feed /> : <Home />;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RequireGuest>
            <Page>
              <Login />
            </Page>
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
      <Route path="/" element={<Public><HomeOrFeed /></Public>} />
      <Route path="/feed" element={<Public><Feed /></Public>} />
      <Route path="/projects/new" element={<Private><CreateProject /></Private>} />
      <Route path="/projects/:id" element={<Public><ProjectDetail /></Public>} />
      <Route path="/projects/:id/edit" element={<Private><CreateProject /></Private>} />
      <Route path="/users/:id" element={<Private><UserProfile /></Private>} />
      <Route path="/events" element={<Public><Events /></Public>} />
      <Route path="/events/:id" element={<Public><EventDetail /></Public>} />
      <Route path="/schools" element={<Public><Schools /></Public>} />
      <Route path="/invite/:code" element={<Public><InvitePage /></Public>} />
      <Route path="/looking-for-team" element={<Private><LookingForTeam /></Private>} />
      <Route path="/dashboard" element={<Private><Dashboard /></Private>} />
      <Route path="/moderation/reports" element={<Private><ModerationReports /></Private>} />
      <Route path="/moderation/events" element={<Private><ModerationEventDrafts /></Private>} />
      <Route path="/moderation/stats" element={<Private><ModerationStats /></Private>} />
      <Route
        path="/privacy"
        element={
          <Page>
            <PrivacyPolicy />
          </Page>
        }
      />
      <Route
        path="/terms"
        element={
          <Page>
            <Terms />
          </Page>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
