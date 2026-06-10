import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import {
  FiClock,
  FiCalendar,
  FiZap,
  FiArrowLeft,
  FiCheckCircle,
  FiActivity,
  FiUser,
  FiLoader,
  FiSearch,
  FiLock,
  FiXCircle,
  FiSettings,
  FiPlus,
  FiTrash2,
  FiAlertCircle,
  FiLayers,
  FiChevronRight,
  FiChevronLeft,
  FiFilter,
  FiX,
} from "react-icons/fi";
import { Pill, FlaskConical, Zap, Loader2 } from "lucide-react";
import "./Doctor_Appointment_Management.css";
import { useLocation } from "react-router-dom";

function parseTimeSlot(timeSlot) {
  if (!timeSlot) return "00:00";
  const [time, modifier] = timeSlot.split(" ");
  let [hours, minutes] = time.split(":");
  hours = parseInt(hours, 10);
  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, "0")}:${minutes}`;
}

export default function Doctor_Appointment_Management() {
  const location = useLocation();
  const doctorUser = JSON.parse(localStorage.getItem("userData"));
  const loggedInDoctor = doctorUser?.name || "Dr. Guest";

  const [filterMode, setFilterMode] = useState("ongoing");
  const [isDetailView, setIsDetailView] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [listData, setListData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [subFilterType, setSubFilterType] = useState("All");
  const [subFilterUrgency, setSubFilterUrgency] = useState("All");

  const [patientProfileData, setPatientProfileData] = useState(null);
  const [patientHistory, setPatientHistory] = useState([]);
  const [fetchingPatientMeta, setFetchingPatientMeta] = useState(false);

  const [prescribedItems, setPrescribedItems] = useState([]);
  const [orderQuery, setOrderQuery] = useState("");
  const [inventory, setInventory] = useState({ medicines: [], tests: [] });

  const [replacementDoctors, setReplacementDoctors] = useState([]);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 6;

  /* --- DYNAMIC SLOT TRACKING MATRICES STATE --- */
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");
  const [bookedSlots, setBookedSlots] = useState([]);
  const [dynamicDaySlotsMatrix, setDynamicDaySlotsMatrix] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [activeAdminSubPanel, setActiveAdminSubPanel] = useState(null);
  const [isTransferSubmitted, setIsTransferSubmitted] = useState(false);

  const todayDate = new Date().toISOString().split("T")[0];

  const isTimeWindowOpenForRx = useMemo(() => {
    if (!selectedAppt || selectedAppt.status !== "Upcoming") return false;
    if (selectedAppt.date !== todayDate) return false;

    try {
      const now = new Date();
      const slotTimeStr = parseTimeSlot(selectedAppt.time);
      const [slotHours, slotMinutes] = slotTimeStr.split(":").map(Number);

      const slotTimeToday = new Date();
      slotTimeToday.setHours(slotHours, slotMinutes, 0, 0);

      const msDifference = slotTimeToday.getTime() - now.getTime();
      return msDifference <= 15 * 60 * 1000;
    } catch (e) {
      return false;
    }
  }, [selectedAppt, todayDate]);

  const isCushionValidForAdminChange = useMemo(() => {
    if (!selectedAppt) return false;
    try {
      const now = new Date();
      const slotTimeStr = parseTimeSlot(selectedAppt.time);
      const [hours, minutes] = slotTimeStr.split(":").map(Number);
      const appointmentDateTime = new Date(
        `${selectedAppt.date}T${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`,
      );

      const diffInHours = (appointmentDateTime - now) / (1000 * 60 * 60);
      return diffInHours >= 24;
    } catch (e) {
      return false;
    }
  }, [selectedAppt]);

  const suggestedResources = useMemo(() => {
    if (orderQuery.length < 2) return [];
    const pool = [
      ...inventory.medicines.map((m) => ({ ...m, type: "Medicine" })),
      ...inventory.tests.map((t) => ({ ...t, type: "Test" })),
    ];
    return pool
      .filter((r) => r.name.toLowerCase().includes(orderQuery.toLowerCase()))
      .slice(0, 5);
  }, [orderQuery, inventory]);

  useEffect(() => {
    if (!loading && listData.length > 0 && location.state?.autoSelectId) {
      const targetSession = listData.find(
        (appt) => appt._id === location.state.autoSelectId,
      );
      if (targetSession) {
        handleOpenAppointmentWorkspace(targetSession);
        window.history.replaceState({}, document.title);
      }
    }
  }, [loading, listData, location.state]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const [apptRes, medRes, testRes] = await Promise.all([
        axios.get(
          `http://localhost:5000/api/appointments/doctor/${encodeURIComponent(loggedInDoctor)}`,
          { headers },
        ),
        axios
          .get("http://localhost:5000/api/medicines/all", { headers })
          .catch(() => ({ data: [] })),
        axios
          .get("http://localhost:5000/api/tests/all", { headers })
          .catch(() => ({ data: [] })),
      ]);
      setListData(apptRes.data || []);
      setInventory({ medicines: medRes.data || [], tests: testRes.data || [] });
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [loggedInDoctor]);

  /* --- RUNTIME HOURLY AVAILABILITY SYNC FOR FOLLOW-UP SCHEDULER --- */
  useEffect(() => {
    if (selectedAppt && followUpDate) {
      setLoadingSlots(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Resolves target hex identification parameters
      const targetDoctorId =
        selectedAppt.docId ||
        selectedAppt.doctorId ||
        doctorUser?._id ||
        doctorUser?.id;

      if (!targetDoctorId) {
        console.warn("Could not determine dynamic doctor context ID");
        setLoadingSlots(false);
        return;
      }

      axios
        .get(
          `http://localhost:5000/api/doctors/availability/${targetDoctorId}/${followUpDate}`,
          { headers },
        )
        .then((res) => {
          setBookedSlots(res.data.blockedSlots || []);
          setDynamicDaySlotsMatrix(res.data.slotsConfigMatrix || []);
        })
        .catch((err) => {
          console.error("Follow-up Shift Matrix Grid Load Sync Failure:", err);
          setDynamicDaySlotsMatrix([]);
        })
        .finally(() => {
          setLoadingSlots(false);
        });
    }
  }, [selectedAppt, followUpDate]);

  /* --- COMPILING DYNAMIC SHIFT DISCOVERY MAP OVERRIDES --- */
  const normalizeTimeStr = (str) => {
    if (!str) return "";
    return String(str).replace(/^0/, "").replace(/\s+/g, " ").trim();
  };

  const calculatedSlotsGrid = useMemo(() => {
    if (!followUpDate || dynamicDaySlotsMatrix.length === 0) return [];

    const now = new Date();
    const isToday = followUpDate === now.toLocaleDateString("en-CA");
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

      const isAlreadyBooked = bookedSlots.some((blocked) => {
        return normalizeTimeStr(blocked) === cleanSlotStr;
      });

      return {
        time: slotTimeStr,
        isBooked: isAlreadyBooked,
        isOnLeave: isFullDayLeaveApproved,
        isPast: isPast,
      };
    });
  }, [followUpDate, bookedSlots, dynamicDaySlotsMatrix]);

  const handleOpenAppointmentWorkspace = async (appt) => {
    setSelectedAppt(appt);
    setIsDetailView(true);
    setFetchingPatientMeta(true);
    setPatientProfileData(null);
    setPatientHistory([]);
    setFollowUpDate("");
    setFollowUpTime("");
    setDynamicDaySlotsMatrix([]);
    setActiveAdminSubPanel(null);

    if (
      appt.adminRequest &&
      appt.adminRequest.requestType === "Shift" &&
      appt.adminRequest.status === "Pending"
    ) {
      setIsTransferSubmitted(true);
    } else {
      setIsTransferSubmitted(false);
    }

    if (appt.status === "Upcoming") {
      fetchAvailableReplacements(appt);
    }

    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      if (appt.patientId) {
        const profileRes = await axios.get(
          `http://localhost:5000/api/patients/profile/${appt.patientId}`,
          { headers },
        );
        setPatientProfileData(profileRes.data);

        const historyRes = await axios.get(
          `http://localhost:5000/api/appointments/list/${appt.patientId}`,
          { headers },
        );
        const filteredHistory = (historyRes.data || [])
          .filter((h) => h._id !== appt._id)
          .slice(0, 3);
        setPatientHistory(filteredHistory);
      }
    } catch (err) {
      console.error("Dossier synchronization failure:", err);
    } finally {
      setFetchingPatientMeta(false);
    }
  };

  useEffect(() => {
    if (selectedAppt && selectedAppt.status === "Completed") {
      setPrescribedItems(selectedAppt.prescribedItems || []);
    } else {
      setPrescribedItems([]);
    }
  }, [selectedAppt]);

  const fetchAvailableReplacements = async (appt) => {
    try {
      const token = localStorage.getItem("token");
      const departmentKey = appt.department || appt.departmentName || "";
      const headers = { Authorization: `Bearer ${token}` };

      if (!departmentKey) return;
      let replacementList = [];

      try {
        const res = await axios.get(
          `http://localhost:5000/api/doctors/replacements?date=${appt.date}&time=${appt.time}&department=${encodeURIComponent(departmentKey)}`,
          { headers },
        );
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          replacementList = res.data;
        }
      } catch (e) {
        console.warn("Query fallback activated.");
      }

      if (replacementList.length === 0) {
        try {
          const generalDocRes = await axios.get(
            `http://localhost:5000/api/doctors/list`,
            { headers },
          );
          replacementList = (generalDocRes.data || []).filter(
            (doc) =>
              (doc.department || "").toLowerCase().trim() ===
                departmentKey.toLowerCase().trim() &&
              doc.name !== loggedInDoctor &&
              doc.availability !== "On Leave",
          );
        } catch (masterErr) {
          console.error("Master collection lookups blocked.");
        }
      }

      setReplacementDoctors(replacementList);
    } catch (err) {
      console.error("Critical breakdown inside replacement pipeline:", err);
      setReplacementDoctors([]);
    }
  };

  const addResourceToRx = (resource) => {
    if (!isTimeWindowOpenForRx) return;
    const newItem = {
      itemId: resource._id,
      name: resource.name,
      type: resource.type,
      price: resource.price,
      quantity: 1,
      timing: { morning: false, afternoon: false, night: false },
      intake: "After Food",
      instruction: "With Water",
    };
    setPrescribedItems([...prescribedItems, newItem]);
    setOrderQuery("");
  };

  const updateRxItem = (index, field, value) => {
    if (!isTimeWindowOpenForRx) return;
    const updated = prescribedItems.map((item, idx) => {
      if (idx !== index) return item;
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        return { ...item, [parent]: { ...item[parent], [child]: value } };
      }
      return { ...item, [field]: value };
    });
    setPrescribedItems(updated);
  };

  const removeRxItem = (index) => {
    if (!isTimeWindowOpenForRx) return;
    setPrescribedItems(prescribedItems.filter((_, i) => i !== index));
  };

  const handleAdminRequest = async (type, targetDoc = null) => {
    if (isTransferSubmitted) return;
    if (!isCushionValidForAdminChange) {
      alert(
        "Action Denied: Adjustments can only be initiated at least 24 hours prior to launch.",
      );
      return;
    }

    const reason = prompt(
      `Provide administrative justification for requesting [${type}]:`,
    );
    if (!reason || !reason.trim()) {
      alert(
        "A text explanation is mandatory to transmit this structural shift request.",
      );
      return;
    }

    setIsRequesting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:5000/api/appointments/admin-request/${selectedAppt._id}`,
        { requestType: type, reason, targetDoctorName: targetDoc },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      alert(
        "Shift request has been dispatched to hospital management vectors.",
      );
      setIsTransferSubmitted(true);
      setActiveAdminSubPanel(null);

      setListData((prevList) =>
        prevList.map((item) =>
          item._id === selectedAppt._id
            ? {
                ...item,
                adminRequest: {
                  requestType: type,
                  status: "Pending",
                  reason: reason,
                  targetDoctorName: targetDoc,
                },
              }
            : item,
        ),
      );
    } catch (err) {
      alert("Error processing administrative dispatch.");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleScheduleFollowUp = async () => {
    if (!followUpDate)
      return alert("Please specify a valid return date index trace.");
    if (!followUpTime)
      return alert("Please choose an available operational time segment.");

    setIsSchedulingFollowUp(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const followUpPayload = {
        patientId: selectedAppt.patientId,
        patientName: selectedAppt.patientName,
        doctorName: selectedAppt.doctorName,
        department: selectedAppt.department,
        date: followUpDate,
        time: followUpTime,
        type: "Follow-up",
        notes: `Automated recall session authorized by Dr. ${loggedInDoctor}.`,
      };

      await axios.post(
        "http://localhost:5000/api/appointments/book",
        followUpPayload,
        { headers },
      );
      alert(`Follow-up consultation logged successfully for ${followUpDate}!`);
      setFollowUpDate("");
      setFollowUpTime("");
      setActiveAdminSubPanel(null);
      fetchData();
    } catch (err) {
      alert("Failed to allocate return index slot.");
    } finally {
      setIsSchedulingFollowUp(false);
    }
  };

  const handleEndAppointment = async () => {
    if (prescribedItems.length === 0)
      return alert(
        "Please specify clinical remedies before ending the session.",
      );
    setIsFinalizing(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:5000/api/appointments/complete/${selectedAppt._id}`,
        { prescribedItems: prescribedItems },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      alert("Session Finalized. Electronic prescription dispatch completed.");
      setIsDetailView(false);
      fetchData();
    } catch (err) {
      alert("Finalization sequence failed.");
    } finally {
      setIsFinalizing(false);
    }
  };

  const filteredList = useMemo(() => {
    return listData
      .filter((item) => {
        const matchesSearch =
          (item.patientName || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (item.appointmentID || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;
        if (dateFilter && item.date !== dateFilter) return false;

        const isApprovedShiftReassignment =
          item.adminRequest?.requestType === "Shift" &&
          item.adminRequest?.status === "Approved";
        const isOthersCategory =
          item.status === "Cancelled" ||
          item.status === "Transferred" ||
          isApprovedShiftReassignment;

        if (isOthersCategory) return false;

        if (filterMode === "previous") {
          if (item.status !== "Completed") return false;
          if (subFilterType !== "All") return item.type === subFilterType;
          return true;
        }

        if (filterMode === "ongoing") {
          const isOngoingBase =
            item.date === todayDate && item.status === "Upcoming";
          if (!isOngoingBase) return false;

          if (subFilterUrgency === "Imminent") {
            try {
              const now = new Date();
              const slotTimeStr = parseTimeSlot(item.time);
              const [h, m] = slotTimeStr.split(":").map(Number);
              const targetTime = new Date();
              targetTime.setHours(h, m, 0, 0);
              return targetTime.getTime() - now.getTime() <= 30 * 60 * 1000;
            } catch (e) {
              return true;
            }
          }
          if (subFilterUrgency === "Scheduled") {
            try {
              const now = new Date();
              const slotTimeStr = parseTimeSlot(item.time);
              const [h, m] = slotTimeStr.split(":").map(Number);
              const targetTime = new Date();
              targetTime.setHours(h, m, 0, 0);
              return targetTime.getTime() - now.getTime() > 30 * 60 * 1000;
            } catch (e) {
              return true;
            }
          }
          return true;
        }

        if (filterMode === "upcoming") {
          if (item.date <= todayDate || item.status !== "Upcoming")
            return false;
          if (subFilterType !== "All") return item.type === subFilterType;
          return true;
        }
        return false;
      })
      .sort((a, b) => {
        if (filterMode === "previous") {
          return new Date(b.date) - new Date(a.date);
        }
        const parseToMinutes = (timeStr) => {
          if (!timeStr) return 0;
          const [time, modifier] = timeStr.split(" ");
          let [hours, minutes] = time.split(":").map(Number);
          if (hours === 12) hours = 0;
          if (modifier === "PM") hours += 12;
          return hours * 60 + minutes;
        };

        if (a.date !== b.date) return new Date(a.date) - new Date(b.date);
        return parseToMinutes(a.time) - parseToMinutes(b.time);
      });
  }, [
    listData,
    filterMode,
    todayDate,
    searchQuery,
    dateFilter,
    subFilterType,
    subFilterUrgency,
  ]);

  const totalPages = Math.ceil(filteredList.length / rowsPerPage);
  const currentRows = filteredList.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  const [isSchedulingFollowUp, setIsSchedulingFollowUp] = useState(false);

  if (loading)
    return (
      <div className="doc_apt_m_loading_screen">
        <FiLoader className="doc_apt_m_spin" /> Syncing clinical records...
      </div>
    );

  return (
    <div className="doc_apt_m_root_view">
      {!isDetailView ? (
        <div className="doc_apt_m_main_list_view">
          <header className="doc_apt_m_header_panel">
            <div className="doc_apt_m_branding_node">
              <h1 className="doc_apt_m_title_elite">
                Clinical{" "}
                <span className="doc_avai_m_highlight">Operations</span>
              </h1>
              <p>
                Specialist Registry Panel: <b>{loggedInDoctor}</b>
              </p>
            </div>
            <div className="doc_apt_m_segmented_control">
              {["previous", "ongoing", "upcoming"].map((m) => (
                <button
                  key={m}
                  className={filterMode === m ? "doc_apt_m_tab_active" : ""}
                  onClick={() => {
                    setFilterMode(m);
                    setCurrentPage(1);
                    setSubFilterType("All");
                    setSubFilterUrgency("All");
                  }}
                >
                  {m === "previous"
                    ? "History"
                    : m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
            <button
              className="doc_apt_m_dash_btn_primary"
              onClick={fetchData}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="spin" size={16} />
                  <span>Synchronizing...</span>
                </>
              ) : (
                <>
                  <Zap size={16} />
                  <span>Sync Data</span>
                </>
              )}
            </button>
          </header>

          <div className="doc_apt_m_filter_strip">
            <div className="doc_apt_m_search_cluster">
              <div className="doc_apt_m_input_icon_field">
                <FiSearch />
                <input
                  type="text"
                  placeholder="Search patient name or REF..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <div className="doc_apt_m_input_icon_field">
                <FiCalendar />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              {(searchQuery || dateFilter) && (
                <button
                  className="doc_apt_m_reset_filter_btn"
                  onClick={() => {
                    setSearchQuery("");
                    setDateFilter("");
                    setCurrentPage(1);
                  }}
                >
                  <FiX /> Reset
                </button>
              )}
            </div>

            <div className="doc_apt_m_dropdown_cluster">
              <div className="doc_apt_m_select_icon_field">
                <FiFilter />
                {filterMode === "previous" || filterMode === "upcoming" ? (
                  <select
                    value={subFilterType}
                    onChange={(e) => {
                      setSubFilterType(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="All">All Visit Classifications</option>
                    <option value="Consultation">Standard Consultations</option>
                    <option value="Follow-up">Recall Follow-ups</option>
                  </select>
                ) : (
                  <select
                    value={subFilterUrgency}
                    onChange={(e) => {
                      setSubFilterUrgency(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="All">All Timelines</option>
                    <option value="Imminent">Imminent (&lt; 30 Mins)</option>
                    <option value="Scheduled">Deferred Slots</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          <div className="doc_apt_m_grid_feed_container">
            {currentRows.length > 0 ? (
              <div className="doc_apt_m_card_bento_grid">
                {currentRows.map((a) => {
                  const isPending = a.adminRequest?.status === "Pending";
                  let cardModifierStyle = "";
                  if (isPending)
                    cardModifierStyle =
                      a.adminRequest.requestType === "Shift"
                        ? "doc_apt_m_card_pending_shift"
                        : "doc_apt_m_card_pending_cancel";

                  const avatarSource = a.patientPhoto?.startsWith("http")
                    ? a.patientPhoto
                    : a.patientPhoto
                      ? `http://localhost:5000/uploads/${a.patientPhoto}`
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(a.patientName || "P")}&background=e2e8f0&color=64748b&bold=true`;

                  return (
                    <div
                      key={a._id}
                      className={`doc_apt_m_session_card_elite ${cardModifierStyle}`}
                    >
                      <div className="doc_apt_m_card_upper_row">
                        <div className="doc_apt_m_card_avatar_wrap">
                          <img
                            src={avatarSource}
                            alt={a.patientName}
                            className="doc_apt_m_card_patient_img"
                            onError={(e) => {
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(a.patientName || "P")}&background=e2e8f0&color=64748b&bold=true`;
                            }}
                          />
                        </div>
                        <div className="doc_apt_m_profile_title_stack">
                          <h3>{a.patientName}</h3>
                          <span>REF ID: {a.appointmentID || "N/A"}</span>
                          <span className="doc_apt_m_type_badge">
                            ✚ {a.type}
                          </span>
                          {isPending && (
                            <span className="doc_apt_m_alert_pill_pending">
                              <FiAlertCircle /> Pending Approval
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="doc_apt_m_card_metrics_row_highlighted">
                        <div className="doc_apt_m_metric_badge_time">
                          <FiClock /> <span>{a.time}</span>
                        </div>
                        <div className="doc_apt_m_metric_badge_date">
                          <FiCalendar /> <span>{a.date}</span>
                        </div>
                      </div>

                      <button
                        className="doc_apt_m_btn_open_workspace"
                        onClick={() => handleOpenAppointmentWorkspace(a)}
                      >
                        Open Patient Workspace
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="doc_apt_m_empty_registry_notice">
                <FiActivity size={36} />
                <p>
                  No clinical operational consultation files match your active
                  filter arrays.
                </p>
              </div>
            )}

            {totalPages > 1 && (
              <div className="doc_apt_m_pagination_control_bar">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                >
                  <FiChevronLeft />
                </button>
                <span>
                  Page <b>{currentPage}</b> of {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                >
                  <FiChevronRight />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="doc_apt_m_workspace_detail_view">
          <div className="doc_apt_m_detail_navigation_header">
            <button
              className="doc_apt_m_btn_back_to_list"
              onClick={() => setIsDetailView(false)}
            >
              <FiArrowLeft /> Back to Registry
            </button>
            <div
              className={`doc_apt_m_dashboard_status_pill doc_apt_m_status_color_${selectedAppt.status.toLowerCase()}`}
            >
              <FiLayers /> {selectedAppt.status} Workspace Dashboard
            </div>
          </div>

          <div className="doc_apt_m_workspace_bento_layout">
            <div className="doc_apt_m_card doc_apt_m_full_width_dossier_hero">
              <div className="doc_apt_m_demographics_left_panel">
                <div className="doc_apt_m_patient_headline_group">
                  <h2>{selectedAppt.patientName}</h2>
                  <span className="doc_apt_m_id_pill">
                    REF ID: {selectedAppt.appointmentID} •{" "}
                    {patientProfileData?.age || "N/A"} Yrs
                  </span>
                </div>

                <div className="doc_apt_m_vitals_horizontal_grid">
                  <div className="doc_apt_m_strip_metric_box">
                    <span>
                      Height:{" "}
                      <b>
                        {patientProfileData?.height
                          ? `${patientProfileData.height} cm`
                          : "N/A"}
                      </b>
                    </span>
                  </div>
                  <div className="doc_apt_m_strip_metric_box">
                    <span>
                      Weight:{" "}
                      <b>
                        {patientProfileData?.weight
                          ? `${patientProfileData.weight} kg`
                          : "N/A"}
                      </b>
                    </span>
                  </div>
                  <div className="doc_apt_m_strip_metric_box">
                    <span>
                      Blood Group:{" "}
                      <b>{patientProfileData?.bloodGroup || "N/A"}</b>
                    </span>
                  </div>
                </div>

                {selectedAppt.notes && (
                  <div className="doc_apt_m_dossier_symptoms_callout_box">
                    <h5>Presenting Symptoms / Intake Notes:</h5>
                    <p>"{selectedAppt.notes}"</p>
                  </div>
                )}
              </div>

              <div className="doc_apt_m_photo_right_panel">
                <img
                  src={
                    patientProfileData?.photo?.startsWith("http")
                      ? patientProfileData.photo
                      : patientProfileData?.photo
                        ? `http://localhost:5000/uploads/${patientProfileData.photo}`
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedAppt.patientName || "P")}&background=e2e8f0&color=64748b&bold=true`
                  }
                  className="doc_apt_m_full_height_dossier_image"
                  alt="Patient Snapshot"
                />
              </div>
            </div>

            <div className="doc_apt_m_split_treatment_history_row">
              <div className="doc_apt_m_card doc_apt_m_treatment_pad_card">
                {selectedAppt.status === "Upcoming" &&
                  selectedAppt.date === todayDate &&
                  !(
                    selectedAppt.adminRequest?.requestType === "Shift" &&
                    selectedAppt.adminRequest?.status === "Approved"
                  ) && (
                    <>
                      <label className="doc_apt_m_pad_section_title">
                        <FiActivity /> Prescription 
                      </label>
                      {!isTimeWindowOpenForRx ? (
                        <div className="doc_apt_m_locked_hold_splash">
                          <FiLock size={40} />
                          <h4>Prescription Pad Suspended</h4>
                          <p>
                            This workspace activates exactly 15 minutes prior to
                            the booked time parameters (
                            <b>{selectedAppt.time}</b>).
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="doc_apt_m_inventory_search_box">
                            <div className="doc_apt_m_search_input_wrapper">
                              <FiSearch />
                              <input
                                placeholder="Search pharmacy products or laboratory metrics database..."
                                value={orderQuery}
                                onChange={(e) => setOrderQuery(e.target.value)}
                              />
                            </div>
                            {suggestedResources.length > 0 && (
                              <div className="doc_apt_m_inventory_dropdown_list">
                                {suggestedResources.map((res) => (
                                  <div
                                    key={res._id}
                                    className="doc_apt_m_inventory_suggestion_row"
                                    onClick={() => addResourceToRx(res)}
                                  >
                                    {res.type === "Medicine" ? (
                                      <Pill size={14} />
                                    ) : (
                                      <FlaskConical size={14} />
                                    )}
                                    <span>{res.name}</span>
                                    <FiPlus />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="doc_apt_m_staged_rx_rows_stack">
                            {prescribedItems.map((item, idx) => (
                              <div
                                key={idx}
                                className="doc_apt_m_staged_rx_item_premium_card"
                              >
                                <div className="doc_apt_m_staged_rx_top_identity_flex">
                                  <div className="doc_apt_m_staged_rx_item_title">
                                    <strong>{item.name}</strong>
                                    <small>{item.type}</small>
                                  </div>
                                  <div className="doc_apt_m_staged_rx_qty_stepper">
                                    <button
                                      onClick={() =>
                                        updateRxItem(
                                          idx,
                                          "quantity",
                                          Math.max(1, item.quantity - 1),
                                        )
                                      }
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      value={item.quantity}
                                      readOnly
                                    />
                                    <button
                                      onClick={() =>
                                        updateRxItem(
                                          idx,
                                          "quantity",
                                          item.quantity + 1,
                                        )
                                      }
                                    >
                                      +
                                    </button>
                                  </div>
                                  <button
                                    className="doc_apt_m_staged_rx_remove_btn"
                                    onClick={() => removeRxItem(idx)}
                                  >
                                    <FiTrash2 />
                                  </button>
                                </div>

                                {item.type === "Medicine" && (
                                  <div className="doc_apt_m_staged_rx_dosage_config_grid">
                                    <div className="doc_apt_m_dosage_timing_chips_row">
                                      {["morning", "afternoon", "night"].map(
                                        (time) => (
                                          <label
                                            key={time}
                                            className={`doc_apt_m_dosage_timing_chip ${item.timing[time] ? "doc_apt_m_chip_active" : ""}`}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={item.timing[time]}
                                              onChange={(e) =>
                                                updateRxItem(
                                                  idx,
                                                  `timing.${time}`,
                                                  e.target.checked,
                                                )
                                              }
                                            />
                                            {time.toUpperCase().slice(0, 3)}
                                          </label>
                                        ),
                                      )}
                                    </div>
                                    <div className="doc_apt_m_dosage_instructions_selects_row">
                                      <select
                                        value={item.intake}
                                        onChange={(e) =>
                                          updateRxItem(
                                            idx,
                                            "intake",
                                            e.target.value,
                                          )
                                        }
                                      >
                                        <option value="Before Food">
                                          Before Food
                                        </option>
                                        <option value="After Food">
                                          After Food
                                        </option>
                                        <option value="Empty Stomach">
                                          Empty Stomach
                                        </option>
                                      </select>
                                      <select
                                        value={item.instruction}
                                        onChange={(e) =>
                                          updateRxItem(
                                            idx,
                                            "instruction",
                                            e.target.value,
                                          )
                                        }
                                      >
                                        <option value="With Water">
                                          With Water
                                        </option>
                                        <option value="With Milk">
                                          With Milk
                                        </option>
                                        <option value="Chewable">
                                          Chewable
                                        </option>
                                      </select>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}

                {selectedAppt.status === "Upcoming" &&
                  selectedAppt.date > todayDate && (
                    <div className="doc_apt_m_locked_hold_splash doc_apt_m_future_hold_splash">
                      <FiCalendar size={44} />
                      <h4>Advanced Session Queue Record</h4>
                      <p>
                        This operational panel trace is mapped for a future
                        calendar date (<b>{selectedAppt.date}</b>).
                      </p>
                    </div>
                  )}

                {selectedAppt.status === "Completed" && (
                  <div className="doc_apt_m_finalized_static_board_layer">
                    <label className="doc_apt_m_static_rx_board_headline">
                      <FiCheckCircle /> Dispatched Treatment Specifications
                    </label>
                    <div className="doc_apt_m_static_rx_cards_grid">
                      {prescribedItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="doc_apt_m_static_rx_item_row_card"
                        >
                          <div className="doc_apt_m_static_rx_title_flex">
                            <h4>{item.name}</h4>
                            <span className="doc_apt_m_flat_type_tag">
                              {item.type}
                            </span>
                          </div>
                          <div className="doc_apt_m_static_rx_details_metrics_strip">
                            <span>
                              Quantity: <b>{item.quantity} units</b>
                            </span>
                            {item.type === "Medicine" && (
                              <>
                                <span className="doc_apt_m_static_dot_spacer">
                                  •
                                </span>
                                <span>
                                  Schedule:{" "}
                                  <b>
                                    {Object.keys(item.timing || {})
                                      .filter((k) => item.timing[k])
                                      .join("-")
                                      .toUpperCase() || "N/A"}
                                  </b>
                                </span>
                                <span className="doc_apt_m_static_dot_spacer">
                                  •
                                </span>
                                <span>
                                  Administration:{" "}
                                  <b>
                                    {item.intake} ({item.instruction})
                                  </b>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="doc_apt_m_card doc_apt_m_history_timeline_card">
                <label className="doc_apt_m_sidebar_section_title">
                  <FiLayers /> Consultation History
                </label>
                <div className="doc_apt_m_history_vertical_timeline_wrapper">
                  {patientHistory.length > 0 ? (
                    patientHistory.map((historyItem) => (
                      <div
                        key={historyItem._id}
                        className="doc_apt_m_timeline_history_card_node"
                      >
                        <div className="doc_apt_m_timeline_node_header_flex">
                          <span className="doc_apt_m_timeline_node_date">
                            {historyItem.date}
                          </span>
                          <span
                            className={`doc_apt_m_timeline_flat_status_tag doc_apt_m_status_color_${historyItem.status.toLowerCase()}`}
                          >
                            {historyItem.status}
                          </span>
                        </div>
                        <p>
                          Specialist Consultant:{" "}
                          <b>Dr. {historyItem.doctorName}</b>
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="doc_apt_m_empty_timeline_prompt_box">
                      No structural medical tracking history logs found.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="doc_apt_m_center_aligned_action_row">
              {selectedAppt.status === "Upcoming" &&
                selectedAppt.date === todayDate &&
                isTimeWindowOpenForRx && (
                  <button
                    className="doc_apt_m_btn_finalize_session_centered"
                    onClick={handleEndAppointment}
                    disabled={isFinalizing}
                  >
                    {isFinalizing ? (
                      <FiLoader className="doc_apt_m_spin" />
                    ) : (
                      <FiCheckCircle />
                    )}{" "}
                    Complete Appointment
                  </button>
                )}

              {selectedAppt.status === "Upcoming" && (
                <div className="doc_apt_m_card doc_apt_m_admin_controls_guarded_card_centered">
                  {!isCushionValidForAdminChange &&
                  activeAdminSubPanel !== "followup" ? (
                    <div className="doc_apt_m_admin_locked_notice_alert_box">
                      <FiLock />{" "}
                      <span>
                        Guarded Actions Locked (Less than 24 hours to
                        appointment).
                      </span>
                    </div>
                  ) : (
                    <div className="doc_apt_m_admin_interactive_panel_hub_centered">
                      {/* STANDALONE ALIGNED OPERATIONS MANAGEMENT HUB BAR */}
                      <div className="doc_apt_m_center_aligned_action_row">
                        {selectedAppt.status === "Upcoming" &&
                          selectedAppt.date === todayDate &&
                          isTimeWindowOpenForRx && (
                            <button
                              className="doc_apt_m_btn_finalize_session_centered"
                              onClick={handleEndAppointment}
                              disabled={isFinalizing}
                            >
                              {isFinalizing ? (
                                <FiLoader className="doc_apt_m_spin" />
                              ) : (
                                <FiCheckCircle />
                              )}{" "}
                              Finalize Treatment & Close File
                            </button>
                          )}

                        {selectedAppt.status === "Upcoming" && (
                          <div className="doc_apt_m_card doc_apt_m_admin_controls_guarded_card_centered">
                            <div className="doc_apt_m_admin_interactive_panel_hub_centered">
                              {/* BUTTONS STAY IN THEIR EXACT ORIGINAL PLACE */}
                              <div className="doc_apt_m_admin_hub_nav_buttons_row">
                                <button
                                  className={`doc_apt_m_hub_nav_action_btn_mini ${activeAdminSubPanel === "reassign" ? "doc_apt_m_nav_btn_active" : ""}`}
                                  disabled={
                                    isTransferSubmitted ||
                                    isRequesting ||
                                    !isCushionValidForAdminChange
                                  }
                                  onClick={() =>
                                    setActiveAdminSubPanel("reassign")
                                  }
                                >
                                  <FiUser />{" "}
                                  <span>
                                    {isTransferSubmitted
                                      ? "Shift Dispatched"
                                      : "Reassign Specialist"}
                                  </span>
                                </button>
                                <button
                                  className={`doc_apt_m_hub_nav_action_btn_mini doc_apt_m_hub_teal_btn_variant ${activeAdminSubPanel === "followup" ? "doc_apt_m_nav_btn_teal_active" : ""}`}
                                  onClick={() =>
                                    setActiveAdminSubPanel("followup")
                                  }
                                >
                                  <FiCalendar /> <span>Schedule Follow-up</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ========================================================================= */}
                      {/* NEW MEDICO OVERLAY MODAL PORTAL: APPEARS ON TOP OF EVERYTHING IN CENTER */}
                      {/* ========================================================================= */}
                      {activeAdminSubPanel && (
                        <div
                          className="med_apt_overlay"
                          onClick={() => setActiveAdminSubPanel(null)}
                        >
                          <div
                            className="med_apt_modal_popup"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Modal Dismiss Header */}
                            <div className="med_apt_modal_header">
                              <h4>
                                {activeAdminSubPanel === "reassign"
                                  ? "Administrative Shift Reassignment"
                                  : "Configure Recall Consultation"}
                              </h4>
                              <button
                                className="med_apt_modal_close_x"
                                onClick={() => setActiveAdminSubPanel(null)}
                              >
                                <FiXCircle size={20} />
                              </button>
                            </div>

                            <div className="med_apt_modal_body">
                              {/* PANEL A: REASSIGN MODULE */}
                              {activeAdminSubPanel === "reassign" &&
                                !isTransferSubmitted &&
                                isCushionValidForAdminChange && (
                                  <div className="doc_apt_m_admin_nested_drawer_action_box_centered">
                                    <p>
                                      Select Alternative Replacement Consultant
                                      Specialist:
                                    </p>
                                    <select
                                      className="doc_apt_m_admin_shift_select_dropdown"
                                      onChange={(e) => {
                                        if (e.target.value)
                                          handleAdminRequest(
                                            "Shift",
                                            e.target.value,
                                          );
                                      }}
                                    >
                                      <option value="">Select Doctor...</option>
                                      {replacementDoctors.map((d) => (
                                        <option key={d._id} value={d.name}>
                                          {d.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                              {/* PANEL B: FOLLOW-UP SLOT PICKER */}
                              {activeAdminSubPanel === "followup" && (
                                <div className="doc_apt_m_admin_nested_drawer_action_box_centered doc_apt_m_teal_drawer_border_override">
                                  <p
                                    style={{
                                      color: "#007acc",
                                      marginBottom: "12px",
                                    }}
                                  >
                                    Configure Recall Session (Dynamic Doctor
                                    Shifts Matrix):
                                  </p>

                                  <div
                                    className="doc_apt_m_follow_up_input_inline_row"
                                    style={{ marginBottom: "16px" }}
                                  >
                                    <input
                                      type="date"
                                      min={todayDate}
                                      value={followUpDate}
                                      onChange={(e) => {
                                        setFollowUpDate(e.target.value);
                                        setFollowUpTime("");
                                      }}
                                    />
                                  </div>

                                  <div className="doc_apt_m_matrix_slots_wrapper">
                                    {loadingSlots ? (
                                      <div className="doc_apt_m_slots_status_msg">
                                        <FiLoader className="doc_apt_m_spin" />{" "}
                                        Reading active clinician availability
                                        records...
                                      </div>
                                    ) : followUpDate &&
                                      calculatedSlotsGrid.length > 0 ? (
                                      <div className="doc_apt_m_bento_slots_grid_container">
                                        {calculatedSlotsGrid.map((s, idx) => {
                                          let slotBtnClass =
                                            "doc_apt_m_matrix_slot_btn";
                                          let isSelectable = true;

                                          if (s.isOnLeave) {
                                            slotBtnClass +=
                                              " slot_on_leave_red";
                                            isSelectable = false;
                                          } else if (s.isBooked || s.isPast) {
                                            slotBtnClass +=
                                              " slot_unselectable_booked";
                                            isSelectable = false;
                                          } else if (followUpTime === s.time) {
                                            slotBtnClass += " active_selected";
                                          }

                                          return (
                                            <button
                                              key={`fup-slot-${idx}-${s.time}`}
                                              disabled={!isSelectable}
                                              className={slotBtnClass}
                                              onClick={() =>
                                                setFollowUpTime(s.time)
                                              }
                                            >
                                              {s.time}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    ) : followUpDate ? (
                                      <div className="doc_apt_m_slots_status_msg err_msg">
                                        No operational structural shifts
                                        configured for this date.
                                      </div>
                                    ) : (
                                      <div className="doc_apt_m_slots_status_msg">
                                        Select a calendar date to load active
                                        dynamic slots grid matrix.
                                      </div>
                                    )}
                                  </div>

                                  <button
                                    className="doc_apt_m_btn_submit_follow_up_booking"
                                    style={{ marginTop: "16px" }}
                                    onClick={handleScheduleFollowUp}
                                    disabled={
                                      isSchedulingFollowUp || !followUpTime
                                    }
                                  >
                                    {isSchedulingFollowUp ? (
                                      <FiLoader className="doc_apt_m_spin" />
                                    ) : (
                                      <FiZap />
                                    )}{" "}
                                    Authorize Follow-up Booking
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
