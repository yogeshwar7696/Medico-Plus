import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  Search,
  User,
  ArrowLeft,
  Phone,
  Mail,
  Scale,
  Ruler,
  Zap,
  ChevronRight,
  ChevronLeft,
  X,
  Loader2,
  Pill,
  FlaskConical,
  ShoppingCart,
  Send,
  Calendar,
  Clock,
  Activity,
  Filter,
  UserCheck,
  Users,
} from "lucide-react";
import "./Doctor_Patient_Management.css";

export default function Patients() {
  const navigate = useNavigate();
  const rowsPerPage = 5;

  /* --- SECTION: CORE STATE MANAGEMENT --- */
  const [dateFilter, setDateFilter] = useState("");
  const [classificationFilter, setClassificationFilter] = useState("All");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isDetailView, setIsDetailView] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [inventory, setInventory] = useState({ medicines: [], tests: [] });
  const [orderQuery, setOrderQuery] = useState("");
  const [selectedResource, setSelectedResource] = useState(null);
  const [prescriptionCount, setPrescriptionCount] = useState(1);
  const [isOrdering, setIsOrdering] = useState(false);
  const [activeInspectionAppt, setActiveInspectionAppt] = useState(null);

  const doctorUser = JSON.parse(localStorage.getItem("userData")) || {};
  const currentDocName = doctorUser.name || "Dr. Guest";

  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState(
    location.state?.globalSearchQuery || "",
  );

  // Syncs the local search input instantly whenever a query string streams from Doctor_Home.jsx
  useEffect(() => {
    if (location.state?.globalSearchQuery !== undefined) {
      setSearchTerm(location.state.globalSearchQuery);
      setIsDetailView(false);
      setCurrentPage(1);
    }
  }, [location.state?.globalSearchQuery]);

  /* --- SECTION: DATA SYNCHRONIZATION PIPELINE --- */
  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [patRes, apptRes, medRes, testRes] = await Promise.all([
        axios
          .get("http://localhost:5000/api/patients/all", { headers })
          .catch(() => ({ data: [] })),
        axios
          .get("http://localhost:5000/api/appointments/all", { headers })
          .catch(() => ({ data: [] })),
        axios
          .get("http://localhost:5000/api/medicines/all", { headers })
          .catch(() => ({ data: [] })),
        axios
          .get("http://localhost:5000/api/tests/all", { headers })
          .catch(() => ({ data: [] })),
      ]);

      setPatients(patRes.data);
      setAppointments(apptRes.data);
      setInventory({ medicines: medRes.data, tests: testRes.data });
    } catch (err) {
      console.error("Clinical Registry critical failure:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* --- SECTION: COMPUTED REGISTRY FILTERS --- */
  const filteredPatients = useMemo(() => {
    const seenPatientNames = [
      ...new Set(
        appointments
          .filter((appt) => appt.doctorName === currentDocName)
          .map((appt) => appt.patientName),
      ),
    ];

    return patients.filter((p) => {
      const isEstablished = seenPatientNames.includes(p.name);
      if (!isEstablished) return false;

      const matchesSearch = p.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const patAppts = appointments.filter((a) => a.patientName === p.name);
      const matchesDate = dateFilter
        ? patAppts.some((a) => a.date === dateFilter)
        : true;
      const matchesClass =
        classificationFilter === "All"
          ? true
          : patAppts.some((a) => a.type === classificationFilter);

      return matchesSearch && matchesDate && matchesClass;
    });
  }, [
    patients,
    appointments,
    currentDocName,
    searchTerm,
    dateFilter,
    classificationFilter,
  ]);

  const currentPatients = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredPatients.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredPatients, currentPage]);

  const totalPages = Math.ceil(filteredPatients.length / rowsPerPage);

  /* --- SECTION: SEGREGATED HISTORICAL ATTRIBUTES --- */
  const doctorSpecificHistory = useMemo(() => {
    if (!selectedPatient) return [];
    return appointments
      .filter(
        (a) =>
          a.patientName === selectedPatient.name &&
          a.doctorName === currentDocName,
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [selectedPatient, appointments, currentDocName]);

  const externalDoctorsHistory = useMemo(() => {
    if (!selectedPatient) return [];
    return appointments
      .filter(
        (a) =>
          a.patientName === selectedPatient.name &&
          a.doctorName !== currentDocName,
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [selectedPatient, appointments, currentDocName]);

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

  /* --- SECTION: TRANSACTION TERMINAL HOOKS --- */
  const commitPrescriptionToVault = async () => {
    if (!selectedResource || !selectedPatient) return;
    setIsOrdering(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        patientId: selectedPatient._id,
        type:
          selectedResource.type === "Test" ? "Lab Reports" : "Prescriptions",
        name: `Prescription: ${selectedResource.name}`,
        codename: `ORDER_PENDING_${Date.now()}.pdf`,
        resourceId: selectedResource._id,
        onModel: selectedResource.type === "Test" ? "Tests" : "Medicines",
        prescribedCount: parseInt(prescriptionCount, 10),
        unitPrice: selectedResource.price,
        size: 1024,
        mimeType: "application/pdf",
      };

      await axios.post(
        "http://localhost:5000/api/patient/vault/upload-structured",
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      alert("Clinical requisition committed to vault.");
      setSelectedResource(null);
      setOrderQuery("");
      setPrescriptionCount(1);
    } catch (err) {
      alert("Vault sync failed. Ensure structured data endpoints exist.");
    } finally {
      setIsOrdering(false);
    }
  };

  if (loading)
    return (
      <div className="doc_pat_m_loading">
        <Loader2 className="doc_pat_m_spin" size={24} /> Opening Clinical
        Vault...
      </div>
    );

  return (
    <div className="doc_pat_m_root doc_pat_m_page_fade_in">
      {!isDetailView ? (
        <div className="doc_pat_m_list_view">
          <header className="doc_pat_m_section_header">
            <div className="doc_pat_m_branding">
              <h1 className="doc_pat_m_title_elite">
                Patient <span className="doc_pat_m_highlight">Registry</span>
              </h1>
              <p className="doc_pat_m_subtitle">
                {filteredPatients.length} patient profiles matched under active
                queries
              </p>
            </div>
            <button
              className="doc_pat_m_dash_btn_primary"
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

          {/* DYNAMIC REGISTRY SUB-FILTERS INTERFACE BAR */}
          <div className="doc_pat_m_filter_bar">
            <div className="doc_pat_m_search_box">
              <Search size={18} />
              <input
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="doc_pat_m_filter_controls_stack">
              <div className="doc_pat_m_date_filter_wrap">
                <Calendar size={16} />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <div className="doc_pat_m_dropdown_filter_wrap">
                <Filter size={16} />
                <select
                  value={classificationFilter}
                  onChange={(e) => {
                    setClassificationFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="All">All Visit Types</option>
                  <option value="Consultation">Consultation</option>
                  <option value="Follow-up">Follow-up</option>
                </select>
              </div>
              {(searchTerm || dateFilter || classificationFilter !== "All") && (
                <button
                  className="doc_pat_m_clear_filter_btn"
                  onClick={() => {
                    setSearchTerm("");
                    setDateFilter("");
                    setClassificationFilter("All");
                    setCurrentPage(1);
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="doc_pat_m_table_container">
            <table className="doc_pat_m_table">
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Reason / Medical Tag</th>
                  <th>Patient Demographics</th>
                  <th className="doc_pat_m_text_right">Action</th>
                </tr>
              </thead>
              <tbody>
                {currentPatients.map((p) => {
                  // 1. DYNAMIC PHOTO PARSING & GRACEFUL ERROR FALLBACKS
                  const dynamicAvatarSource = p.photo?.startsWith("http")
                    ? p.photo
                    : p.photo
                      ? `http://localhost:5000/uploads/${p.photo}`
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || "P")}&background=e2e8f0&color=64748b&bold=true`;

                  return (
                    <tr key={p._id}>
                      <td>
                        <div className="doc_pat_m_cell_user">
                          <div className="doc_pat_m_avatar_container_refined">
                            <img
                              src={dynamicAvatarSource}
                              alt={p.name}
                              className="doc_pat_m_table_patient_avatar_img"
                              onError={(e) => {
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || "P")}&background=e2e8f0&color=64748b&bold=true`;
                              }}
                            />
                          </div>
                          <div className="doc_pat_m_user_meta">
                            <b>{p.name}</b>
                            <span>ID: {p._id.slice(-6).toUpperCase()}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="doc_pat_m_disease_tag">
                          {p.disease || "General Checkup"}
                        </span>
                      </td>
                      <td>
                        {/* 2. ADDED DYNAMIC BIOMETRICS STACK INSTEAD OF STATUS */}
                        <div className="doc_pat_m_table_demographics_stack">
                          <span className="doc_pat_m_demog_badge_gender">
                            {p.gender || "N/A"}
                          </span>
                          <span className="doc_pat_m_demog_span_item">
                            <strong>{p.age || "24"} Yrs</strong>
                          </span>
                        </div>
                      </td>
                      <td className="doc_pat_m_text_right">
                        <button
                          className="doc_pat_m_btn_manage"
                          onClick={() => {
                            setSelectedPatient(p);
                            setIsDetailView(true);
                          }}
                        >
                          Open EHR
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="doc_pat_m_pagination_bar">
              <div className="doc_pat_m_pag_buttons">
                <button
                  className="doc_pat_m_pag_nav_btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="doc_pat_m_pag_indicator">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="doc_pat_m_pag_nav_btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="doc_pat_m_patient_workspace doc_pat_m_page_fade_in">
          <div className="doc_pat_m_detail_nav">
            <button
              className="doc_pat_m_back_btn"
              onClick={() => setIsDetailView(false)}
            >
              <ArrowLeft size={18} /> Back to Registry
            </button>
          </div>

          {/* ROW 1: SPLIT DETAILS BLOCK WITH IMAGE FILLING THE FULL RIGHT PANEL HEIGHT */}
          <div className="doc_pat_m_workspace_upper_row">
            <div className="doc_pat_m_card_refined doc_pat_m_split_info_container">
              <div className="doc_pat_m_demographics_left_panel">
                <div className="doc_pat_m_patient_headline_group">
                  <h2>{selectedPatient.name}</h2>
                  <span className="doc_pat_m_id_pill">
                    {selectedPatient.gender} • {selectedPatient.age || "24"}{" "}
                    Years
                  </span>
                </div>

                <div className="doc_pat_m_vitals_horizontal_grid">
                  <div className="doc_pat_m_strip_metric_box">
                    <Ruler size={14} />
                    <span>
                      Height: <strong>{selectedPatient.bmi || "NA"} cm</strong>
                    </span>
                  </div>
                  <div className="doc_pat_m_strip_metric_box">
                    <Scale size={14} />
                    <span>
                      Weight:{" "}
                      <strong>{selectedPatient.weight || "68"} kg</strong>
                    </span>
                  </div>
                  <div className="doc_pat_m_strip_metric_box">
                    <Activity size={14} />
                    <span>
                      Blood Group:{" "}
                      <strong>{selectedPatient.bloodGroup || "B+"}</strong>
                    </span>
                  </div>
                  <div className="doc_pat_m_strip_metric_box">
                    <Activity size={14} style={{ color: "#d97706" }} />
                    <span>
                      BMI Index:: <strong>{selectedPatient.bmi || "B+"}</strong>
                    </span>
                  </div>
                </div>

                <div className="doc_pat_m_contact_info_box">
                  <div className="doc_pat_m_contact_line">
                    <Phone size={14} />{" "}
                    <span>{selectedPatient.contact || "N/A"}</span>
                  </div>
                  <div className="doc_pat_m_contact_line">
                    <Mail size={14} />{" "}
                    <span>{selectedPatient.email || "N/A"}</span>
                  </div>
                  {selectedPatient.emergencyContact && (
                    <div className="doc_pat_m_contact_line doc_pat_m_backup_emergency_line">
                      <span className="doc_pat_m_emergency_alert_tag">
                        Emergency Contact:
                      </span>
                      <strong>{selectedPatient.emergencyContact}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Patient Photo Frame occupying the absolute full right column tier */}
              <div className="doc_pat_m_photo_right_panel">
                <img
                  src={
                    selectedPatient?.photo
                      ? `http://localhost:5000/uploads/${selectedPatient.photo}`
                      : "https://via.placeholder.com/150"
                  }
                  className="doc_pat_m_full_height_dossier_image"
                  alt="Patient Identity Portfolio"
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/150";
                  }}
                />
              </div>
            </div>
          </div>

          {/* ROW 2: SPLIT HISTORICAL ARCHITECTURE (HISTORY WITH YOU VS WITH OTHERS) */}
          <div className="doc_pat_m_workspace_lower_row">
            {/* COLUMN A: HISTORY WITH ACTIVE LOGGED DOCTOR */}
            <div className="doc_pat_m_card_refined doc_pat_m_history_split_panel">
              <h4 className="doc_pat_m_history_title doc_pat_m_medico_teal_header">
                <UserCheck size={16} /> History with You (
                {doctorSpecificHistory.length})
              </h4>
              <div className="doc_pat_m_history_list_stack doc_pat_m_vertical_scroll_lock_container">
                {doctorSpecificHistory.length > 0 ? (
                  doctorSpecificHistory.map((appt) => (
                    <div
                      key={appt._id}
                      className="doc_pat_m_history_card_item doc_pat_m_clickable_case_row doc_pat_m_own_encounter_node"
                      onClick={() => setActiveInspectionAppt(appt)}
                    >
                      <div className="doc_pat_m_case_row_left_stack">
                        <div className="doc_pat_m_case_badge_date_info">
                          <strong>{appt.date}</strong>
                          <span className="doc_pat_m_case_consultant_label">
                            {appt.type || "Consultation"}
                          </span>
                        </div>
                        <p className="doc_pat_m_case_notes_truncate_preview">
                          {appt.notes ||
                            "No clinical diagnostic summary logged."}
                        </p>
                      </div>
                      <div className="doc_pat_m_case_row_right_flex">
                        <span
                          className={`doc_pat_m_case_status_pill doc_pat_m_status_${appt.status.toLowerCase()}`}
                        >
                          {appt.status}
                        </span>
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="doc_pat_m_empty_text">
                    No prior consultations recorded with your profile.
                  </p>
                )}
              </div>
            </div>

            {/* COLUMN B: HISTORY WITH EXTERNAL SECTOR SPECIALISTS */}
            <div className="doc_pat_m_card_refined doc_pat_m_history_split_panel">
              <h4 className="doc_pat_m_history_title doc_pat_m_medico_blue_header">
                <Users size={16} /> History with Other Doctors (
                {externalDoctorsHistory.length})
              </h4>
              <div className="doc_pat_m_history_list_stack doc_pat_m_vertical_scroll_lock_container">
                {externalDoctorsHistory.length > 0 ? (
                  externalDoctorsHistory.map((appt) => (
                    <div
                      key={appt._id}
                      className="doc_pat_m_history_card_item doc_pat_m_clickable_case_row doc_pat_m_external_encounter_node"
                      onClick={() => setActiveInspectionAppt(appt)}
                    >
                      <div className="doc_pat_m_case_row_left_stack">
                        <div className="doc_pat_m_case_badge_date_info">
                          <strong>{appt.date}</strong>
                          <span className="doc_pat_m_case_consultant_label">
                            Dr. {appt.doctorName}
                          </span>
                        </div>
                        <p className="doc_pat_m_case_notes_truncate_preview">
                          {appt.notes ||
                            "No clinical diagnostic summary logged."}
                        </p>
                      </div>
                      <div className="doc_pat_m_case_row_right_flex">
                        <span
                          className={`doc_pat_m_case_status_pill doc_pat_m_status_${appt.status.toLowerCase()}`}
                        >
                          {appt.status}
                        </span>
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="doc_pat_m_empty_text">
                    No prior consultation records logged with other
                    practitioners.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INSPECTION OVERLAY POPUP MODAL SCREEN */}
      {activeInspectionAppt && (
        <div className="doc_pat_m_clinical_inspection_modal_overlay">
          <div className="doc_pat_m_inspection_modal_card_blueprint doc_pat_m_page_fade_in">
            <div className="doc_pat_m_inspection_modal_header">
              <div>
                <h3>Case Log Details</h3>
                <span className="doc_pat_m_modal_ref_id">
                  Reference Ticket:{" "}
                  {activeInspectionAppt.appointmentID ||
                    activeInspectionAppt._id}
                </span>
              </div>
              <button
                className="doc_pat_m_close_modal_action"
                onClick={() => setActiveInspectionAppt(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="doc_pat_m_inspection_modal_body_content">
              <div className="doc_pat_m_modal_meta_grid_layout">
                <div className="doc_pat_m_modal_meta_cell">
                  <Calendar size={14} />{" "}
                  <span>
                    Date: <strong>{activeInspectionAppt.date}</strong>
                  </span>
                </div>
                <div className="doc_pat_m_modal_meta_cell">
                  <Clock size={14} />{" "}
                  <span>
                    Time Slot: <strong>{activeInspectionAppt.time}</strong>
                  </span>
                </div>
                <div className="doc_pat_m_modal_meta_cell">
                  <User size={14} />{" "}
                  <span>
                    Consultant:{" "}
                    <strong>Dr. {activeInspectionAppt.doctorName}</strong>
                  </span>
                </div>
                <div className="doc_pat_m_modal_meta_cell">
                  <Activity size={14} />{" "}
                  <span>
                    Department:{" "}
                    <strong>
                      {activeInspectionAppt.department || "General"}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="doc_pat_m_modal_clinical_findings_box">
                <h4>Clinical Findings & Diagnostics Notes:</h4>
                <p>
                  "
                  {activeInspectionAppt.notes ||
                    "No general clinical findings documented for this case channel."}
                  "
                </p>
              </div>

              <div className="doc_pat_m_modal_rx_dispatched_block">
                <h4>Prescribed Items Matrix:</h4>
                {activeInspectionAppt.prescribedItems &&
                activeInspectionAppt.prescribedItems.length > 0 ? (
                  <div className="doc_pat_m_modal_rx_table_wrapper">
                    {activeInspectionAppt.prescribedItems.map((item, idx) => (
                      <div key={idx} className="doc_pat_m_modal_rx_item_row">
                        <div className="doc_pat_m_rx_item_main_identity">
                          <strong>{item.name}</strong>
                          <span className="doc_pat_m_rx_item_type_tag">
                            {item.type}
                          </span>
                        </div>
                        <div className="doc_pat_m_rx_item_clinical_dosage_meta">
                          <span>
                            Quantity: <strong>{item.quantity} units</strong>
                          </span>
                          {item.type === "Medicine" && (
                            <>
                              <span className="doc_pat_m_divider_dot">•</span>
                              <span>
                                Intake: <strong>{item.intake}</strong>
                              </span>
                              <span className="doc_pat_m_divider_dot">•</span>
                              <span>
                                Instruction: <strong>{item.instruction}</strong>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="doc_pat_m_no_rx_logged_warning">
                    No pharmacotherapy orders or diagnostics items linked to
                    this encounter.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
