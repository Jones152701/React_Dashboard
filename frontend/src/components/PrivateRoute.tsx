import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

const PrivateRoute = ({ children }: any) => {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);

  useEffect(() => {
    const verifyUser = async () => {
      try {
        const res = await fetch("http://localhost:8000/protected/", {
          method: "GET",
          credentials: "include", // ✅ ONLY THIS is needed
        });

        setIsAuth(res.ok);
      } catch {
        setIsAuth(false);
      }
    };

    verifyUser();
  }, []);

  if (isAuth === null) return <div>Loading...</div>;

  return isAuth ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;