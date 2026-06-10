import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import {
  Search,
  Download,
  Plus,
  Trash2,
  X,
  Eye,
  Copy,
  MapPin,
  Loader2,
  Activity,
  Calendar as CalIcon,
  Users,
  UserPlus,
  Layers,
  Check,
  Edit2,
} from "lucide-react";
import "./Event_Management.css";

export default function Event_Management() {
  /* --- 1. CORE SYSTEM STATES --- */
  const [loading, setLoading] = useState(true);
  const [allDoctorsRegistry, setAllDoctorsRegistry] = useState([]);

  const [hospitalDepartments, setHospitalDepartments] = useState([]);
  const [editingEventId, setEditingEventId] = useState(null);
  const location = useLocation();
  const [eventState, setEventState] = useState({
    events: [],
    searchQuery: location.state?.globalSearchQuery || "",
    filterDepartment: "",
    sortBy: "date",
    showEventForm: false,
    selectedEventDetail: null,
  });

  useEffect(() => {
    if (location.state?.globalSearchQuery !== undefined) {
      setEventState((prev) => ({
        ...prev,
        searchQuery: location.state.globalSearchQuery,
      }));
    }
  }, [location.state?.globalSearchQuery]);

  // Controlled Form Inputs
  const [doctorSelectionMethod, setDoctorSelectionMethod] =
    useState("individual"); // individual or department
  const [formFields, setFormFields] = useState({
    title: "",
    department: [],
    date: "",
    location: "",
    type: "Workshop",
    capacity: "100",
    startTime: "09:00 AM",
    notes: "",
    doctors: [],
  });

  const setState = useCallback((updates) => {
    setEventState((prev) => ({ ...prev, ...updates }));
  }, []);

  /* --- 2. SECURE DATA SYNCHRONIZATION --- */
  const initializeWorkspace = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = {
        Authorization: token?.startsWith("Bearer ") ? token : `Bearer ${token}`,
      };

      const [eventRes, doctorRes, deptRes] = await Promise.all([
        axios.get("http://localhost:5000/api/events/all", { headers }),
        axios.get("http://localhost:5000/api/doctors/list", { headers }),
        axios.get("http://localhost:5000/api/departments/dropdown/list", {
          headers,
        }),
      ]);

      setState({ events: eventRes.data || [] });
      setAllDoctorsRegistry(doctorRes.data || []);
      setHospitalDepartments(deptRes.data || []);
    } catch (err) {
      console.error("Infrastructure Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeWorkspace();
  }, []);

  /* --- 3. MULTI-DEPARTMENT & SPECIALIST MANAGEMENT HANDLERS --- */
  const handleFormChange = (e) => {
    setFormFields({ ...formFields, [e.target.name]: e.target.value });
  };

  const handleToggleDepartmentSelection = (deptName) => {
    setFormFields((prev) => {
      const exists = prev.department.includes(deptName);
      let updatedDepts = exists
        ? prev.department.filter((d) => d !== deptName)
        : [...prev.department, deptName];

      // Safe fallbacks to keep input fields controlled
      if (updatedDepts.length === 0) {
        updatedDepts = prev.department;
      }

      let updatedDoctorsList = [...prev.doctors];

      if (doctorSelectionMethod === "department") {
        if (!exists) {
          const targetDeptRecord = hospitalDepartments.find(
            (d) => d.name.toLowerCase() === deptName.toLowerCase(),
          );

          if (targetDeptRecord && Array.isArray(targetDeptRecord.doctors)) {
            // Find matched doctor objects inside our master registry to map out text name references safely
            targetDeptRecord.doctors.forEach((nestedDoc) => {
              const matchedDocObject = allDoctorsRegistry.find(
                (dr) =>
                  dr._id ===
                  (typeof nestedDoc === "object" ? nestedDoc._id : nestedDoc),
              );
              if (matchedDocObject) {
                const targetName =
                  matchedDocObject.name || matchedDocObject.doctorName;
                if (!updatedDoctorsList.includes(targetName)) {
                  updatedDoctorsList.push(targetName);
                }
              }
            });
          }
        } else {
          // If unselected, strip out the specialists belonging to this specific wing cleanly
          const remainingDeptsLower = updatedDepts.map((d) => d.toLowerCase());
          updatedDoctorsList = allDoctorsRegistry
            .filter((doc) =>
              remainingDeptsLower.includes(
                (doc.department || "").toLowerCase(),
              ),
            )
            .map((doc) => doc.name || doc.doctorName);
        }
      }

      return {
        ...prev,
        department: updatedDepts,
        doctors: updatedDoctorsList, // Automatically computed with zero manual data overlap traps!
      };
    });
  };

  // Aggregates specialist lists whose department properties exist inside chosen multi-chips selections array
  const filteredDoctorsByDepts = useMemo(() => {
    return allDoctorsRegistry.filter((doc) =>
      formFields.department.some(
        (dept) => (doc.department || "").toLowerCase() === dept.toLowerCase(),
      ),
    );
  }, [allDoctorsRegistry, formFields.department]);

  const handleSelectAllDeptDoctors = () => {
    const deptDocNames = filteredDoctorsByDepts.map(
      (d) => d.name || d.doctorName,
    );
    setFormFields((prev) => ({ ...prev, doctors: deptDocNames }));
  };

  const handleToggleIndividualDoctor = (docName) => {
    setFormFields((prev) => {
      const alreadySelected = prev.doctors.includes(docName);
      const updatedList = alreadySelected
        ? prev.doctors.filter((name) => name !== docName)
        : [...prev.doctors, docName];
      return { ...prev, doctors: updatedList };
    });
  };

  /* --- 4. GOVERNANCE ANALYTICS FILTERING --- */
  const filteredAndSortedEvents = useMemo(() => {
    let result = [...eventState.events].filter((event) => {
      const matchesSearch = (event.title || "")
        .toLowerCase()
        .includes(eventState.searchQuery.toLowerCase());
      const eventDepts = Array.isArray(event.department)
        ? event.department
        : [event.department];
      const matchesDept =
        !eventState.filterDepartment ||
        eventDepts.includes(eventState.filterDepartment);

      return matchesSearch && matchesDept;
    });

    result.sort((a, b) => {
      if (eventState.sortBy === "date")
        return new Date(a.date) - new Date(b.date);
      if (eventState.sortBy === "title")
        return (a.title || "").localeCompare(b.title || "");
      return 0;
    });

    return result;
  }, [eventState]);

  const stats = useMemo(
    () => [
      {
        label: "Global Events",
        val: eventState.events.length,
        icon: <CalIcon size={20} />,
        color: "#007acc",
      },
      {
        label: "Active Sessions",
        val: eventState.events.filter((e) => e.status === "Upcoming").length,
        icon: <Activity size={20} />,
        color: "#10b981",
      },
      {
        label: "Total Panel Speakers",
        val: allDoctorsRegistry.length,
        icon: <Users size={20} />,
        color: "#00d2ff",
      },
    ],
    [eventState.events, allDoctorsRegistry],
  );

  /* --- 5. SUBMISSIONS & MUTATIONS (CRUD) --- */
  const handleOpenEditModal = (e, event) => {
    e.stopPropagation();
    setEditingEventId(event._id);

    setFormFields({
      title: event.title || "",
      department: Array.isArray(event.department)
        ? event.department
        : [event.department || ""],
      date: event.date || "",
      location: event.location || "",
      type: event.type || "Workshop",
      capacity: String(event.capacity || "100"),
      startTime: event.startTime || "09:00 AM",
      notes: event.notes || "",
      doctors: event.doctors || [],
    });

    setState({ showEventForm: true });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const headers = {
        Authorization: token?.startsWith("Bearer ") ? token : `Bearer ${token}`,
      };

      if (editingEventId) {
        await axios.put(
          `http://localhost:5000/api/events/update/${editingEventId}`,
          formFields,
          { headers },
        );
        alert("Medical Event Updated Successfully!");
      } else {
        await axios.post("http://localhost:5000/api/events/add", formFields, {
          headers,
        });
        alert("Medical Event Deployed into System Calendar!");
      }

      setFormFields({
        title: "",
        department: [],
        date: "",
        location: "",
        type: "Workshop",
        capacity: "100",
        startTime: "09:00 AM",
        notes: "",
        doctors: [],
      });
      setEditingEventId(null);
      setState({ showEventForm: false });
      initializeWorkspace();
    } catch (err) {
      alert(
        "Submission aborted: " + (err.response?.data?.message || err.message),
      );
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (
      window.confirm(
        "Archive this medical event from reporting views permanently?",
      )
    ) {
      try {
        const token = localStorage.getItem("token");
        const headers = {
          Authorization: token?.startsWith("Bearer ")
            ? token
            : `Bearer ${token}`,
        };

        await axios.delete(`http://localhost:5000/api/events/delete/${id}`, {
          headers,
        });
        initializeWorkspace();
      } catch (err) {
        alert("Archive execution trace unresolvable.");
      }
    }
  };

  if (loading)
    return (
      <div className="admin_dash_load">
        <Loader2 className="spin" size={40} />
        <p>Synchronizing Events Registry...</p>
      </div>
    );

  return (
    <div className="event_elite_root doc_home_view_fade_in">
      {/* --- HEADER --- */}
      <header className="dept_elite_header">
        <div className="dept_elite_branding">
          <h1>
            Medical <span className="text_cyan">Events</span>
          </h1>
          <p>Clinical Conferences, Multi-Disciplinary Workshops & Governance</p>
        </div>
        <div className="dept_elite_actions">
          <button
            className="dept_elite_btn_primary"
            onClick={() => {
              setEditingEventId(null);
              setFormFields({
                title: "",
                department:
                  hospitalDepartments.length > 0
                    ? [hospitalDepartments[0].name]
                    : [],
                date: new Date().toISOString().split("T")[0],
                location: "",
                type: "Workshop",
                capacity: "100",
                startTime: "09:00 AM",
                notes: "",
                doctors: [],
              });
              setState({ showEventForm: true });
            }}
          >
            <Plus size={18} /> Add New Event
          </button>
        </div>
      </header>

      {/* --- STATS GRID --- */}
      <section className="dept_elite_stats_bento">
        {stats.map((s, i) => (
          <div className="dept_elite_stat_tile" key={i}>
            <div
              className="stat_tile_icon"
              style={{ backgroundColor: `${s.color}15`, color: s.color }}
            >
              {s.icon}
            </div>
            <div className="stat_tile_content">
              <span className="stat_tile_label">{s.label}</span>
              <h2 className="stat_tile_value">{s.val}</h2>
            </div>
          </div>
        ))}
      </section>

      {/* --- CONTROL BAR --- */}
      <div className="dept_mgmt_control_bar">
        <div className="dept_mgmt_search_wrapper">
          <Search size={18} className="search_icon" color="#94a3b8" />
          <input
            placeholder="Search event title records..."
            value={eventState.searchQuery}
            onChange={(e) => setState({ searchQuery: e.target.value })}
          />
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <select
            value={eventState.filterDepartment}
            onChange={(e) => setState({ filterDepartment: e.target.value })}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              outline: "none",
              fontSize: "0.85rem",
            }}
          >
            <option value="">All Departments</option>
            {hospitalDepartments.map((d) => (
              <option key={d._id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            className="admin_appt_m_btn_export"
            onClick={() => window.print()}
          >
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* --- CLINICAL REGISTRY TABLE --- */}
      <main className="admin_appt_m_table_scroll">
        <table className="admin_appt_m_table">
          <thead>
            <tr>
              <th>Event Title</th>
              <th>Medical Tracks Covered</th>
              <th>Schedule</th>
              <th>Type</th>
              <th>Seating Limit</th>
              <th>Status</th>
              <th className="admin_appt_m_text_right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedEvents.length > 0 ? (
              filteredAndSortedEvents.map((event) => (
                <tr
                  key={`clinical-event-record-${event._id}`}
                  onClick={() => setState({ selectedEventDetail: event })}
                  style={{ cursor: "pointer" }}
                  className="interactive_table_row"
                >
                  <td>
                    <div className="admin_appt_m_user_cell">
                      <div
                        className="admin_appt_m_avatar_init"
                        style={{ backgroundColor: "#f0f9ff", color: "#007acc" }}
                      >
                        {(event.title || "E").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <b>{event.title}</b>
                        <span>
                          <MapPin size={10} /> {event.location}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="admin_doc_m_text_bold">
                    {Array.isArray(event.department)
                      ? event.department.join(", ")
                      : event.department}
                  </td>
                  <td>
                    <div className="admin_appt_m_time_cell">
                      <span className="admin_appt_m_date_text">
                        {event.date}
                      </span>
                      <span className="admin_appt_m_time_text">
                        {event.startTime || "09:00 AM"}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="badge_pill">{event.type}</span>
                  </td>
                  <td>
                    <div className="admin_doc_m_text_bold">
                      {event.capacity} Max
                    </div>
                  </td>
                  <td>
                    <span
                      className={`admin_appt_m_status ${(event.status || "Upcoming").toLowerCase()}`}
                    >
                      {event.status || "Upcoming"}
                    </span>
                  </td>
                  <td className="admin_appt_m_text_right">
                    <div className="admin_dept_action_group">
                      {event.status === "Upcoming" || !event.status ? (
                        <>
                          <button
                            className="admin_dept_icon_btn edit"
                            onClick={(e) => handleOpenEditModal(e, event)}
                            title="Modify Matrix Properties"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            className="admin_dept_icon_btn delete"
                            onClick={(e) => handleDelete(e, event._id)}
                            title="Archive Records"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      ) : (
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "#94a3b8",
                            fontStyle: "italic",
                            paddingRight: "10px",
                          }}
                        >
                          Locked
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="admin_appt_m_empty">
                  <Activity size={32} />
                  <p>
                    No matching multidisciplinary records located inside active
                    session matrices.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </main>

      {/* --- SETUP / EDIT FORM MODAL --- */}
      {eventState.showEventForm && (
        <div className="adm_evt_modal">
          <div
            className="adm_evt_modal_box adm_evt_modal_wide"
            style={{ maxHeight: "90vh", overflowY: "auto" }}
          >
            <div className="adm_evt_modal_head">
              <h3>
                Event <span>{editingEventId ? "Modification" : "Setup"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setState({ showEventForm: false })}
              >
                <X size={20} />
              </button>
            </div>
            <form className="adm_evt_form" onSubmit={handleCreateSubmit}>
              <div className="adm_evt_field">
                <label>Event Title</label>
                <input
                  type="text"
                  name="title"
                  value={formFields.title}
                  onChange={handleFormChange}
                  placeholder="e.g. Multi-Specialty Neuro-Cardio Symposium"
                  required
                />
              </div>

              <div className="adm_evt_field" style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "700",
                  }}
                >
                  <Layers
                    size={14}
                    style={{ marginRight: "4px", verticalAlign: "middle" }}
                  />{" "}
                  Target Department Clusters (Select Multiple)
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {hospitalDepartments.map((dept) => {
                    const isSelected = formFields.department.includes(
                      dept.name,
                    );
                    return (
                      <button
                        type="button"
                        key={dept._id}
                        onClick={() =>
                          handleToggleDepartmentSelection(dept.name)
                        }
                        style={{
                          padding: "6px 14px",
                          borderRadius: "20px",
                          border: "1px solid",
                          borderColor: isSelected ? "#0284c7" : "#cbd5e1",
                          background: isSelected ? "#e0f2fe" : "#fff",
                          color: isSelected ? "#0369a1" : "#475569",
                          fontSize: "0.8rem",
                          fontWeight: "600",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {isSelected && <Check size={12} />}
                        {dept.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                className="adm_evt_doctor_wrapper"
                style={{
                  margin: "15px 0",
                  background: "#f8fafc",
                  padding: "15px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <label
                  style={{
                    display: "block",
                    fontWeight: "700",
                    marginBottom: "8px",
                    fontSize: "0.85rem",
                    color: "#334155",
                  }}
                >
                  <UserPlus
                    size={14}
                    style={{ marginRight: "5px", verticalAlign: "middle" }}
                  />{" "}
                  Panelist Speaker Allocation
                </label>

                <div
                  style={{ display: "flex", gap: "15px", marginBottom: "12px" }}
                >
                  <label
                    style={{
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <input
                      type="radio"
                      name="selectionMethod"
                      checked={doctorSelectionMethod === "individual"}
                      onChange={() => {
                        setDoctorSelectionMethod("individual");
                        setFormFields((p) => ({ ...p, doctors: [] }));
                      }}
                    />{" "}
                    Individual Selection
                  </label>
                  <label
                    style={{
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <input
                      type="radio"
                      name="selectionMethod"
                      checked={doctorSelectionMethod === "department"}
                      onChange={() => {
                        setDoctorSelectionMethod("department");
                        const activeDeptsLower = formFields.department.map(
                          (d) => d.toLowerCase(),
                        );
                        const bulkNamesList = allDoctorsRegistry
                          .filter((doc) =>
                            activeDeptsLower.includes(
                              (doc.department || "").toLowerCase(),
                            ),
                          )
                          .map((doc) => doc.name || doc.doctorName);
                        setFormFields((p) => ({
                          ...p,
                          doctors: bulkNamesList,
                        }));
                      }}
                    />{" "}
                    Assign Selected Departments Entirely
                  </label>
                </div>

                {doctorSelectionMethod === "department" ? (
                  <div>
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "#64748b",
                        margin: "0 0 8px 0",
                      }}
                    >
                      Will automatically load all active specialists working
                      inside the selected clusters: (
                      <strong>{formFields.department.join(", ")}</strong>).
                    </p>
                    <button
                      type="button"
                      onClick={handleSelectAllDeptDoctors}
                      style={{
                        background: "#e0f2fe",
                        color: "#0369a1",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      Force Re-Sync All ({filteredDoctorsByDepts.length})
                      Medical Experts across Sectors
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(200px, 1fr))",
                      gap: "8px",
                      maxHeight: "120px",
                      overflowY: "auto",
                      background: "#fff",
                      padding: "10px",
                      borderRadius: "4px",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    {allDoctorsRegistry.map((doc) => {
                      const nameString = doc.name || doc.doctorName;
                      return (
                        <label
                          key={doc._id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={formFields.doctors.includes(nameString)}
                            onChange={() =>
                              handleToggleIndividualDoctor(nameString)
                            }
                          />
                          <span>
                            {nameString}{" "}
                            <small style={{ color: "#94a3b8" }}>
                              ({doc.department})
                            </small>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {formFields.doctors.length > 0 && (
                  <div
                    style={{
                      marginTop: "10px",
                      fontSize: "0.75rem",
                      color: "#475569",
                    }}
                  >
                    Active Target Panel Speakers (
                    <strong>{formFields.doctors.length} Checked</strong>):{" "}
                    <strong>{formFields.doctors.join(", ")}</strong>
                  </div>
                )}
              </div>

              <div className="adm_evt_row">
                <div className="adm_evt_field">
                  <label>Date</label>
                  <input
                    type="date"
                    name="date"
                    value={formFields.date}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="adm_evt_field">
                  <label>Location / Auditorium Hall</label>
                  <input
                    type="text"
                    name="location"
                    value={formFields.location}
                    onChange={handleFormChange}
                    placeholder="Main Room C"
                    required
                  />
                </div>
              </div>
              <div className="adm_evt_row">
                <div className="adm_evt_field">
                  <label>Event Category Type</label>
                  <select
                    name="type"
                    className="adm_evt_select"
                    value={formFields.type}
                    onChange={handleFormChange}
                  >
                    <option value="Workshop">Workshop</option>
                    <option value="Conference">Conference</option>
                    <option value="Seminar">Seminar</option>
                    <option value="Grand Rounds">Grand Rounds</option>
                  </select>
                </div>
                <div className="adm_evt_field">
                  <label>Max Seating Capacity</label>
                  <input
                    type="number"
                    name="capacity"
                    value={formFields.capacity}
                    onChange={handleFormChange}
                    required
                  />
                </div>
              </div>
              <div className="adm_evt_field">
                <label>Session Abstracts / Administrative Notes</label>
                <textarea
                  name="notes"
                  value={formFields.notes}
                  onChange={handleFormChange}
                  rows="2"
                  placeholder="Provide event schedule matrix milestones..."
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #cbd5e1",
                  }}
                />
              </div>
              <button type="submit" className="adm_evt_submit">
                {editingEventId
                  ? "Save Matrix Modifications"
                  : "Deploy to System Calendar"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- DETAIL VIEW MASTER SIDE-PANEL --- */}
      {eventState.selectedEventDetail && (
        <div
          className="admin_appt_m_modal"
          onClick={() => setState({ selectedEventDetail: null })}
        >
          <div
            className="admin_appt_m_modal_box viewing_modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal_header_accent"
              style={{
                backgroundColor:
                  eventState.selectedEventDetail.status === "Cancelled"
                    ? "#fb7185"
                    : "#007acc",
              }}
            ></div>
            <div className="admin_appt_m_modal_head">
              <h2>{eventState.selectedEventDetail.title}</h2>
              <button onClick={() => setState({ selectedEventDetail: null })}>
                <X size={20} />
              </button>
            </div>
            <div className="dept_detail_body">
              <div className="dept_detail_grid">
                <div className="detail_node">
                  <label>Sectors Covered</label>
                  <strong>
                    {Array.isArray(eventState.selectedEventDetail.department)
                      ? eventState.selectedEventDetail.department.join(", ")
                      : eventState.selectedEventDetail.department}
                  </strong>
                </div>
                <div className="detail_node">
                  <label>Classification Type</label>
                  <strong>{eventState.selectedEventDetail.type}</strong>
                </div>
                <div className="detail_node">
                  <label>Scheduled Start</label>
                  <strong>
                    {eventState.selectedEventDetail.date} •{" "}
                    {eventState.selectedEventDetail.startTime || "09:00 AM"}
                  </strong>
                </div>
                <div className="detail_node">
                  <label>Location Hall</label>
                  <strong>{eventState.selectedEventDetail.location}</strong>
                </div>
                <div className="detail_node">
                  <label>Seating Capacity</label>
                  <strong>
                    {eventState.selectedEventDetail.capacity} Maximum
                  </strong>
                </div>
                <div className="detail_node">
                  <label>Active Operational Status</label>
                  <strong
                    style={{
                      color:
                        eventState.selectedEventDetail.status === "Upcoming"
                          ? "#10b981"
                          : "#64748b",
                    }}
                  >
                    {eventState.selectedEventDetail.status || "Upcoming"}
                  </strong>
                </div>
              </div>

              <div
                className="detail_node"
                style={{
                  marginTop: "20px",
                  background: "#f8fafc",
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <label style={{ color: "#007acc", fontWeight: "700" }}>
                  Cross-Department Specialist Speakers Panel (
                  {eventState.selectedEventDetail.doctors?.length || 0})
                </label>
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    margin: "5px 0 0 0",
                    color: "#334155",
                  }}
                >
                  {eventState.selectedEventDetail.doctors &&
                  eventState.selectedEventDetail.doctors.length > 0
                    ? eventState.selectedEventDetail.doctors.join(", ")
                    : "No specific clinical specialists mapped onto this track roster yet."}
                </p>
              </div>

              <div className="detail_node" style={{ marginTop: "20px" }}>
                <label>Administrative Session Notes</label>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#64748b",
                    lineHeight: "1.6",
                    background: "#fff",
                    padding: "10px",
                    border: "1px dashed #cbd5e1",
                    borderRadius: "4px",
                  }}
                >
                  {eventState.selectedEventDetail.notes ||
                    "No additional records provided for this session abstract outline."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
