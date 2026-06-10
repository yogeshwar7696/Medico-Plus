import React, { useState, useMemo, useEffect } from "react";

import axios from "axios";
import { useLocation } from "react-router-dom";
import {
  ShieldCheck,
  ArrowLeftRight,
  Search,
  AlertTriangle,
  Clock,
  ChevronLeft,
  Calendar as CalIcon,
  X,
  Zap,
  Plus,
  Users,
  Loader2,
  UserCheck,
  CalendarDays,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import "./Availability_Management.css";

const LEAVE_TYPES = [
  { id: "sick", label: "Medical/Sick" },
  { id: "emergency", label: "Emergency" },
  { id: "casual", label: "Personal" },
  { id: "conference", label: "Conference" },
];

export default function Availability_Management() {
  const location = useLocation();
  const [requests, setRequests] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbDepartments, setDbDepartments] = useState([]);
  const [activeConflictsList, setActiveConflictsList] = useState([]);
  const [fetchingConflicts, setFetchingConflicts] = useState(false);
  const todayDate = new Date().toISOString().split("T")[0];

  const [showManualForm, setShowManualForm] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [activeTab, setActiveTab] = useState("All");

  const [searchTerm, setSearchTerm] = useState(
    location.state?.globalSearchQuery || "",
  );

  useEffect(() => {
    if (location.state?.globalSearchQuery !== undefined) {
      setSearchTerm(location.state.globalSearchQuery);
    }
  }, [location.state?.globalSearchQuery]);

  useEffect(() => {
    const loadHospitalDepartments = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          "http://localhost:5000/api/departments/dropdown/list",
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setDbDepartments(res.data || []);
      } catch (err) {
        console.error("Failed to fetch departments list:", err);
      }
    };
    loadHospitalDepartments();
  }, []);

  const syncHospitalData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const [leaveRes, docRes] = await Promise.all([
        axios.get("http://localhost:5000/api/leaves/all", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get("http://localhost:5000/api/doctors/list", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setRequests(leaveRes.data || []);
      setDoctorsList(docRes.data || []);
    } catch (err) {
      console.error("Data synchronization failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncHospitalData();
  }, []);

  useEffect(() => {
    const syncActiveConflictsLedger = async () => {
      if (!selectedReq) {
        setActiveConflictsList([]);
        return;
      }
      setFetchingConflicts(true);
      try {
        const token = localStorage.getItem("token");
        const leaveStrategy = selectedReq.leaveType || "Full_Day";
        const dateString = selectedReq.startDate;
        const endDateString = selectedReq.endDate || dateString;

        const res = await axios.get(
          `http://localhost:5000/api/leaves/conflicts-list?doctorName=${encodeURIComponent(selectedReq.doctorName)}&startDate=${dateString}&endDate=${endDateString}&leaveType=${leaveStrategy}&slots=${(selectedReq.blockedSlots || []).join(",")}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (
          leaveStrategy === "Slot_Block" &&
          Array.isArray(selectedReq.blockedSlots)
        ) {
          const cleanRequestedSlots = selectedReq.blockedSlots.map((s) =>
            String(s).trim(),
          );
          const filteredConflicts = (res.data || []).filter((appt) =>
            cleanRequestedSlots.includes(String(appt.time).trim()),
          );
          setActiveConflictsList(filteredConflicts);
        } else {
          setActiveConflictsList(res.data || []);
        }
      } catch (err) {
        console.error("Failed to sync active schedule conflicts:", err);
      } finally {
        setFetchingConflicts(false);
      }
    };
    syncActiveConflictsLedger();
  }, [selectedReq]);

  const findReplacement = (dept, currentDocId) => {
    if (!dept) return null;
    const candidates = doctorsList.filter(
      (d) =>
        d.department === dept &&
        d.doctorId !== currentDocId &&
        d._id !== currentDocId &&
        d.availability === "Available",
    );
    if (candidates.length === 0) return null;

    return candidates.sort((a, b) => {
      const expA = parseInt(a.experience) || 0;
      const expB = parseInt(b.experience) || 0;
      return expB - expA;
    })[0];
  };

  const computeProximitySlots = (start, end) => {
    const list = [];
    let [sh, sm] = (start || "09:00").split(":").map(Number);
    let [eh, em] = (end || "17:00").split(":").map(Number);
    let startD = new Date();
    startD.setHours(sh, sm, 0, 0);
    let endD = new Date();
    endD.setHours(eh, em, 0, 0);

    while (startD < endD) {
      let formatStr = startD.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      list.push(formatStr.replace(/^0/, "").replace(/\s+/g, " "));
      startD.setMinutes(startD.getMinutes() + 30);
    }
    return list;
  };

  const strategicRosterEvaluation = useMemo(() => {
    if (!selectedReq || doctorsList.length === 0) return [];

    const peers = doctorsList.filter(
      (d) =>
        d.department === selectedReq.department &&
        d.name !== selectedReq.doctorName &&
        d.availability === "Available",
    );

    return activeConflictsList.map((appt) => {
      let idealPeer = null;
      let fallbackPeer = null;
      let calculatedProximityTime = null;

      for (let peer of peers) {
        const hasTimeConflict = activeConflictsList.some(
          (c) =>
            c.doctorName === peer.name &&
            c.date === appt.date &&
            c.time === appt.time,
        );
        if (!hasTimeConflict) {
          idealPeer = peer;
          break;
        }
      }

      if (!idealPeer && peers.length > 0) {
        const potentialPeer = peers[0];
        const peerShiftMatrix = computeProximitySlots(
          potentialPeer.shiftStart,
          potentialPeer.shiftEnd,
        );
        calculatedProximityTime = peerShiftMatrix.find(
          (slotStr) =>
            !activeConflictsList.some(
              (c) =>
                c.doctorName === potentialPeer.name &&
                c.date === appt.date &&
                c.time === slotStr,
            ),
        );
        if (calculatedProximityTime) {
          fallbackPeer = potentialPeer;
        }
      }

      return {
        appointment: appt,
        exactMatchDoctor: idealPeer,
        proximityDoctor: fallbackPeer,
        proximitySlot: calculatedProximityTime,
      };
    });
  }, [selectedReq, doctorsList, activeConflictsList]);

  const handleDecision = async (id, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      const req = requests.find((r) => r._id === id);
      const replacement = findReplacement(req.department, req.doctorId);
      const targetDoctor = replacement ? replacement.name : "System Unassigned";

      await axios.put(
        `http://localhost:5000/api/leaves/admin/resolve/${id}`,
        {
          targetDoctor: targetDoctor,
          status:
            newStatus === "Approved" && replacement ? "Reassigned" : newStatus,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      alert(
        newStatus === "Rejected"
          ? "Absence request declined safely."
          : "Success: Leave authorized and patient appointments successfully shifted.",
      );
      syncHospitalData();
      setSelectedReq(null);
    } catch (err) {
      alert(
        "Rerouting failed: " + (err.response?.data?.message || "Server Error"),
      );
    }
  };

  const handleDirectRouteTransfer = async (
    appointmentId,
    doctorName,
    reallocatedTime = null,
  ) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:5000/api/leaves/reallocate-direct/${appointmentId}`,
        { targetDoctorName: doctorName, adjustedTime: reallocatedTime },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      alert(
        `Appointment successfully moved directly to Dr. ${doctorName}${reallocatedTime ? " at " + reallocatedTime : ""}`,
      );
      setActiveConflictsList((prev) =>
        prev.filter((item) => item._id !== appointmentId),
      );
    } catch (err) {
      console.error("Direct appointment transfer failed:", err);
      alert("Failed to complete direct route transfer.");
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const docId = formData.get("docId");
    const selectedDoc = doctorsList.find(
      (d) => d.doctorId === docId || d._id === docId,
    );

    if (!selectedDoc) return alert("Please choose a valid doctor.");

    try {
      const token = localStorage.getItem("token");
      const conflictRes = await axios.get(
        `http://localhost:5000/api/leaves/conflicts-list?doctorId=${selectedDoc._id}&startDate=${formData.get("startDate")}&endDate=${formData.get("endDate") || formData.get("startDate")}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const payload = {
        doctorId: selectedDoc.doctorId || selectedDoc._id,
        doctorName: selectedDoc.name,
        department: selectedDoc.department,
        leaveType: "Full_Day",
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate") || formData.get("startDate"),
        type: formData.get("type"),
        priority: formData.get("priority"),
        reason: formData.get("reason"),
        appointments: conflictRes.data?.length || 0,
        status: "Pending",
      };

      await axios.post("http://localhost:5000/api/leaves/apply", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setShowManualForm(false);
      syncHospitalData();
      alert("Absence record registered clearly into database.");
    } catch (err) {
      alert(
        "Manual log failed: " + (err.response?.data?.message || err.message),
      );
    }
  };

  const filtered = useMemo(() => {
    return requests.filter(
      (r) =>
        ((r.doctorName || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
          (r.department || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase())) &&
        (activeTab === "All" ||
          (r.status || "").toLowerCase() === activeTab.toLowerCase()),
    );
  }, [requests, searchTerm, activeTab]);

  if (loading && requests.length === 0)
    return (
      <div className="admin_dash_load">
        <Loader2 className="spin" size={32} /> Synchronizing Schedule
        Registry...
      </div>
    );

  return (
    <div className="admin_avail_m_wrapper">
      <header className="admin_avail_m_header">
        <div className="admin_avail_m_branding">
          <h1 className="admin_avail_m_title_elite">
            Leave <span>Redistribution</span>
          </h1>
          <p className="admin_avail_m_subtitle">
            {selectedReq
              ? `Reviewing Leave Options for Dr. ${selectedReq.doctorName}`
              : "Track doctor availability, handle leaves, and move conflicting appointments easily."}
          </p>
        </div>

        <div className="admin_avail_m_action_group">
          {!selectedReq && (
            <div className="admin_avail_m_search_box">
              <Search size={18} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search doctors or departments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}
          <button
            className="admin_avail_m_btn_sync_suite"
            onClick={syncHospitalData}
            title="Refresh Live Data"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} />{" "}
            <span>Sync Data</span>
          </button>
          {!selectedReq && (
            <button
              className="admin_avail_m_btn_primary"
              onClick={() => setShowManualForm(true)}
            >
              <Plus size={18} /> Log Manual Leave
            </button>
          )}
        </div>
      </header>

      {!selectedReq ? (
        <div className="admin_avail_m_fade_in">
          <section className="admin_avail_m_stat_grid">
            <div className="admin_avail_m_stat_tile">
              <div className="admin_avail_m_tile_icon">
                <Users size={20} />
              </div>
              <div className="admin_avail_m_tile_txt">
                <h3>{doctorsList.length}</h3>
                <p>Total Active Doctors</p>
              </div>
            </div>
            <div className="admin_avail_m_stat_tile">
              <div className="admin_avail_m_tile_icon orange_stat">
                <Clock size={20} />
              </div>
              <div className="admin_avail_m_tile_txt">
                <h3>{requests.filter((r) => r.status === "Pending").length}</h3>
                <p>Awaiting Review</p>
              </div>
            </div>
            <div className="admin_avail_m_stat_tile">
              <div className="admin_avail_m_tile_icon green_stat">
                <ArrowLeftRight size={20} />
              </div>
              <div className="admin_avail_m_tile_txt">
                <h3>
                  {
                    requests.filter(
                      (r) =>
                        r.status === "Reassigned" || r.status === "Approved",
                    ).length
                  }
                </h3>
                <p>Moved & Resolved</p>
              </div>
            </div>
          </section>

          <div className="admin_avail_m_control_bar">
            <div className="admin_avail_m_tabs">
              {"All Pending Approved Reassigned Rejected"
                .split(" ")
                .map((tab) => (
                  <button
                    key={tab}
                    className={`admin_avail_m_tab_btn ${activeTab === tab ? "active" : ""}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
            </div>
          </div>

          <div className="admin_avail_m_specialist_grid">
            {filtered.map((req) => (
              <div
                className="admin_avail_m_glass_card"
                key={req._id}
                onClick={() => setSelectedReq(req)}
              >
                <div className="admin_avail_m_card_header">
                  <span className="admin_avail_m_id_badge">
                    TOKEN-{(req._id || "").slice(-4).toUpperCase()}
                  </span>
                  <div
                    className={`admin_avail_m_priority_dot ${(req.priority || "Low").toLowerCase()}`}
                  ></div>
                </div>
                <div className="admin_avail_m_spec_identity_block">
                  <strong>{req.doctorName}</strong>
                  <span>{req.department} Department</span>
                  {req.leaveType === "Slot_Block" && (
                    <small className="admin_avail_m_blockout_label">
                      Partial Day Leave
                    </small>
                  )}
                </div>
                <div className="admin_avail_m_spec_meta">
                  <div className="admin_avail_m_meta_pill">
                    <CalIcon size={12} /> {req.startDate}
                  </div>
                  <div
                    className={`admin_avail_m_pill_status ${(req.status || "Pending").toLowerCase()}`}
                  >
                    {req.status}
                  </div>
                </div>
                <div className="admin_avail_m_conflict_box">
                  {req.appointments > 0 ? (
                    <p className="admin_avail_m_txt_conflict">
                      <AlertTriangle size={14} /> {req.appointments} Bookings at
                      Risk
                    </p>
                  ) : (
                    <p className="admin_avail_m_txt_safe">
                      <ShieldCheck size={14} /> No Patient Conflicts
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="admin_avail_m_detail_container admin_avail_m_fade_in">
          <div className="admin_avail_m_panel_top">
            <button
              className="admin_avail_m_btn_outline"
              onClick={() => setSelectedReq(null)}
            >
              <ChevronLeft size={20} /> Back to Requests List
            </button>
            <div className="admin_avail_m_ref_id">
              Leave Request Token ID: #{selectedReq._id.toUpperCase()}
            </div>
          </div>

          <div className="admin_avail_m_workspace_grid">
            <div className="admin_avail_m_workspace_left">
              <div className="admin_avail_m_profile_hero">
                <h2>{selectedReq.doctorName}</h2>
                <p>Specialist in {selectedReq.department}</p>
              </div>

              <div className="admin_avail_m_details_bento">
                <div className="admin_avail_m_bento_item">
                  <label>Leave Duration</label>
                  <strong>
                    {selectedReq.leaveType === "Slot_Block"
                      ? "Partial Day Leave"
                      : "Full Day Leave"}
                  </strong>
                </div>
                <div className="admin_avail_m_bento_item">
                  <label>Date Bounds</label>
                  <strong>
                    {selectedReq.startDate}
                    {selectedReq.endDate !== selectedReq.startDate
                      ? ` to ${selectedReq.endDate}`
                      : ""}
                  </strong>
                </div>

                {selectedReq.leaveType === "Slot_Block" &&
                  Array.isArray(selectedReq.blockedSlots) && (
                    <div className="admin_avail_m_bento_item full">
                      <label>Requested Slot Timings</label>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px",
                          marginTop: "6px",
                        }}
                      >
                        {selectedReq.blockedSlots.map((slot, idx) => (
                          <span
                            key={idx}
                            style={{
                              padding: "4px 10px",
                              background: "#fee2e2",
                              color: "#991b1b",
                              borderRadius: "4px",
                              fontSize: "0.8rem",
                              fontWeight: "600",
                              border: "1px solid #fca5a5",
                            }}
                          >
                            {slot}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                <div className="admin_avail_m_bento_item full">
                  <label>Reason for Leave</label>
                  <p style={{ margin: "4px 0 0 0", color: "#334155" }}>
                    {selectedReq.reason}
                  </p>
                </div>
              </div>
            </div>

            <div className="admin_avail_m_workspace_right">
              <div className="admin_avail_m_conflict_pad_wrapper">
                <h3 className="admin_avail_m_sidebar_title">
                  <CalendarDays size={18} /> Booking Conflicts Resolver
                </h3>

                {fetchingConflicts ? (
                  <div className="admin_avail_m_pad_loader">
                    <Loader2 className="spin" size={24} />
                    <p>Looking for alternative available doctors...</p>
                  </div>
                ) : strategicRosterEvaluation.length > 0 ? (
                  <div className="admin_avail_m_impact_list">
                    {strategicRosterEvaluation.map((match, idx) => {
                      const {
                        appointment,
                        exactMatchDoctor,
                        proximityDoctor,
                        proximitySlot,
                      } = match;
                      return (
                        <div
                          key={appointment._id || idx}
                          className="admin_avail_m_impact_item"
                        >
                          <div className="admin_avail_m_impact_card_top">
                            <div>
                              <strong>{appointment.patientName}</strong>
                              <span className="admin_avail_m_time_tag">
                                {appointment.time || "OPD Slot"} •{" "}
                                {appointment.date
                                  ? new Date(
                                      appointment.date,
                                    ).toLocaleDateString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : "Unrecorded"}
                              </span>
                            </div>
                            <span className="admin_avail_m_risk_pill">
                              Time Conflict
                            </span>
                          </div>

                          <div className="admin_avail_m_reroute_options_panel">
                            {exactMatchDoctor ? (
                              <div className="admin_avail_m_match_pill exact">
                                <span>
                                  <b>Direct Swap Available:</b> Dr.{" "}
                                  {exactMatchDoctor.name}
                                </span>
                                <button
                                  onClick={() =>
                                    handleDirectRouteTransfer(
                                      appointment._id,
                                      exactMatchDoctor.name,
                                    )
                                  }
                                >
                                  Move Here
                                </button>
                              </div>
                            ) : proximityDoctor && proximitySlot ? (
                              <div className="admin_avail_m_match_pill alternate">
                                <div className="admin_avail_m_alternate_meta">
                                  <span>
                                    🟡 <b>Alternate Shift:</b> Dr.{" "}
                                    {proximityDoctor.name}
                                  </span>
                                  <small>
                                    Original time busy. Move to:{" "}
                                    <b>{proximitySlot}</b>
                                  </small>
                                </div>
                                <button
                                  onClick={() =>
                                    handleDirectRouteTransfer(
                                      appointment._id,
                                      proximityDoctor.name,
                                      proximitySlot,
                                    )
                                  }
                                >
                                  Move ({proximitySlot})
                                </button>
                              </div>
                            ) : (
                              <div className="admin_avail_m_match_pill error_block">
                                <AlertCircle size={14} />{" "}
                                <span>
                                  No available peers. Please re-arrange manually
                                  from Bookings.
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="admin_avail_m_pad_safe_state">
                    <UserCheck size={32} />
                    <p>
                      No patient booking conflicts found for this leave
                      duration.
                    </p>
                  </div>
                )}
              </div>

              <div className="admin_avail_m_logic_card">
                <h3>
                  <Zap size={18} fill="#f59e0b" color="#f59e0b" /> Request
                  Actions
                </h3>
                {(selectedReq.status || "").toLowerCase() === "pending" ? (
                  <div className="admin_avail_m_bulk_ui_stack">
                    <p
                      style={{
                        fontSize: "0.85rem",
                        color: "#64748b",
                        marginBottom: "12px",
                      }}
                    >
                      {selectedReq.leaveType === "Slot_Block"
                        ? "Approving this will automatically move only the appointments during these specific slot timings to another available doctor."
                        : "Approving this will automatically move all of this doctor's appointments for the full day to another available doctor."}
                    </p>
                    <div className="admin_avail_m_bulk_action_row">
                      <button
                        className="admin_avail_m_btn_bulk_submit"
                        onClick={() =>
                          handleDecision(selectedReq._id, "Approved")
                        }
                      >
                        Auto Shift & Approve
                      </button>
                      <button
                        className="admin_avail_m_btn_bulk_reject"
                        onClick={() =>
                          handleDecision(selectedReq._id, "Rejected")
                        }
                      >
                        Reject Leave
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="admin_avail_m_workflow_closed_banner">
                    <ShieldCheck size={28} />
                    <p>Workflow Finished ({selectedReq.status})</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showManualForm && (
        <div
          className="admin_appt_m_modal"
          onClick={() => setShowManualForm(false)}
        >
          <div
            className="admin_appt_m_modal_box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin_appt_m_modal_head">
              <h2>
                Log <span>Doctor Absence</span>
              </h2>
              <button onClick={() => setShowManualForm(false)}>
                <X size={20} />
              </button>
            </div>
            <form
              className="admin_avail_m_form_grid"
              onSubmit={handleManualSubmit}
            >
              <div className="admin_avail_m_input_box full">
                <label>Select Doctor</label>
                <select className="admin_avail_m_select" name="docId" required>
                  <option value="">Choose Doctor...</option>
                  {doctorsList.map((doc) => (
                    <option
                      key={doc._id || doc.doctorId}
                      value={doc.doctorId || doc._id}
                    >
                      {doc.name} ({doc.department})
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin_avail_m_input_box">
                <label>Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  min={todayDate}
                  required
                  className="admin_avail_m_input"
                />
              </div>
              <div className="admin_avail_m_input_box">
                <label>End Date (Optional)</label>
                <input
                  type="date"
                  name="endDate"
                  min={todayDate}
                  className="admin_avail_m_input"
                />
              </div>
              <div className="admin_avail_m_input_box">
                <label>Leave Reason Category</label>
                <select className="admin_avail_m_select" name="type" required>
                  {LEAVE_TYPES.map((t) => (
                    <option key={t.id} value={t.label}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin_avail_m_input_box">
                <label>Urgency Priority</label>
                <select
                  className="admin_avail_m_select"
                  name="priority"
                  required
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div className="admin_avail_m_input_box full">
                <label>Leave Reason Details</label>
                <textarea
                  className="admin_avail_m_textarea"
                  name="reason"
                  rows="2"
                  required
                ></textarea>
              </div>
              <button className="admin_avail_m_btn_submit full" type="submit">
                Save & Register Absence
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
