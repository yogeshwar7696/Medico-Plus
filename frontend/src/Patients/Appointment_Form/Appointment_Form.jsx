import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  X,
  Calendar,
  Clock,
  Search,
  ChevronRight,
  Loader2,
  ArrowLeft,
  CheckCircle,
  Filter,
  ShieldCheck,
  UserCheck,
  Info,
  Building,
  CreditCard,
  Check,
} from "lucide-react";
import "./Appointment_Form.css";

export default function AppointmentForm({
  isOpen,
  onClose,
  existingData,
  isRescheduleMode,
  initialDoctor,
}) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("userData")) || {};

 
  const [step, setStep] = useState(1);
  const [doctors, setDoctors] = useState([]);
  const [recentDoctors, setRecentDoctors] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [dynamicDaySlotsMatrix, setDynamicDaySlotsMatrix] = useState([]);
  const [liveDepartments, setLiveDepartments] = useState([]);

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);

  const [formData, setFormData] = useState({
    doctor: null,
    date: new Date().toLocaleDateString("en-CA"),
    time: "",
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setIsProcessingPayment(false);
      setIsPaymentComplete(false);
      setFormData({
        doctor: initialDoctor || null,
        date: new Date().toLocaleDateString("en-CA"),
        time: "",
        notes: "",
      });
    }
  }, [isOpen, initialDoctor]);

  const maxBookingDate = useMemo(() => {
    const today = new Date();
    today.setMonth(today.getMonth() + 1);
    return today.toLocaleDateString("en-CA");
  }, []);

 
  useEffect(() => {
    if (isOpen) {
      const initWorkspace = async () => {
        try {
          const token = localStorage.getItem("token");
          const headers = { Authorization: `Bearer ${token}` };

          const [docRes, deptRes] = await Promise.all([
            axios.get("http://localhost:5000/api/doctors/list", { headers }),
            axios.get("http://localhost:5000/api/departments/all", { headers }),
          ]);

          const allDocs = docRes.data || [];
          const allDepts = deptRes.data || [];

          setDoctors(allDocs);

          const activeDepts = allDepts.filter((d) => d.status === "Active");
          setLiveDepartments(activeDepts);

          if (isRescheduleMode && existingData) {
            const targetDoc = allDocs.find(
              (d) => d.name === existingData.doctorName,
            );
            if (targetDoc) {
              setFormData({
                doctor: targetDoc,
                date: new Date(existingData.date).toLocaleDateString("en-CA"),
                time: "",
                notes: existingData.notes || "",
              });
            }
          } else if (!initialDoctor) {
            const historyRes = await axios.get(
              `http://localhost:5000/api/appointments/list/${user._id || user.id}`,
              { headers },
            );
            const lastUsedNames = [
              ...new Set((historyRes.data || []).map((a) => a.doctorName)),
            ].slice(0, 3);
            const historyDocs = lastUsedNames
              .map((name) => allDocs.find((d) => d.name === name))
              .filter(Boolean);
            setRecentDoctors(historyDocs);
          }
        } catch (err) {
          console.error("Clinical Infrastructure Sync Error:", err);
        }
      };
      initWorkspace();
    }
  }, [
    isOpen,
    isRescheduleMode,
    existingData,
    user._id,
    user.id,
    initialDoctor,
  ]);

 
  useEffect(() => {
    if (formData.doctor && formData.date) {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const targetDoctorId = formData.doctor._id || formData.doctor.doctorId;

      axios
        .get(
          `http://localhost:5000/api/doctors/availability/${targetDoctorId}/${formData.date}`,
          { headers },
        )
        .then((res) => {
          setBookedSlots(res.data.blockedSlots || []);
          setDynamicDaySlotsMatrix(res.data.slotsConfigMatrix || []);
        })
        .catch((err) => {
          console.error("Slot Sync Error:", err);
          setDynamicDaySlotsMatrix([]);
        });
    }
  }, [formData.doctor, formData.date]);

 
  const departmentsDropdownList = useMemo(() => {
    const names = liveDepartments.map((d) => d.name);
    return ["All Departments", ...names];
  }, [liveDepartments]);

  const normalizeTimeStr = (str) => {
    if (!str) return "";
    return String(str).replace(/^0/, "").replace(/\s+/g, " ").trim();
  };

  const calculatedSlotsGrid = useMemo(() => {
    if (!formData.doctor || dynamicDaySlotsMatrix.length === 0) return [];

    const now = new Date();
    const isToday = formData.date === now.toLocaleDateString("en-CA");
    const isFullDayLeaveApproved = bookedSlots.includes("FULL_DAY_LEAVE");

    return dynamicDaySlotsMatrix.map((slotTimeStr) => {
      const cleanSlotStr = normalizeTimeStr(slotTimeStr);
      let isPast = false;

      if (isToday) {
        const [timePart, modifier] = cleanSlotStr.split(" ");
        let [hours, minutes] = timePart.split(":").map(Number);
        if (modifier === "PM" && hours < 12) hours += 12;
        if (modifier === "AM" && hours === 12) hours = 0;

        const slotComparisonTime = new Date();
        slotComparisonTime.setHours(hours, minutes, 0, 0);
        isPast = slotComparisonTime.getTime() < now.getTime();
      }

      const isAlreadyBooked = bookedSlots.some((blocked) => {
        return normalizeTimeStr(blocked) === cleanSlotStr;
      });

      return {
        time: slotTimeStr,
        isBooked: isAlreadyBooked,
        isOnLeave: isFullDayLeaveApproved,
        isPast: isPast,
      };
    });
  }, [formData.doctor, formData.date, bookedSlots, dynamicDaySlotsMatrix]);

  const doctorConsultationFee = useMemo(() => {
    return Number(formData.doctor?.fee) || 0;
  }, [formData.doctor]);

  const triggerAutomatedPaymentProcessing = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsProcessingPayment(false);
      setIsPaymentComplete(true);
      setTimeout(() => {
        handleBooking();
      }, 1000);
    }, 1500);
  };

  
  const handleBooking = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const targetSubmissionTime = formData.time;

      const patientIdHex = user._id || user.id;

      if (isRescheduleMode && existingData) {
        await axios.put(
          `http://localhost:5000/api/appointments/reschedule/${existingData._id}`,
          {
            patientId: patientIdHex,
            doctorName: formData.doctor.name,
            date: formData.date,
            time: targetSubmissionTime,
          },
          { headers },
        );
        alert("Appointment rescheduled successfully!");
      } else {
        const doctorIdHex = formData.doctor?._id || formData.doctor?.id;
        await axios.post(
          "http://localhost:5000/api/appointments/book",
          {
            patientId: patientIdHex,
            docId: doctorIdHex,
            patientName: user.name,
            doctorName: formData.doctor.name,
            department: formData.doctor.department,
            date: formData.date,
            time: targetSubmissionTime,
            notes: formData.notes,
          },
          { headers },
        );
        alert("Appointment booked successfully!");
      }

      window.dispatchEvent(new Event("appointment_booked"));
      onClose();
      setStep(1);
      setIsPaymentComplete(false);
      navigate("/patient/patient_bookings");
    } catch (err) {
      alert(
        err.response?.data?.message || "Slot transaction failed. Try again.",
      );
      if (!isRescheduleMode) {
        setStep(2);
      }
      setIsPaymentComplete(false);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="med_apt_overlay">
      <div
        className={`med_apt_container ${step > 1 ? "confirm_mode" : ""} ${formData.doctor ? "pane_open" : ""} ${isRescheduleMode ? "reschedule_locked_layout" : ""}`}
      >
        
        {step === 1 && (
          <div className="med_apt_step_discovery">
            <div className="recent_header_bar">
              <div className="recent_group">
                <label>
                  {isRescheduleMode
                    ? "Reschedule Lock Active"
                    : initialDoctor
                      ? "Direct Focused Booking"
                      : "Recent Specialists"}
                </label>
                {!isRescheduleMode && !initialDoctor && (
                  <div className="recent_docs_list">
                    {recentDoctors.map((d) => (
                      <div
                        key={d._id}
                        className={`recent_doc_pill ${formData.doctor?._id === d._id ? "active" : ""}`}
                        onClick={() =>
                          setFormData({ ...formData, doctor: d, time: "" })
                        }
                      >
                        <div className="pill_avatar">
                          {d.photo ? (
                            <img
                            src={
                              d.photo && d.photo.trim() !== ""
                                ? `http://localhost:5000/uploads/${d.photo}`
                                : null
                            }
                            alt={d.name || "Specialist"}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                d.name || "Doctor"
                              )}&background=f0f7ff&color=007acc&size=80`;
                            }}
                          />

                          ) : (
                            <span>{d.name.charAt(0)}</span>
                          )}
                        </div>{" "}
                        <span>{d.name}</span>{" "}
                      </div>
                    ))}
                  </div>
                )}
                {(isRescheduleMode || initialDoctor) && (
                  <span className="reschedule_notice_badge">
                    <Info size={14} /> Focused parameters active for Dr.{" "}
                    {formData.doctor?.name || existingData?.doctorName}.
                  </span>
                )}
              </div>
              <button onClick={onClose} className="med_close_btn">
                <X size={20} />
              </button>
            </div>

            <div className="med_apt_workspace">
              <div className={`slot_pane ${formData.doctor ? "active" : ""}`}>
                {formData.doctor && (
                  <div className="slot_pane_inner">
                    <div className="slot_pane_header">
                      <h3>Select Date & Time</h3>
                      <p>Consultant: Dr. {formData.doctor.name}</p>
                      <span
                        className="department_location_subtext"
                        style={{
                          fontSize: "0.75rem",
                          color: "#64748b",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          marginTop: "4px",
                        }}
                      >
                        <Building size={12} /> Unit Wing Location:{" "}
                        {liveDepartments.find(
                          (d) => d.name === formData.doctor.department,
                        )?.location || "Main Block"}
                      </span>
                    </div>

                    <div className="date_picker_alt">
                      <Calendar size={14} />
                      <input
                        type="date"
                        min={new Date().toLocaleDateString("en-CA")}
                        max={maxBookingDate}
                        value={formData.date}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            date: e.target.value,
                            time: "",
                          })
                        }
                      />
                    </div>

                    <div className="time_slot_list">
                      {calculatedSlotsGrid.length > 0 ? (
                        calculatedSlotsGrid.map((s, idx) => {
                          let buttonClass = "";
                          let isSelectable = true;

                          if (s.isOnLeave) {
                            buttonClass = "slot_on_leave_red";
                            isSelectable = false;
                          } else if (s.isBooked || s.isPast) {
                            buttonClass = "slot_unselectable_booked";
                            isSelectable = false;
                          } else if (formData.time === s.time) {
                            buttonClass = "active";
                          }

                          return (
                            <button
                              key={`slot-btn-${idx}-${s.time}`}
                              disabled={!isSelectable}
                              className={buttonClass}
                              onClick={() => {
                                setFormData({ ...formData, time: s.time });
                              }}
                            >
                              {s.time}
                            </button>
                          );
                        })
                      ) : (
                        <div className="no_slots_alert_box">
                          No operational shifts logged for this calendar date.
                        </div>
                      )}
                    </div>

                    <button
                      className="proceed_prime_btn"
                      disabled={!formData.time}
                      onClick={() => setStep(2)}
                    >
                      Proceed to Review <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>

              <div className="discovery_pane">
                {isRescheduleMode ? (
                  <div className="reschedule_locked_splash">
                    <ShieldCheck size={48} color="#2563eb" />
                    <h3>Consultant Selection Locked</h3>
                    <p>
                      To schedule with a different specialist, close this
                      workspace window and initialize a "New Appointment" block.
                    </p>
                  </div>
                ) : initialDoctor ? (
                  <div className="reschedule_locked_splash">
                    <UserCheck size={48} color="#10b981" />
                    <h3>Focused Booking Active</h3>
                    <p>
                      You are establishing a direct care session window with{" "}
                      <strong>Dr. {initialDoctor.name}</strong>.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="filter_header">
                      <div className="search_wrap">
                        <Search size={16} />
                        <input
                          placeholder="Search specialist name..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <div className="select_wrap">
                        <Filter size={16} />
                        <select
                          value={deptFilter}
                          onChange={(e) => setDeptFilter(e.target.value)}
                        >
                          {departmentsDropdownList.map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="doctor_bento_grid">
                      {doctors
                        .filter(
                          (d) =>
                            (deptFilter === "All Departments" ||
                              d.department === deptFilter) &&
                            d.name
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()),
                        )
                        .map((d) => (
                          <div
                            key={d._id}
                            className={`bento_doc_card ${formData.doctor?._id === d._id ? "selected" : ""} ${d.availability === "On Leave" ? "doctor_status_leave_dim" : ""}`}
                            onClick={() =>
                              setFormData({ ...formData, doctor: d, time: "" })
                            }
                          >
                            <div className="bento_avatar">
                              {d.photo ? (
                                <img
                                src={
                                  d.photo && d.photo.trim() !== ""
                                    ? `http://localhost:5000/uploads/${d.photo}`
                                    : null
                                }
                                alt={d.name || "Specialist"}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    d.name || "Doctor"
                                  )}&background=f0f7ff&color=007acc&size=80`;
                                }}
                              />

                              ) : (
                                <span>{d.name.charAt(0)}</span>
                              )}
                            </div>
                            <div className="bento_info">
                              {" "}
                              <strong>{d.name}</strong>{" "}
                              <span>{d.department}</span>{" "}
                              {d.availability === "On Leave" && (
                                <span
                                  style={{
                                    color: "#ef4444",
                                    fontSize: "0.7rem",
                                    fontWeight: "700",
                                  }}
                                >
                                  (On Leave)
                                </span>
                              )}
                            </div>
                            {formData.doctor?._id === d._id && (
                              <div className="active_tick">
                                <CheckCircle size={14} />
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        
        {step === 2 && (
          <div className="med_confirmation_view">
            <header className="confirm_header">
              <button className="back_to_edit" onClick={() => setStep(1)}>
                <ArrowLeft size={18} /> Edit Selection
              </button>
              <h2>Clinical Summary</h2>
            </header>

            <div className="confirm_card">
              <div className="confirm_avatar">
                {formData.doctor?.photo ? (
                  <img
                  
                  src={
                    formData.doctor.photo && formData.doctor.photo.trim() !== ""
                      ? `http://localhost:5000/uploads/${formData.doctor.photo}`
                      : null
                  }
                  alt={formData.doctor.name || "Specialist"}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      formData.doctor.name || "Doctor"
                    )}&background=f0f7ff&color=007acc&size=80`;
                  }}
                />

                ) : (
                  <span>{formData.doctor?.name?.charAt(0)}</span>
                )}
              </div>
              <h3>Review Details</h3>
              <p className="conf_doc_title">
                Dr. {formData.doctor.name} • {formData.doctor.department}
              </p>

              <div className="summary_pill_container">
                <div className="s_pill">
                  <Calendar size={14} />{" "}
                  {new Date(formData.date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <div className="s_pill">
                  <Clock size={14} /> {formData.time}
                </div>
                {!isRescheduleMode && (
                  <div
                    className="s_pill"
                    style={{
                      background: "#eff6ff",
                      color: "#1e40af",
                      fontWeight: "600",
                    }}
                  >
                    Fee: ₹{doctorConsultationFee}
                  </div>
                )}
              </div>

              <div className="notes_field">
                <label>Consultation Notes</label>
                <textarea
                  disabled={isRescheduleMode}
                  placeholder="Describe your symptoms..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>

              {isRescheduleMode ? (
                <button
                  className="final_book_btn"
                  disabled={loading}
                  onClick={handleBooking}
                >
                  {loading ? (
                    <Loader2 className="spin" size={18} />
                  ) : (
                    <Check size={18} />
                  )}{" "}
                  Confirm Reschedule Changes
                </button>
              ) : (
                <button className="final_book_btn" onClick={() => setStep(3)}>
                  Proceed to Checkout • ₹{doctorConsultationFee}{" "}
                  <ChevronRight size={18} />
                </button>
              )}
            </div>
          </div>
        )}

        
        {step === 3 && !isRescheduleMode && (
          <div className="med_confirmation_view">
            <header className="confirm_header">
              <button
                className="back_to_edit"
                onClick={() => setStep(2)}
                disabled={isProcessingPayment || loading}
              >
                <ArrowLeft size={18} /> Back to Notes
              </button>
              <h2>Secure Gateway Payment</h2>
            </header>

            <div
              className="confirm_card"
              style={{
                padding: "30px 20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "15px",
              }}
            >
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px dashed #bbf7d0",
                  padding: "15px 25px",
                  borderRadius: "8px",
                  width: "100%",
                }}
              >
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "#16a34a",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: "5px",
                  }}
                >
                  Order Total Verified
                </span>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "0.9rem", color: "#334155" }}>
                    OPD Consultation Charge
                  </span>
                  <strong style={{ fontSize: "1.4rem", color: "#0f172a" }}>
                    ₹{doctorConsultationFee}
                  </strong>
                </div>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  padding: "15px",
                  borderRadius: "8px",
                  width: "100%",
                  textAlign: "left",
                }}
              >
                <p
                  style={{
                    margin: "0 0 5px 0",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    color: "#475569",
                  }}
                >
                  Patient Account Holder:{" "}
                  <span style={{ color: "#0f172a" }}>{user.name}</span>
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    color: "#475569",
                  }}
                >
                  Beneficiary:{" "}
                  <span style={{ color: "#0f172a" }}>
                    Dr. {formData.doctor?.name} ({formData.doctor?.department})
                  </span>
                </p>
              </div>

              <button
                onClick={triggerAutomatedPaymentProcessing}
                disabled={isProcessingPayment || isPaymentComplete || loading}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: isPaymentComplete ? "#10b981" : "#020617",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "600",
                  fontSize: "1rem",
                  cursor:
                    isProcessingPayment || isPaymentComplete
                      ? "not-allowed"
                      : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  marginTop: "10px",
                  transition: "background 0.3s ease",
                }}
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="spin" size={18} /> Authorizing Payment
                    Wallet...
                  </>
                ) : isPaymentComplete ? (
                  <>
                    <Check size={18} /> Transaction Approved Successfully!
                  </>
                ) : (
                  <>
                    <CreditCard size={18} /> Pay & Confirm Appointment Now
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
