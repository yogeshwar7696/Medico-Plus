import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Search,
  X,
  Clock,
  Plus,
  Phone,
  Mail,
  ArrowLeft,
  Activity,
  MapPin,
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
  User,
  ClipboardList,
  ShieldCheck,
  GraduationCap,
  Hash,
  Thermometer,
  Loader2,
  Bell,
  Check,
  ArrowUpRight,
  Scroll,
  AlertCircle,
  Zap,
  ArrowRight,
  CheckCircle,
  Filter,
  UserCheck,
  Building,
} from "lucide-react";

import "./Appointment_Management.css";

export default function Appointment_Management() {
  const [appointments, setAppointments] = useState([]);
  const [rescheduleRequests, setRescheduleRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbDepartments, setDbDepartments] = useState([]);
  const [docData, setDocData] = useState([]);

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showRequestsOverlay, setShowRequestsOverlay] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  const [processedRequestIds, setProcessedRequestIds] = useState(new Set());

  const [localSearch, setLocalSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [isDetailView, setIsDetailView] = useState(false);
  const [patientProfilesList, setPatientProfilesList] = useState([]);

  // ==========================================
  // ADVANCED NEW BOOKING WORKFLOW ENGINE STATE
  // ==========================================
  const [bookingStep, setBookingStep] = useState(1);
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [doctorSearchQuery, setDoctorSearchQuery] = useState("");
  const [formDeptFilter, setFormDeptFilter] = useState("All Departments");
  const [bookedSlots, setBookedSlots] = useState([]);
  const [dynamicDaySlotsMatrix, setDynamicDaySlotsMatrix] = useState([]);

  const [newBookingData, setNewBookingData] = useState({
    patient: null,
    doctor: null,
    date: new Date().toLocaleDateString("en-CA"),
    time: "",
    notes: "Scheduled via Administrative Panel Overview Management.",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const maxBookingDate = useMemo(() => {
    const today = new Date();
    today.setMonth(today.getMonth() + 1);
    return today.toLocaleDateString("en-CA");
  }, []);
  /* --- REVISED PATIENT PROFILE FALLBACK DECONSTRUCTION MATRIX --- */
  const getLivePatientValue = (selectedAppt, targetKey) => {
    if (!selectedAppt) return "N/A";

    const masterProfile = patientProfilesList.find((p) => {
      const apptPatientId =
        selectedAppt.patientId?._id || selectedAppt.patientId;
      if (apptPatientId && p._id === apptPatientId) return true;

      return (
        (p.name || "").toLowerCase().trim() ===
        (selectedAppt.patientName || selectedAppt.patient || "")
          .toLowerCase()
          .trim()
      );
    });

    if (masterProfile) {
      if (targetKey === "age") return masterProfile.age || "—";
      if (targetKey === "gender") return masterProfile.gender || "—";
      if (targetKey === "blood") return masterProfile.bloodGroup || "—";
      if (targetKey === "email") return masterProfile.email || "—";
      if (targetKey === "phone") return masterProfile.contact || "—";
    }

    if (targetKey === "age")
      return selectedAppt.patientAge || selectedAppt.age || "N/A";
    if (targetKey === "gender")
      return selectedAppt.patientGender || selectedAppt.gender || "N/A";
    if (targetKey === "blood")
      return selectedAppt.patientBloodGroup || selectedAppt.bloodGroup || "N/A";
    if (targetKey === "email")
      return selectedAppt.patientEmail || selectedAppt.email || "N/A";
    if (targetKey === "phone") {
      return (
        selectedAppt.patientContact ||
        selectedAppt.patientMobile ||
        selectedAppt.contact ||
        "N/A"
      );
    }
    return "N/A";
  };

  const docPhotoMap = useMemo(() => {
    const map = {};
    if (Array.isArray(docData)) {
      docData.forEach((d) => {
        if (d && d.name) map[d.name] = d.photo;
      });
    }
    return map;
  }, [docData]);

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const docRes = await axios.get("http://localhost:5000/api/doctors/list", {
        headers,
      });
      if (docRes && docRes.data) {
        setDocData(docRes.data);
      }
      const [apptRes, requestRes, deptRes, patientRes] = await Promise.all([
        axios.get("http://localhost:5000/api/appointments/all", { headers }),
        axios
          .get(
            "http://localhost:5000/api/appointments/admin/pending-requests",
            { headers },
          )
          .catch(() => ({ data: [] })),
        axios
          .get("http://localhost:5000/api/departments/dropdown/list", {
            headers,
          })
          .catch(() => ({ data: [] })),
        axios
          .get("http://localhost:5000/api/patients/all", { headers })
          .catch(() => ({ data: [] })),
      ]);

      setAppointments(apptRes.data || []);
      setRescheduleRequests(requestRes.data || []);
      setDbDepartments(deptRes.data || []);
      setPatientProfilesList(patientRes.data || []);
    } catch (err) {
      console.error("Registry Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    setIsHistoryExpanded(false);
  }, [selectedAppointment]);

  // ==========================================
  // RUNTIME AVAILABILITY SLOT MATRIX SYNC HOOK
  // ==========================================
  useEffect(() => {
    if (newBookingData.doctor && newBookingData.date) {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const targetDoctorId =
        newBookingData.doctor._id || newBookingData.doctor.doctorId;

      axios
        .get(
          `http://localhost:5000/api/doctors/availability/${targetDoctorId}/${newBookingData.date}`,
          { headers },
        )
        .then((res) => {
          setBookedSlots(res.data.blockedSlots || []);
          setDynamicDaySlotsMatrix(res.data.slotsConfigMatrix || []);
        })
        .catch((err) => {
          console.error(
            "Administrative Runtime Slot Matrix Sync Failure:",
            err,
          );
          setDynamicDaySlotsMatrix([]);
        });
    }
  }, [newBookingData.doctor, newBookingData.date]);

  const pendingRequestsCount = useMemo(() => {
    return rescheduleRequests.filter(
      (req) =>
        !processedRequestIds.has(req._id) &&
        req.adminRequest?.status === "Pending",
    ).length;
  }, [rescheduleRequests, processedRequestIds]);

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      const patientNameStr = (a.patientName || a.patient || "").toLowerCase();
      const matchesLocal = patientNameStr.includes(localSearch.toLowerCase());
      const matchesDept = filterDept ? a.department === filterDept : true;
      const matchesStatus = filterStatus ? a.status === filterStatus : true;
      const matchesDate = dateFilter ? a.date === dateFilter : true;

      return matchesLocal && matchesDept && matchesStatus && matchesDate;
    });
  }, [localSearch, filterDept, filterStatus, dateFilter, appointments]);

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentAppointments = filtered.slice(indexOfFirstRow, indexOfLastRow);

  const normalizeTimeStr = (str) => {
    if (!str) return "";
    return String(str).replace(/^0/, "").replace(/\s+/g, " ").trim();
  };

  // ==========================================
  // DYNAMIC COMPUTED HOURLY SLOTS VISIBILITY GRID
  // ==========================================
  const calculatedSlotsGrid = useMemo(() => {
    if (!newBookingData.doctor || dynamicDaySlotsMatrix.length === 0) return [];

    const now = new Date();
    const isToday = newBookingData.date === now.toLocaleDateString("en-CA");
    const isFullDayLeaveApproved = bookedSlots.includes("FULL_DAY_LEAVE");

    return dynamicDaySlotsMatrix.map((slotTimeStr) => {
      const cleanSlotStr = normalizeTimeStr(slotTimeStr);
      let isPast = false;

      if (isToday) {
        const [timePart, modifier] = cleanSlotStr.split(" ");
        let [hours, minutes] = timePart.split(":").map(Number);
        if (modifier === "PM" && hours < 12) hours += 12;
        if (modifier === "AM" && hours === 12) hours = 0;

        const slotComparisonTime = new Date();
        slotComparisonTime.setHours(hours, minutes, 0, 0);
        isPast = slotComparisonTime.getTime() < now.getTime();
      }

      const isAlreadyBooked = bookedSlots.some(
        (blocked) => normalizeTimeStr(blocked) === cleanSlotStr,
      );

      return {
        time: slotTimeStr,
        isBooked: isAlreadyBooked,
        isOnLeave: isFullDayLeaveApproved,
        isPast: isPast,
      };
    });
  }, [
    newBookingData.doctor,
    newBookingData.date,
    bookedSlots,
    dynamicDaySlotsMatrix,
  ]);

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      alert(
        "No clinical appointment records available inside the current view state to export.",
      );
      return;
    }

    const headers = [
      "Appointment ID",
      "Patient Name",
      "Specialist Consultant",
      "Medical Department",
      "Scheduled Date",
      "Time Slot",
      "Session Type",
      "Workflow Status",
    ];

    const rows = filtered.map((appt) => [
      appt.appointmentID || "N/A",
      `"${(appt.patientName || appt.patient || "Unrecorded").replace(/"/g, '""')}"`,
      `"${(appt.doctorName || appt.doctor || "Unassigned").replace(/"/g, '""')}"`,
      `"${(appt.department || "General Medicine").replace(/"/g, '""')}"`,
      appt.date,
      appt.time,
      appt.type || "Consultation",
      appt.status || "Upcoming",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute(
      "download",
      `Clinical_Appointments_Ledger_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  };

  const consultationHistory = useMemo(() => {
    if (!selectedAppointment) return [];
    return appointments
      .filter(
        (a) =>
          (a.patientId === selectedAppointment.patientId ||
            a.patientName === selectedAppointment.patientName ||
            a.patient === selectedAppointment.patient) &&
          a.status === "Completed" &&
          a._id !== selectedAppointment._id,
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [selectedAppointment, appointments]);

  const activeHistoryRenderList = useMemo(() => {
    if (isHistoryExpanded) return consultationHistory;
    return consultationHistory.slice(0, 5);
  }, [consultationHistory, isHistoryExpanded]);

  const hasMoreRecordsThanPreview = consultationHistory.length > 5;

  const handleRequestAction = async (
    requestId,
    apptId,
    uiAction,
    newDate,
    newTime,
  ) => {
    try {
      const token = localStorage.getItem("token");
      const backendActionStr = uiAction === "Accept" ? "Approved" : "Rejected";

      await axios.put(
        `http://localhost:5000/api/appointments/admin/resolve-request/${apptId}`,
        { action: backendActionStr, appointmentId: apptId, newDate, newTime },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setProcessedRequestIds((prev) => {
        const next = new Set(prev);
        next.add(requestId);
        return next;
      });

      alert(`Request has been successfully marked as ${backendActionStr}`);
      await fetchAppointments();

      if (selectedAppointment && selectedAppointment._id === apptId) {
        const freshAppt = appointments.find((a) => a._id === apptId);
        if (freshAppt) setSelectedAppointment(freshAppt);
      }
    } catch (err) {
      alert(`Action resolution failure: ${err.message}`);
    }
  };

  const navigateToAppointmentFileView = (apptId) => {
    setShowRequestsOverlay(false);
    const targetAppointment = appointments.find((a) => a._id === apptId);
    if (targetAppointment) {
      setSelectedAppointment(targetAppointment);
      setIsDetailView(true);
    } else {
      alert(
        "Target appointment metrics not loaded within current operational scope.",
      );
    }
  };

  const handlePageChange = (num) => {
    if (num >= 1 && num <= totalPages) {
      setCurrentPage(num);
      const container = document.querySelector(".admin_appt_m_table_scroll");
      if (container) container.scrollTop = 0;
    }
  };

  const handleViewDetails = (appt) => {
    setSelectedAppointment(appt);
    setIsDetailView(true);
  };

  // ==========================================
  // HIGH-FIDELITY ADMINISTRATIVE BOOKING TRANSACTIONS SUBMITTER
  // ==========================================
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (
      !newBookingData.patient ||
      !newBookingData.doctor ||
      !newBookingData.time
    ) {
      alert(
        "Please ensure Patient, Doctor, Date, and Time slot coordinates are set.",
      );
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      await axios.post(
        "http://localhost:5000/api/appointments/book",
        {
          patientId: newBookingData.patient._id,
          docId: newBookingData.doctor._id,
          patientName: newBookingData.patient.name,
          doctorName: newBookingData.doctor.name,
          department: newBookingData.doctor.department,
          date: newBookingData.date,
          time: newBookingData.time,
          notes: newBookingData.notes,
          type: "Consultation",
        },
        { headers },
      );

      alert(
        "Appointment has been successfully scheduled via Administrative Ledger Routing!",
      );
      setShowForm(false);

      // Reset State parameters
      setBookingStep(1);
      setPatientSearchQuery("");
      setDoctorSearchQuery("");
      setFormDeptFilter("All Departments");
      setNewBookingData({
        patient: null,
        doctor: null,
        date: new Date().toLocaleDateString("en-CA"),
        time: "",
        notes: "Scheduled via Administrative Panel Overview Management.",
      });
      await fetchAppointments();
    } catch (err) {
      alert(
        `Booking workflow generation error: ${err.response?.data?.message || err.message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="admin_dash_load">
        <Loader2 className="spin" size={40} />
        <p>Synchronizing Appointment Registry...</p>
      </div>
    );

  return (
    <div className="admin_appt_m_wrapper">
      {!isDetailView ? (
        <div className="admin_appt_m_list_view">
          <div className="admin_appt_m_header">
            <div className="admin_appt_m_branding">
              <h1 className="admin_appt_m_title">
                Clinical <span>Appointments</span>
              </h1>
              <p className="admin_appt_m_meta">
                {filtered.length} total records
              </p>
            </div>
            <div className="admin_appt_m_actions">
              <button
                className="admin_appt_m_btn_sync"
                onClick={fetchAppointments}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="spin" size={16} />
                ) : (
                  <Zap size={16} />
                )}
                <span>Sync Data</span>
              </button>
              <button
                className={`admin_appt_m_btn_req ${pendingRequestsCount > 0 ? "admin_appt_m_pulse_alert" : ""}`}
                onClick={() => setShowRequestsOverlay(true)}
              >
                <Bell size={16} /> <span>Reschedule Requests</span>
                {pendingRequestsCount > 0 && (
                  <span className="admin_appt_m_badge_count">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>

              <button
                className="admin_appt_m_btn_export"
                onClick={handleExportCSV}
              >
                <Download size={16} /> Export CSV
              </button>
              <button
                className="admin_appt_m_btn_primary"
                onClick={() => {
                  setBookingStep(1);
                  setShowForm(true);
                }}
              >
                <Plus size={15} /> New Booking
              </button>
            </div>
          </div>

          <div className="admin_appt_m_toolbar">
            <div className="admin_appt_m_search_container">
              <Search size={18} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search by patient name..."
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="admin_appt_m_filter_group">
              <select
                className="admin_appt_m_select"
                value={filterDept}
                onChange={(e) => {
                  setFilterDept(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">Departments</option>
                {dbDepartments.map((dept) => (
                  <option key={dept._id || dept.name} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>

              <select
                className="admin_appt_m_select"
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">Status</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Completed">Completed</option>
              </select>

              <input
                type="date"
                className="admin_appt_m_date_input"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setCurrentPage(1);
                }}
              />

              {(localSearch || filterDept || filterStatus || dateFilter) && (
                <button
                  className="admin_appt_m_clear"
                  onClick={() => {
                    setLocalSearch("");
                    setFilterDept("");
                    setFilterStatus("");
                    setDateFilter("");
                    setCurrentPage(1);
                  }}
                >
                  <X size={14} /> Clear
                </button>
              )}
            </div>
          </div>

          <div className="admin_appt_m_table_scroll">
            <table className="admin_appt_m_table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Schedule</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th className="admin_appt_m_text_right">Action</th>
                </tr>
              </thead>
              <tbody>
                {currentAppointments.length > 0 ? (
                  currentAppointments.map((appt) => {
                    const isRescheduled =
                      appt.adminRequest?.requestType === "Shift" &&
                      appt.adminRequest?.status === "Approved";

                    return (
                      <tr
                        key={appt._id || appt.id}
                        className="admin_appt_m_tr_element"
                      >
                        <td data-label="Patient">
                          <div className="admin_appt_m_user_cell">
                            <img
                              src={
                                appt.patientPhoto ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(appt.patientName || "PT")}&background=e2e8f0&color=64748b`
                              }
                              alt="Patient"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(appt.patientName || "PT")}&background=e2e8f0&color=64748b`;
                              }}
                            />
                            <div>
                              <b>{appt.patientName || appt.patient}</b>
                              <span>#{appt.appointmentID || "N/A"}</span>
                            </div>
                          </div>
                        </td>
                        <td data-label="Doctor">
                          {appt.doctorName || appt.doctor}
                        </td>
                        <td data-label="Schedule">
                          <div className="admin_appt_m_time_cell">
                            <span className="admin_appt_m_date_text">
                              {appt.date}
                            </span>
                            <span className="admin_appt_m_time_text">
                              {appt.time}
                              {isRescheduled && (
                                <span
                                  className="admin_appt_m_resched_dot"
                                  style={{
                                    marginLeft: "4px",
                                    color: "#f59e0b",
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  (Rescheduled)
                                </span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td data-label="Type">
                          <span
                            className={`admin_appt_m_tag ${appt.type?.toLowerCase()}`}
                          >
                            {appt.type}
                          </span>
                        </td>
                        <td data-label="Status">
                          <span
                            className={`admin_appt_m_status ${appt.status?.toLowerCase()}`}
                          >
                            {appt.status}
                          </span>
                        </td>
                        <td
                          data-label="Action"
                          className="admin_appt_m_text_right"
                        >
                          <button
                            className="admin_appt_m_btn_view"
                            onClick={() => handleViewDetails(appt)}
                          >
                            View File
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="admin_appt_m_empty">
                      <Activity size={32} />
                      <p>No matching records found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="admin_appt_m_pagination">
              <p>
                Showing{" "}
                <b>
                  {indexOfFirstRow + 1}-
                  {Math.min(indexOfLastRow, filtered.length)}
                </b>{" "}
                of <b>{filtered.length}</b>
              </p>
              <div className="admin_appt_m_pag_controls">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
                </button>
                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1;
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={i}
                        className={
                          currentPage === page ? "admin_appt_m_pag_active" : ""
                        }
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    page === currentPage - 2 ||
                    page === currentPage + 2
                  ) {
                    return <span key={i}>...</span>;
                  }
                  return null;
                })}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="admin_appt_m_detail_view">
          <div className="admin_appt_m_detail_header">
            <button
              className="admin_appt_m_back_btn"
              onClick={() => setIsDetailView(false)}
            >
              <ArrowLeft size={18} /> Back to Overview
            </button>
            <div className="admin_appt_m_status_indicator">
              <span
                className={`admin_appt_m_pulse ${selectedAppointment.status?.toLowerCase()}`}
              ></span>
              Reference ID: {selectedAppointment.appointmentID || "#N/A"}
            </div>
          </div>

          <div className="admin_appt_m_grid_layout">
            <div className="admin_appt_m_card admin_appt_m_profile_card">
              {selectedAppointment.status === "Transferred" ||
              (selectedAppointment.adminRequest?.status === "Approved" &&
                selectedAppointment.adminRequest?.requestType === "Shift") ? (
                <div className="admin_appt_m_transfer_disclosure_banner">
                  <ShieldCheck size={28} className="success_tick_icon" />
                  <div className="disclosure_message_stack">
                    <h3>Administrative Reassignment Finalized</h3>
                    <p>
                      This consult vector has been safely reassigned. Operations
                      are transferred to:{" "}
                      <strong>Dr. {selectedAppointment.doctorName}</strong>.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <label className="admin_appt_m_label_alt">
                    <ShieldCheck size={14} /> Specialist Profile
                  </label>
                  <div className="admin_appt_m_profile_flex">
                    <img
                      src={
                        docPhotoMap[selectedAppointment.doctorName]
                          ? `http://localhost:5000/uploads/${docPhotoMap[selectedAppointment.doctorName]}`
                          : `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedAppointment.doctorName || "DR")}&background=f0f7ff&color=007acc&bold=true`
                      }
                      alt="Doctor"
                      className="admin_appt_m_profile_img"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedAppointment.doctorName || "DR")}&background=e2e8f0&color=64748b`;
                      }}
                    />
                    <div className="admin_appt_m_profile_info">
                      <h2>
                        {selectedAppointment.doctorName ||
                          selectedAppointment.doctor}
                      </h2>
                      <div className="admin_appt_m_degree_tag">
                        <GraduationCap size={14} /> MBBS, MD |{" "}
                        {selectedAppointment.department}
                      </div>
                      <div className="admin_appt_m_quick_meta">
                        <span>
                          <MapPin size={12} /> Tower A, Room 402
                        </span>
                        <span>
                          <Clock size={12} /> Shift: 09:00 - 17:00
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="admin_appt_m_card admin_appt_m_profile_card">
              <label className="admin_appt_m_label_alt">
                <User size={14} /> Patient profile
              </label>
              <div className="admin_appt_m_profile_flex">
                <img
                  src={
                    selectedAppointment.patientId?.photo &&
                    !selectedAppointment.patientId.photo.includes("pravatar")
                      ? `http://localhost:5000/uploads/${selectedAppointment.patientId.photo}`
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedAppointment.patientName || "PT")}&background=e0f2fe&color=007acc&bold=true`
                  }
                  alt="PatientAvatar"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedAppointment.patientName || "PT")}&background=e0f2fe&color=007acc&bold=true`;
                  }}
                />
                <div className="admin_appt_m_profile_info">
                  <h2>
                    {selectedAppointment.patientName ||
                      selectedAppointment.patient}
                  </h2>
                  <div className="admin_appt_m_demographic_grid">
                    <div className="admin_appt_m_demo_item">
                      Age:{" "}
                      <b>{getLivePatientValue(selectedAppointment, "age")}</b>
                    </div>
                    <div className="admin_appt_m_demo_item">
                      Sex:{" "}
                      <b>
                        {getLivePatientValue(selectedAppointment, "gender")}
                      </b>
                    </div>
                    <div className="admin_appt_m_demo_item">
                      Blood:{" "}
                      <b>{getLivePatientValue(selectedAppointment, "blood")}</b>
                    </div>
                    <div className="admin_appt_m_contact_info">
                      <span>
                        <Mail size={12} />{" "}
                        {getLivePatientValue(selectedAppointment, "email")}
                      </span>
                      <span>
                        <Phone size={12} />{" "}
                        {getLivePatientValue(selectedAppointment, "phone")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="admin_appt_m_card admin_appt_m_session_details_full">
              <label className="admin_appt_m_label_alt">
                <Activity size={14} /> Appointment Overview
              </label>
              <div className="admin_appt_m_session_row">
                <div className="admin_appt_m_session_cell">
                  <Calendar size={18} />
                  <div>
                    <small>Schedule Date</small>
                    <p>{selectedAppointment.date}</p>
                  </div>
                </div>
                <div className="admin_appt_m_session_cell">
                  <Clock size={18} />
                  <div>
                    <small>Time Slot</small>
                    <p>{selectedAppointment.time}</p>
                  </div>
                </div>
                <div className="admin_appt_m_session_cell">
                  <Hash size={18} />
                  <div>
                    <small>Visit Type</small>
                    <p className="admin_appt_m_type_text">
                      {selectedAppointment.type}
                    </p>
                  </div>
                </div>
                <div className="admin_appt_m_session_cell">
                  <Thermometer size={18} />
                  <div>
                    <small>Status</small>
                    <p
                      className={`admin_appt_m_status_pill ${selectedAppointment.status?.toLowerCase()}`}
                    >
                      {selectedAppointment.status}
                    </p>
                  </div>
                </div>
              </div>

              {selectedAppointment.adminRequest?.requestType === "Shift" &&
                selectedAppointment.adminRequest?.status === "Approved" && (
                  <div className="admin_appt_m_resched_history_banner">
                    <div className="banner_history_header">
                      <Clock size={16} />
                      <span>Administrative Reassignment Ledger Log Trace</span>
                    </div>

                    <div className="banner_history_body_details">
                      <p>
                        • Rerouted From:{" "}
                        <strong>
                          {selectedAppointment.originalDoctor ||
                            "Previous Specialist"}
                        </strong>
                      </p>
                      <p>
                        • Transferred To:{" "}
                        <strong>Dr. {selectedAppointment.doctorName}</strong>
                      </p>
                      <p>
                        • Clinical Justification:{" "}
                        <em>
                          "
                          {selectedAppointment.adminRequest?.reason ||
                            "Operational necessity requested by medical unit."}
                          "
                        </em>
                      </p>
                    </div>

                    <div className="resched_time_delta_flow">
                      <span className="time_stamp historical">
                        {selectedAppointment.date}
                      </span>
                      <ChevronRight size={14} />
                      <span className="time_stamp operational">
                        {selectedAppointment.time}
                      </span>
                    </div>
                  </div>
                )}

              {selectedAppointment.status === "Completed" && (
                <div className="admin_appt_m_prescription_board">
                  <div className="prescription_board_title_row">
                    <FileText size={16} color="#0284c7" />
                    <h4>Authorized Clinical Rx Builder Specifications</h4>
                  </div>

                  {selectedAppointment.prescribedItems &&
                  selectedAppointment.prescribedItems.length > 0 ? (
                    <div className="admin_appt_m_rx_grid_container">
                      {selectedAppointment.prescribedItems.map((item, idx) => (
                        <div
                          key={item._id || idx}
                          className="admin_appt_m_rx_row_card"
                        >
                          <div className="rx_card_main_info_row">
                            <span
                              className={`rx_type_chip ${item.type?.toLowerCase()}`}
                            >
                              {item.type}
                            </span>
                            <h5>{item.name}</h5>
                            <span className="rx_quantity_metric">
                              Qty: <b>{item.quantity}</b>
                            </span>
                          </div>

                          {item.type === "Medicine" && item.timing && (
                            <div className="rx_card_secondary_clinical_details">
                              <div className="rx_timing_chips_flex_group">
                                {Object.keys(item.timing).map((timeKey) => (
                                  <span
                                    key={timeKey}
                                    className={`rx_timing_tag ${item.timing[timeKey] ? "active" : "inactive"}`}
                                  >
                                    {timeKey.toUpperCase().slice(0, 3)}
                                  </span>
                                ))}
                              </div>
                              <div className="rx_intake_instructions_text">
                                <span>{item.intake}</span>
                                {item.instruction && (
                                  <small>({item.instruction})</small>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="prescription_empty_records_warning">
                      <AlertCircle size={14} />
                      <span>
                        Session finalized with zero therapeutic items
                        prescribed.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="admin_appt_m_card admin_appt_m_history_full">
              <label className="admin_appt_m_label_alt">
                <ClipboardList size={14} /> Previous Encounters
              </label>
              <div
                className={`admin_appt_m_history_list_v3 ${isHistoryExpanded ? "admin_appt_m_inline_scroll_active" : ""}`}
              >
                {activeHistoryRenderList.length > 0 ? (
                  <>
                    <table className="admin_appt_m_modern_table">
                      <thead>
                        <tr>
                          <th>Clinical Date</th>
                          <th>Category</th>
                          <th>Observations</th>
                          <th className="admin_appt_m_text_right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeHistoryRenderList.map((past) => (
                          <tr key={past._id || past.id}>
                            <td className="admin_appt_m_date_col">
                              <b>{past.date}</b>
                              <br />
                              <span>{past.time}</span>
                            </td>
                            <td className="admin_appt_m_doc_name_sub">
                              <b>{past.doctorName || past.doctor}</b>
                              <br />
                              <span className="admin_appt_m_cat_tag">
                                {past.type}
                              </span>
                            </td>
                            <td>
                              <p className="admin_appt_m_history_notes_text">
                                {past.notes || "Completed Consultation"}
                              </p>
                            </td>
                            <td className="admin_appt_m_text_right">
                              <button className="admin_appt_m_btn_file_view">
                                <FileText size={14} /> Report
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {hasMoreRecordsThanPreview && (
                      <button
                        className="admin_appt_m_view_more_trigger"
                        onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                      >
                        <Scroll size={14} />
                        {isHistoryExpanded
                          ? "Collapse View"
                          : `View All Appointments (${consultationHistory.length})`}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="admin_appt_m_empty_clinical">
                    <Activity size={24} />
                    <p>
                      No prior clinical history found for this patient
                      interaction.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {showRequestsOverlay && (
        <div
          className="admin_appt_m_overlay_backdrop"
          onClick={() => setShowRequestsOverlay(false)}
        >
          <div
            className="admin_appt_m_overlay_panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin_appt_m_overlay_header">
              <div className="admin_appt_m_overlay_title_group">
                <AlertCircle size={20} color="#0d9488" />
                <h3>Pending Reschedules</h3>
              </div>
              <button
                className="admin_appt_m_close_panel"
                onClick={() => setShowRequestsOverlay(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="admin_appt_m_req_grid">
              {rescheduleRequests.map((req) => {
                const isRowActionLocked =
                  processedRequestIds.has(req._id) ||
                  req.adminRequest?.status !== "Pending";

                const activeTargetDocName =
                  req.adminRequest?.targetDoctorName ||
                  req.doctorName ||
                  "Cancellation Request";

                const matchedDoctor = docData.find(
                  (d) => d.name === activeTargetDocName,
                );
                const docPhoto = matchedDoctor ? matchedDoctor.photo : null;

                return (
                  <div
                    key={req._id}
                    className={`admin_appt_m_req_card_modern ${req.adminRequest?.status?.toLowerCase() || ""}`}
                  >
                    <div className="req_profile_banner">
                      <div className="req_entity">
                        <img
                          src={
                            docPhoto
                              ? docPhoto.startsWith("http")
                                ? docPhoto
                                : `http://localhost:5000/uploads/${docPhoto}`
                              : `https://ui-avatars.com/api/?name=${encodeURIComponent(activeTargetDocName || "DR")}&background=e2e8f0&color=64748b`
                          }
                          alt="Doctor"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(activeTargetDocName || "DR")}&background=e2e8f0&color=64748b`;
                          }}
                        />
                        <span>{activeTargetDocName}</span>
                      </div>
                      <ArrowRight size={14} color="#64748b" />
                      <div className="req_entity">
                        <img
                          src={
                            req.patientPhoto
                              ? req.patientPhoto.startsWith("http")
                                ? req.patientPhoto
                                : `http://localhost:5000/uploads/${req.patientPhoto}`
                              : `https://ui-avatars.com/api/?name=${encodeURIComponent(req.patientName || "PT")}&background=e2e8f0&color=64748b`
                          }
                          alt="Patient"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(req.patientName || "PT")}&background=e2e8f0&color=64748b`;
                          }}
                        />
                        <span>{req.patientName}</span>
                      </div>
                    </div>

                    <div className="req_card_top">
                      <span className="req_id_tag">#{req.appointmentID}</span>
                      <button
                        className="req_jump_btn"
                        onClick={() => navigateToAppointmentFileView(req._id)}
                      >
                        File <ArrowUpRight size={14} />
                      </button>
                    </div>

                    <div className="req_timeline_grid">
                      <div className="timeline_box">
                        <span>Current Slot</span>
                        <b>
                          {req.date} | {req.time}
                        </b>
                      </div>
                      <div className="timeline_box">
                        <span>Request Type / Target</span>
                        <b>
                          {req.adminRequest?.requestType === "Shift"
                            ? `Shift to: ${req.adminRequest?.targetDoctorName}`
                            : "Cancellation Request"}
                        </b>
                      </div>
                    </div>

                    <div className="req_reason_box">
                      {req.adminRequest?.reason ||
                        "No clinical justification provided."}
                    </div>

                    {!isRowActionLocked ? (
                      <div className="req_action_bar">
                        <button
                          className="btn_accept"
                          onClick={() =>
                            handleRequestAction(
                              req._id,
                              req._id,
                              "Accept",
                              req.date,
                              req.time,
                            )
                          }
                        >
                          <Check size={14} /> Accept
                        </button>
                        <button
                          className="btn_decline"
                          onClick={() =>
                            handleRequestAction(req._id, req._id, "Decline")
                          }
                        >
                          <X size={14} /> Decline
                        </button>
                      </div>
                    ) : (
                      <div className="admin_appt_m_resolved_badge">
                        Status: {req.adminRequest?.status || "Resolved"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="adm_appt_m_overlay">
          <div
            className={`adm_appt_m_container ${bookingStep > 2 ? "adm_appt_m_confirm_mode" : ""}`}
            style={{ maxWidth: "1050px", width: "95%" }}
          >
            <div
              className="adm_appt_m_modal_header"
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <div className="adm_appt_m_progress_group">
                <label
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: "700",
                    color: "#0f172a",
                  }}
                >
                  Administrative Booking • Step {bookingStep} of 3
                </label>
                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  <span
                    style={{
                      height: "4px",
                      width: "40px",
                      borderRadius: "2px",
                      background: bookingStep >= 1 ? "#0284c7" : "#e2e8f0",
                    }}
                  />
                  <span
                    style={{
                      height: "4px",
                      width: "40px",
                      borderRadius: "2px",
                      background: bookingStep >= 2 ? "#0284c7" : "#e2e8f0",
                    }}
                  />
                  <span
                    style={{
                      height: "4px",
                      width: "40px",
                      borderRadius: "2px",
                      background: bookingStep >= 3 ? "#0284c7" : "#e2e8f0",
                    }}
                  />
                </div>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="adm_appt_m_close_btn"
                style={{ top: "18px" }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              className="adm_appt_m_modal_workspace"
              style={{ padding: "0" }}
            >
              {bookingStep === 1 && (
                <div className="adm_appt_m_pane_full">
                  {!newBookingData.patient ? (
                    <>
                      <div className="adm_appt_m_filter_header">
                        <div
                          className="adm_appt_m_search_wrap"
                          style={{ width: "100%", maxWidth: "none" }}
                        >
                          <Search size={16} />
                          <input
                            placeholder="Search active profile registries by patient name..."
                            value={patientSearchQuery}
                            onChange={(e) =>
                              setPatientSearchQuery(e.target.value)
                            }
                          />
                        </div>
                      </div>

                      <div className="adm_appt_m_bento_grid adm_appt_m_scroll_area">
                        {patientProfilesList
                          .filter((p) =>
                            (p.name || "")
                              .toLowerCase()
                              .includes(patientSearchQuery.toLowerCase()),
                          )
                          .map((p) => (
                            <div
                              key={p._id}
                              className="adm_appt_m_bento_card"
                              onClick={() =>
                                setNewBookingData({
                                  ...newBookingData,
                                  patient: p,
                                })
                              }
                            >
                              <div
                                className="adm_appt_m_bento_avatar"
                                style={{ background: "#f0fdf4" }}
                              >
                                <User size={20} color="#16a34a" />
                              </div>
                              <div className="adm_appt_m_bento_info">
                                <strong>{p.name}</strong>
                                <span>{p.email || "No Email Registered"}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </>
                  ) : (
                    <div className="adm_appt_m_selected_row">
                      <div className="adm_appt_m_bento_card adm_appt_m_active_selection">
                        <div
                          className="adm_appt_m_bento_avatar"
                          style={{ background: "#16a34a" }}
                        >
                          <User size={20} color="#fff" />
                        </div>
                        <div className="adm_appt_m_bento_info">
                          <strong>{newBookingData.patient.name}</strong>
                          <span>{newBookingData.patient.email}</span>
                          <small style={{ color: "#64748b" }}>
                            Isolated Patient Target Profile
                          </small>
                        </div>
                      </div>
                      <button
                        className="adm_appt_m_btn_reset"
                        onClick={() =>
                          setNewBookingData({
                            ...newBookingData,
                            patient: null,
                          })
                        }
                      >
                        Change Patient
                      </button>
                    </div>
                  )}

                  <div className="adm_appt_m_footer_nav">
                    <button
                      className="adm_appt_m_proceed_btn"
                      disabled={!newBookingData.patient}
                      onClick={() => setBookingStep(2)}
                    >
                      Select Specialist <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}

              {bookingStep === 2 && (
                <div style={{ display: "flex", width: "100%" }}>
                  <div
                    className={`adm_appt_m_slot_pane ${newBookingData.doctor ? "adm_appt_m_active" : ""}`}
                    style={{ width: "45%", borderRight: "1px solid #e2e8f0" }}
                  >
                    {newBookingData.doctor ? (
                      <div
                        className="adm_appt_m_slot_pane_inner"
                        style={{ padding: "24px" }}
                      >
                        <div className="adm_appt_m_slot_pane_header">
                          <h3>Schedule Assignment</h3>
                          <p style={{ color: "#0284c7", fontWeight: "600" }}>
                            Dr. {newBookingData.doctor.name}
                          </p>
                          <span
                            className="adm_appt_m_location_subtext"
                            style={{
                              fontSize: "0.75rem",
                              color: "#64748b",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Building size={12} /> Sector:{" "}
                            {newBookingData.doctor.department}
                          </span>
                        </div>

                        <div
                          className="adm_appt_m_date_picker_alt"
                          style={{ marginTop: "12px", marginBottom: "16px" }}
                        >
                          <Calendar size={14} />
                          <input
                            type="date"
                            min={new Date().toLocaleDateString("en-CA")}
                            max={maxBookingDate}
                            value={newBookingData.date}
                            onChange={(e) =>
                              setNewBookingData({
                                ...newBookingData,
                                date: e.target.value,
                                time: "",
                              })
                            }
                          />
                        </div>

                        <div
                          className="adm_appt_m_slot_list"
                          style={{
                            gridTemplateColumns:
                              "repeat(auto-fill, minmax(90px, 1fr))",
                            maxHeight: "200px",
                            overflowY: "auto",
                          }}
                        >
                          {calculatedSlotsGrid.length > 0 ? (
                            calculatedSlotsGrid.map((s, idx) => {
                              let buttonClass = "";
                              let isSelectable = true;

                              if (s.isOnLeave) {
                                buttonClass = "adm_appt_m_slot_leave";
                                isSelectable = false;
                              } else if (s.isBooked || s.isPast) {
                                buttonClass = "adm_appt_m_slot_booked";
                                isSelectable = false;
                              } else if (newBookingData.time === s.time) {
                                buttonClass = "adm_appt_m_slot_active";
                              }

                              return (
                                <button
                                  key={`admin-form-slot-${idx}`}
                                  disabled={!isSelectable}
                                  className={buttonClass}
                                  onClick={() =>
                                    setNewBookingData({
                                      ...newBookingData,
                                      time: s.time,
                                    })
                                  }
                                >
                                  {s.time}
                                </button>
                              );
                            })
                          ) : (
                            <div className="adm_appt_m_no_slots" colSpan="100%">
                              No active shifts configured on this calendar date.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          height: "100%",
                          color: "#94a3b8",
                          padding: "20px",
                          textAlign: "center",
                        }}
                      >
                        <Clock size={36} style={{ marginBottom: "8px" }} />
                        <p style={{ fontSize: "0.85rem" }}>
                          Select a medical consultant from the registry to sync
                          shift timeline parameters.
                        </p>
                      </div>
                    )}
                  </div>

                  <div
                    className="adm_appt_m_discovery_pane"
                    style={{ width: "55%", padding: "24px" }}
                  >
                    {!newBookingData.doctor ? (
                      <>
                        <div className="adm_appt_m_filter_header">
                          <div
                            className="adm_appt_m_search_wrap"
                            style={{ flex: "1" }}
                          >
                            <Search size={16} />
                            <input
                              placeholder="Filter specialists..."
                              value={doctorSearchQuery}
                              onChange={(e) =>
                                setDoctorSearchQuery(e.target.value)
                              }
                            />
                          </div>
                        </div>

                        <div className="adm_appt_m_bento_grid adm_appt_m_scroll_area">
                          {docData
                            .filter((d) =>
                              d.name
                                .toLowerCase()
                                .includes(doctorSearchQuery.toLowerCase()),
                            )
                            .map((d) => (
                              <div
                                key={d._id}
                                className="adm_appt_m_bento_card"
                                onClick={() =>
                                  setNewBookingData({
                                    ...newBookingData,
                                    doctor: d,
                                    time: "",
                                  })
                                }
                              >
                                <div className="adm_appt_m_bento_avatar">
                                  {d.photo ? (
                                    <img
                                      src={`http://localhost:5000/uploads/${d.photo}`}
                                      alt={d.name}
                                    />
                                  ) : (
                                    <span>{d.name.charAt(0)}</span>
                                  )}
                                </div>
                                <div className="adm_appt_m_bento_info">
                                  <strong>{d.name}</strong>
                                  <span>{d.department}</span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </>
                    ) : (
                      <div className="adm_appt_m_selected_row adm_appt_m_text_stack">
                        <div
                          className="adm_appt_m_bento_card adm_appt_m_active_selection"
                          style={{ width: "100%" }}
                        >
                          <div className="adm_appt_m_bento_avatar">
                            {newBookingData.doctor.photo ? (
                              <img
                                src={`http://localhost:5000/uploads/${newBookingData.doctor.photo}`}
                                alt="Selected Doctor"
                              />
                            ) : (
                              <span>
                                {newBookingData.doctor.name.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div className="adm_appt_m_bento_info">
                            <strong>Dr. {newBookingData.doctor.name}</strong>
                            <span>{newBookingData.doctor.department}</span>
                            <small style={{ color: "#0284c7" }}>
                              Active Clinical Consultant Assignment
                            </small>
                          </div>
                        </div>
                        <button
                          className="adm_appt_m_btn_reset"
                          onClick={() =>
                            setNewBookingData({
                              ...newBookingData,
                              doctor: null,
                              time: "",
                            })
                          }
                        >
                          Change Doctor
                        </button>
                      </div>
                    )}

                    <div
                      className="adm_appt_m_footer_nav"
                      style={{ marginTop: "auto", paddingTop: "24px" }}
                    >
                      <button
                        className="adm_appt_m_back_btn"
                        style={{ border: "none" }}
                        onClick={() => setBookingStep(1)}
                      >
                        <ArrowLeft size={16} /> Patient Selection
                      </button>
                      <button
                        className="adm_appt_m_proceed_btn"
                        disabled={
                          !newBookingData.doctor || !newBookingData.time
                        }
                        onClick={() => setBookingStep(3)}
                      >
                        Next <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {bookingStep === 3 && (
                <div
                  className="adm_appt_m_confirmation_view"
                  style={{ width: "100%", padding: "24px" }}
                >
                  <div
                    className="adm_appt_m_confirm_card"
                    style={{
                      maxWidth: "650px",
                      margin: "0 auto",
                      boxShadow: "none",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <h3>Review Appointment Summary</h3>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "16px",
                        marginTop: "16px",
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          padding: "12px",
                          background: "#f8fafc",
                          borderRadius: "6px",
                        }}
                      >
                        <small style={{ color: "#64748b", display: "block" }}>
                          Isolated Patient Profile
                        </small>
                        <strong style={{ color: "#0f172a" }}>
                          {newBookingData.patient?.name}
                        </strong>
                        <span
                          style={{
                            display: "block",
                            fontSize: "0.8rem",
                            color: "#64748b",
                          }}
                        >
                          {newBookingData.patient?.email}
                        </span>
                      </div>
                      <div
                        style={{
                          padding: "12px",
                          background: "#f8fafc",
                          borderRadius: "6px",
                        }}
                      >
                        <small style={{ color: "#64748b", display: "block" }}>
                          Consultant Assignment
                        </small>
                        <strong style={{ color: "#0f172a" }}>
                          Dr. {newBookingData.doctor?.name}
                        </strong>
                        <span
                          style={{
                            display: "block",
                            fontSize: "0.8rem",
                            color: "#0284c7",
                          }}
                        >
                          Sector: {newBookingData.doctor?.department}
                        </span>
                      </div>
                    </div>

                    <div
                      className="adm_appt_m_summary_container"
                      style={{ marginTop: "20px", justifyContent: "center" }}
                    >
                      <div className="adm_appt_m_summary_pill">
                        <Calendar size={14} /> {newBookingData.date}
                      </div>
                      <div className="adm_appt_m_summary_pill">
                        <Clock size={14} /> {newBookingData.time}
                      </div>
                      <div
                        className="adm_appt_m_summary_pill"
                        style={{ background: "#f0fdf4", color: "#16a34a" }}
                      >
                        Fee: ₹{newBookingData.doctor?.fee || 0}
                      </div>
                    </div>

                    <div
                      className="adm_appt_m_notes_field"
                      style={{ marginTop: "16px", textAlign: "left" }}
                    >
                      <label>Internal Log Notes</label>
                      <textarea
                        value={newBookingData.notes}
                        onChange={(e) =>
                          setNewBookingData({
                            ...newBookingData,
                            notes: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: "24px",
                        paddingTop: "16px",
                        borderTop: "1px solid #f1f5f9",
                      }}
                    >
                      <button
                        className="adm_appt_m_back_btn"
                        style={{ border: "none" }}
                        onClick={() => setBookingStep(2)}
                      >
                        <ArrowLeft size={16} /> Edit Metrics
                      </button>
                      <button
                        className="adm_appt_m_final_btn"
                        style={{ margin: "0" }}
                        onClick={handleFormSubmit}
                      >
                        <Check size={18} /> Confirm Booking
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
