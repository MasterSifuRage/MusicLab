import { createBrowserRouter } from "react-router";
import { LandingPage } from "./pages/LandingPage";
import { SignUpPage } from "./pages/SignUpPage";
import { LogInPage } from "./pages/LogInPage";
import { CreatorDashboard } from "./pages/CreatorDashboard";
import { MusicEditor } from "./pages/MusicEditor";
import { LibraryPage } from "./pages/LibraryPage";
import { AdminDashboard } from "./pages/AdminDashboard";
import { ProfilePage } from "./pages/ProfilePage";
import { RequireAuth, RequireRole, RedirectIfAuthed } from "./components/RouteGuards";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/signup",
    element: (
      <RedirectIfAuthed>
        <SignUpPage />
      </RedirectIfAuthed>
    ),
  },
  {
    path: "/login",
    element: (
      <RedirectIfAuthed>
        <LogInPage />
      </RedirectIfAuthed>
    ),
  },
  {
    path: "/dashboard",
    element: (
      <RequireAuth>
        <CreatorDashboard />
      </RequireAuth>
    ),
  },
  {
    path: "/editor/:projectId?",
    element: (
      <RequireAuth>
        <MusicEditor />
      </RequireAuth>
    ),
  },
  {
    path: "/library",
    element: (
      <RequireAuth>
        <LibraryPage />
      </RequireAuth>
    ),
  },
  {
    path: "/admin",
    element: (
      <RequireRole role="admin">
        <AdminDashboard />
      </RequireRole>
    ),
  },
  {
    path: "/profile",
    element: (
      <RequireAuth>
        <ProfilePage />
      </RequireAuth>
    ),
  },
]);
