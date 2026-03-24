
import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

import { toast } from "react-toastify";

import logo from "../../assets/images/header_logo.png";
import "./Header.css";

const Header: React.FC = () => {

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const confirmLogout = () => {

    setShowLogoutModal(false);

    toast.success("You have been logged out successfully!", {
      autoClose: 1000
    });

    setTimeout(() => {

      localStorage.removeItem("access");
      localStorage.removeItem("refresh");

      document.cookie = "access=; Max-Age=0; path=/";

      window.location.href = "/login";

    }, 1000);
  };

  return (
    <>

      {/* HEADER */}
      <header className="bg-white shadow-sm border-bottom p-2" >

        <div className="container-fluid d-flex align-items-center justify-content-between py-1">

          {/* LEFT - LOGO */}
          <div className="d-flex align-items-center">

            <img
              src={logo}
              alt="Lyca AI"
              className="header-logo"
            />

          </div>

          {/* RIGHT - LOGOUT */}
          <button
            className="btn btn-danger btn-sm fw-semibold px-2"
            onClick={() => setShowLogoutModal(true)}
          >
            Logout
          </button>

        </div>

      </header>


      {/* LOGOUT MODAL */}
      {showLogoutModal && (

        <div className="logout-modal-backdrop">

          <div className="logout-modal-card text-center">

            <div className="text-warning fs-2 mb-2">⚠️</div>

            <h5 className="fw-bold mb-2">
              Confirm Logout
            </h5>

            <p className="text-muted mb-4">
              Are you sure you want to logout?
            </p>

            <div className="d-flex justify-content-center gap-3">

              <button
                className="btn btn-secondary"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>

              <button
                className="btn btn-danger"
                onClick={confirmLogout}
              >
                Yes, Logout
              </button>

            </div>

          </div>

        </div>

      )}

    </>
  );
};

export default Header;

