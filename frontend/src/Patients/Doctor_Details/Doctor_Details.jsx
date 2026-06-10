import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  Search,
  CalendarCheck,
  Award,
  Clock,
  Loader2,
  History,
  ExternalLink,
  X,
} from "lucide-react";
import "./Doctor_Details.css";

import AppointmentForm from "../Appointment_Form/Appointment_Form";

export default function Doctor_Details() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState(
    location.state?.globalSearchQuery || "",
  );
  const [selectedDept, setSelectedDept] = useState("All");

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbDepartmentsList, setDbDepartmentsList] = useState([]);

  const [viewingDoctor, setViewingDoctor] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [targetDoctor, setTargetDoctor] = useState(null);

  const [pastConsultations, setPastConsultations] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem("userData"));

  
  useEffect(() => {
    if (location.state?.globalSearchQuery !== undefined) {
      setSearchTerm(location.state.globalSearchQuery);
    }
  }, [location.state?.globalSearchQuery]);

  const departments = useMemo(() => {
    const listFromDb = dbDepartmentsList.map((d) => d.name).filter(Boolean);
    return ["All", ...listFromDb];
  }, [dbDepartmentsList]);

  const handleNavigateToBooking = (appt) => {
    navigate("/patient/patient_bookings", {
      state: { autoSelectId: appt._id },
    });
  };

  useEffect(() => {
    const fetchHospitalInfrastructureData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const [doctorRes, departmentRes] = await Promise.all([
          axios.get("http://localhost:5000/api/doctors/list", { headers }),
          axios.get("http://localhost:5000/api/departments/dropdown/list", {
            headers,
          }),
        ]);

        setDoctors(doctorRes.data || []);
        setDbDepartmentsList(departmentRes.data || []);
      } catch (err) {
        console.error("Infrastructure synchronization failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHospitalInfrastructureData();
  }, []);

  useEffect(() => {
    const fetchDoctorSpecificHistory = async () => {
      if (!viewingDoctor || !user?._id) return;

      setHistoryLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `http://localhost:5000/api/appointments/list/${user._id}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        const filteredHistory = res.data.filter(
          (appt) =>
            appt.doctorName === viewingDoctor.name &&
            appt.status === "Completed",
        );
        setPastConsultations(filteredHistory.slice(0, 2));
      } catch (err) {
        console.error("History sync failure:", err);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchDoctorSpecificHistory();
  }, [viewingDoctor, user?._id]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const docName = doc.name || "";
      const docDept = doc.department || "";

      const matchesSearch =
        docName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        docDept.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDept =
        selectedDept === "All" || doc.department === selectedDept;
      return matchesSearch && matchesDept;
    });
  }, [doctors, searchTerm, selectedDept]);

  const handleOpenBooking = (doc) => {
    setTargetDoctor(doc);
    setIsFormOpen(true);
  };

  if (loading)
    return (
      <div className="pat_spec_loading">
        <Loader2 className="spinner" />
        <span>Synchronizing Hospital Registry...</span>
      </div>
    );

  return (
    <div className="pat_spec_container_full">
      {viewingDoctor && (
        <div className="modal_backdrop" onClick={() => setViewingDoctor(null)}>
          <div
            className="center_profile_modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal_close_btn"
              onClick={() => setViewingDoctor(null)}
            >
              <X size={20} />
            </button>

            <div className="modal_grid_layout">
              <div className="modal_left_col">
               
                <img
                  src={
                    viewingDoctor.photo && viewingDoctor.photo.trim() !== ""
                      ? `http://localhost:5000/uploads/${viewingDoctor.photo}`
                      : null
                  }
                  alt={viewingDoctor.name}
                  className="modal_profile_img"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(viewingDoctor.name)}&background=0D8ABC&color=fff&size=150`;
                  }}
                />
                <h2>{viewingDoctor.name}</h2>
                <span className="modal_dept_tag">
                  {viewingDoctor.department} Specialist
                </span>
              </div>

              <div className="modal_right_col">
                <div className="modal_stats_row">
                  <div className="modal_stat_box">
                    <strong>Experience</strong>
                    <span>{viewingDoctor.experience}</span>
                  </div>
                  <div className="modal_stat_box">
                    <strong>Consultation Fee</strong>
                    <span>₹{viewingDoctor.fee}</span>
                  </div>
                </div>

                <div className="modal_info_section">
                  <h3>Qualifications</h3>
                  <p>{viewingDoctor.degrees}</p>
                </div>

                <div className="modal_info_section">
                  <h3>
                    <History size={16} /> Recent Bookings
                  </h3>
                  {historyLoading ? (
                    <div className="modal_history_status">
                      <Loader2 size={14} className="spinner" /> Fetching
                      records...
                    </div>
                  ) : pastConsultations.length > 0 ? (
                    <div className="modal_history_list">
                      {pastConsultations.map((appt) => (
                        <div
                          key={appt._id}
                          className="modal_history_card"
                          onClick={() => {
                            setViewingDoctor(null);
                            handleNavigateToBooking(appt);
                          }}
                        >
                          <div className="modal_history_date">
                            {new Date(appt.date).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                            <ExternalLink size={12} />
                          </div>
                          <div className="modal_history_notes">
                            {appt.notes || "No clinical notes provided."}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="modal_history_empty">
                      No previous consultations recorded with{" "}
                      {viewingDoctor.name}.
                    </div>
                  )}
                </div>

                <button
                  className="modal_book_btn"
                  onClick={() => {
                    handleOpenBooking(viewingDoctor);
                    setViewingDoctor(null);
                  }}
                >
                  Book Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="pat_spec_main_full">
        <div className="pat_spec_search_strip">
          <div className="pat_spec_filter_row_top">
            <div className="pat_spec_input_wrap">
              <Search size={18} className="search_icon" />
              <input
                type="text"
                placeholder="Search by name or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="pat_spec_dept_filter">
            {departments.map((dept) => (
              <button
                key={dept}
                className={selectedDept === dept ? "active" : ""}
                onClick={() => setSelectedDept(dept)}
              >
                {dept === "All" ? "All Departments" : dept}
              </button>
            ))}
          </div>
        </div>

        <div className="pat_spec_grid_full">
          {filteredDoctors.length > 0 ? (
            filteredDoctors.map((doc) => {
              if (!doc) return null;

              return (
                <div
                  className="pat_spec_card"
                  key={doc.doctorId || Math.random()}
                >
                  <div className="pat_spec_card_top">
                    <div className="pat_spec_avatar_frame">
                      
                      <img
                        src={
                          doc.photo && doc.photo.trim() !== ""
                            ? `http://localhost:5000/uploads/${doc.photo}`
                            : null
                        }
                        alt={doc.name || "Specialist"}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.name || "Doctor")}&background=f0f7ff&color=007acc&size=80`;
                        }}
                      />
                      <span
                        className={`status_dot ${doc.availability === "Available" ? "online" : "offline"}`}
                      ></span>
                    </div>
                    <div className="pat_spec_core_info">
                      <h3>Dr. {doc.name || "Unknown Doctor"}</h3>
                      <span className="pat_spec_dept_tag_small">
                        {doc.department || "General"}
                      </span>
                    </div>
                  </div>

                  <div className="pat_spec_card_meta">
                    <div className="meta_item">
                      <Award size={14} />{" "}
                      <span>Experience : {doc.experience} yrs</span>
                    </div>
                    <div className="meta_item">
                      <Clock size={14} />{" "}
                      <span>{doc.availability || "Offline"}</span>
                    </div>
                  </div>

                  <div className="pat_spec_card_actions">
                    <button
                      className="btn_view_profile"
                      onClick={() => setViewingDoctor(doc)}
                    >
                      Profile
                    </button>
                    <button
                      className="btn_book_now"
                      onClick={() => handleOpenBooking(doc)}
                    >
                      Book Now
                      <CalendarCheck size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="pat_spec_empty_text">
              No clinical specialists found matching your current filters.
            </div>
          )}
        </div>
      </main>

      <AppointmentForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialDoctor={targetDoctor}
      />
    </div>
  );
}
