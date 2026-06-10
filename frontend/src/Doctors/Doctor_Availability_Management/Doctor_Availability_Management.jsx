import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  FiCalendar,
  FiClock,
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
  FiX,
  FiCheck,
  FiLoader,
  FiAlertCircle,
  FiSave,
  FiEye,
  FiFilter,
} from "react-icons/fi";
import { Zap, Loader2 } from "lucide-react";
import "./Doctor_Availability_Management.css";

const LEAVE_TYPES = [
  { id: "sick", label: "Medical/Sick" },
  { id: "emergency", label: "Emergency" },
  { id: "casual", label: "Personal" },
  { id: "conference", label: "Conference" },
];

const todayDate = new Date().toISOString().split("T")[0];

export default function ScheduleAvailability() {
  const doctorUser = JSON.parse(localStorage.getItem("userData")) || {};
  const targetId = doctorUser?._id || doctorUser?.doctorId || "";

  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [schedule, setSchedule] = useState({});
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [conflictsCount, setConflictsCount] = useState(0);

  const [activeShiftSlots, setActiveShiftSlots] = useState([]);
  const [pendingBlockoutSlots, setPendingBlockoutSlots] = useState([]);
  const [savingBlockouts, setSavingBlockouts] = useState(false);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [modalFilterStatus, setModalFilterStatus] = useState("all");
  const [modalFilterStartDate, setModalFilterStartDate] = useState("");
  const [modalFilterEndDate, setModalFilterEndDate] = useState("");

  const [newLeave, setNewLeave] = useState({
    startDate: todayDate,
    endDate: todayDate,
    type: "casual",
    reason: "",
    priority: "Medium",
  });

  const fetchLeaves = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `http://localhost:5000/api/leaves/history/${targetId}?doctorName=${encodeURIComponent(doctorUser.name || "")}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setLeaveHistory(res.data || []);
    } catch (err) {
      console.error("Leave history sync failed", err);
    }
  };

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `http://localhost:5000/api/doctors/availability/${targetId}/${selectedDate}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const mappedSchedule = {};
      const serverSlotsMatrix = res.data.slotsConfigMatrix || [];
      setActiveShiftSlots(serverSlotsMatrix);

      const serverConfirmedBlocked = res.data.blockedSlots || [];
      const serverPendingAdminSlots = res.data.pendingAdminSlots || [];

      // Find all leave requests that cover this specific selected date
      const leavesOnThisDay = leaveHistory.filter(
        (l) => selectedDate >= l.startDate && selectedDate <= l.endDate,
      );

      const hasFullDayApproved =
        leavesOnThisDay.some(
          (l) => l.leaveType === "Full_Day" && l.status === "Approved",
        ) || serverConfirmedBlocked.includes("FULL_DAY_LEAVE");

      const hasFullDayPending = leavesOnThisDay.some(
        (l) => l.leaveType === "Full_Day" && l.status === "Pending",
      );

      serverSlotsMatrix.forEach((slot) => {
        // Find if a specific slot block request exists for this exact slot time
        const matchingSlotLeave = leavesOnThisDay.find(
          (l) => l.leaveType === "Slot_Block" && l.blockedSlots?.includes(slot),
        );

        /* ===================================================================
          FIXED STEP-BY-STEP STATUS RESOLVER MATRIX (PREVENTS MINGLING)
           ===================================================================
        */
        if (hasFullDayApproved) {
          mappedSchedule[slot] = "leave_approved";
        } else if (hasFullDayPending) {
          mappedSchedule[slot] = "leave_pending";
        } else if (matchingSlotLeave) {
          // Check the slot-block request's unique status to prevent overwrites
          if (matchingSlotLeave.status === "Approved") {
            mappedSchedule[slot] = "leave_approved";
          } else if (matchingSlotLeave.status === "Pending") {
            mappedSchedule[slot] = "leave_pending";
          } else {
            mappedSchedule[slot] = "available";
          }
        } else if (serverPendingAdminSlots.includes(slot)) {
          mappedSchedule[slot] = "leave_pending";
        } else if (serverConfirmedBlocked.includes(slot)) {
          // If there is an appointment and no matching leave, it is strictly booked
          mappedSchedule[slot] = "patient_booked";
        } else {
          mappedSchedule[slot] = "available";
        }
      });

      setSchedule(mappedSchedule);

      // FIX: Only add slots to the pending blockouts list if they aren't already approved leaves
      const filteredPending = serverPendingAdminSlots.filter(
        (slot) => mappedSchedule[slot] !== "leave_approved",
      );
      setPendingBlockoutSlots(filteredPending);
    } catch (err) {
      setSchedule({});
      setActiveShiftSlots([]);
      setPendingBlockoutSlots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkImpact = async () => {
      if (showLeaveForm && doctorUser.name) {
        try {
          const token = localStorage.getItem("token");
          const res = await axios.get(
            `http://localhost:5000/api/leaves/check-conflicts?doctorName=${encodeURIComponent(doctorUser.name)}&startDate=${newLeave.startDate}&endDate=${newLeave.endDate}&leaveType=Full_Day&slots=`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          setConflictsCount(res.data.count || 0);
        } catch (err) {
          console.error("Conflict checker failed.");
        }
      }
    };
    checkImpact();
  }, [newLeave.startDate, newLeave.endDate, showLeaveForm, doctorUser.name]);

  useEffect(() => {
    if (targetId) {
      fetchAvailability();
    }
  }, [selectedDate, targetId, leaveHistory]);

  useEffect(() => {
    if (targetId) {
      fetchLeaves();
    }
  }, [selectedDate, targetId]);

  const handleToggleChecklistSlot = (time) => {
    const currentStatus = schedule[time] || "available";

    if (currentStatus === "leave_approved") {
      alert(
        "This time slot is locked down due to an approved leave structure.",
      );
      return;
    }

    /* ===================================================================
      UPDATED STRUCTURAL TOGGLE ENGINE: CANCELS LEAVE BACK TO NORMAL
      =================================================================== */
    if (currentStatus === "leave_pending") {
      // If it's pending, clicking it cancels the request and reverts it back to open/available
      setPendingBlockoutSlots((prev) => prev.filter((s) => s !== time));
      setSchedule((prev) => ({ ...prev, [time]: "available" }));
    } else {
      // If it's available or patient_booked, toggle it to a pending blockout request
      setPendingBlockoutSlots((prev) => [...prev, time]);
      setSchedule((prev) => ({ ...prev, [time]: "leave_pending" }));
    }
  };

  const handleSaveChecklistBlockouts = async () => {
    const finalPendingRequests = activeShiftSlots.filter(
      (slot) => schedule[slot] === "leave_pending",
    );

    if (
      window.confirm(
        `Commit your structural slot modifications for date: ${selectedDate}? Unselected pending slots will revert to normal.`,
      )
    ) {
      setSavingBlockouts(true);
      try {
        const token = localStorage.getItem("token");
        const payload = {
          doctorId: targetId,
          doctorName: doctorUser.name || "Practitioner",
          leaveType: "Slot_Block",
          startDate: selectedDate,
          endDate: selectedDate,
          blockedSlots: finalPendingRequests, // Sends the true state map to overwrite and clean out cancelled requests
          reason:
            "Manually requested schedule hour slot blockout modification.",
          type: "Personal",
          priority: "Medium",
        };

        await axios.post("http://localhost:5000/api/leaves/apply", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });

        alert("Hourly configuration sync completed successfully!");
        await fetchLeaves();
        await fetchAvailability();
      } catch (err) {
        alert(
          "Failed to synchronize adjustments: " +
            (err.response?.data?.message || err.message),
        );
        fetchAvailability();
      } finally {
        setSavingBlockouts(false);
      }
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const payload = {
        doctorId: targetId,
        doctorName: doctorUser.name || "",
        leaveType: "Full_Day",
        startDate: newLeave.startDate,
        endDate: newLeave.endDate,
        blockedSlots: [],
        reason: newLeave.reason,
        type:
          LEAVE_TYPES.find((t) => t.id === newLeave.type)?.label || "Personal",
        priority: newLeave.priority,
      };

      await axios.post("http://localhost:5000/api/leaves/apply", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert(
        conflictsCount > 0
          ? `Absence registered. ${conflictsCount} active patient bookings flagged for auto-redistribution loops.`
          : "Absence configuration applied successfully for administrative auditing.",
      );
      setShowLeaveForm(false);
      setNewLeave({
        startDate: todayDate,
        endDate: todayDate,
        type: "casual",
        reason: "",
        priority: "Medium",
      });
      await fetchLeaves();
      await fetchAvailability();
    } catch (err) {
      alert("Pipeline error: " + (err.response?.data?.message || err.message));
    }
  };

  const dashboardLeaveHistory = useMemo(() => {
    return [...leaveHistory]
      .sort(
        (a, b) =>
          new Date(b.createdAt || b.startDate) -
          new Date(a.createdAt || a.startDate),
      )
      .slice(0, 5);
  }, [leaveHistory]);

  const filteredModalLeaveHistory = useMemo(() => {
    return leaveHistory
      .filter((l) => {
        const apptDate = new Date(l.startDate);
        const matchesStatus =
          modalFilterStatus === "all" ||
          String(l.status).toLowerCase() === modalFilterStatus.toLowerCase();
        const matchesStart =
          !modalFilterStartDate || apptDate >= new Date(modalFilterStartDate);
        const matchesEnd =
          !modalFilterEndDate || apptDate <= new Date(modalFilterEndDate);

        return matchesStatus && matchesStart && matchesEnd;
      })
      .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  }, [
    leaveHistory,
    modalFilterStatus,
    modalFilterStartDate,
    modalFilterEndDate,
  ]);

  const changeMonth = (step) => {
    let m = currentMonth + step;
    let y = currentYear;
    if (m < 0) {
      m = 11;
      y--;
    } else if (m > 11) {
      m = 0;
      y++;
    }
    setCurrentMonth(m);
    setCurrentYear(y);
  };

  const monthName = new Date(currentYear, currentMonth).toLocaleString(
    "default",
    { month: "long" },
  );
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  return (
    <div className="doc_avai_m_root doc_avai_m_page_fade_in">
      <div className="doc_avai_m_section_header">
        <div className="doc_avai_m_branding">
          <h1 className="doc_avai_m_title_elite">
            Schedule <span className="doc_avai_m_highlight">Console</span>
          </h1>
          <p className="doc_avai_m_subtitle">
            Clinical redistribution engine for{" "}
            <b>{doctorUser?.name || "Practitioner"}</b>
          </p>
        </div>
        <div className="doc_avai_m_head_btns">
          <button
            className="doc_avai_m_btn_primary"
            onClick={() => setShowLeaveForm(true)}
          >
            <FiPlus /> Record Absence
          </button>
          <button
            className="doc_avai_m_dash_btn_primary"
            onClick={fetchAvailability}
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
        </div>
      </div>

      <div className="doc_avai_m_row_top">
        <div className="doc_avai_m_card_refined doc_avai_m_cal_module">
          <div className="doc_avai_m_cal_nav_header">
            <button
              className="doc_avai_m_nav_btn_lite"
              onClick={() => changeMonth(-1)}
            >
              <FiChevronLeft />
            </button>
            <h3 className="doc_avai_m_cal_title">
              {monthName} <span>{currentYear}</span>
            </h3>
            <button
              className="doc_avai_m_nav_btn_lite"
              onClick={() => changeMonth(1)}
            >
              <FiChevronRight />
            </button>
          </div>
          <div className="doc_avai_m_cal_days_header">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="doc_avai_m_cal_date_grid">
            {Array(firstDayOfMonth)
              .fill(null)
              .map((_, i) => (
                <div key={i} className="doc_avai_m_day_blank"></div>
              ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const d = i + 1;
              const fDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              return (
                <div
                  key={d}
                  className={`doc_avai_m_day_node ${selectedDate === fDate ? "doc_avai_m_active" : ""} ${fDate < todayDate ? "doc_avai_m_past" : ""}`}
                  onClick={() => fDate >= todayDate && setSelectedDate(fDate)}
                >
                  {d}
                </div>
              );
            })}
          </div>
        </div>

        <div className="doc_avai_m_card_refined doc_avai_m_slots_module">
          {loading ? (
            <div className="doc_avai_m_loader_center">
              <FiLoader className="doc_avai_m_spin" />
            </div>
          ) : (
            <>
              <div className="doc_avai_m_slots_body_scroller">
                <span className="doc_avai_m_label_micro">
                  Session Checklist: {selectedDate}
                </span>
                <div className="doc_avai_m_slot_grid_layout">
                  {activeShiftSlots.length > 0 ? (
                    activeShiftSlots.map((t) => {
                      const currentSlotState = schedule[t] || "available";

                      return (
                        <div
                          key={t}
                          className={`doc_avai_m_slot_card_elite doc_avai_m_status_${currentSlotState}`}
                          onClick={() => handleToggleChecklistSlot(t)}
                          style={{
                            cursor:
                              currentSlotState === "leave_approved"
                                ? "not-allowed"
                                : "pointer",
                            transition: "all 0.15s ease",
                            userSelect: "none",
                          }}
                        >
                          <div className="doc_avai_m_slot_meta">
                            <span className="doc_avai_m_s_time">{t}</span>
                            <span className="doc_avai_m_s_label">
                              {currentSlotState === "patient_booked"
                                ? "PATIENT BOOKED"
                                : currentSlotState
                                    .replace("_", " ")
                                    .toUpperCase()}
                            </span>
                          </div>

                          <div className="doc_avai_m_slot_check_indicator">
                            {currentSlotState === "leave_approved" ? (
                              <FiX size={14} color="#b91c1c" />
                            ) : currentSlotState === "leave_pending" ? (
                              <FiAlertCircle size={14} color="#b45309" />
                            ) : currentSlotState === "patient_booked" ? (
                              <FiCheck size={14} color="#15803d" />
                            ) : (
                              <FiCheck size={14} color="#cbd5e1" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="doc_avai_m_empty_slots_notice">
                      No operational shift rules logged for this calendar date.
                    </div>
                  )}
                </div>
              </div>

              <div className="doc_avai_m_slots_footer">
                <button
                  type="button"
                  onClick={handleSaveChecklistBlockouts}
                  disabled={savingBlockouts}
                  className="doc_avai_m_btn_primary"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "#10b981",
                  }}
                >
                  {savingBlockouts ? (
                    <>
                      <FiLoader className="doc_avai_m_spin" /> Updating...
                    </>
                  ) : (
                    <>
                      <FiSave /> Save Blocked Slots
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="doc_avai_m_row_bottom">
        <div className="doc_avai_m_card_refined doc_avai_m_history_card">
          <div className="doc_avai_m_history_header_flex">
            <h3>Recent Absence & Allocation Logs</h3>
            <button
              type="button"
              className="doc_avai_m_btn_history_modal_trigger"
              onClick={() => setShowHistoryModal(true)}
            >
              <FiEye /> View Full Registry
            </button>
          </div>
          <div className="doc_avai_m_line_history_stack">
            {leaveHistory.length > 0 ? (
              dashboardLeaveHistory.map((l) => (
                <div key={l._id} className="doc_avai_m_history_line_node">
                  <div className="doc_avai_m_history_line_left_stack">
                    <div className="doc_avai_m_history_line_badge_row">
                      <strong>
                        {l.startDate}{" "}
                        {l.endDate !== l.startDate ? `to ${l.endDate}` : ""}
                      </strong>
                      <span className="doc_avai_m_type_pill">
                        {l.leaveType === "Slot_Block"
                          ? "Slot Block Modification"
                          : l.type || "Full Day"}
                      </span>
                    </div>
                    <p className="doc_avai_m_history_line_reason_preview">
                      {l.leaveType === "Slot_Block"
                        ? `Blocked Hours: ${l.blockedSlots?.join(", ")}`
                        : l.reason}
                    </p>
                  </div>
                  <div className="doc_avai_m_history_line_right_flex">
                    <span
                      className={`doc_avai_m_status_pill doc_avai_m_${(l.status || "Pending").toLowerCase()}`}
                    >
                      {l.status || "Pending"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="doc_avai_m_empty_msg_line">
                No tracked roster history logs registered inside the console
                ledger.
              </p>
            )}
          </div>
        </div>
      </div>

      {showLeaveForm && (
        <div className="doc_avai_m_modal_overlay">
          <div
            className="doc_avai_m_modal_card_compact"
            style={{
              maxHeight: "90vh",
              overflowY: "auto",
              width: "100%",
              maxWidth: "500px",
            }}
          >
            <div
              className="doc_avai_m_modal_header"
              style={{
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: "12px",
                marginBottom: "15px",
              }}
            >
              <h3 className="doc_avai_m_title_elite" style={{ margin: 0 }}>
                Clinical Absence
              </h3>
              {conflictsCount > 0 && (
                <div
                  className="doc_avai_m_conflict_banner"
                  style={{
                    marginTop: "8px",
                    background: "#fef2f2",
                    padding: "8px",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <FiAlertCircle color="#ef4444" />
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "#991b1b",
                      fontWeight: "600",
                    }}
                  >
                    {conflictsCount} Bookings Affected (Auto-Redistribution
                    Triggered)
                  </span>
                </div>
              )}
            </div>
            <form onSubmit={handleApplyLeave}>
              <div className="doc_avai_m_modal_form_row">
                <div className="doc_avai_m_input_stack">
                  <label>Start Window Date</label>
                  <input
                    type="date"
                    min={todayDate}
                    value={newLeave.startDate}
                    onChange={(e) =>
                      setNewLeave({
                        ...newLeave,
                        startDate: e.target.value,
                        endDate:
                          e.target.value < newLeave.endDate
                            ? newLeave.endDate
                            : e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="doc_avai_m_input_stack">
                  <label>End Window Date</label>
                  <input
                    type="date"
                    min={newLeave.startDate}
                    value={newLeave.endDate}
                    onChange={(e) =>
                      setNewLeave({ ...newLeave, endDate: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div
                className="doc_avai_m_modal_form_row"
                style={{ marginTop: "15px" }}
              >
                <div className="doc_avai_m_input_stack">
                  <label>Leave Category</label>
                  <select
                    value={newLeave.type}
                    onChange={(e) =>
                      setNewLeave({ ...newLeave, type: e.target.value })
                    }
                  >
                    {LEAVE_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="doc_avai_m_input_stack">
                  <label>Priority Tier</label>
                  <select
                    value={newLeave.priority}
                    onChange={(e) =>
                      setNewLeave({ ...newLeave, priority: e.target.value })
                    }
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
              <div
                className="doc_avai_m_input_stack"
                style={{ marginTop: "15px" }}
              >
                <label>Justification Rationale Abstract</label>
                <textarea
                  placeholder="Provide clinical notes..."
                  value={newLeave.reason}
                  onChange={(e) =>
                    setNewLeave({ ...newLeave, reason: e.target.value })
                  }
                  required
                  style={{ minHeight: "80px", padding: "10px" }}
                />
              </div>
              <div className="doc_avai_m_modal_footer_actions">
                <button
                  type="button"
                  className="doc_avai_m_btn_cancel"
                  onClick={() => setShowLeaveForm(false)}
                >
                  Discard
                </button>
                <button type="submit" className="doc_avai_m_btn_primary">
                  Confirm & Sync
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div
          className="doc_avai_m_modal_overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(15,23,42,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
            padding: 20,
          }}
        >
          <div
            className="doc_avai_m_modal_card_compact"
            style={{
              background: "#fff",
              padding: "30px",
              borderRadius: "8px",
              width: "90%",
              maxWidth: "850px",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: "15px",
                marginBottom: "20px",
              }}
            >
              <h2
                style={{
                  fontSize: "1.4rem",
                  fontWeight: "700",
                  margin: 0,
                  color: "#0f172a",
                }}
              >
                Advanced Clinical{" "}
                <span style={{ color: "#007acc" }}>Absence Registries</span>
              </h2>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                <FiX size={24} />
              </button>
            </div>

            <div
              style={{
                background: "#f8fafc",
                padding: "15px 20px",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "15px",
                marginBottom: "20px",
              }}
            >
              <div className="doc_avai_m_input_stack" style={{ margin: 0 }}>
                <label
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    color: "#475569",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Roster Workflow Filter
                </label>
                <select
                  value={modalFilterStatus}
                  onChange={(e) => setModalFilterStatus(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    fontSize: "0.85rem",
                    width: "100%",
                    borderRadius: "4px",
                  }}
                >
                  <option value="all">All Logs Slate</option>
                  <option value="Pending">Pending Audit</option>
                  <option value="Approved">Approved Blocks</option>
                  <option value="Rejected">Rejected Closures</option>
                </select>
              </div>

              <div className="doc_avai_m_input_stack" style={{ margin: 0 }}>
                <label
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    color: "#475569",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  From Range Date
                </label>
                <input
                  type="date"
                  value={modalFilterStartDate}
                  onChange={(e) => setModalFilterStartDate(e.target.value)}
                  style={{
                    padding: "5px 8px",
                    fontSize: "0.85rem",
                    width: "100%",
                    borderRadius: "4px",
                  }}
                />
              </div>

              <div className="doc_avai_m_input_stack" style={{ margin: 0 }}>
                <label
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    color: "#475569",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  To Range Date
                </label>
                <input
                  type="date"
                  value={modalFilterEndDate}
                  onChange={(e) => setModalFilterEndDate(e.target.value)}
                  style={{
                    padding: "5px 8px",
                    fontSize: "0.85rem",
                    width: "100%",
                    borderRadius: "4px",
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => {
                    setModalFilterStatus("all");
                    setModalFilterStartDate("");
                    setModalFilterEndDate("");
                  }}
                  style={{
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    width: "100%",
                    padding: "7px",
                    borderRadius: "4px",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    color: "#475569",
                  }}
                >
                  Reset Filters
                </button>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="doc_avai_m_table" style={{ width: "100%" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    <th style={{ padding: "10px" }}>Timeline Window</th>
                    <th style={{ padding: "10px" }}>Configuration Type</th>
                    <th style={{ padding: "10px" }}>Justification Context</th>
                    <th
                      style={{ padding: "10px" }}
                      className="doc_avai_m_text_right"
                    >
                      Audit Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModalLeaveHistory.length > 0 ? (
                    filteredModalLeaveHistory.map((l) => (
                      <tr
                        key={l._id}
                        style={{ borderBottom: "1px solid #cbd5e1" }}
                      >
                        <td style={{ padding: "12px 10px" }}>
                          <b>
                            {l.startDate}{" "}
                            {l.endDate !== l.startDate ? `to ${l.endDate}` : ""}
                          </b>
                        </td>
                        <td style={{ padding: "12px 10px" }}>
                          <span
                            className="doc_avai_m_type_pill"
                            style={{
                              textTransform: "capitalize",
                              fontSize: "0.75rem",
                            }}
                          >
                            {l.leaveType === "Slot_Block"
                              ? `Block: ${l.blockedSlots?.join(", ")}`
                              : l.type || "Full Day"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "12px 10px",
                            fontSize: "0.85rem",
                            color: "#334155",
                            maxWidth: "250px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={l.reason}
                        >
                          {l.reason}
                        </td>
                        <td
                          style={{ padding: "12px 10px" }}
                          className="doc_avai_m_text_right"
                        >
                          <span
                            className={`doc_avai_m_status_pill doc_avai_m_${(l.status || "Pending").toLowerCase()}`}
                          >
                            {l.status || "Pending"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="4"
                        className="doc_avai_m_empty_msg"
                        style={{
                          padding: "30px",
                          textAlign: "center",
                          color: "#64748b",
                        }}
                      >
                        <FiFilter size={24} style={{ marginBottom: "6px" }} />
                        <p style={{ margin: 0 }}>
                          No historical rows match your active search filters.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div
              style={{
                textAlign: "right",
                marginTop: "25px",
                borderTop: "1px solid #e2e8f0",
                paddingTop: "15px",
              }}
            >
              <button
                type="button"
                className="doc_avai_m_btn_cancel"
                onClick={() => setShowHistoryModal(false)}
                style={{ padding: "8px 20px" }}
              >
                Close Registry Overview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
