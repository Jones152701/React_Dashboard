import React, { useState } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "bootstrap/dist/css/bootstrap.min.css";
import "react-toastify/dist/ReactToastify.css";
import "../assets/css/login.css";
import favicon from "../assets/images/favicon.ico"
import loginLogo from "../assets/images/login_logo.png";


const setFavicon = (iconPath: string) => {
  const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;

  if (link) {
    link.href = iconPath;
  } else {
    const newLink = document.createElement("link");
    newLink.rel = "icon";
    newLink.href = iconPath;
    document.head.appendChild(newLink);
  }
};



// API configuration
const API_BASE_URL = "http://localhost:8000";

const Login: React.FC = () => {

   useEffect(() => {
    document.title = "Login";
    setFavicon(favicon);
  }, []);

  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
        const response = await fetch(`${API_BASE_URL}/api/token/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // ✅ REQUIRED
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();

      if (response.ok) {
        

        toast.success("You have logged in successfully.", {
          position: "top-right",
          autoClose: 1200,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: false,
          draggable: true,
        });

        // Short delay for toast to be seen before redirect
        setTimeout(() => {
          navigate("/social_media");
        }, 1200);
      } else {
        // Handle specific error messages from backend
        const errorMessage = result.detail || "Invalid username or password.";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page d-flex justify-content-center align-items-center">
      <div className="login-wrapper shadow-lg">
        <div className="row g-0">
          {/* LEFT PANEL */}
          <div className="col-md-5 left-box d-flex align-items-center">
            <div className="w-100 px-4 text-center">
              <div className="user-icon mx-auto mb-4">👤</div>

              <form onSubmit={handleLogin}>
                <input
                  type="text"
                  className="form-control rounded-pill mb-3"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="username"
                />

                <input
                  type="password"
                  className="form-control rounded-pill mb-4"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                />

                <button
                  type="submit"
                  className="btn btn-login w-100 rounded-pill py-2 text-light"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      LOGGING IN...
                    </>
                  ) : (
                    "LOGIN"
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="col-md-7 right-box d-flex align-items-center justify-content-center">
            <div className="right-content text-center p-5">
              <img
                src={loginLogo}
                alt="logo"
                className="img-fluid"
                style={{ maxWidth: "220px" }}
              />

              <h5 className="mt-4 text-white">
                Your internal <b>AI workshop</b> for analytics, insights & automation
              </h5>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Login;