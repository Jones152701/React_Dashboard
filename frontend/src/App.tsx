import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Login from "./pages/login";
import SocialMedia from "./pages/social_media";
import LenAnalytics from "./pages/LensAnalytics";
import Competitors from "./pages/Competitors";
import CompetitorDetail from "./pages/CompetitorDetail";
import PrivateRoute from "./components/PrivateRoute";

function App() {
  return (
    <>
      <Routes>

        {/* Login Page */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route
          path="/social_media"
          element={
            <PrivateRoute>
              <SocialMedia />
            </PrivateRoute>
          }
        />

        <Route
          path="/LensAnalytics/Overview"
          element={
            <PrivateRoute>
              <LenAnalytics />
            </PrivateRoute>
          }
        />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <LenAnalytics />
            </PrivateRoute>
          }
        />

        <Route
          path="/competitors-plan"
          element={
            <PrivateRoute>
              <Competitors />
            </PrivateRoute>
          }
        />

        <Route
          path="/:slug"
          element={
            <PrivateRoute>
              <CompetitorDetail />
            </PrivateRoute>
          }
        />

      </Routes>

      {/* ✅ ADD THIS (GLOBAL TOASTER) */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
      />
    </>
  );
}

export default App;