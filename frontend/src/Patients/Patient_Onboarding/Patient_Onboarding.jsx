import React, { useState } from "react";
import axios from "axios";
import { Upload, User, ArrowRight } from "lucide-react";
import "./Patient_Onboarding.css";

const Patient_Onboarding = ({ user, setOnboardingComplete }) => {
  const [formData, setFormData] = useState({
    contact: user.contact || "",
    age: user.age || "",
    gender: user.gender || "",
    bloodGroup: user.bloodGroup || "",
    dob: user.dob || "",
    height: user.height || "",
    weight: user.weight || "",
    disease: user.disease || "",
    emergencyContact: user.emergencyContact || "",
    address: user.address || "", 
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(user.photo || null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.contact ||
      !formData.age ||
      !formData.gender ||
      !formData.bloodGroup ||
      !formData.dob
    ) {
      alert(
        "Please fill in all mandatory details (Contact, DOB, Age, Gender, Blood Group).",
      );
      return;
    }

    const data = new FormData();
    Object.keys(formData).forEach((key) => {
      data.append(key, formData[key]);
    });

    if (selectedFile) {
      data.append("photo", selectedFile);
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `http://localhost:5000/api/patients/update/${user._id || user.id}`,
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      localStorage.setItem("userData", JSON.stringify(res.data.user));
      window.dispatchEvent(new Event("profile_synced"));
      alert("Health profile successfully updated!");
      setOnboardingComplete(true);
    } catch (err) {
      alert(
        err.response?.data?.message || "Upload failed. Try a smaller image.",
      );
    }
  };

  return (
    <div className="pat_onboard_overlay">
      <div className="pat_onboard_card">
        <div className="pat_onboard_header">
          <h2>Complete Your Profile</h2>
          <p>
            Provide your clinical metrics and profile picture to finalize your
            medical registry account.
          </p>
        </div>

        <form className="pat_onboard_form" onSubmit={handleSubmit}>
          <div className="pat_onboard_image_section">
            <div className="pat_onboard_avatar_preview">
              {preview ? (
                <img
                  src={
                    preview.startsWith("blob")
                      ? preview
                      : `http://localhost:5000/uploads/${preview}`
                  }
                  alt="Profile Preview"
                />
              ) : (
                <div className="pat_onboard_placeholder">
                  <User size={20} />
                </div>
              )}
            </div>
            <input
              type="file"
              id="pat-photo-upload"
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: "none" }}
            />
            <label htmlFor="pat-photo-upload" className="pat_onboard_file_btn">
              <Upload size={13} /> Choose File
            </label>
          </div>

          <div className="pat_onboard_grid">
            <div className="pat_onboard_group">
              <label>Contact Number *</label>
              <input
                type="text"
                placeholder="+91 XXXXX XXXXX"
                value={formData.contact}
                onChange={(e) =>
                  setFormData({ ...formData, contact: e.target.value })
                }
                required
              />
            </div>

            <div className="pat_onboard_group">
              <label>Date of Birth *</label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) =>
                  setFormData({ ...formData, dob: e.target.value })
                }
                required
              />
            </div>

            <div className="pat_onboard_group">
              <label>Age *</label>
              <input
                type="number"
                placeholder="Years"
                value={formData.age}
                onChange={(e) =>
                  setFormData({ ...formData, age: e.target.value })
                }
                required
              />
            </div>

            <div className="pat_onboard_group">
              <label>Blood Group *</label>
              <select
                value={formData.bloodGroup}
                onChange={(e) =>
                  setFormData({ ...formData, bloodGroup: e.target.value })
                }
                required
              >
                <option value="">Select</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>

            <div className="pat_onboard_group">
              <label>Gender *</label>
              <select
                value={formData.gender}
                onChange={(e) =>
                  setFormData({ ...formData, gender: e.target.value })
                }
                required
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="pat_onboard_group">
              <label>Emergency Contact</label>
              <input
                type="text"
                placeholder="Name or Number"
                value={formData.emergencyContact}
                onChange={(e) =>
                  setFormData({ ...formData, emergencyContact: e.target.value })
                }
              />
            </div>

            <div className="pat_onboard_group">
              <label>Height (cm)</label>
              <input
                type="text"
                placeholder="cm"
                value={formData.height}
                onChange={(e) =>
                  setFormData({ ...formData, height: e.target.value })
                }
              />
            </div>

            <div className="pat_onboard_group">
              <label>Weight (kg)</label>
              <input
                type="text"
                placeholder="kg"
                value={formData.weight}
                onChange={(e) =>
                  setFormData({ ...formData, weight: e.target.value })
                }
              />
            </div>
          </div>

          <div className="pat_onboard_group full_width">
            <label>Residential Address</label>
            <input
              type="text"
              placeholder="Door No, Street, City, State"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
            />
          </div>

          <div className="pat_onboard_group full_width">
            <label>Medical History / Known Diagnoses</label>
            <textarea
              placeholder="List conditions (e.g., Asthma, Diabetes) or input 'None'"
              value={formData.disease}
              onChange={(e) =>
                setFormData({ ...formData, disease: e.target.value })
              }
            ></textarea>
          </div>

          <div className="pat_onboard_actions">
            <button type="submit" className="pat_onboard_submit_btn">
              Save & Continue <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="pat_onboard_skip_btn"
              onClick={() => setOnboardingComplete(true)}
            >
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Patient_Onboarding;
