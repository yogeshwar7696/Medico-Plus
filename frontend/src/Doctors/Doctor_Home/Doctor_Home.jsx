import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import NotificationProvider from "../../Notifications/NotificationProvider";
import NotificationBell from "../../Notifications/NotificationBell";
import axios from "axios";
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  Clock,
  BarChart4,
  Star,
  LogOut,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
  Settings as SettingsIcon,
} from "lucide-react";

import "./Doctor_Home.css";

export default function DoctorHome() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dateTime, setDateTime] = useState(new Date());
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dbPatients, setDbPatients] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchDoctorSearchReferences = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const res = await axios
          .get("http://localhost:5000/api/patients/all", { headers })
          .catch(() => ({ data: [] }));

        setDbPatients(res.data || []);
        console.log(dbPatients);
      } catch (err) {
        console.error("Doctor global references matching sync failed", err);
      }
    };
    fetchDoctorSearchReferences();
  }, []);

  /* --- SECTION: LOGED-IN SESSION LOGIC --- */
  const currentDoc = useMemo(() => {
    return (
      JSON.parse(localStorage.getItem("userData")) || {
        name: "Medical Officer",
        department: "General Clinical",
        degrees: "MBBS",
      }
    );
  }, []);

  const routeDoctorSearchQuery = (rawVal) => {
    const query = rawVal.toLowerCase().trim();
    if (!query) return;

    const matchesDatabasePatient = dbPatients.some(
      (pat) =>
        (pat.name || "").toLowerCase().includes(query) ||
        (pat.patientId || pat._id || "").toLowerCase().includes(query) ||
        (pat.email || "").toLowerCase().includes(query),
    );

    if (matchesDatabasePatient) {
      navigate("/doctor/doctor_patients_management", {
        state: { globalSearchQuery: rawVal },
      });
      return;
    }

    navigate(window.location.pathname, {
      state: { globalSearchQuery: rawVal },
      replace: true,
    });
  };

  /* --- SECTION: SYSTEM CLOCK INTERACTION ENGINE --- */
  useEffect(() => {
    console.log(currentDoc.photo);

    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /* --- SECTION: ROUTING NAVIGATION PROPERTIES --- */
  const mainNavOptions = useMemo(
    () => [
      {
        id: 1,
        label: "Dashboard",
        icon: <LayoutDashboard size={20} />,
        path: "/doctor/doctor_dashboard",
      },
      {
        id: 2,
        label: "Appointments",
        icon: <CalendarCheck size={20} />,
        path: "/doctor/doctor_appointments_management",
      },
      {
        id: 3,
        label: "Patients",
        icon: <Users size={20} />,
        path: "/doctor/doctor_patients_management",
      },
      {
        id: 4,
        label: "Schedule",
        icon: <Clock size={20} />,
        path: "/doctor/doctor_availability_management",
      },
      {
        id: 5,
        label: "Performance",
        icon: <BarChart4 size={20} />,
        path: "/doctor/doctor_performance_dashboard",
      },
      {
        id: 6,
        label: "Reviews",
        icon: <Star size={20} />,
        path: "/doctor/doctor_review_management",
      },
    ],
    [],
  );

  /* --- SECTION: SECURE LOGOUT TERMINAL HOOK --- */
  const handleLogout = () => {
    if (window.confirm("Terminate clinical session at Medico+?")) {
      localStorage.removeItem("token");
      localStorage.removeItem("userData");
      navigate("/");
    }
  };

  return (
    <NotificationProvider>
      <div className="doc_home_med_doctor_root">
        <aside
          className={`doc_home_med_sidebar_elite ${isCollapsed ? "doc_home_is_collapsed" : ""}`}
        >
          
          <div
            className="doc_home_doc_identity_panel"
            onClick={() => navigate("/doctor/doctor_profile")}
          >
            <div className="doc_home_avatar_wrapper">
              <img
                src={
                  currentDoc.photo && currentDoc.photo.trim() !== ""
                    ? `http://localhost:5000/uploads/${currentDoc.photo}`
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        currentDoc.name || "DR"
                      )}&background=f0f7ff&color=007acc&bold=true&size=80`
                }
                alt={currentDoc.name || "Specialist"}
                className={`doc_home_identity_avatar ${
                  isCollapsed ? "doc_home_avatar_mini" : ""
                }`}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    currentDoc.name || "Doctor"
                  )}&background=f0f7ff&color=007acc&bold=true&size=80`;
                }}
              />

              <div className="doc_home_active_indicator_sidebar"></div>
            </div>

            {!isCollapsed && (
              <div className="doc_home_identity_meta doc_home_view_fade_in">
                <h3 className="doc_home_doc_full_name">{currentDoc.name}</h3>
                <p className="doc_home_doc_degree_tag">{currentDoc.degrees}</p>
                <p className="doc_home_doc_dept_tag">
                  {currentDoc.department} Dept
                </p>
              </div>
            )}
          </div>

          {/* WORKFLOW NAVIGATION ITEMS */}
          <nav className="doc_home_sidebar_navigation_menu">
            <div className="doc_home_nav_spacer_top"></div>
            {mainNavOptions.map((opt) => (
              <button
                key={opt.id}
                className={`doc_home_nav_menu_item ${location.pathname.includes(opt.path) ? "doc_home_is_active" : ""}`}
                onClick={() => navigate(opt.path)}
              >
                <span className="doc_home_nav_icon_box">{opt.icon}</span>
                {!isCollapsed && (
                  <span className="doc_home_nav_label_text">{opt.label}</span>
                )}
                {isCollapsed && (
                  <div className="doc_home_collapsed_tooltip">{opt.label}</div>
                )}
              </button>
            ))}
          </nav>

          {/* SYSTEM DISCONNECT ACTION CONTAINER */}
          <div className="doc_home_sidebar_footer_actions">
            <button
              className="doc_home_logout_btn_elite"
              onClick={handleLogout}
            >
              <LogOut size={20} />
              {!isCollapsed && (
                <span className="doc_home_logout_text">Logout</span>
              )}
            </button>
          </div>

          <button
            className="doc_home_sidebar_toggle_trigger"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronRight size={14} />
            ) : (
              <ChevronLeft size={14} />
            )}
          </button>
        </aside>

        {/* CORE FRAME LAYOUT ENGINE VIEWPORT */}
        <main className="doc_home_med_workspace_viewport">
          <header className="doc_home_med_workspace_header">
            <div className="doc_home_header_left_brand">
              <div className="doc_home_medico_plus_logo_area">
                <span className="doc_home_logo_symbol">✚</span>
                <h2 className="doc_home_logo_text">
                  MEDICO<span className="doc_home_text_cyan">PLUS</span>
                </h2>
              </div>
            </div>

            {/* SECURE DIRECTORY DATA FILTER REGISTRY SEARCH BAR */}
            <div className="doc_home_header_center_search">
              <form
                className={`doc_home_global_search_container ${isSearchFocused ? "doc_home_is_focused" : ""}`}
                onSubmit={(e) => {
                  e.preventDefault();
                  routeDoctorSearchQuery(searchTerm);
                }}
              >
                <Search size={18} className="doc_home_search_icon_main" />
                <input
                  type="text"
                  placeholder="Search patient UID, schedules or records..."
                  value={searchTerm}
                  autoComplete="off"
                  name="medico_plus_doctor_global_search"
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </form>
            </div>

            {/* DYNAMIC METRICS SYSTEM TIMESTAMP OVERLAY */}
            <div className="doc_home_header_right_controls">
              <div className="doc_home_widget_header_sync">
                <div className="doc_home_live_time_group">
                  <span className="doc_home_live_time">
                    {dateTime.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                  <div className="doc_home_live_date_single_line">
                    <span className="doc_home_full_date_text">
                      {dateTime.toLocaleDateString(undefined, {
                        weekday: "long",
                      })}
                      ,{" "}
                      {dateTime.toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="doc_home_header_icon_group">
                <NotificationBell></NotificationBell>
                <button
                  className="doc_home_control_icon_btn"
                  onClick={() => navigate("/doctor/doctor_settings")}
                >
                  <SettingsIcon size={22} />
                </button>
              </div>
            </div>
          </header>

          {/* COMPONENT OUTLET WORKSPACE DISPLAY ENGINE */}
          <section className="doc_home_med_workspace_content">
            <div className="doc_home_content_inner_wrapper doc_home_view_fade_in">
              <Outlet
                context={{ globalSearch: searchTerm, searchTerm: searchTerm }}
              />{" "}
            </div>
          </section>
        </main>
      </div>
    </NotificationProvider>
  );
}
