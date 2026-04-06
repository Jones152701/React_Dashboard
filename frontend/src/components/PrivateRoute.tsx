import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../config";

const PrivateRoute = ({ children }: any) => {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);

  useEffect(() => {
    const verifyUser = async () => {
      try {
        await api.get("/protected/");
        setIsAuth(true);
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