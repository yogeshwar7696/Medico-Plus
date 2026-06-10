import React, { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import {
  Search,
  Plus,
  Download,
  Calendar,
  Activity,
  ChevronRight,
  X,
  Zap,
  User,
  Briefcase,
  ChevronLeft,
  GraduationCap,
  Mail,
  Clock,
  ShieldCheck,
  ClipboardList,
  Star,
  Milestone,
  Award,
  FileText,
  MapPin,
  CheckCircle2,
  AlertCircle,
  PlaneTakeoff,
  History,
  Loader2,
} from "lucide-react";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

import "./Doctor_Management.css";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function Doctor_Management() {
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [globalEvents, setGlobalEvents] = useState([]);
  const [liveDepartments, setLiveDepartments] = useState([]);
  const [feedbackCollection, setFeedbackCollection] = useState([]);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [filterDept, setFilterDept] = useState("");
  const [filterAvail, setFilterAvail] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [leaveTab, setLeaveTab] = useState("upcoming");
  const [historyTab, setHistoryTab] = useState("Recent");
  const [showForm, setShowForm] = useState(false);
  const [editDoctor, setEditDoctor] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const location = useLocation();
  const [localSearch, setLocalSearch] = useState(
    location.state?.globalSearchQuery || "",
  );

  useEffect(() => {
    if (location.state) {
      setLocalSearch(location.state.globalSearchQuery);
      setCurrentPage(1);
    }
  }, [location.state?.globalSearchQuery]);

  const syncData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };

      const [docRes, apptRes, eventRes, deptRes, feedbackRes] =
        await Promise.all([
          axios.get("http://localhost:5000/api/doctors/list", { headers }),
          axios.get("http://localhost:5000/api/appointments/all", { headers }),
          axios.get("http://localhost:5000/api/events/all", { headers }),
          axios.get("http://localhost:5000/api/departments/dropdown/list", {
            headers,
          }),
          axios.get("http://localhost:5000/api/feedback/all", { headers }),
        ]);

      setDoctors(docRes.data || []);
      setAppointments(apptRes.data || []);
      setGlobalEvents(eventRes.data || []);
      setFeedbackCollection(feedbackRes.data || []);
      setLiveDepartments(
        (deptRes.data || []).filter((d) => d.status !== "Decommissioned"),
      );
    } catch (err) {
      console.error("Registry Sync Failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncData();
  }, []);

  useEffect(() => {
    if (selectedDoctor) {
      const token = localStorage.getItem("token");
      axios
        .get(
          `http://localhost:5000/api/leaves/history/${selectedDoctor._id}?doctorName=${encodeURIComponent(selectedDoctor.name)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        )
        .then((res) => setLeaveHistory(res.data || []))
        .catch((err) => console.error("Absence fetch failure", err));
    } else {
      setLeaveHistory([]);
    }
  }, [selectedDoctor]);

  useEffect(() => {
    if (selectedDoctor) {
      const updated = doctors.find(
        (d) =>
          d._id === selectedDoctor._id ||
          d.doctorId === selectedDoctor.doctorId,
      );
      if (updated) setSelectedDoctor(updated);
    }
  }, [doctors]);

  /* --- REVISED APPROVED ABSENCE REGISTRY FILTER PIPELINE --- */
  const activeFilteredLeavesList = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0]; // Evaluates dynamically to "2026-05-21"

    return leaveHistory.filter((leave) => {
      if (leave.status !== "Approved") return false;

      if (leaveTab === "upcoming") {
        return leave.startDate >= todayStr;
      }
      return leave.startDate < todayStr;
    });
  }, [leaveHistory, leaveTab]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const doctorName = (doc.name || "").toLowerCase();
      const doctorDept = (doc.department || "").toLowerCase();

      const matchesSearch =
        doctorName.includes(localSearch.toLowerCase()) ||
        doctorDept.includes(localSearch.toLowerCase());

      const matchesDept = filterDept ? doc.department === filterDept : true;
      const matchesAvail = filterAvail
        ? doc.availability === filterAvail
        : true;

      return matchesSearch && matchesDept && matchesAvail;
    });
  }, [doctors, localSearch, filterDept, filterAvail]);

  const activeHospitalDepartments = useMemo(() => {
    const activeNames = liveDepartments.map((d) => d.name).filter(Boolean);
    return activeNames.length > 0 ? activeNames : ["General Medicine"];
  }, [liveDepartments]);

  const docStats = useMemo(() => {
    if (!selectedDoctor)
      return {
        totalAppts: 0,
        totalPatients: 0,
        averageRating: "5.0",
        activeReviews: [],
        attendedEvents: [],
      };

    const doctorAppts = appointments.filter(
      (appt) =>
        (appt.doctorName || appt.doctor || "").toLowerCase().trim() ===
        (selectedDoctor.name || "").toLowerCase().trim(),
    );

    const uniquePatientList = new Set(
      doctorAppts.map(
        (appt) => appt.patientId || appt.patientName || appt.patient,
      ),
    );
    const feedbackRecords = feedbackCollection
      .filter(
        (review) =>
          (review.doctorName || "").toLowerCase().trim() ===
          (selectedDoctor.name || "").toLowerCase().trim(),
      )
      .map((review) => ({
        patientName: review.patientName || "Verified Patient",
        rating: Number(review.rating) || 5,
        comment: review.comments || "No textual comment written.",
      }));

    const totalRatingSum = feedbackRecords.reduce(
      (sum, item) => sum + item.rating,
      0,
    );
    const calculatedAvg =
      feedbackRecords.length > 0
        ? (totalRatingSum / feedbackRecords.length).toFixed(1)
        : "5.0";

    const matchingAttendedEvents = globalEvents
      .filter((event) => {
        const panelSpeakers = Array.isArray(event.doctors) ? event.doctors : [];
        return panelSpeakers.some(
          (docName) =>
            (docName || "").toLowerCase().trim() ===
            (selectedDoctor.name || "").toLowerCase().trim(),
        );
      })
      .map((event) => ({
        title: event.title,
        date: event.date,
        status: event.status || "Upcoming",
        location: event.location || "Clinical Facility",
      }));

    return {
      totalAppts: doctorAppts.length,
      totalPatients: uniquePatientList.size,
      averageRating: calculatedAvg,
      activeReviews: feedbackRecords,
      attendedEvents: matchingAttendedEvents,
    };
  }, [selectedDoctor, appointments, globalEvents]);

  const totalPages = Math.ceil(filteredDoctors.length / rowsPerPage);
  const currentDoctors = filteredDoctors.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  const getFilteredDoctorAppointments = useMemo(() => {
    return (doctorName) => {
      if (!doctorName) return [];
      const targetStatus = historyTab === "Recent" ? "Completed" : "Upcoming";
      return appointments
        .filter(
          (appt) =>
            (appt.doctorName || appt.doctor || "") === doctorName &&
            appt.status === targetStatus,
        )
        .sort((a, b) =>
          historyTab === "Recent"
            ? new Date(b.date) - new Date(a.date)
            : new Date(a.date) - new Date(b.date),
        )
        .slice(0, 3);
    };
  }, [appointments, historyTab]);

  const dynamicPerformanceChartData = useMemo(() => {
    if (!selectedDoctor) return { labels: [], datasets: [] };

    const myAppts = appointments.filter(
      (appt) =>
        (appt.doctorName || appt.doctor || "").toLowerCase().trim() ===
        (selectedDoctor.name || "").toLowerCase().trim(),
    );

    const weeklyCounters = Array(4).fill(0);
    myAppts.forEach((appt) => {
      if (appt.date) {
        const day = parseInt(appt.date.split("-")[2], 10);
        if (!isNaN(day)) {
          const index = Math.min(Math.floor((day - 1) / 7), 3);
          weeklyCounters[index]++;
        }
      }
    });

    return {
      labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
      datasets: [
        {
          label: "Consultations Finished",
          data: weeklyCounters,
          backgroundColor: "#007acc",
          borderRadius: 6,
          hoverBackgroundColor: "#00d2ff",
          barThickness: 16,
        },
      ],
    };
  }, [selectedDoctor, appointments]);

  /* ============================================================
     5. MANAGEMENT HANDLERS & REGISTRY EXPORTS
     ============================================================ */
  const handleExportCSV = () => {
    if (filteredDoctors.length === 0) return;
    const headers = [
      "Specialist ID",
      "Full Name",
      "Degrees",
      "Department",
      "Experience",
      "Shift Hours",
      "Fee",
      "Roster Status",
    ];
    const rows = filteredDoctors.map((doc) => [
      doc.doctorId || doc._id.slice(-6).toUpperCase(),
      `"${(doc.name || "").replace(/"/g, '""')}"`,
      `"${(doc.degrees || "").replace(/"/g, '""')}"`,
      `"${(doc.department || "").replace(/"/g, '""')}"`,
      `"${(doc.experience || "N/A").replace(/"/g, '""')}"`,
      `"${doc.shiftStart || "09:00"} to ${doc.shiftEnd || "17:00"}"`,
      `₹${doc.fee || 500}`,
      doc.availability || "Available",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodeURI(csvContent));
    downloadAnchor.setAttribute(
      "download",
      `Hospital_Specialists_Registry_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  };

  const handlePageChange = (num) => {
    if (num >= 1 && num <= totalPages) {
      setCurrentPage(num);
      document.querySelector(".admin_doc_m_table_scroll")?.scrollTo(0, 0);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const formDataPayload = new FormData(e.target);
    try {
      const token = localStorage.getItem("token");
      setLoading(true);

      if (editDoctor) {
        await axios.put(
          `http://localhost:5000/api/doctors/update/${editDoctor.doctorId}`,
          formDataPayload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          },
        );
      } else {
        await axios.post(
          "http://localhost:5000/api/doctors/register",
          formDataPayload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          },
        );
      }

      setShowForm(false);
      setEditDoctor(null);
      syncData();
    } catch (err) {
      alert(
        "Validation failed. Ensure clinical fields conform to operational criteria.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="admin_dash_load">
        <Loader2 className="spin" /> Synchronizing Doctor Registry...
      </div>
    );

  return (
    <div className="admin_doc_m_wrapper">
      {/* ============================================================
         VIEW STATE 1: GLOBAL CLINICAL DIRECTORY TABLE REGISTRY
         ============================================================ */}
      {!selectedDoctor && (
        <div className="admin_doc_m_list_view">
          <div className="admin_doc_m_header_row">
            <div className="admin_doc_m_branding">
              <h2 className="admin_doc_m_title_elite">
                Medical <span>Specialists</span>
              </h2>
              <p className="admin_doc_m_subtitle">
                {filteredDoctors.length} clinical personnel records matched
              </p>
            </div>
            <div className="admin_doc_m_action_group">
              <button
                className="admin_doc_m_btn_sync_action"
                onClick={syncData}
                disabled={loading}
              >
                <Zap size={16} className={loading ? "spin" : ""} /> Sync Data
              </button>
              <button
                className="admin_doc_m_btn_outline_action"
                onClick={handleExportCSV}
              >
                <Download size={16} /> Export CSV
              </button>
              <button
                className="admin_doc_m_btn_primary_action"
                onClick={() => {
                  setEditDoctor(null);
                  setShowForm(true);
                }}
              >
                <Plus size={18} /> Add New Specialist
              </button>
            </div>
          </div>

          <div className="admin_doc_m_actions_bar">
            <div className="admin_doc_m_search_box">
              <Search size={18} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search specs by name..."
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="admin_doc_m_dropdown_group">
              <select
                className="admin_doc_m_select_filter"
                value={filterDept}
                onChange={(e) => {
                  setFilterDept(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Departments</option>
                {activeHospitalDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              <select
                className="admin_doc_m_select_filter"
                value={filterAvail}
                onChange={(e) => {
                  setFilterAvail(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Status</option>
                <option value="Available">Available</option>
                <option value="On Leave">On Leave</option>
                <option value="Busy">Busy (Emergency)</option>
              </select>
            </div>
          </div>

          <div className="admin_doc_m_table_container">
            <div className="admin_doc_m_table_scroll">
              <table className="admin_doc_m_table">
                <thead>
                  <tr>
                    <th>Specialist Profile</th>
                    <th>Medical Department</th>
                    <th>Clinical Status</th>
                    <th>Experience</th>
                    <th className="admin_doc_m_text_right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentDoctors.map((doc) => (
                    <tr key={doc._id}>
                      <td data-label="Specialist Profile">
                        <div className="admin_doc_m_cell_user">
                          <img
                            src={
                              doc.photo
                                ? `http://localhost:5000/uploads/${doc.photo}`
                                : `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.name || "DR")}&background=e2e8f0&color=64748b`
                            }
                            alt={doc.name}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.name || "DR")}&background=e2e8f0&color=64748b`;
                            }}
                          />
                          <div>
                            <b>{doc.name}</b>
                            <span>{doc.degrees}</span>
                          </div>
                        </div>
                      </td>
                      <td
                        data-label="Medical Department"
                        className="admin_doc_m_text_bold"
                      >
                        {doc.department}
                      </td>
                      <td data-label="Clinical Status">
                        <span
                          className={`admin_doc_m_status ${doc.availability === "Available" ? "upcoming" : "cancelled"}`}
                        >
                          {doc.availability === "Available" ? (
                            <CheckCircle2 size={12} />
                          ) : (
                            <AlertCircle size={12} />
                          )}
                          {doc.availability}
                        </span>
                      </td>
                      <td data-label="Experience">{doc.experience || "N/A"}</td>
                      <td
                        data-label="Management"
                        className="admin_doc_m_text_right"
                      >
                        <button
                          className="admin_doc_m_btn_manage"
                          onClick={() => setSelectedDoctor(doc)}
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                  {currentDoctors.length === 0 && (
                    <tr>
                      <td colSpan="5" className="admin_doc_m_empty_state">
                        No matching practitioner files found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="admin_patnt_m_pagination_bar">
              <div className="admin_patnt_m_pag_info">
                Showing{" "}
                <b>
                  {(currentPage - 1) * rowsPerPage + 1}-
                  {Math.min(currentPage * rowsPerPage, filteredDoctors.length)}
                </b>{" "}
                of <b>{filteredDoctors.length}</b>
              </div>
              <div className="admin_patnt_m_pag_buttons">
                <button
                  className="admin_patnt_m_pag_nav_btn"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
                </button>
                <button className="admin_patnt_m_pag_num_btn admin_patnt_m_active">
                  {currentPage}
                </button>
                <button
                  className="admin_patnt_m_pag_nav_btn"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
         VIEW STATE 2: MASTER DETAILED CLINICAL WORKSPACE ARCHITECTURE
         ============================================================ */}
      {selectedDoctor && (
        <div className="admin_doc_m_detail_container">
          <div className="admin_doc_m_detail_header">
            <button
              className="admin_doc_m_btn_edit"
              onClick={() => {
                setEditDoctor(selectedDoctor);
                setShowForm(true);
              }}
            >
              Edit Specialist
            </button>
            <button
              className="admin_doc_m_btn_close"
              onClick={() => setSelectedDoctor(null)}
            >
              Close Workspace
            </button>
          </div>

          <div className="admin_doc_m_profile_section">
            <img
              src={
                selectedDoctor.photo
                  ? `http://localhost:5000/uploads/${selectedDoctor.photo}`
                  : `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedDoctor.name || "DR")}&size=150&background=e2e8f0&color=64748b`
              }
              alt={selectedDoctor.name}
              className="admin_doc_m_profile_photo_large"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedDoctor.name || "DR")}&size=150&background=e2e8f0&color=64748b`;
              }}
            />
            <div className="admin_doc_m_profile_info">
              <h2>{selectedDoctor.name}</h2>
              <p className="admin_doc_m_rating_indicator_text">
                <Star size={16} fill="#eab308" color="#eab308" /> True Rating
                Index: {docStats.averageRating} / 5.0
              </p>
              <p>
                <Mail size={16} /> Email: {selectedDoctor.email}
              </p>
              <p>
                <GraduationCap size={16} /> Qualification:{" "}
                {selectedDoctor.degrees}
              </p>
              <p>
                <Briefcase size={16} /> Clinical Dept:{" "}
                {selectedDoctor.department}
              </p>
              <p>
                <Activity size={16} /> Experience: {selectedDoctor.experience}
              </p>
              <p>
                <FileText size={16} /> System reference:{" "}
                {selectedDoctor.doctorId ||
                  selectedDoctor._id?.slice(-6).toUpperCase()}
              </p>
            </div>
            <div className="admin_doc_m_profile_stats">
              <div className="admin_doc_m_stat_box">
                <p>Appointments</p>
                <h3>{docStats.totalAppts}</h3>
              </div>
              <div className="admin_doc_m_stat_box">
                <p>Total Patients</p>
                <h3>{docStats.totalPatients}</h3>
              </div>
            </div>
          </div>

          <div className="admin_doc_m_middle_section">
            <div className="admin_doc_m_appointments_list">
              <div className="admin_doc_m_list_header_flex">
                <h3>Appointment History </h3>
                <div className="admin_doc_m_sub_filter_toggle">
                  <button
                    className={`admin_doc_m_sub_tab ${historyTab === "Recent" ? "admin_doc_m_active" : ""}`}
                    onClick={() => setHistoryTab("Recent")}
                  >
                    Recent
                  </button>
                  <button
                    className={`admin_doc_m_sub_tab ${historyTab === "Upcoming" ? "admin_doc_m_active" : ""}`}
                    onClick={() => setHistoryTab("Upcoming")}
                  >
                    Upcoming
                  </button>
                </div>
              </div>
              <ul className="admin_doc_m_elite_list">
                {getFilteredDoctorAppointments(selectedDoctor.name).map(
                  (appt, idx) => (
                    <li key={idx} className="admin_doc_m_list_item_refined">
                      <div style={{ display: "flex", gap: "12px" }}>
                        <b>{appt.patientName || appt.patient}</b>
                        <span style={{ color: "#64748b" }}>{appt.date}</span>
                      </div>
                      <span className="admin_doc_m_status upcoming">
                        {appt.status}
                      </span>
                    </li>
                  ),
                )}
                {getFilteredDoctorAppointments(selectedDoctor.name).length ===
                  0 && (
                  <li
                    className="admin_doc_m_list_item_refined"
                    style={{ color: "#94a3b8" }}
                  >
                    No recorded logs inside this track filter scope.
                  </li>
                )}
              </ul>
            </div>

            <div className="admin_doc_m_charts_section">
              <h3>Weekly Trend</h3>{" "}
              <div className="admin_doc_m_chart_canvas_box">
                <Bar
                  data={dynamicPerformanceChartData}
                  options={{
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                  }}
                />
              </div>
            </div>
          </div>

          <div className="admin_doc_m_leaves_section">
            <div className="admin_doc_m_list_header_flex">
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <h3>Leave Registry</h3>
                <div className="admin_doc_m_sub_filter_toggle">
                  <button
                    className={`admin_doc_m_sub_tab ${leaveTab === "upcoming" ? "admin_doc_m_active" : ""}`}
                    onClick={() => setLeaveTab("upcoming")}
                  >
                    Upcoming
                  </button>
                  <button
                    className={`admin_doc_m_sub_tab ${leaveTab === "completed" ? "admin_doc_m_active" : ""}`}
                    onClick={() => setLeaveTab("completed")}
                  >
                    History
                  </button>
                </div>
              </div>
            </div>
            <div className="admin_doc_m_leaves_grid">
              {activeFilteredLeavesList.map((leave, idx) => {
                // Cleans up the database string to parse out prefix tags
                const displayReason = leave.reason
                  ? leave.reason.replace(/^\[.*?\]\s*/, "")
                  : "Medical Roster Adjustment Request";

                return (
                  <div key={idx} className="admin_doc_m_leave_box_elite">
                    {leaveTab === "upcoming" ? (
                      <PlaneTakeoff size={14} color="#e11d48" />
                    ) : (
                      <History size={14} color="#64748b" />
                    )}
                    <div>
                      <b style={{ textTransform: "capitalize" }}>
                        {displayReason}
                      </b>
                      <br />
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#64748b",
                          fontWeight: "600",
                        }}
                      >
                        Date: {leave.startDate}
                      </span>
                    </div>
                  </div>
                );
              })}

              {activeFilteredLeavesList.length === 0 && (
                <div
                  className="admin_doc_m_leave_box_elite"
                  style={{
                    color: "#94a3b8",
                    width: "100%",
                    gridColumn: "span 2",
                    fontStyle: "italic",
                  }}
                >
                  Zero authorized approved absences logged in this timeline
                  window parameter.
                </div>
              )}
            </div>
          </div>

          <div
            className="admin_doc_m_middle_section"
            style={{ marginTop: "24px" }}
          >
            <div className="admin_doc_m_appointments_list">
              <h3>
                <Star size={18} color="#facc15" fill="#facc15" /> Patient
                feedback
              </h3>
              <div className="admin_doc_m_elite_list">
                {(showAllReviews
                  ? docStats.activeReviews
                  : docStats.activeReviews.slice(0, 3)
                ).map((rev, i) => (
                  <div
                    key={i}
                    className="admin_doc_m_list_item_refined"
                    style={{
                      flexDirection: "column",
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        width: "100%",
                      }}
                    >
                      <b>{rev.patientName}</b>
                      <div style={{ display: "flex" }}>
                        {[...Array(Number(rev.rating))].map((_, s) => (
                          <Star
                            key={s}
                            size={10}
                            fill="#facc15"
                            color="#facc15"
                          />
                        ))}
                      </div>
                    </div>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#475569",
                        fontStyle: "italic",
                        margin: "4px 0 0 0",
                      }}
                    >
                      "{rev.comment}"
                    </p>
                  </div>
                ))}
                {docStats.activeReviews.length === 0 && (
                  <div
                    className="admin_doc_m_list_item_refined"
                    style={{ color: "#94a3b8" }}
                  >
                    No quality assurance feedback surveys submitted for this
                    clinician chart.
                  </div>
                )}
              </div>
              {docStats.activeReviews.length > 3 && (
                <button
                  className="admin_doc_m_triggered_view_more_btn"
                  onClick={() => setShowAllReviews(!showAllReviews)}
                >
                  {showAllReviews
                    ? "Collapse Testimonials View"
                    : `View All Testimonials (${docStats.activeReviews.length})`}
                </button>
              )}
            </div>

            <div className="admin_doc_m_charts_section">
              <h3>
                <Activity size={18} color="#007acc" />
                Events Details
              </h3>
              <div
                className="admin_doc_m_elite_list"
                style={{ maxHeight: "250px", overflowY: "auto" }}
              >
                {docStats.attendedEvents.length > 0 ? (
                  docStats.attendedEvents.map((evt, i) => (
                    <div
                      key={i}
                      className="admin_doc_m_list_item_refined"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 12px",
                        borderBottom: "1px solid #f1f5f9",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "12px",
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            background:
                              evt.status === "Cancelled"
                                ? "#ffe4e6"
                                : "#e0f2fe",
                            padding: "8px",
                            borderRadius: "8px",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <ShieldCheck
                            size={16}
                            color={
                              evt.status === "Cancelled" ? "#e11d48" : "#007acc"
                            }
                          />
                        </div>
                        <div>
                          <b style={{ color: "#1e293b", fontSize: "0.9rem" }}>
                            {evt.title}
                          </b>
                          <br />
                          <small
                            style={{ color: "#64748b", fontSize: "0.75rem" }}
                          >
                            <MapPin
                              size={10}
                              style={{
                                display: "inline",
                                verticalAlign: "middle",
                                marginRight: "2px",
                              }}
                            />
                            {evt.location} • {evt.date}
                          </small>
                        </div>
                      </div>
                      <span
                        className={`admin_doc_m_status ${(evt.status || "Upcoming").toLowerCase()}`}
                        style={{
                          fontSize: "0.7rem",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontWeight: "700",
                          background:
                            evt.status === "Completed"
                              ? "#d1fae5"
                              : evt.status === "Cancelled"
                                ? "#ffe4e6"
                                : "#e0f2fe",
                          color:
                            evt.status === "Completed"
                              ? "#065f46"
                              : evt.status === "Cancelled"
                                ? "#991b1b"
                                : "#0369a1",
                        }}
                      >
                        {evt.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="admin_doc_m_empty_notice_list">
                    No clinical conferences or calendar events tracked on roster
                    logs for this specialist profile.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
         VIEW STATE 3: CLINICAL ONBOARDING / PROFILE UPDATE MODAL
         ============================================================ */}
      {showForm && (
        <div className="admin_doc_m_modal_overlay">
          <div className="admin_doc_m_centered_form_card">
            <div
              className="admin_doc_m_header_row"
              style={{ marginBottom: "20px" }}
            >
              <h2 style={{ margin: 0 }}>
                {editDoctor ? "Update Specialist" : "Add New Specialist"}
              </h2>
              <button
                className="admin_doc_m_form_close_trigger"
                onClick={() => setShowForm(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleFormSubmit}
              className="admin_doc_m_form_grid"
              encType="multipart/form-data"
            >
              <div
                className="admin_doc_m_input_box"
                style={{ gridColumn: "span 2" }}
              >
                <label>Profile Image Source (JPG / PNG)</label>
                <input type="file" name="photo" accept="image/*" />
              </div>
              <div className="admin_doc_m_input_box">
                <label>Full Name</label>
                <input
                  name="name"
                  defaultValue={editDoctor?.name}
                  required
                  placeholder="Dr. First Last"
                />
              </div>

              <div className="admin_doc_m_input_box">
                <label>Medical Department Wing</label>
                <select
                  name="department"
                  defaultValue={
                    editDoctor?.department || activeHospitalDepartments[0]
                  }
                  required
                >
                  {activeHospitalDepartments.map((dept) => (
                    <option
                      key={`modal-dept-select-option-${dept}`}
                      value={dept}
                    >
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin_doc_m_input_box">
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  defaultValue={editDoctor?.email}
                  required
                  placeholder="doctor@medico.com"
                />
              </div>
              <div className="admin_doc_m_input_box">
                <label>
                  {editDoctor
                    ? "Change Access Security Key (Leave Blank to Keep)"
                    : "Access Security Key"}
                </label>
                <input
                  type="password"
                  name="password"
                  required={!editDoctor}
                  placeholder="••••••••"
                />
              </div>
              <div className="admin_doc_m_input_box">
                <label>Credentials / Degrees</label>
                <input
                  name="degrees"
                  defaultValue={editDoctor?.degrees}
                  required
                  placeholder="MBBS, MD, FRCS"
                />
              </div>
              <div className="admin_doc_m_input_box">
                <label>Years of Clinical Experience</label>
                <input
                  name="experience"
                  defaultValue={editDoctor?.experience}
                  placeholder="e.g. 10 Years"
                />
              </div>
              <div className="admin_doc_m_input_box">
                <label>Standard Consultation Fee (₹)</label>
                <input
                  type="number"
                  name="fee"
                  defaultValue={editDoctor?.fee || 500}
                  required
                />
              </div>
              <div className="admin_doc_m_input_box">
                <label>Initial Roster Status</label>
                <select
                  name="availability"
                  defaultValue={editDoctor?.availability || "Available"}
                >
                  <option value="Available">Available</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Busy">Busy (Emergency)</option>
                </select>
              </div>
              <div className="admin_doc_m_input_box">
                <label>OPD Shift Starting Hours</label>
                <input
                  type="time"
                  name="shiftStart"
                  defaultValue={editDoctor?.shiftStart || "09:00"}
                />
              </div>
              <div className="admin_doc_m_input_box">
                <label>OPD Shift Ending Hours</label>
                <input
                  type="time"
                  name="shiftEnd"
                  defaultValue={editDoctor?.shiftEnd || "17:00"}
                />
              </div>
              <div
                className="admin_doc_m_input_box"
                style={{ gridColumn: "span 2" }}
              >
                <label>Professional Summary & Core Competencies</label>
                <textarea
                  name="bio"
                  rows="2"
                  defaultValue={editDoctor?.bio}
                  placeholder="Describe clinical expertise or specialization focuses..."
                />
              </div>
              <button
                type="submit"
                className="admin_doc_m_btn_submit_pro"
                disabled={loading}
              >
                {loading ? "Synchronizing Shared Registry Stack..." : "Commit"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
