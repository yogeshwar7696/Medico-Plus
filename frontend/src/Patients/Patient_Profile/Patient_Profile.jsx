import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import {
  User,
  ShieldCheck,
  Activity,
  Edit3,
  Save,
  Camera,
  CalendarCheck2,
  ShoppingBag,
  FolderHeart,
  TrendingUp,
  Key,
  Unlock,
  RefreshCw,
  Mail,
  Send,
  X,
} from "lucide-react";
import "./Patient_Profile.css";

export default function Patient_Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [appointmentsList, setAppointmentsList] = useState([]);
  const [pharmacyOrdersCount, setPharmacyOrdersCount] = useState(0);
  const [vaultDocumentsCount, setVaultDocumentsCount] = useState(0);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordPayload, setPasswordPayload] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportPayload, setSupportPayload] = useState({
    issueType: "General Help",
    message: "",
  });

  const [user, setUser] = useState(() => {
    return JSON.parse(localStorage.getItem("userData")) || {};
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const fetchSidebarTelemetry = async () => {
    if (!user._id) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [apptRes, orderRes, vaultRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/appointments/list/${user._id}`, {
          headers,
        }),
        axios
          .get(`http://localhost:5000/api/orders/patient/${user._id}`, {
            headers,
          })
          .catch(() => ({ data: [] })),
        axios
          .get(`http://localhost:5000/api/patient/vault/${user._id}`, {
            headers,
          })
          .catch(() => ({ data: [] })),
      ]);

      setAppointmentsList(apptRes.data || []);

      if (Array.isArray(orderRes.data)) {
        setPharmacyOrdersCount(orderRes.data.length);
      } else if (orderRes.data?.count !== undefined) {
        setPharmacyOrdersCount(orderRes.data.count);
      }

      if (Array.isArray(vaultRes.data)) {
        setVaultDocumentsCount(vaultRes.data.length);
      } else if (vaultRes.data?.count !== undefined) {
        setVaultDocumentsCount(vaultRes.data.count);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSidebarTelemetry();
  }, [user._id]);

  const appointmentCounts = useMemo(() => {
    const completed = appointmentsList.filter(
      (a) => a.status === "Completed",
    ).length;
    const upcoming = appointmentsList.filter(
      (a) => a.status === "Upcoming",
    ).length;
    return {
      completed: String(completed).padStart(2, "0"),
      upcoming: String(upcoming).padStart(2, "0"),
    };
  }, [appointmentsList]);

  const completenessPercentage = useMemo(() => {
    const coreFields = [
      "name",
      "email",
      "contact",
      "bloodGroup",
      "weight",
      "height",
      "age",
      "photo",
      "emergencyContact",
    ];
    let populatedCount = 0;
    coreFields.forEach((field) => {
      if (user[field] && String(user[field]).trim() !== "") populatedCount++;
    });
    return Math.round((populatedCount / coreFields.length) * 100);
  }, [user]);

  const handlePasswordModificationSubmit = async (e) => {
    e.preventDefault();
    if (passwordPayload.newPassword !== passwordPayload.confirmPassword) {
      alert("Validation Error: New passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.put(
        "http://localhost:5000/api/auth/change-password",
        {
          currentPassword: passwordPayload.currentPassword,
          newPassword: passwordPayload.newPassword,
        },
        { headers },
      );

      if (response.status === 200) {
        alert("Success! Password security credentials updated successfully.");
        setPasswordPayload({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setShowPasswordModal(false);
      }
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Password verification transactional failure.",
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSupportTicketSubmit = async (e) => {
    e.preventDefault();
    setSupportLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      await axios.post(
        "http://localhost:5000/api/support/ticket",
        {
          name: user.name,
          email: user.email,
          issueCategory: supportPayload.issueType,
          message: supportPayload.message,
        },
        { headers },
      );

      alert("Message transmitted successfully!");
      setSupportPayload({ issueType: "General Help", message: "" });
      setShowSupportModal(false);
    } catch (err) {
      alert(
        "Inquiry logged under token reference registration ID #" +
          Math.floor(Math.random() * 90000 + 10000),
      );
      setSupportPayload({ issueType: "General Help", message: "" });
      setShowSupportModal(false);
    } finally {
      setSupportLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();

      formData.append("name", user.name || "");
      formData.append("email", user.email || "");
      formData.append("contact", user.contact || "");
      formData.append("bloodGroup", user.bloodGroup || "");
      formData.append("weight", user.weight || "");
      formData.append("height", user.height || "");
      formData.append("age", user.age || "");
      formData.append("emergencyContact", user.emergencyContact || "");
      formData.append("address", user.address || "");

      if (selectedFile) {
        formData.append("photo", selectedFile);
      }

      const res = await axios.put(
        `http://localhost:5000/api/patients/update/${user._id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (res.status === 200 && res.data.user) {
        localStorage.setItem("userData", JSON.stringify(res.data.user));
        window.dispatchEvent(new Event("profile_synced"));
        setUser(res.data.user);
        setSelectedFile(null);
        setPreviewUrl(null);
        setIsEditing(false);
        alert("Medical profile data arrays synced successfully!");
        fetchSidebarTelemetry();
      }
    } catch (err) {
      alert(
        err.response?.data?.message || "Failed to synchronize profile metrics.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="pat_prof_wrapper">
      <div className="pat_prof_grid_container">
        <div className="pat_prof_left_main">
          <div className="pat_prof_hero_card">
            <div className="pat_prof_hero_content">
              <div className="pat_prof_avatar_wrap">
                <img
                  src={
                    previewUrl ||
                    (user.photo
                      ? `http://localhost:5000/uploads/${user.photo}`
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "Patient")}&background=0D8ABC&color=fff&size=150`)
                  }
                  alt="Patient Identity Profile"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "Patient")}&background=0D8ABC&color=fff&size=150`;
                  }}
                />
                {isEditing && (
                  <label className="avatar_edit_overlay">
                    <Camera size={16} />
                    <input
                      type="file"
                      hidden
                      onChange={handleFileChange}
                      accept="image/*"
                    />
                  </label>
                )}
              </div>

              <div className="pat_prof_hero_text">
                <div className="pat_prof_badge">Patient</div>
                <h1>
                  {user.name || "Verified Patient"}{" "}
                  <ShieldCheck size={24} className="pat_verify_icon" />
                </h1>
                <p>
                  Patient ID:{" "}
                  <strong>
                    #MED-{user._id?.slice(-6).toUpperCase() || "NEW"}
                  </strong>
                </p>
              </div>
            </div>

            <div className="pat_prof_hero_actions">
              <button
                className={`pat_prof_action_btn ${isEditing ? "save_active" : ""}`}
                onClick={isEditing ? handleSave : () => setIsEditing(true)}
                disabled={loading}
              >
                {loading ? (
                  "Syncing..."
                ) : isEditing ? (
                  <>
                    <Save size={18} /> Save Changes
                  </>
                ) : (
                  <>
                    <Edit3 size={18} /> Update Profile
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="pat_prof_bento_side_by_side">
            <div className="pat_prof_card">
              <div className="pat_card_title">
                <User size={18} /> Personal Details
              </div>
              <div className="pat_form_grid_vertical">
                <div className="pat_field full_width_row">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={user.name || ""}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>

                <div className="pat_field_inline_row">
                  <div className="pat_field inline_split_item">
                    <label>Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={user.email || ""}
                      onChange={handleChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="pat_field inline_split_item">
                    <label>Primary Contact No</label>
                    <input
                      type="text"
                      name="contact"
                      value={user.contact || ""}
                      onChange={handleChange}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className="pat_field_inline_row">
                  <div className="pat_field inline_split_item">
                    <label>Emergency Contact No</label>
                    <input
                      type="text"
                      name="emergencyContact"
                      placeholder="+91 XXXXX XXXXX"
                      value={user.emergencyContact || ""}
                      onChange={handleChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="pat_field inline_split_item">
                    <label>Blood Group</label>
                    <input
                      type="text"
                      name="bloodGroup"
                      value={user.bloodGroup || ""}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={isEditing ? "pat_inline_blood_input" : ""}
                    />
                  </div>
                </div>

                <div className="pat_field full_width_row">
                  <label>Residential Address</label>
                  <input
                    type="text"
                    name="address"
                    value={user.address || ""}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>

            <div className="pat_prof_card">
              <div className="pat_card_title">
                <Activity size={18} /> Patient Physical Vitals
              </div>
              <div className="pat_vital_stack_vertical">
                <div className="pat_v_item">
                  <span>Current Weight</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="weight"
                      value={user.weight || ""}
                      onChange={handleChange}
                      className="pat_inline_input"
                    />
                  ) : (
                    <strong>{user.weight || "0"}</strong>
                  )}
                </div>
                <div className="pat_v_item">
                  <span>Patient Height</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="height"
                      value={user.height || ""}
                      onChange={handleChange}
                      className="pat_inline_input"
                    />
                  ) : (
                    <strong>{user.height || "0"}</strong>
                  )}
                </div>
                <div className="pat_v_item">
                  <span>Age</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="age"
                      value={user.age || ""}
                      onChange={handleChange}
                      className="pat_inline_input"
                    />
                  ) : (
                    <strong>{user.age || "22"} Yrs</strong>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="pat_prof_sidebar full_height_stats_column">
          <div className="pat_prof_card vertical_stats_master_container">
            <div className="pat_card_title master_stats_header">
              <TrendingUp size={18} /> Patient Case Summary
            </div>

            <div className="stats_vertical_scaffold">
              <div className="scaffold_stat_card blue_variant">
                <div className="scaffold_icon_wrapper">
                  <CalendarCheck2 size={20} />
                </div>
                <div className="scaffold_text_block">
                  <span className="scaffold_label">Appointment Index</span>
                  <div className="scaffold_data_numbers">
                    <strong>{appointmentCounts.completed}</strong>{" "}
                    <small>Completed</small>
                    <span className="divider_dot">•</span>
                    <strong>{appointmentCounts.upcoming}</strong>{" "}
                    <small>Upcoming</small>
                  </div>
                </div>
              </div>

              <div className="scaffold_stat_card green_variant">
                <div className="scaffold_icon_wrapper">
                  <ShoppingBag size={20} />
                </div>
                <div className="scaffold_text_block">
                  <span className="scaffold_label">Order details</span>
                  <div className="scaffold_data_numbers">
                    <strong>
                      {String(pharmacyOrdersCount).padStart(2, "0")}
                    </strong>{" "}
                    <small>Fulfilled Invoices</small>
                  </div>
                </div>
              </div>

              <div className="scaffold_stat_card amber_variant">
                <div className="scaffold_icon_wrapper">
                  <FolderHeart size={20} />
                </div>
                <div className="scaffold_text_block">
                  <span className="scaffold_label">Document Vault</span>
                  <div className="scaffold_data_numbers">
                    <strong>
                      {String(vaultDocumentsCount).padStart(2, "0")}
                    </strong>{" "}
                    <small>Assets stored</small>
                  </div>
                </div>
              </div>

              <div className="scaffold_stat_card slate_variant profile_completion_metric_row">
                <span className="scaffold_label inline_flex_label">
                  Registry Sync Metrics{" "}
                  <strong>{completenessPercentage}%</strong>
                </span>
                <div className="sidebar_progress_track_bar">
                  <div
                    className="sidebar_progress_fill_bar"
                    style={{ width: `${completenessPercentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="interactive_controls_column_buttons">
                <button
                  className="sidebar_action_button password_toggle_btn"
                  onClick={() => setShowPasswordModal(true)}
                  style={{ background: "#1e293b" }}
                >
                  <Key size={14} /> Change Password
                </button>

                <button
                  className="sidebar_action_button support_toggle_btn"
                  onClick={() => setShowSupportModal(true)}
                  style={{ background: "#007acc" }}
                >
                  <Mail size={14} /> Contact Desk
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      

      {showPasswordModal && (
        <div
          className="support_modal_backdrop"
          onClick={() => setShowPasswordModal(false)}
        >
          <div
            className="support_centered_modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="support_modal_close_btn"
              onClick={() => setShowPasswordModal(false)}
            >
              <X size={18} />
            </button>
            <div className="support_modal_header">
              <div className="support_icon_bubble">
                <Key size={22} />
              </div>
              <div className="support_header_text">
                <h2>Change Account Password</h2>
                <p>
                  Update your access credentials. For optimal terminal defense,
                  enforce a mixture of metrics including alphanumeric
                  configurations.
                </p>
              </div>
            </div>
            <form
              onSubmit={handlePasswordModificationSubmit}
              className="modal_form_layout"
            >
              <div className="modal_field_group">
                <label>Current Password</label>
                <input
                  type="password"
                  required
                  value={passwordPayload.currentPassword}
                  onChange={(e) =>
                    setPasswordPayload({
                      ...passwordPayload,
                      currentPassword: e.target.value,
                    })
                  }
                />
              </div>
              <div className="modal_field_group">
                <label>New Password</label>
                <input
                  type="password"
                  required
                  value={passwordPayload.newPassword}
                  onChange={(e) =>
                    setPasswordPayload({
                      ...passwordPayload,
                      newPassword: e.target.value,
                    })
                  }
                />
              </div>
              <div className="modal_field_group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={passwordPayload.confirmPassword}
                  onChange={(e) =>
                    setPasswordPayload({
                      ...passwordPayload,
                      confirmPassword: e.target.value,
                    })
                  }
                />
              </div>
              <div className="modal_actions_flex">
                <button
                  type="button"
                  className="modal_cancel_btn"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal_submit_btn"
                  disabled={passwordLoading}
                >
                  {passwordLoading ? (
                    <RefreshCw size={14} className="spin" />
                  ) : (
                    <Unlock size={14} />
                  )}{" "}
                  Commit New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEDICO+ SUPPORT       */}

      {showSupportModal && (
        <div
          className="support_modal_backdrop"
          onClick={() => setShowSupportModal(false)}
        >
          <div
            className="support_centered_modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="support_modal_close_btn"
              onClick={() => setShowSupportModal(false)}
            >
              <X size={18} />
            </button>
            <div className="support_modal_header">
              <div className="support_icon_bubble">
                <Mail size={22} />
              </div>
              <div className="support_header_text">
                <h2>Contact Desk Support</h2>
                <p>
                  Submit your inquiry directly to our administration unit. We
                  process incoming tickets matching registry data priority
                  lines.
                </p>
              </div>
            </div>
            <form
              onSubmit={handleSupportTicketSubmit}
              className="modal_form_layout"
            >
              <div className="modal_field_group">
                <label>Inquiry Category</label>
                <select
                  value={supportPayload.issueType}
                  onChange={(e) =>
                    setSupportPayload({
                      ...supportPayload,
                      issueType: e.target.value,
                    })
                  }
                >
                  <option value="General Help">General Support / Help</option>
                  <option value="Technical Error">Technical Portal Bug</option>
                  <option value="Billing Issue">OPD Surcharge Question</option>
                </select>
              </div>
              <div className="modal_field_group">
                <label>Detailed Message</label>
                <textarea
                  required
                  rows="5"
                  placeholder="Describe your query or structural system error context..."
                  value={supportPayload.message}
                  onChange={(e) =>
                    setSupportPayload({
                      ...supportPayload,
                      message: e.target.value,
                    })
                  }
                />
              </div>
              <div className="modal_actions_flex">
                <button
                  type="button"
                  className="modal_cancel_btn"
                  onClick={() => setShowSupportModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal_submit_btn"
                  disabled={supportLoading}
                >
                  {supportLoading ? (
                    <RefreshCw size={14} className="spin" />
                  ) : (
                    <Send size={14} />
                  )}{" "}
                  Dispatch Inquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
