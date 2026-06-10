import React, { useState, useMemo, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import axios from "axios";
import {
  Search,
  Plus,
  X,
  Scale,
  Ruler,
  User,
  Phone,
  Scroll,
  Clock,
  Activity,
  Download,
  ShieldCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Mail,
  ArrowLeft,
  MapPin,
  ClipboardList,
  Loader2,
  AlertCircle,
  KeyRound,
  CalendarDays,
  Zap,
} from "lucide-react";

import "./Patient_Management.css";

export default function Patient_Management() {
  const { searchTerm: globalSearch = "" } = useOutletContext() || {};

  const [localSearch, setLocalSearch] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterAgeRange, setFilterAgeRange] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  const [showAllRecent, setShowAllRecent] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const [patientRes, apptRes] = await Promise.all([
        axios.get("http://localhost:5000/api/patients/all", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get("http://localhost:5000/api/appointments/all", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setPatients(patientRes.data || []);
      setAppointments(apptRes.data || []);
    } catch (err) {
      console.error("Clinical Registry Sync Failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      const updated = patients.find((p) => p._id === selectedPatient._id);
      if (updated) setSelectedPatient(updated);
    }
  }, [patients]);

  const handleExportCSV = () => {
    if (filteredPatients.length === 0) return;
    const headers = [
      "Patient ID",
      "Full Name",
      "Email Portal",
      "Age",
      "Gender",
      "Primary Condition",
      "Contact Phone",
    ];
    const rows = filteredPatients.map((p) => [
      `PT-${p._id.slice(-5).toUpperCase()}`,
      `"${p.name.replace(/"/g, '""')}"`,
      p.email || "N/A",
      p.age || "N/A",
      p.gender || "Unrecorded",
      `"${(p.disease || "No Active Condition").replace(/"/g, '""')}"`,
      p.contact || "—",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute(
      "download",
      `Hospital_Patient_Directory_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const credentialsPayload = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    };

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:5000/api/auth/signup",
        credentialsPayload,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setShowForm(false);
      fetchData();
      alert("Patient account dispatched and registered cleanly!");
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Error creating account. Please try again.",
      );
    }
  };

  const getAgeClass = (age) => {
    if (!age) return "New Profile";
    if (age < 13) return "Child";
    if (age < 20) return "Teen";
    if (age < 60) return "Adult";
    return "Senior";
  };

  const calculateBMI = (weightStr, heightStr) => {
    const w = parseFloat(weightStr);
    const h = parseFloat(heightStr) / 100;
    if (!w || !h || h === 0)
      return { bmi: "—", category: "Unrecorded", color: "#64748b" };
    const bmi = (w / (h * h)).toFixed(1);
    if (bmi < 18.5) return { bmi, category: "Underweight", color: "#f59e0b" };
    if (bmi >= 25 && bmi < 30)
      return { bmi, category: "Overweight", color: "#f59e0b" };
    if (bmi >= 30) return { bmi, category: "Obese", color: "#ef4444" };
    return { bmi, category: "Normal", color: "#10b981" };
  };

  /* Relational Patient Data Filter Segments */
  const allPatientAppointments = useMemo(() => {
    if (!selectedPatient) return [];
    return appointments
      .filter(
        (a) =>
          (a.patientName || a.patient || "").toLowerCase().trim() ===
          (selectedPatient.name || "").toLowerCase().trim(),
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [selectedPatient, appointments]);

  const recentHistoryAppts = useMemo(() => {
    return allPatientAppointments.filter(
      (a) => a.status === "Completed" || a.status === "Cancelled",
    );
  }, [allPatientAppointments]);

  const upcomingScheduledAppts = useMemo(() => {
    return allPatientAppointments.filter(
      (a) => a.status === "Upcoming" || a.status === "Pending",
    );
  }, [allPatientAppointments]);

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const disease = (p.disease || "").toLowerCase();
      const contact = p.contact || "";
      const matchesGlobal =
        name.includes(globalSearch.toLowerCase()) ||
        disease.includes(globalSearch.toLowerCase());
      const matchesLocal =
        name.includes(localSearch.toLowerCase()) ||
        contact.includes(localSearch);
      const matchesGender = filterGender ? p.gender === filterGender : true;

      let matchesAge = true;
      if (filterAgeRange === "0-18") matchesAge = p.age <= 18;
      else if (filterAgeRange === "19-40")
        matchesAge = p.age >= 19 && p.age <= 40;
      else if (filterAgeRange === "41-60")
        matchesAge = p.age >= 41 && p.age <= 60;
      else if (filterAgeRange === "60+") matchesAge = p.age > 60;

      return matchesGlobal && matchesLocal && matchesGender && matchesAge;
    });
  }, [globalSearch, localSearch, filterGender, filterAgeRange, patients]);

  const totalPages = Math.ceil(filteredPatients.length / rowsPerPage);
  const currentPatients = filteredPatients.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  const handlePageChange = (num) => {
    if (num >= 1 && num <= totalPages) setCurrentPage(num);
  };

  if (loading) {
    return (
      <div className="admin_dash_load">
        <Loader2 className="admin_patnt_m_spinner" size={48} />
        <p>Synchronizing Patient Registry...</p>
      </div>
    );
  }

  return (
    <div className="admin_patnt_m_page_fade_in">
      {!selectedPatient ? (
        <div className="admin_patnt_m_main_list_view">
          <div className="admin_patnt_m_section_header">
            <div className="admin_patnt_m_branding">
              <h1 className="admin_patnt_m_title_elite">
                Patient{" "}
                <span className="admin_patnt_m_highlight">Directory</span>
              </h1>
              <p className="admin_patnt_m_subtitle">
                {filteredPatients.length} active records loaded
              </p>
            </div>
            <div className="admin_patnt_m_action_group">
              <button
                className="admin_patnt_m_btn_sync"
                onClick={fetchData}
                disabled={loading}
              >
                <Zap size={16} className={loading ? "spin" : ""} /> Sync Data
              </button>
              <button
                className="admin_patnt_m_btn_outline"
                onClick={handleExportCSV}
              >
                <Download size={16} /> Export CSV
              </button>
              <button
                className="admin_patnt_m_btn_primary"
                onClick={() => setShowForm(true)}
              >
                <Plus size={18} /> Add Patient
              </button>
            </div>
          </div>

          <div className="admin_patnt_m_filter_bar">
            <div className="admin_patnt_m_search_box admin_patnt_m_smart_search">
              <Search size={18} color="#007acc" />
              <input
                placeholder="Search Name, Phone or Disease..."
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="admin_patnt_m_dropdown_group">
              <select
                className="admin_patnt_m_select_filter"
                value={filterGender}
                onChange={(e) => {
                  setFilterGender(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              <select
                className="admin_patnt_m_select_filter"
                value={filterAgeRange}
                onChange={(e) => {
                  setFilterAgeRange(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Ages</option>
                <option value="0-18">Under 18</option>
                <option value="19-40">19 - 40</option>
                <option value="41-60">41 - 60</option>
                <option value="60+">60+</option>
              </select>
            </div>
          </div>

          <div className="admin_patnt_m_table_container">
            <table className="admin_patnt_m_table">
              <thead>
                <tr>
                  <th>Patient Info</th>
                  <th>Age Class</th>
                  <th>Gender</th>
                  <th>Condition</th>
                  <th className="admin_patnt_m_text_right">Action</th>
                </tr>
              </thead>
              <tbody>
                {currentPatients.map((p) => (
                  <tr key={p._id}>
                    <td data-label="Patient Info">
                      <div className="admin_patnt_m_cell_user">
                        <img
                          src={
                            p.photo?.startsWith("http")
                              ? p.photo
                              : p.photo
                                ? `http://localhost:5000/uploads/${p.photo}`
                                : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || "P")}&background=e2e8f0&color=64748b`
                          }
                        />
                        <div>
                          <b>{p.name}</b>
                          <span>
                            {p.email || `#PT-${p._id.slice(-5).toUpperCase()}`}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td data-label="Age Class">
                      {p.age ? `${p.age} Yrs ` : "— "}
                      <small className="admin_patnt_m_age_pill">
                        {getAgeClass(p.age)}
                      </small>
                    </td>
                    <td data-label="Gender">{p.gender || "Unrecorded"}</td>
                    <td data-label="Condition">
                      <span className="admin_patnt_m_disease_tag">
                        {p.disease || "No Active Condition"}
                      </span>
                    </td>
                    <td
                      data-label="Action"
                      className="admin_patnt_m_text_right"
                    >
                      <button
                        className="admin_patnt_m_btn_manage"
                        onClick={() => {
                          setSelectedPatient(p);
                          setShowAllRecent(false);
                          setShowAllUpcoming(false);
                        }}
                      >
                        View Case
                      </button>
                    </td>
                  </tr>
                ))}
                {currentPatients.length === 0 && (
                  <tr>
                    <td colSpan="5" className="admin_patnt_m_empty_row">
                      <AlertCircle size={20} />
                      <p>
                        No unique diagnostic records matched current parameters.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="admin_patnt_m_pagination_bar">
              <button
                className="admin_patnt_m_pag_nav_btn"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="admin_patnt_m_pag_nav_btn"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Workspace Detail View Frame Setup */
        <div className="admin_patnt_m_detail_workspace">
          <div className="admin_patnt_m_workspace_header">
            <button
              className="admin_patnt_m_btn_close_workspace"
              onClick={() => setSelectedPatient(null)}
            >
              <ArrowLeft size={18} /> Back to Directory
            </button>
            <div className="admin_patnt_m_status_indicator">
              <span className="admin_patnt_m_pulse"></span>
              Active Profile Stack View
            </div>
          </div>

          <div className="admin_patnt_m_profile_hero_card">
            <div className="admin_patnt_m_hero_left">
              <img
                src={
                  selectedPatient.photo?.startsWith("http")
                    ? selectedPatient.photo
                    : selectedPatient.photo
                      ? `http://localhost:5000/uploads/${selectedPatient.photo}`
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPatient.name || "P")}&size=150&background=e2e8f0&color=64748b`
                }
              />
              <div className="admin_patnt_m_hero_info">
                <h2>{selectedPatient.name}</h2>
                <div className="admin_patnt_m_hero_badges">
                  <span className="admin_patnt_m_badge_outline">
                    <User size={14} /> {selectedPatient.age || "—"}Y •{" "}
                    {selectedPatient.gender || "Unrecorded"}
                  </span>
                  <span className="admin_patnt_m_badge_outline">
                    <ShieldCheck size={14} />{" "}
                    {selectedPatient.disease || "No Active Condition"}
                  </span>
                </div>
                <div className="admin_patnt_m_hero_contact">
                  <span>
                    <Mail size={14} />{" "}
                    {selectedPatient.email || "No Email Address"}
                  </span>
                  <span>
                    <Phone size={14} />{" "}
                    {selectedPatient.contact || "No Contact Number"}
                  </span>
                </div>
              </div>
            </div>

            <div className="admin_patnt_m_hero_stats">
              <div className="admin_patnt_m_hero_stat_item">
                <Scale size={18} />
                <div>
                  <p>{selectedPatient.weight || "—"} kg</p>
                  <small>Weight</small>
                </div>
              </div>
              <div className="admin_patnt_m_hero_stat_item">
                <Ruler size={18} />
                <div>
                  <p>{selectedPatient.height || "—"} cm</p>
                  <small>Height</small>
                </div>
              </div>
              <div className="admin_patnt_m_hero_stat_item">
                <ClipboardList size={18} color="#007acc" />
                <div>
                  <p>{selectedPatient.bloodGroup || "—"}</p>
                  <small>Blood Type</small>
                </div>
              </div>
              <div className="admin_patnt_m_hero_stat_item blue_bg">
                <Activity size={18} />
                <div>
                  <p
                    style={{
                      color: calculateBMI(
                        selectedPatient.weight,
                        selectedPatient.height,
                      ).color,
                    }}
                  >
                    {
                      calculateBMI(
                        selectedPatient.weight,
                        selectedPatient.height,
                      ).bmi
                    }
                  </p>
                  <small>
                    BMI (
                    {
                      calculateBMI(
                        selectedPatient.weight,
                        selectedPatient.height,
                      ).category
                    }
                    )
                  </small>
                </div>
              </div>
            </div>
          </div>

          <div className="admin_patnt_m_split_history_row">
            {/* COLUMN 1: UPCOMING SCHEDULED APPOINTMENTS */}
            <div className="admin_patnt_m_history_column">
              <div className="admin_patnt_m_col_header">
                <h3>
                  <CalendarDays size={18} color="#007acc" />Upcoming Bookings
                </h3>
              </div>
              <div className="admin_patnt_m_col_list">
                {(showAllUpcoming
                  ? upcomingScheduledAppts
                  : upcomingScheduledAppts.slice(0, 4)
                ).map((appt, i) => (
                  <div
                    key={appt._id || i}
                    className="admin_patnt_m_history_mini_card yellow_border"
                  >
                    <div className="mini_card_date">
                      <b>{appt.date}</b>
                      <span>{appt.time}</span>
                    </div>
                    <div className="mini_card_main">
                      <b>Dr. {appt.doctorName || appt.doctor}</b>
                      <p>
                        <span className="admin_patnt_m_sub_status upcoming">
                          {appt.status}
                        </span>{" "}
                        — {appt.department}
                      </p>
                    </div>
                  </div>
                ))}
                {upcomingScheduledAppts.length === 0 && (
                  <div className="admin_patnt_m_empty_col_notice">
                    No upcoming appointments found.
                  </div>
                )}
                {upcomingScheduledAppts.length > 4 && (
                  <button
                    className="admin_patnt_m_view_more_trigger"
                    onClick={() => setShowAllUpcoming(!showAllUpcoming)}
                  >
                    <Scroll size={14} />
                    {showAllUpcoming
                      ? "Collapse Roster Logs"
                      : `View All Bookings (${upcomingScheduledAppts.length})`}
                  </button>
                )}
              </div>
            </div>

            {/* COLUMN 2: RECENT HISTORY ENCOUNTERS */}
            <div className="admin_patnt_m_history_column">
              <div className="admin_patnt_m_col_header">
                <h3>
                  <Clock size={18} color="#10b981" /> Completed Bookings
                </h3>
              </div>
              <div className="admin_patnt_m_col_list">
                {(showAllRecent
                  ? recentHistoryAppts
                  : recentHistoryAppts.slice(0, 4)
                ).map((appt, i) => (
                  <div
                    key={appt._id || i}
                    className="admin_patnt_m_history_mini_card green_border"
                  >
                    <div className="mini_card_date">
                      <b>{appt.date}</b>
                      <span>{appt.time}</span>
                    </div>
                    <div className="mini_card_main">
                      <b>Dr. {appt.doctorName || appt.doctor}</b>
                      <p>
                        <span className="admin_patnt_m_sub_status completed">
                          {appt.status}
                        </span>{" "}
                        — {appt.department}
                      </p>
                    </div>
                  </div>
                ))}
                {recentHistoryAppts.length === 0 && (
                  <div className="admin_patnt_m_empty_col_notice">
                    No historical encounters found.
                  </div>
                )}
                {recentHistoryAppts.length > 4 && (
                  <button
                    className="admin_patnt_m_view_more_trigger"
                    onClick={() => setShowAllRecent(!showAllRecent)}
                  >
                    <Scroll size={14} />
                    {showAllRecent
                      ? "Collapse Archive Logs"
                      : `View All History (${recentHistoryAppts.length})`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACCOUNT MODAL SYSTEM */}
      {showForm && (
        <div
          className="admin_patnt_m_modal_overlay"
          onClick={() => setShowForm(false)}
        >
          <div
            className="admin_patnt_m_centered_form_card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin_patnt_m_modal_header">
              <h2>New Patient Credentials </h2>
              <button
                className="admin_patnt_m_close_panel_btn"
                onClick={() => setShowForm(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={handleFormSubmit}
              className="admin_patnt_m_form_layout"
            >
              <div className="admin_patnt_m_input_box">
                <label>
                  <User size={14} /> Full Name
                </label>
                <input
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="admin_patnt_m_input_box">
                <label>
                  <Mail size={14} /> Email Address
                </label>
                <input
                  name="email"
                  type="email"
                  placeholder="patient@medico.com"
                  required
                />
              </div>
              <div className="admin_patnt_m_input_box">
                <label>
                  <KeyRound size={14} /> Portal Password
                </label>
                <input
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button type="submit" className="admin_patnt_m_btn_submit_pro">
                Initialize Portal Activation
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
