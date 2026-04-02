import { Routes, Route } from "react-router-dom";

import Login from "./pages/login";
import SocialMedia from "./pages/social_media";
import LenAnalytics from "./pages/LensAnalytics";
import Competitors from "./pages/Competitors";
import CompetitorDetail from "./pages/CompetitorDetail";


function App() {
  return (

    <Routes>
  

      {/* Login Page */}
      <Route path="/login" element={<Login />} />

      {/* Dashboard */}
      <Route path="/social_media" element={<SocialMedia />} />

      <Route path="LensAnalytics/Overview" element={<LenAnalytics />} />
      <Route path="" element={<LenAnalytics />} />

      <Route path="competitors-plan" element={<Competitors />} />

      <Route path="/:slug" element={<CompetitorDetail />} />

    </Routes>

  );
}

export default App;