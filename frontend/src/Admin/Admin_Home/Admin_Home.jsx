import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import NotificationProvider from "../../Notifications/NotificationProvider";
import NotificationBell from "../../Notifications/NotificationBell";
import axios from "axios";
import {
  LayoutDashboard,
  CalendarDays,
  UserRound,
  Users,
  Wallet,
  BarChart3,
  PartyPopper,
  Clock,
  Settings,
  LogOut,
  Search,
  ChevronLeft,
  ChevronRight,
  Menu,
  MessageSquareQuote,
  Microscope,
  Key,
  Mail,
  Lock,
  X,
  UserPlus,
  Save,
} from "lucide-react";
import "./Admin_Home.css";

export default function Admin_Home() {
  const [dbMedicines, setDbMedicines] = useState([]);
  const [dbTests, setDbTests] = useState([]);
  const [dbDepartments, setDbDepartments] = useState([]);
  const [dbDoctors, setDbDoctors] = useState([]);
  const [dbEvents, setDbEvents] = useState([]);
  const [dbPatients, setDbPatients] = useState([]);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [adminUser, setAdminUser] = useState(() => {
    const cachedData = JSON.parse(localStorage.getItem("userData")) || {};
    return {
      id: cachedData.id || cachedData._id || "", // Core relational binding hook
      name: cachedData.name || "Master Terminal",
      email: cachedData.email || "admin@medicoplus.com",
    };
  });

  useEffect(() => {
    const fetchAdminSearchReferences = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const [medRes, testRes, deptRes, docRes, eventRes, patientRes] =
          await Promise.all([
            axios
              .get("http://localhost:5000/api/medicines/all", { headers })
              .catch(() => ({ data: [] })),
            axios
              .get("http://localhost:5000/api/tests/all", { headers })
              .catch(() => ({ data: [] })),
            axios
              .get("http://localhost:5000/api/departments/all", { headers })
              .catch(() => ({ data: [] })),
            axios
              .get("http://localhost:5000/api/doctors/list", { headers })
              .catch(() => ({ data: [] })),
            axios
              .get("http://localhost:5000/api/events/all", { headers })
              .catch(() => ({ data: [] })),
            axios
              .get("http://localhost:5000/api/patients/all", { headers })
              .catch(() => ({ data: [] })),
          ]);
        setDbMedicines(medRes.data || []);
        setDbTests(testRes.data || []);
        setDbDepartments(deptRes.data || []);
        setDbDoctors(docRes.data || []);
        setDbEvents(eventRes.data || []);
        setDbPatients(patientRes.data || []);
      } catch (err) {
        console.error("Admin global lookup synchronization failed", err);
      }
    };
    fetchAdminSearchReferences();
  }, []);

  const routeAdminSearchQuery = (rawVal) => {
    const query = rawVal.toLowerCase().trim();
    if (!query) return;

    if (query.includes("@") || query === (adminUser?.email || "").toLowerCase())
      return;

    const matchesDatabaseDept = dbDepartments.some(
      (dept) =>
        (dept.name || "").toLowerCase().includes(query) ||
        (dept.location || "").toLowerCase().includes(query),
    );
    if (
      matchesDatabaseDept ||
      query.includes("wing") ||
      query.includes("department") ||
      query.includes("infrastructure") ||
      query.includes("settings")
    ) {
      navigate("/admin/departments_management", {
        state: { globalSearchQuery: rawVal },
      });
      return;
    }

    const matchesDatabaseMedicine = dbMedicines.some(
      (med) =>
        (med.name || "").toLowerCase().includes(query) ||
        (med.composition || "").toLowerCase().includes(query) ||
        (med.category || "").toLowerCase().includes(query),
    );
    const matchesDatabaseTest = dbTests.some(
      (t) =>
        (t.name || "").toLowerCase().includes(query) ||
        (t.category || "").toLowerCase().includes(query),
    );
    if (matchesDatabaseMedicine || matchesDatabaseTest) {
      navigate("/admin/pharmacy_management", {
        state: { globalSearchQuery: rawVal },
      });
      return;
    }

    const matchesDatabasePatient = dbPatients.some(
      (pat) =>
        (pat.name || "").toLowerCase().includes(query) ||
        (pat.patientId || pat._id || "").toLowerCase().includes(query) ||
        (pat.email || "").toLowerCase().includes(query),
    );

    if (matchesDatabasePatient) {
      navigate("/admin/patients_management", {
        state: { globalSearchQuery: rawVal },
      });
      return;
    }

    const matchesDatabaseEvent = dbEvents.some(
      (evt) =>
        (evt.title || "").toLowerCase().includes(query) ||
        (evt.location || "").toLowerCase().includes(query),
    );

    if (matchesDatabaseEvent) {
      navigate("/admin/events_management", {
        state: { globalSearchQuery: rawVal },
      });
      return;
    }

    const matchesDatabaseDoctor = dbDoctors.some(
      (doc) =>
        (doc.name || "").toLowerCase().includes(query) ||
        (doc.department || "").toLowerCase().includes(query),
    );
    if (
      matchesDatabaseDoctor ||
      query.includes("dr.") ||
      query.includes("doctor") ||
      query.includes("specialist") ||
      query.includes("staff")
    ) {
      navigate("/admin/doctors_management", {
        state: { globalSearchQuery: rawVal },
      });
      return;
    }

    navigate(window.location.pathname, {
      state: { globalSearchQuery: rawVal },
      replace: true,
    });
  };

  const [emailForm, setEmailForm] = useState({
    newEmail: "",
    verificationPassword: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [newAdminForm, setNewAdminForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "Admin",
  });

  const navOptions = [
    {
      id: 1,
      label: "Dashboard",
      path: "/admin/admin_dashboard",
      icon: <LayoutDashboard size={19} />,
    },
    {
      id: 2,
      label: "Appointments",
      path: "/admin/appointments_management",
      icon: <CalendarDays size={19} />,
    },
    {
      id: 3,
      label: "Doctors",
      path: "/admin/doctors_management",
      icon: <UserRound size={19} />,
    },
    {
      id: 4,
      label: "Patients",
      path: "/admin/patients_management",
      icon: <Users size={19} />,
    },
    {
      id: 5,
      label: "Pharmacy",
      path: "/admin/pharmacy_management",
      icon: <Microscope size={19} />,
    },
    {
      id: 6,
      label: "Reviews",
      path: "/admin/review_management",
      icon: <MessageSquareQuote size={19} />,
    },
    {
      id: 7,
      label: "Revenue",
      path: "/admin/revenue_details",
      icon: <Wallet size={19} />,
    },
    {
      id: 8,
      label: "Statistics",
      path: "/admin/statistics",
      icon: <BarChart3 size={19} />,
    },
    {
      id: 9,
      label: "Events",
      path: "/admin/events_management",
      icon: <PartyPopper size={19} />,
    },
    {
      id: 10,
      label: "Schedules",
      path: "/admin/availability_management",
      icon: <Clock size={19} />,
    },
    {
      id: 11,
      label: "Departments",
      path: "/admin/departments_management",
      icon: <Settings size={19} />,
    },
  ];

  const handleEmailSynchronizationSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const targetId = adminUser.id || adminUser._id;

      const response = await axios.put(
        `http://localhost:5000/api/auth/update-profile/${targetId}`,
        { email: emailForm.newEmail },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.status === 200) {
        const structuralRefresh = { ...adminUser, email: emailForm.newEmail };
        localStorage.setItem("userData", JSON.stringify(structuralRefresh));
        setAdminUser(structuralRefresh);
        alert("Email synchronized successfully.");
        setIsEditingEmail(false);
        setEmailForm({ newEmail: "", verificationPassword: "" });
      }
    } catch (err) {
      alert(
        err.response?.data?.message || "Failed to update profile settings.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handlePasswordModificationSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword)
      return alert("Passwords mismatch.");

    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        "http://localhost:5000/api/auth/change-password",
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      alert("Password updated successfully.");
      setIsEditingPassword(false);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Failed to commit security modifications.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddAdminSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post("http://localhost:5000/api/admin/signup", newAdminForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(
        `Administrative profile for ${newAdminForm.name} onboarded successfully.`,
      );
      setShowAddAdminModal(false);
      setNewAdminForm({ name: "", email: "", password: "", role: "Admin" });
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Failed to initialize new administrator.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm("End session?")) {
      localStorage.clear();
      navigate("/");
    }
  };

  return (
    <NotificationProvider>
      <div className="admin_home_layout">
        {isMobileMenuOpen && (
          <div
            className="admin_home_mobile_overlay"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}

        <aside
          className={`admin_home_sidebar ${isCollapsed ? "collapsed" : ""} ${isMobileMenuOpen ? "mobile_open" : ""}`}
        >
          <div className="admin_home_toggle_zone">
            <button
              className="admin_home_toggle_btn"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronRight size={18} />
              ) : (
                <ChevronLeft size={18} />
              )}
            </button>
          </div>

          <nav className="admin_home_nav">
            {navOptions.map((opt) => (
              <NavLink
                key={opt.id}
                to={opt.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  isActive
                    ? "admin_home_nav_item active"
                    : "admin_home_nav_item"
                }
              >
                <span className="admin_home_nav_icon">{opt.icon}</span>
                {!isCollapsed && (
                  <span className="admin_home_nav_label">{opt.label}</span>
                )}
                {isCollapsed && (
                  <div className="admin_home_nav_tooltip">{opt.label}</div>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="admin_home_sidebar_bottom">
            <button className="admin_home_logout_action" onClick={handleLogout}>
              <LogOut size={18} /> {!isCollapsed && <span>Logout</span>}
            </button>
          </div>
        </aside>

        <main className="admin_home_main_viewport">
          <header className="admin_home_top_header">
            <div className="admin_home_header_left">
              <button
                className="admin_home_hamburger"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu size={24} />
              </button>
              <div className="admin_home_brand_header">
                <span className="admin_home_plus_icon">✚</span>
                <span className="admin_home_brand_name">
                  MEDICO<span className="highlight">PLUS</span>
                </span>
              </div>
            </div>

            <div className="admin_home_header_center">
              <form
                className="admin_home_global_search"
                onSubmit={(e) => {
                  e.preventDefault();
                  routeAdminSearchQuery(searchTerm);
                }}
              >
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search doctors, wings, events, medicines..."
                  value={searchTerm}
                  autoComplete="off"
                  name="admin_medico_plus_global_search"
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </form>
            </div>

            <div className="admin_home_header_right">
              <NotificationBell />

              <div
                className="admin_home_profile_hub"
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              >
                <span className="admin_home_admin_name">{adminUser.name}</span>
                <div className="admin_home_avatar_container">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(adminUser.name || "Admin")}&background=007acc&color=fff&bold=true`}
                    alt="Admin Avatar Profile"
                  />
                </div>

                {showProfileDropdown && (
                  <div
                    className="admin_profile_overlay_dropdown"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="profile_info_section">
                      <strong>{adminUser.name}</strong>
                      <span>{adminUser.email}</span>
                    </div>

                    {!isEditingEmail && !isEditingPassword && (
                      <div className="profile_actions">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingEmail(true);
                            setIsEditingPassword(false);
                          }}
                        >
                          <Mail size={14} /> Change Email
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingPassword(true);
                            setIsEditingEmail(false);
                          }}
                        >
                          <Key size={14} /> Change Password
                        </button>
                        <button
                          type="button"
                          className="add_admin_dropdown_btn"
                          onClick={() => {
                            setShowAddAdminModal(true);
                            setShowProfileDropdown(false);
                          }}
                        >
                          <UserPlus size={14} /> Add New Admin
                        </button>
                      </div>
                    )}

                    {isEditingEmail && (
                      <form onSubmit={handleEmailSynchronizationSubmit}>
                        <input
                          type="email"
                          placeholder="New Email"
                          value={emailForm.newEmail}
                          onChange={(e) =>
                            setEmailForm({
                              ...emailForm,
                              newEmail: e.target.value,
                            })
                          }
                          required
                        />
                        <button type="submit" disabled={actionLoading}>
                          <Save size={12} /> Save Email
                        </button>
                        <button
                          type="button"
                          className="cancel_inline_btn"
                          onClick={() => setIsEditingEmail(false)}
                        >
                          Cancel
                        </button>
                      </form>
                    )}

                    {isEditingPassword && (
                      <form onSubmit={handlePasswordModificationSubmit}>
                        <input
                          type="password"
                          placeholder="Current Password"
                          value={passwordForm.currentPassword}
                          onChange={(e) =>
                            setPasswordForm({
                              ...passwordForm,
                              currentPassword: e.target.value,
                            })
                          }
                          required
                        />
                        <input
                          type="password"
                          placeholder="New Password"
                          value={passwordForm.newPassword}
                          onChange={(e) =>
                            setPasswordForm({
                              ...passwordForm,
                              newPassword: e.target.value,
                            })
                          }
                          required
                        />
                        <input
                          type="password"
                          placeholder="Confirm New Password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) =>
                            setPasswordForm({
                              ...passwordForm,
                              confirmPassword: e.target.value,
                            })
                          }
                          required
                        />
                        <button type="submit" disabled={actionLoading}>
                          <Lock size={12} /> Save Password
                        </button>
                        <button
                          type="button"
                          className="cancel_inline_btn"
                          onClick={() => setIsEditingPassword(false)}
                        >
                          Cancel
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          </header>

          <section className="admin_home_page_container">
            <Outlet
              context={{ globalSearch: searchTerm, searchTerm: searchTerm }}
            />
          </section>
        </main>

        {showAddAdminModal && (
          <div className="admin_modal_backdrop_blur">
            <div className="admin_modal_content_card animate_scale_up">
              <div className="admin_modal_header_row">
                <h2>Onboard Administrator</h2>
                <button
                  type="button"
                  className="close_modal_x_btn"
                  onClick={() => setShowAddAdminModal(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <form
                className="admin_modal_form_body"
                onSubmit={handleAddAdminSubmit}
              >
                <div className="admin_modal_input_field">
                  <label>Full Name</label>
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={newAdminForm.name}
                    onChange={(e) =>
                      setNewAdminForm({ ...newAdminForm, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="admin_modal_input_field">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="example@medicoplus.com"
                    value={newAdminForm.email}
                    onChange={(e) =>
                      setNewAdminForm({
                        ...newAdminForm,
                        email: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="admin_modal_input_field">
                  <label>Initial Secure Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newAdminForm.password}
                    onChange={(e) =>
                      setNewAdminForm({
                        ...newAdminForm,
                        password: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="admin_modal_input_field">
                  <label>Role Clearance Authorization</label>
                  <select
                    value={newAdminForm.role}
                    onChange={(e) =>
                      setNewAdminForm({ ...newAdminForm, role: e.target.value })
                    }
                  >
                    <option value="Admin">Standard Administrator</option>
                    <option value="SuperAdmin">
                      Super Administrative Authority
                    </option>
                  </select>
                </div>
                <div className="admin_modal_action_footer">
                  <button
                    type="button"
                    className="admin_btn_secondary"
                    onClick={() => setShowAddAdminModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin_btn_primary"
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Processing..." : "Register Account"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </NotificationProvider>
  );
}
