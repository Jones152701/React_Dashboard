
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "bootstrap/dist/css/bootstrap.min.css";
import "react-toastify/dist/ReactToastify.css";
import "../assets/css/login.css";

import loginLogo from "../assets/images/login_logo.png";

const Login: React.FC = () => {

  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {

      const response = await fetch("http://127.0.0.1:8000/api/token/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          password
        })
      });

      const result = await response.json();

      if (response.ok) {

        localStorage.setItem("access", result.access);
        localStorage.setItem("refresh", result.refresh);

        document.cookie = `access=${result.access}; path=/`;

        toast.success("Login successful!");

        setTimeout(() => {
          navigate("/social_media");
        }, 1200);

      } else {
        toast.error("Invalid username or password.");
      }

    } catch (error) {
      console.error(error);
      toast.error("Error logging in. Try again.");
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
                />

                <input
                  type="password"
                  className="form-control rounded-pill mb-4"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  type="submit"
                  className="btn btn-login w-100 rounded-pill py-2 text-light"
                >
                  LOGIN
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
                Your internal <b>AI workshop</b> for analytics,
                insights & automation
              </h5>

            </div>

          </div>

        </div>

      </div>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="colored"
      />

    </div>
  );
};

export default Login;

