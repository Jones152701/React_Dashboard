import { Routes, Route } from "react-router-dom";

import Login from "./pages/login";
import SocialMedia from "./pages/social_media";
import LenAnalytics from "./pages/LensAnalytics";


function App() {
  return (

    <Routes>
  

      {/* Login Page */}
      <Route path="/login" element={<Login />} />

      {/* Dashboard */}
      <Route path="/social_media" element={<SocialMedia />} />

      <Route path="LensAnalytics/Overview" element={<LenAnalytics />} />

    </Routes>

  );
}

export default App;