import React, { useMemo, useState, useEffect } from "react";
import axios from "axios";
import {
  FaSave,
  FaTimes,
  FaUserMd,
  FaPhoneAlt,
  FaEnvelope,
  FaClock,
  FaEdit,
  FaKey,
} from "react-icons/fa";
import { FiLoader } from "react-icons/fi";
import "./Doctor_Profile.css";
import { X, Loader2 } from "lucide-react";

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);

  const [showPasswordDrawer, setShowPasswordDrawer] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordPayload, setPasswordPayload] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const doctorUser = useMemo(
    () => JSON.parse(localStorage.getItem("userData")) || {},
    [],
  );

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const profileRes = await axios.get(
        `http://localhost:5000/api/doctors/profile/${doctorUser.doctorId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setFormState({
        ...profileRes.data,
        photo: profileRes.data.photo,
        bio:
          profileRes.data.bio ||
          "Dedicated medical professional committed to patient-centered care.",
        experience: profileRes.data.experience || "10+ Years",
        availability: profileRes.data.availability || "Available",
        shiftStart: profileRes.data.shiftStart || "09:00",
        shiftEnd: profileRes.data.shiftEnd || "17:00",
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (doctorUser.doctorId) fetchProfile();
  }, [doctorUser.doctorId]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setFormState((prev) => ({
        ...prev,
        localPreviewUrl: URL.createObjectURL(e.target.files[0]),
      }));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("name", formState.name);
      formData.append("bio", formState.bio);
      formData.append("experience", formState.experience);
      formData.append("fee", formState.fee);
      formData.append("shiftStart", formState.shiftStart);
      formData.append("shiftEnd", formState.shiftEnd);
      formData.append("phone", formState.phone || "");

      if (selectedFile) {
        formData.append("photo", selectedFile.name);
        console.log(selectedFile);
      }

      await axios.put(
        `http://localhost:5000/api/doctors/update/${doctorUser.doctorId}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );
      setIsEditing(false);
      setSelectedFile(null);
      fetchProfile();
      alert("Profile Updated Successfully!");
    } catch (err) {
      alert("Update failed.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordModification = async (e) => {
    e.preventDefault();
    if (passwordPayload.newPassword !== passwordPayload.confirmPassword) {
      alert("New passwords do not match.");
      return;
    }

    const strongPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(passwordPayload.newPassword)) {
      alert(
        "Password must be 8+ chars with uppercase, lowercase, number, and special char.",
      );
      return;
    }

    setPasswordLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        "http://localhost:5000/api/auth/change-password",
        {
          currentPassword: passwordPayload.currentPassword,
          newPassword: passwordPayload.newPassword,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      alert("Credentials updated successfully.");
      setPasswordPayload({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordDrawer(false);
    } catch (err) {
      alert(err.response?.data?.message || "Error updating password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  if (loading && !isEditing)
    return (
      <div className="doc_prof_loading">
        <FiLoader className="spin" /> Syncing Clinical Profile...
      </div>
    );

  return (
    <div className="doc_prof_m_root doc_prof_m_fade_in">
      <div className="doc_prof_m_grid">
        <aside className="doc_prof_m_sidebar">
          <div className="doc_prof_m_card doc_prof_m_identity">
            <div className="doc_prof_m_avatar_wrapper">
              <img
                src={
                  formState.localPreviewUrl
                    ? formState.localPreviewUrl
                    : formState.photo
                      ? `http://localhost:5000/uploads/${formState.photo}`
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(formState.name || "Doctor")}`
                }
                alt={formState.name}
                className="doc_prof_m_img"
              />
              {isEditing && (
                <label
                  className="photo_upload_overlay_label"
                  style={{ cursor: "pointer" }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                  <span>Upload</span>
                </label>
              )}
            </div>

            <div className="doc_prof_m_id_text">
              <h2>{formState.name}</h2>
              <span className="doc_prof_m_qual">{formState.degrees}</span>
            </div>

            <div className="doc_prof_m_stats_row">
              <div className="doc_prof_m_stat_node">
                <label>Experience</label>
                <strong>{formState.experience}</strong>
              </div>
              <div className="doc_prof_m_stat_node">
                <label>Consultation</label>
                <strong>₹{formState.fee}</strong>
              </div>
            </div>

            <div className="doc_prof_m_actions">
              {isEditing ? (
                <div className="doc_prof_m_btn_group">
                  <button
                    className="doc_prof_m_btn_primary"
                    onClick={handleSave}
                  >
                    <FaSave /> Save
                  </button>
                  <button
                    className="doc_prof_m_btn_outline"
                    onClick={() => {
                      setIsEditing(false);
                      setSelectedFile(null);
                    }}
                  >
                    <FaTimes /> Cancel
                  </button>
                </div>
              ) : (
                <>
                  <button
                    className="doc_prof_m_btn_primary full_width"
                    onClick={() => setIsEditing(true)}
                  >
                    <FaEdit /> Update Details
                  </button>
                  <button
                    className="doc_prof_m_btn_outline full_width"
                    onClick={() => setShowPasswordDrawer(!showPasswordDrawer)}
                  >
                    <FaKey /> Password
                  </button>
                </>
              )}
            </div>
          </div>

          {showPasswordDrawer && (
            <div className="doc_prof_m_card password_modification_drawer slide_down_animation">
              <div className="password_drawer_header">
                <h5>Modify Password</h5>
                <X size={16} onClick={() => setShowPasswordDrawer(false)} />
              </div>
              <form onSubmit={handlePasswordModification}>
                <div className="password_input_field">
                  <label>Current</label>
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
                <div className="password_input_field">
                  <label>New</label>
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
                <div className="password_input_field">
                  <label>Confirm</label>
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
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="doc_prof_m_btn_primary full_width"
                >
                  {passwordLoading ? (
                    <Loader2 size={16} className="spin" />
                  ) : (
                    "Commit Credentials"
                  )}
                </button>
              </form>
            </div>
          )}
        </aside>

        <main className="doc_prof_m_main">
          <section className="doc_prof_m_card">
            <div className="doc_prof_m_card_header">
              <FaUserMd className="doc_prof_m_icon" />
              <h4>Summary</h4>
            </div>
            <div className="doc_prof_m_content">
              {isEditing ? (
                <textarea
                  className="doc_prof_m_textarea"
                  value={formState.bio}
                  onChange={(e) => handleChange("bio", e.target.value)}
                  rows="4"
                />
              ) : (
                <p className="doc_prof_m_bio_text">{formState.bio}</p>
              )}
            </div>
          </section>

          <div className="doc_prof_m_details_grid">
            <section className="doc_prof_m_card">
              <div className="doc_prof_m_card_header">
                <FaClock className="doc_prof_m_icon" />
                <h4>Shift</h4>
              </div>
              <div className="doc_prof_m_form">
                <div className="doc_prof_m_field">
                  <label>Department</label>
                  <p className="doc_prof_m_readonly">
                    {formState.department} Specialist
                  </p>
                </div>
                <div className="doc_prof_m_field">
                  <label>Hours</label>
                  {isEditing ? (
                    <div className="doc_prof_shift_inputs">
                      <input
                        type="time"
                        value={formState.shiftStart}
                        onChange={(e) =>
                          handleChange("shiftStart", e.target.value)
                        }
                      />
                      <span>to</span>
                      <input
                        type="time"
                        value={formState.shiftEnd}
                        onChange={(e) =>
                          handleChange("shiftEnd", e.target.value)
                        }
                      />
                    </div>
                  ) : (
                    <p>
                      <strong>{formState.shiftStart}</strong> to{" "}
                      <strong>{formState.shiftEnd}</strong>
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="doc_prof_m_card">
              <div className="doc_prof_m_card_header">
                <FaUserMd className="doc_prof_m_icon" />
                <h4>Contact</h4>
              </div>
              <div className="doc_prof_m_form">
                <div className="doc_prof_m_field">
                  <label>
                    <FaEnvelope /> Email
                  </label>
                  <p>{formState.email}</p>
                </div>
                <div className="doc_prof_m_field">
                  <label>
                    <FaPhoneAlt /> Phone
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formState.phone || ""}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      className="doc_prof_m_input_small"
                    />
                  ) : (
                    <p>{formState.phone || "Not Set"}</p>
                  )}
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
