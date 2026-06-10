import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  FiUser,
  FiDownload,
  FiFileText,
  FiUploadCloud,
  FiActivity,
  FiLoader,
  FiCheck,
} from "react-icons/fi";
import "./Doctor_Settings.css";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [signatureFile, setSignatureFile] = useState(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [appointmentsData, setAppointmentsData] = useState([]);

  const doctorUser = JSON.parse(localStorage.getItem("userData")) || {};
  const [profileData, setProfileData] = useState({
    bio: "",
    signaturePath: "",
    localPreviewUrl: "",
  });

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `http://localhost:5000/api/doctors/profile/${doctorUser.doctorId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setProfileData({
        bio: res.data.bio || "",
        signaturePath: res.data.signaturePath || "",
        localPreviewUrl: "",
      });
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDoctorAppointmentsCache = async () => {
    if (!doctorUser.name) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `http://localhost:5000/api/appointments/doctor/${encodeURIComponent(doctorUser.name)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setAppointmentsData(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (doctorUser.doctorId) {
      fetchSettings();
      fetchDoctorAppointmentsCache();
    }
  }, [doctorUser.doctorId]);

  const handleSignatureChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSignatureFile(file);
      setProfileData((prev) => ({
        ...prev,
        localPreviewUrl: URL.createObjectURL(file),
      }));
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("bio", profileData.bio || "");
      if (signatureFile) formData.append("signature", signatureFile);

      await axios.put(
        `http://localhost:5000/api/doctors/update/${doctorUser.doctorId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      setSaveSuccess(true);
      setSignatureFile(null);
      fetchSettings();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert("Update failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAppointmentsCSV = async () => {
    setCsvLoading(true);
    try {
      let activeList = appointmentsData;
      if (activeList.length === 0) {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `http://localhost:5000/api/appointments/doctor/${encodeURIComponent(doctorUser.name)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        activeList = res.data || [];
      }
      const csvHeaders = [
        "Appointment ID",
        "Patient Name",
        "Date",
        "Time",
        "Type",
        "Status",
      ];
      const csvRows = activeList.map((app) => [
        app.appointmentID,
        app.patientName,
        app.date,
        app.time,
        app.type,
        app.status,
      ]);
      const csvContent =
        "data:text/csv;charset=utf-8," +
        [csvHeaders.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
      const link = document.createElement("a");
      link.href = encodeURI(csvContent);
      link.download = `Registry_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Failed to export registry.");
    } finally {
      setCsvLoading(false);
    }
  };

  return (
    <div className="doc_set_wrapper">
      <header className="doc_set_header">
        <h1>
          System <span>Governance</span>
        </h1>
        <div className="doc_set_nav_row">
          <button
            className={activeTab === "profile" ? "active" : ""}
            onClick={() => setActiveTab("profile")}
          >
            <FiUser /> Identity
          </button>
          <button
            className={activeTab === "data" ? "active" : ""}
            onClick={() => setActiveTab("data")}
          >
            <FiDownload /> Export Registry
          </button>
        </div>
      </header>

      <main className="doc_set_content">
        {activeTab === "profile" && (
          <div className="doc_set_card">
            <div className="doc_set_flex_container">
              <div className="doc_set_input_group">
                <h3>Professional Summary</h3>
                <textarea
                  rows="6"
                  value={profileData.bio}
                  onChange={(e) =>
                    setProfileData({ ...profileData, bio: e.target.value })
                  }
                />
              </div>

              <div className="doc_set_upload_group">
                <h3>Digital Signature</h3>
                <label className="doc_set_upload_zone">
                  <input type="file" onChange={handleSignatureChange} hidden />
                  <FiUploadCloud />
                  <span>
                    {signatureFile ? signatureFile.name : "Browse Signature"}
                  </span>
                </label>
              </div>
            </div>

            <div className="doc_set_action_row">
              <button
                className="doc_set_btn_primary"
                onClick={handleSaveProfile}
                disabled={loading}
              >
                {loading ? (
                  <FiLoader className="spin" />
                ) : saveSuccess ? (
                  <FiCheck />
                ) : (
                  "Save Profile Changes"
                )}
              </button>
            </div>
          </div>
        )}

        {activeTab === "data" && (
          <div className="doc_set_card">
            <h3>Secure Export Center</h3>
            <div className="doc_set_export_item">
              <div className="doc_set_icon_wrap">
                <FiFileText />
              </div>
              <div>
                <strong>Appointments Ledger</strong>
                <p>Full clinical history for compliance</p>
              </div>
              <button
                className="doc_set_btn_download"
                onClick={handleDownloadAppointmentsCSV}
                disabled={csvLoading}
              >
                {csvLoading ? "Processing..." : "Export CSV"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
