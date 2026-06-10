import React, { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  LayoutDashboard,
  Stethoscope,
  CalendarDays,
  Pill,
  UserCircle,
  LogOut,
  Menu,
  X,
  Search,
  User,
} from "lucide-react";
import "./Patient_Navbar.css";
import NotificationBell from "../../Notifications/NotificationBell";

import defaultPatientImg from "../../Assets/Images/Patient/default_patient_pic.jpg";

export default function Patient_Navbar() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dbMedicines, setDbMedicines] = useState([]);
  const [dbTests, setDbTests] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(
    () => JSON.parse(localStorage.getItem("userData")) || {},
  );

  useEffect(() => {
    const handleProfileSync = () => {
      setUser(JSON.parse(localStorage.getItem("userData")) || {});
    };

    window.addEventListener("profile_synced", handleProfileSync);
    return () =>
      window.removeEventListener("profile_synced", handleProfileSync);
  }, []);

  useEffect(() => {
    const fetchSearchReferenceData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const [medRes, testRes] = await Promise.all([
          axios.get("http://localhost:5000/api/medicines/all", { headers }),
          axios.get("http://localhost:5000/api/tests/all", { headers }),
        ]);
        setDbMedicines(medRes.data || []);
        setDbTests(testRes.data || []);
      } catch (err) {
        console.error("Navbar search dictionary sync failed", err);
      }
    };
    fetchSearchReferenceData();
  }, []);

  const profilePic = user?.photo
    ? `http://localhost:5000/uploads/${user.photo}`
    : defaultPatientImg;

  const navOptions = [
    {
      id: 1,
      label: "Dashboard",
      path: "/patient/patient_dashboard",
      icon: <LayoutDashboard size={18} />,
    },
    {
      id: 2,
      label: "Specialists",
      path: "/patient/doctor_details",
      icon: <Stethoscope size={18} />,
    },
    {
      id: 3,
      label: "Bookings",
      path: "/patient/patient_bookings",
      icon: <CalendarDays size={18} />,
    },
    {
      id: 4,
      label: "Pharmacy",
      path: "/patient/pharmacy_details",
      icon: <Pill size={18} />,
    },
    {
      id: 5,
      label: "Vault",
      path: "/patient/patient_vault",
      icon: <UserCircle size={18} />,
    },
  ];

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [location]);

  const routeGlobalSearchQuery = (rawVal) => {
    const query = rawVal.toLowerCase().trim();
    if (!query) return;

    const vaultKeywords = [
      "invoice",
      "receipt",
      "order",
      "report",
      "prescription",
      "file",
      "vault",
      "pdf",
      "#",
    ];

    const isVaultKeyword = vaultKeywords.some((keyword) =>
      query.includes(keyword),
    );
    if (isVaultKeyword) {
      navigate("/patient/patient_vault", {
        state: { globalSearchQuery: rawVal },
      });
      return;
    }

    const matchesDatabaseMedicine = dbMedicines.some(
      (med) =>
        (med.name || "").toLowerCase().includes(query) ||
        (med.composition || "").toLowerCase().includes(query),
    );

    const matchesDatabaseTest = dbTests.some((test) =>
      (test.name || "").toLowerCase().includes(query),
    );

    if (matchesDatabaseMedicine || matchesDatabaseTest) {
      navigate("/patient/pharmacy_details", {
        state: { globalSearchQuery: rawVal },
      });
    } else if (query.includes("dr.") || query.includes("doctor")) {
      navigate("/patient/doctor_details", {
        state: { globalSearchQuery: rawVal },
      });
    } else {
      navigate(location.pathname, {
        state: { globalSearchQuery: rawVal },
        replace: true,
      });
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <nav className="pat_nav_wrapper">
      <div className="pat_nav_container">
        <div
          className="pat_nav_brand"
          onClick={() => navigate("/patient/patient_dashboard")}
        >
          <span className="pat_nav_plus_icon">✚</span>
          <span className="pat_nav_brand_name">
            MEDICO<span className="pat_nav_highlight">PLUS</span>
          </span>
        </div>

        <div className="pat_nav_search_wrapper">
          <form
            className="pat_nav_search_inner"
            onSubmit={(e) => {
              e.preventDefault();
              routeGlobalSearchQuery(searchQuery);
            }}
          >
            <Search size={16} className="pat_nav_search_icon" />
            <input
              type="text"
              placeholder="Search speacialists, medicines, tests, records..."
              className="pat_nav_search_input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>

        <ul
          className={`pat_nav_links_group ${menuOpen ? "pat_nav_mobile_active" : ""}`}
        >
          {navOptions.map((opt) => (
            <li key={opt.id} className="pat_nav_li">
              <NavLink
                to={opt.path}
                className={({ isActive }) =>
                  isActive ? "pat_nav_item pat_nav_active" : "pat_nav_item"
                }
              >
                <span className="pat_nav_label">{opt.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="pat_nav_right_actions">
          <NotificationBell />

          <div className="pat_nav_profile_container">
            <img
              src={profilePic}
              alt="Patient Profile"
              className="pat_nav_user_img"
              onClick={() => setProfileOpen(!profileOpen)}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = defaultPatientImg;
              }}
            />

            {profileOpen && (
              <div className="pat_nav_dropdown_card">
                <div className="pat_nav_dropdown_header">
                  <strong>{user?.name || "Patient Portal"}</strong>
                  <span>{user?.email || "Verified Identity"}</span>
                </div>
                <div className="pat_nav_divider"></div>

                <NavLink
                  to="/patient/patient_profile"
                  className="pat_nav_dropdown_link"
                >
                  <User size={16} /> <span>My Profile</span>
                </NavLink>

                <div className="pat_nav_divider"></div>

                <button
                  className="pat_nav_dropdown_link pat_nav_danger"
                  onClick={handleLogout}
                >
                  <LogOut size={16} /> <span>Logout</span>
                </button>
              </div>
            )}
          </div>

          <button
            className="pat_nav_hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
    </nav>
  );
}
