import React, { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Users,
  DollarSign,
  BarChart3,
  ShieldCheck,
  Clock,
  X,
  Loader2,
  Activity,
  Star,
  AlertCircle,
  UserPlus,
} from "lucide-react";
import "./Department_Management.css";

const DEFAULT_FORM_STATE = {
  name: "",
  head: "",
  doctors: [],
  budget: 0,
  patientCount: 0,
  location: "Main Block",
  status: "Active",
  color: "#007acc",
  operatingHours: "24/7",
};

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState([]);
  const [allDoctorsRegistry, setAllDoctorsRegistry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("card");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewingDept, setViewingDept] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM_STATE);
  const [lastSynced, setLastSynced] = useState(new Date().toLocaleTimeString());
  const [appointmentsRegistry, setAppointmentsRegistry] = useState([]);
  const [feedbacksRegistry, setFeedbacksRegistry] = useState([]);

  const [doctorSearchQuery, setDoctorSearchQuery] = useState("");
  const [hodSearchQuery, setHodSearchQuery] = useState("");
  const [showHodDropdown, setShowHodDropdown] = useState(false);

  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState(
    location.state?.globalSearchQuery || "",
  );

  useEffect(() => {
    if (location.state?.globalSearchQuery !== undefined) {
      setSearchQuery(location.state.globalSearchQuery);
    }
  }, [location.state?.globalSearchQuery]);

  const hodRef = useRef(null);

  const initializeWorkspace = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };

      const [deptRes, feedbackRes, doctorsRes, apptRes] = await Promise.all([
        axios.get("http://localhost:5000/api/departments/all", config),
        axios.get("http://localhost:5000/api/feedback/all", config),
        axios.get("http://localhost:5000/api/doctors/list", config),
        axios
          .get("http://localhost:5000/api/appointments/all", config)
          .catch(() => ({ data: [] })),
      ]);

      setDepartments(deptRes.data || []);
      setFeedbacksRegistry(feedbackRes.data || []);
      setAllDoctorsRegistry(doctorsRes.data || []);
      setAppointmentsRegistry(apptRes.data || []);
      setLastSynced(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Infrastructure Workspace Sync Failure:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeWorkspace();

    const handleClickOutside = (event) => {
      if (hodRef.current && !hodRef.current.contains(event.target)) {
        setShowHodDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleDoctorSelection = (docId) => {
    setFormData((prev) => {
      const alreadySelected = prev.doctors.includes(docId);
      const updatedDoctorsArray = alreadySelected
        ? prev.doctors.filter((id) => id !== docId)
        : [...prev.doctors, docId];
      return { ...prev, doctors: updatedDoctorsArray };
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      if (isEditMode) {
        await axios.put(
          `http://localhost:5000/api/departments/update/${formData._id}`,
          formData,
          { headers },
        );
      } else {
        await axios.post(
          "http://localhost:5000/api/departments/add",
          formData,
          { headers },
        );
      }
      setIsFormOpen(false);
      setFormData(DEFAULT_FORM_STATE);
      setDoctorSearchQuery("");
      setHodSearchQuery("");
      initializeWorkspace();
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Infrastructure update failed. Ensure wing name is unique.",
      );
    }
  };

  const handleOpenEdit = (dept) => {
    const doctorIds = Array.isArray(dept.doctors)
      ? dept.doctors.map((d) => (typeof d === "object" ? d._id : d))
      : [];

    setFormData({
      ...dept,
      doctors: doctorIds,
      doctorCount: dept.doctorCount || 0,
      budget: dept.budget || 0,
      patientCount: dept.patientCount || 0,
    });
    setHodSearchQuery(dept.head || "");
    setIsEditMode(true);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Decommission this clinical wing permanently?")) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(
          `http://localhost:5000/api/departments/delete/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        initializeWorkspace();
      } catch (err) {
        alert("Deletion failed.");
      }
    }
  };

  const computedInfrastructureMatrix = useMemo(() => {
    return departments.map((dept) => {
      const departmentAppointments = appointmentsRegistry.filter(
        (appt) =>
          String(appt.department || "")
            .toLowerCase()
            .trim() ===
          String(dept.name || "")
            .toLowerCase()
            .trim(),
      );

      const rawDoctorIds = Array.isArray(dept.doctors)
        ? dept.doctors.map((d) => (typeof d === "object" ? d._id : d))
        : [];

      const linkedDoctorNames = allDoctorsRegistry
        .filter((doc) => rawDoctorIds.includes(doc._id))
        .map((doc) => (doc.name || "").toLowerCase().trim());

      const departmentReviews = feedbacksRegistry.filter((review) =>
        linkedDoctorNames.includes(
          String(review.doctorName || "")
            .toLowerCase()
            .trim(),
        ),
      );

      const reviewSum = departmentReviews.reduce(
        (sum, r) => sum + (Number(r.rating) || 0),
        0,
      );
      const dynamicSatisfactionAverage =
        departmentReviews.length > 0
          ? (reviewSum / departmentReviews.length).toFixed(1)
          : "5.0";

      return {
        ...dept,
        patientCount: departmentAppointments.length,
        rating: dynamicSatisfactionAverage,
        doctorCount: rawDoctorIds.length,
      };
    });
  }, [
    departments,
    appointmentsRegistry,
    feedbacksRegistry,
    allDoctorsRegistry,
  ]);

  const filteredDepts = useMemo(() => {
    return computedInfrastructureMatrix.filter(
      (d) =>
        (d.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.head || "").toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [computedInfrastructureMatrix, searchQuery]);

  const filteredDoctorsChecklist = useMemo(() => {
    return allDoctorsRegistry.filter((doc) => {
      const name = (doc.name || doc.doctorName || "").toLowerCase();
      const dept = (doc.department || "").toLowerCase();
      return (
        name.includes(doctorSearchQuery.toLowerCase()) ||
        dept.includes(doctorSearchQuery.toLowerCase())
      );
    });
  }, [allDoctorsRegistry, doctorSearchQuery]);

  const filteredHodSuggestions = useMemo(() => {
    return allDoctorsRegistry.filter((doc) => {
      const name = (doc.name || doc.doctorName || "").toLowerCase();
      const dept = (doc.department || "").toLowerCase();
      return (
        name.includes(hodSearchQuery.toLowerCase()) ||
        dept.includes(hodSearchQuery.toLowerCase())
      );
    });
  }, [allDoctorsRegistry, hodSearchQuery]);

  const stats = useMemo(
    () => [
      {
        label: "Total Wings",
        val: computedInfrastructureMatrix.length,
        icon: <BarChart3 size={20} />,
        color: "#007acc",
      },
      {
        label: "Active Staff",
        val: computedInfrastructureMatrix.reduce(
          (a, b) => a + Number(b.doctorCount || 0),
          0,
        ),
        icon: <Users size={20} />,
        color: "#10b981",
      },
      {
        label: "Global Budget",
        val: `₹${(computedInfrastructureMatrix.reduce((a, b) => a + Number(b.budget || 0), 0) / 1000).toFixed(0)}K`,
        icon: <DollarSign size={20} />,
        color: "#00d2ff",
      },
    ],
    [computedInfrastructureMatrix],
  );

  const activeViewingDepartmentResolved = useMemo(() => {
    if (!viewingDept) return null;
    return (
      computedInfrastructureMatrix.find((d) => d._id === viewingDept._id) ||
      viewingDept
    );
  }, [viewingDept, computedInfrastructureMatrix]);

  if (loading)
    return (
      <div className="adm_dash_load">
        <Loader2 className="adm_dash_load" /> Synchronizing Department Registry...
      </div>
    );

  return (
    <div className="adm_dept_m_root">
      <header className="adm_dept_m_header">
        <div className="adm_dept_m_branding">
          <h1>
            Clinical <span>Infrastructure</span>
          </h1>
          <p>
            Governance & Resource Allocation Center • Verified: {lastSynced}
          </p>
        </div>
        <button
          className="adm_dept_m_btn_primary"
          onClick={() => {
            setFormData(DEFAULT_FORM_STATE);
            setHodSearchQuery("");
            setIsEditMode(false);
            setIsFormOpen(true);
          }}
        >
          <Plus size={18} /> Add New Wing
        </button>
      </header>

      <div className="adm_dept_m_stats_grid">
        {stats.map((s, i) => (
          <div className="adm_dept_m_stat_tile" key={i}>
            <div
              className="adm_dept_m_tile_icon"
              style={{ color: s.color, backgroundColor: `${s.color}15` }}
            >
              {s.icon}
            </div>
            <div className="adm_dept_m_tile_meta">
              <h3>{s.val}</h3>
              <p>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="adm_dept_m_control_bar">
        <div className="adm_dept_m_search_wrapper">
          <Search size={18} />
          <input
            placeholder="Search clinical registries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="adm_dept_m_view_toggles">
          <button
            className={viewMode === "card" ? "active" : ""}
            onClick={() => setViewMode("card")}
          >
            Grid View
          </button>
          <button
            className={viewMode === "list" ? "active" : ""}
            onClick={() => setViewMode("list")}
          >
            Table View
          </button>
        </div>
      </div>

      {filteredDepts.length > 0 ? (
        <div
          className={
            viewMode === "card"
              ? "adm_dept_m_viewport_grid"
              : "adm_dept_m_viewport_list"
          }
        >
          {viewMode === "card" ? (
            filteredDepts.map((dept) => (
              <div className="adm_dept_m_card" key={dept._id}>
                <div
                  className="adm_dept_m_card_accent"
                  style={{ backgroundColor: dept.color || "#007acc" }}
                ></div>
                <div className="adm_dept_m_card_content">
                  <div className="adm_dept_m_card_head">
                    <h3>{dept.name}</h3>
                    <span
                      className={`adm_dept_m_status_tag ${dept.status?.toLowerCase()}`}
                    >
                      {dept.status}
                    </span>
                  </div>
                  <div className="adm_dept_m_card_body_nodes">
                    <div className="adm_dept_m_info_node">
                      <Users size={14} />{" "}
                      <span>{dept.doctorCount} Specialists Assigned</span>
                    </div>
                    <div className="adm_dept_m_info_node">
                      <ShieldCheck size={14} />{" "}
                      <span>Head: {dept.head || "Unassigned"}</span>
                    </div>
                    <div className="adm_dept_m_info_node">
                      <Clock size={14} />{" "}
                      <span>Roster Track: {dept.operatingHours || "24/7"}</span>
                    </div>
                    <div className="adm_dept_m_info_node adm_dept_m_quality_marker">
                      <Star size={14} fill="#eab308" color="#eab308" />{" "}
                      <span>Quality Score: {dept.rating} / 5.0</span>
                    </div>
                  </div>
                </div>
                <div className="adm_dept_m_card_footer">
                  <button
                    className="adm_dept_m_btn_icon view"
                    onClick={() => setViewingDept(dept)}
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    className="adm_dept_m_btn_icon edit"
                    onClick={() => handleOpenEdit(dept)}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="adm_dept_m_btn_icon delete"
                    onClick={() => handleDelete(dept._id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="adm_dept_m_table_scroll_frame">
              <table className="adm_dept_m_audit_ledger">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Clinical Chief</th>
                    <th>Staff Size</th>
                    <th>Fulfillment Load</th>
                    <th>Quality Benchmark</th>
                    <th>Roster Matrix</th>
                    <th className="adm_dept_m_text_right">Management</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDepts.map((dept) => (
                    <tr key={dept._id}>
                      <td>
                        <b style={{ color: dept.color }}>{dept.name}</b>
                      </td>
                      <td>{dept.head || "Unassigned"}</td>
                      <td>
                        <span className="adm_dept_m_pill_badge">
                          {dept.doctorCount} Specs
                        </span>
                      </td>
                      <td>
                        <b>{dept.patientCount} Encounters</b>
                      </td>
                      <td>
                        <span className="adm_dept_m_table_star">
                          ★ {dept.rating}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`adm_dept_m_status_tag ${dept.status?.toLowerCase()}`}
                        >
                          {dept.status}
                        </span>
                      </td>
                      <td className="adm_dept_m_text_right">
                        <div className="adm_dept_m_action_row_layout">
                          <button
                            className="adm_dept_m_btn_icon view"
                            onClick={() => setViewingDept(dept)}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            className="adm_dept_m_btn_icon edit"
                            onClick={() => handleOpenEdit(dept)}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="adm_dept_m_btn_icon delete"
                            onClick={() => handleDelete(dept._id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="adm_dept_m_empty_notice">
          <AlertCircle size={40} />
          <p>No active facility blueprints match parameter indexes.</p>
        </div>
      )}

      {isFormOpen && (
        <div className="adm_dept_m_modal_overlay">
          <div className="adm_dept_m_modal_box">
            <div className="adm_dept_m_modal_header">
              <h3>
                {isEditMode
                  ? "Modify Wing Blueprint"
                  : "Deploy Infrastructure Node"}
              </h3>
              <button
                className="adm_dept_m_close_modal_trigger"
                onClick={() => setIsFormOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <form className="adm_dept_m_form_body" onSubmit={handleFormSubmit}>
              <div className="adm_dept_m_form_field adm_dept_m_full_width">
                <label>Structural Department Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Pathology Unit"
                />
              </div>

              <div
                className="adm_dept_m_form_field adm_dept_m_full_width"
                ref={hodRef}
                style={{ position: "relative" }}
              >
                <label>Clinical Chief (HOD)</label>
                <div className="adm_dept_m_input_icon_box">
                  <Search size={14} className="adm_dept_m_inner_search_icon" />
                  <input
                    type="text"
                    required
                    value={hodSearchQuery}
                    placeholder="Search clinical chief registry..."
                    onFocus={() => setShowHodDropdown(true)}
                    onChange={(e) => {
                      setHodSearchQuery(e.target.value);
                      setFormData({ ...formData, head: e.target.value });
                    }}
                  />
                </div>
                {showHodDropdown && filteredHodSuggestions.length > 0 && (
                  <div className="adm_dept_m_hod_dropdown_scroller">
                    {filteredHodSuggestions.map((doc) => (
                      <div
                        key={doc._id}
                        className="adm_dept_m_dropdown_row"
                        onClick={() => {
                          setHodSearchQuery(doc.name);
                          setFormData({ ...formData, head: doc.name });
                          setShowHodDropdown(false);
                        }}
                      >
                        <strong>{doc.name}</strong>{" "}
                        <small>({doc.department})</small>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="adm_dept_m_form_field adm_dept_m_full_width">
                <label>
                  <UserPlus size={14} /> Assign Medical Team Panels
                </label>
                <div className="adm_dept_m_search_mini_wrapper">
                  <Search size={12} />
                  <input
                    placeholder="Filter clinicians by tag..."
                    value={doctorSearchQuery}
                    onChange={(e) => setDoctorSearchQuery(e.target.value)}
                  />
                </div>
                <div className="adm_dept_m_checkbox_scroll_container">
                  {filteredDoctorsChecklist.map((doc) => (
                    <label key={doc._id} className="adm_dept_m_checkbox_row">
                      <input
                        type="checkbox"
                        checked={formData.doctors.includes(doc._id)}
                        onChange={() => handleToggleDoctorSelection(doc._id)}
                      />
                      <span>
                        {doc.name} <small>({doc.department})</small>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="adm_dept_m_form_field">
                <label>Operational Financial Budget (₹)</label>
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleInputChange}
                />
              </div>
              <div className="adm_dept_m_form_field">
                <label>Facility Location Wing</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                />
              </div>
              <div className="adm_dept_m_form_field">
                <label>Roster Hours Matrix</label>
                <input
                  type="text"
                  name="operatingHours"
                  value={formData.operatingHours}
                  onChange={handleInputChange}
                />
              </div>
              <div className="adm_dept_m_form_field">
                <label>Roster Operational Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="Active">Active</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Decommissioned">Decommissioned</option>
                </select>
              </div>
              <div className="adm_dept_m_form_field">
                <label>Hex Element Accent Branding</label>
                <input
                  type="color"
                  name="color"
                  value={formData.color}
                  onChange={handleInputChange}
                  className="adm_dept_m_color_picker"
                />
              </div>

              <button type="submit" className="adm_dept_m_submit_btn">
                {isEditMode
                  ? "Save Configuration Matrix"
                  : "Deploy Infrastructure Node"}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeViewingDepartmentResolved && (
        <div
          className="adm_dept_m_modal_overlay"
          onClick={() => setViewingDept(null)}
        >
          <div
            className="adm_dept_m_modal_box adm_dept_m_view_only_adjustment"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="adm_dept_m_card_accent"
              style={{ backgroundColor: activeViewingDepartmentResolved.color }}
            ></div>
            <div className="adm_dept_m_modal_header">
              <h2>{activeViewingDepartmentResolved.name} Operations Matrix</h2>
              <button
                className="adm_dept_m_close_modal_trigger"
                onClick={() => setViewingDept(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="adm_dept_m_view_only_body">
              <div className="adm_dept_m_detail_node_grid">
                <div className="adm_dept_m_node_field">
                  <label>Clinical Unit Chief</label>
                  <strong>
                    {activeViewingDepartmentResolved.head || "Unassigned Head"}
                  </strong>
                </div>
                <div className="adm_dept_m_node_field">
                  <label>Patient Encounter Load</label>
                  <strong style={{ color: "#2563eb" }}>
                    {activeViewingDepartmentResolved.patientCount} Appointments
                  </strong>
                </div>
                <div className="adm_dept_m_node_field">
                  <label>Satisfaction Benchmark</label>
                  <strong style={{ color: "#eab308" }}>
                    ★ {activeViewingDepartmentResolved.rating} / 5.0 Baseline
                  </strong>
                </div>
                <div className="adm_dept_m_node_field">
                  <label>Facility Core Location</label>
                  <strong>
                    {activeViewingDepartmentResolved.location || "Main Block"}
                  </strong>
                </div>
              </div>
              <div className="adm_dept_m_node_field full_width_block">
                <label style={{ color: activeViewingDepartmentResolved.color }}>
                  Assigned Medical Staff Panel (
                  {activeViewingDepartmentResolved.doctorCount})
                </label>
                <p>
                  {Array.isArray(activeViewingDepartmentResolved.doctors) &&
                  activeViewingDepartmentResolved.doctors.length > 0
                    ? allDoctorsRegistry
                        .filter((doc) => {
                          const idToCompare =
                            typeof doc === "object" ? doc._id : doc;
                          return activeViewingDepartmentResolved.doctors.some(
                            (dId) =>
                              (typeof dId === "object" ? dId._id : dId) ===
                              idToCompare,
                          );
                        })
                        .map((doc) => doc.name)
                        .join(", ") ||
                      "No active matching specialists found in registry."
                    : "No individual clinician nodes registered under this sector wing footprint."}
                </p>
              </div>
              <button
                className="adm_dept_m_submit_btn"
                style={{
                  backgroundColor: activeViewingDepartmentResolved.color,
                  marginTop: "20px",
                }}
                onClick={() => setViewingDept(null)}
              >
                Dismiss Panel View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
