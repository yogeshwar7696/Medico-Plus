import React, { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  Calendar,
  Clock,
  FileText,
  Plus,
  Search,
  ChevronRight,
  X,
  Loader2,
  ShoppingCart,
  Pill,
  FlaskConical,
  CheckCircle,
  Info,
  ShieldCheck,
  CreditCard,
  PackageCheck,
  CalendarClock,
  Trash2,
  Download,
  MessageSquareShare,
} from "lucide-react";
import AppointmentForm from "../Appointment_Form/Appointment_Form";
import "./Patient_Bookings.css";

export default function Patient_Bookings() {
  const [filter, setFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [formRescheduleMode, setFormRescheduleMode] = useState(false);
  const location = useLocation();

  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutItems, setCheckoutItems] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderType, setOrderType] = useState("");

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comments, setComments] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    setRating(0);
    setHover(0);
    setComments("");
  }, [selectedAppt]);

  const handleDispatchFeedback = async () => {
    if (rating === 0) {
      alert("Please select a rating before submitting.");
      return;
    }

    setSubmittingFeedback(true);
    try {
      const token = localStorage.getItem("token");
      const textPayload = comments;

      const response = await axios.post(
        "http://localhost:5000/api/feedback/submit",
        {
          appointmentId: selectedAppt._id,
          patientId: user._id,
          patientName: user?.name || "Anonymous Patient",
          doctorName: selectedAppt.doctorName,
          rating: rating,
          comments: textPayload,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      console.log("Backend response payload debug check:", response.data);
      alert("Success! Your feedback has been securely logged.");

      setSelectedAppt((prev) => ({
        ...prev,
        hasFeedback: true,
        feedbackRef: {
          rating: rating,
          comments: textPayload,
        },
      }));

      setRating(0);
      setComments("");
      fetchBookings();
    } catch (err) {
      console.error("Feedback Submission Error Log Trace:", err);
      alert("Failed to process feedback submission.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const user = JSON.parse(localStorage.getItem("userData"));

  useEffect(() => {
    if (!loading && appointments.length > 0 && location.state?.autoSelectId) {
      const targetAppt = appointments.find(
        (a) => a._id === location.state.autoSelectId,
      );
      if (targetAppt) {
        setSelectedAppt(targetAppt);
        window.history.replaceState({}, document.title);
      }
    }
  }, [loading, appointments, location.state]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [apptRes, docsRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/appointments/list/${user._id}`, {
          headers,
        }),
        axios.get("http://localhost:5000/api/doctors/list", { headers }),
      ]);

      const now = new Date();

      const mappedAppts = (apptRes.data || []).map((appt) => {
        const matchingDoc = (docsRes.data || []).find(
          (d) => d.name === appt.doctorName,
        );

        let currentStatus = appt.status;
        if (currentStatus === "Upcoming" && appt.date && appt.time) {
          try {
            const [timeStr, modifier] = appt.time.split(" ");
            let [hours, minutes] = timeStr.split(":");
            hours = parseInt(hours, 10);
            if (modifier === "PM" && hours !== 12) hours += 12;
            if (modifier === "AM" && hours === 12) hours = 0;

            const appointmentDateTime = new Date(
              `${appt.date}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`,
            );

            if (appointmentDateTime < now) {
              currentStatus = "Cancelled";
              axios
                .put(
                  `http://localhost:5000/api/appointments/cancel/${appt._id}`,
                  {},
                  { headers },
                )
                .catch((e) => console.error("Auto-cancel sync failed", e));
            }
          } catch (dateErr) {
            console.error(
              "Failed parsing absolute timeline parameters",
              dateErr,
            );
          }
        }

        return {
          ...appt,
          status: currentStatus,
          doctorPhoto: matchingDoc?.photo || null,
        };
      });

      setAppointments(mappedAppts);
    } catch (err) {
      console.error("Clinical sync failure:", err);
    } finally {
      setLoading(false);
    }
  };

  const convertImageToBase64 = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.setAttribute("crossOrigin", "anonymous");

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };

      img.onerror = (error) => reject(error);

      img.src = `${url}?t=${new Date().getTime()}`;
    });
  };

  const handleDownloadPrescription = async (appt) => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      let fetchedSignaturePath = "";
      try {
        const doctorsCollectionRes = await axios.get(
          "http://localhost:5000/api/doctors/list",
          { headers },
        );
        const targetingMatchProfile = (doctorsCollectionRes.data || []).find(
          (d) =>
            (d.name || "").toLowerCase().trim() ===
            (appt.doctorName || "").toLowerCase().trim(),
        );
        if (targetingMatchProfile && targetingMatchProfile.signaturePath) {
          fetchedSignaturePath = targetingMatchProfile.signaturePath;
        }
      } catch (docFetchErr) {
        console.warn(
          "Signature registry trace fallback initiated:",
          docFetchErr.message,
        );
      }

      const doc = new jsPDF();
      const primaryColor = [0, 122, 204];

      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 40, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("MEDICOPlus", 20, 24);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Patient Digital Presciption", 20, 32);

      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("PATIENT CLINICAL SUMMARY & PRESCRIPTION", 20, 52);

      doc.setDrawColor(226, 232, 240);
      doc.line(20, 55, 190, 55);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      doc.text(`Patient Name:   ${user?.name || "Verified Account"}`, 20, 65);
      doc.text(`Consultant:     Dr. ${appt.doctorName}`, 20, 72);
      doc.text(
        `Department:     ${appt.department || "General Medicine"} Unit`,
        20,
        79,
      );

      doc.text(`Case Ref ID:    ${appt.appointmentID || "N/A"}`, 120, 65);
      doc.text(
        `Session Date:   ${new Date(appt.date).toLocaleDateString("en-GB", { dateStyle: "long" })}`,
        120,
        72,
      );
      doc.text(`Session Time:   ${appt.time}`, 120, 79);

      doc.setFont("helvetica", "bold");
      doc.text("Specialist Observations & Diagnosis:", 20, 93);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 116, 139);

      const splitNotes = doc.splitTextToSize(
        appt.notes || "Routine health maintenance tracking session.",
        170,
      );
      doc.text(splitNotes, 20, 100);

      const tableRows = (appt.prescribedItems || []).map((item) => {
        let executionDetails = "N/A";

        if (item.type === "Medicine") {
          const matrix = item.timing || {};
          const doseFormat = `${matrix.morning ? "1" : "0"}-${matrix.afternoon ? "1" : "0"}-${matrix.night ? "1" : "0"}`;
          const condition = item.intake ? ` [${item.intake}]` : "";
          const direction = item.instruction
            ? ` - Instruction: ${item.instruction}`
            : "";
          executionDetails = `${doseFormat}${condition}${direction}`;
        } else if (item.type === "Test") {
          executionDetails = `Diagnostic Laboratory Requisition (Instruction: ${item.instruction || "Standard Testing Protocol"})`;
        }

        return [
          item.name,
          item.type,
          `x${item.quantity || 1}`,
          executionDetails,
        ];
      });

      autoTable(doc, {
        startY: 115,
        margin: { left: 20, right: 20 },
        tableWidth: "auto",
        head: [
          [
            "Item Description / Nomenclature",
            "Classification",
            "Qty",
            "Administration Schedule / Instructions",
          ],
        ],
        body: tableRows,
        theme: "striped",
        headStyles: {
          fillColor: primaryColor,
          fontStyle: "bold",
          fontSize: 9,
        },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 25 },
          2: { cellWidth: 15 },
          3: { cellWidth: 85 },
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 4,
          verticalAlign: "middle",
          overflow: "linebreak",
        },
      });

      const finalY = doc.lastAutoTable.finalY + 15;

      if (fetchedSignaturePath) {
        try {
          const signatureUrl = `http://localhost:5000/uploads/${fetchedSignaturePath}`;
          const base64SignatureImg = await convertImageToBase64(signatureUrl);

          doc.addImage(base64SignatureImg, "PNG", 135, finalY - 10, 45, 18);
        } catch (imgConvErr) {
          console.error(
            "Signature processing blocked by security matrix structures:",
            imgConvErr.message,
          );
          doc.line(130, finalY + 10, 185, finalY + 10);
        }
      } else {
        doc.line(130, finalY + 10, 185, finalY + 10);
      }

      doc.setDrawColor(226, 232, 240);
      doc.line(20, finalY + 25, 190, finalY + 25);

      doc.setTextColor(148, 163, 184);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Authorized Digital Signature", 140, finalY + 15);
      doc.text(
        "System Document ID generated via Medico+ Core Engine",
        20,
        finalY + 15,
      );

      const fileName = `Prescription_${appt.appointmentID || Date.now()}.pdf`;
      doc.save(fileName);

      const pdfBlob = doc.output("blob");
      const formData = new FormData();
      formData.append("document", pdfBlob, fileName);
      formData.append("patientId", user._id);
      formData.append("type", "Prescriptions");

      axios
        .post("http://localhost:5000/api/patient/vault/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        })
        .then(() =>
          console.log(
            "Prescription asset safely backed up to decentralized records vault.",
          ),
        )
        .catch((vaultErr) =>
          console.error("Vault synchronization error:", vaultErr),
        );

      alert(
        "Success! Prescription downloaded directly into your device storage directory.",
      );
    } catch (err) {
      console.error("Prescription Export Failure Execution Handler:", err);
      alert(
        "Clinical Document Export Error: Unable to build local file mapping structure.",
      );
    }
  };

  useEffect(() => {
    if (location.state?.autoSelectId && appointments.length > 0) {
      const targetAppt = appointments.find(
        (a) => a._id === location.state.autoSelectId,
      );
      if (targetAppt) {
        setSelectedAppt({
          ...targetAppt,
          isReviewPanelOpen: location.state?.openReviewPanel || false,
        });
      }
    }
  }, [location.state, appointments]);

  useEffect(() => {
    if (user?._id) fetchBookings();
    const handleRefresh = () => fetchBookings();
    window.addEventListener("appointment_booked", handleRefresh);
    return () =>
      window.removeEventListener("appointment_booked", handleRefresh);
  }, [user?._id]);

  const canModifyAppointment = (apptDate, apptTime) => {
    try {
      if (!apptDate || !apptTime) return false;
      const [timeStr, modifier] = apptTime.split(" ");
      let [hours, minutes] = timeStr.split(":");
      hours = parseInt(hours, 10);
      if (modifier === "PM" && hours !== 12) hours += 12;
      if (modifier === "AM" && hours === 12) hours = 0;

      const appointmentDateTime = new Date(
        `${apptDate}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`,
      );
      const now = new Date();

      return (appointmentDateTime - now) / (1000 * 60 * 60) >= 24;
    } catch (e) {
      return false;
    }
  };

  const handleCancelAppointment = async (appt) => {
    if (!canModifyAppointment(appt.date, appt.time)) {
      alert(
        "Action Locked: Changes or cancellations are prohibited within 24 hours of the scheduled time.",
      );
      return;
    }
    if (!window.confirm("Are you sure you want to cancel this appointment?"))
      return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:5000/api/appointments/cancel/${appt._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      alert("Appointment has been cancelled.");
      setSelectedAppt(null);
      fetchBookings();
    } catch (err) {
      console.error("Cancel Error:", err);
      alert("Appointment Cancelled");
    }
  };

  const prescriptionGroups = useMemo(() => {
    if (!selectedAppt?.prescribedItems) return { meds: [], tests: [] };
    return {
      meds: selectedAppt.prescribedItems.filter((i) => i.type === "Medicine"),
      tests: selectedAppt.prescribedItems.filter((i) => i.type === "Test"),
    };
  }, [selectedAppt]);

  const openConfirmation = (items, type) => {
    setCheckoutItems(items);
    setOrderType(type);
    setShowCheckout(true);
  };

  const handleDirectPurchase = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem("token");
      const payloadItems = checkoutItems.map((item) => ({
        itemId: item.itemId,
        name: item.name,
        quantity: item.quantity || 1,
        price: item.price || 0,
        type: item.type,
      }));

      await axios.post(
        "http://localhost:5000/api/orders/create",
        {
          patientId: user._id,
          patientName: user.name,
          items: payloadItems,
          paymentStatus: "Paid",
          status: "Pending",
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      alert(
        `Success! Your ${orderType} order has been successfully generated and placed.`,
      );
      setShowCheckout(false);
      setCheckoutItems([]);
      fetchBookings();
    } catch (err) {
      console.error("Order process integration crash:", err);
      alert(
        err.response?.data?.message ||
          "Transaction failed. Please contact pharmacy billing.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredBookings = useMemo(() => {
    return appointments.filter((app) => {
      const matchesSearch =
        app.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.appointmentID?.includes(searchTerm);
      const matchesStatus = filter === "All" || app.status === filter;
      return matchesSearch && matchesStatus;
    });
  }, [appointments, searchTerm, filter]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return {
      day: d.getDate().toString().padStart(2, "0"),
      month: d.toLocaleString("default", { month: "short" }),
      year: d.getFullYear(),
    };
  };

  const handleCloseFormModal = () => {
    setIsFormOpen(false);
    setFormRescheduleMode(false);
    setSelectedAppt(null);
    fetchBookings();
  };

  if (loading)
    return (
      <div className="pat_book_loading">
        <Loader2 className="spinner" />
        <span>Accessing Clinical Records...</span>
      </div>
    );

  return (
    <div className="pat_book_container_full">
      <main className="pat_book_main_hub">
        <div className="pat_book_header_strip">
          <div className="pat_book_title">
            <h1>
              My <span>Bookings</span>
            </h1>
            <button
              className="pat_book_new_inline"
              onClick={() => {
                setSelectedAppt(null);
                setFormRescheduleMode(false);
                setIsFormOpen(true);
              }}
            >
              <Plus size={18} /> New Appointment
            </button>
          </div>

          <div className="pat_book_controls">
            <div className="pat_book_search">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search doctor or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="pat_book_filter_pills">
              {["All", "Upcoming", "Completed", "Cancelled"].map((f) => (
                <button
                  key={f}
                  className={filter === f ? "active" : ""}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pat_book_list_grid">
          {filteredBookings.length > 0 ? (
            filteredBookings.map((app) => (
              <div
                className={`pat_book_item_card ${selectedAppt?._id === app._id ? "selected" : ""}`}
                key={app._id}
                onClick={() => setSelectedAppt(app)}
              >
                <div className="pat_book_card_upper">
                  <div className="pat_book_date_box">
                    <span className="day">{formatDate(app.date).day}</span>
                    <span className="month">{formatDate(app.date).month}</span>
                  </div>
                  <div className="doc_meta">
                    <div className="doc_avatar">
                      {app.doctorPhoto ? (
                       <img
                          src={
                            app.doctorPhoto && app.doctorPhoto.trim() !== ""
                              ? `http://localhost:5000/uploads/${app.doctorPhoto}`
                              : null
                          }
                          alt={app.doctorName || "Specialist"}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              app.doctorName || "Doctor"
                            )}&background=f0f7ff&color=007acc&size=80`;
                          }}
                        />

                      ) : (
                        <span>{app.doctorName.charAt(0)}</span>
                      )}
                    </div>
                    <div className="doc_text">
                      <h3>Dr. {app.doctorName}</h3>
                      <span className="dept_tag_small">{app.department}</span>
                    </div>
                  </div>
                </div>

                <div className="pat_book_card_meta_rows">
                  <div className="card_meta_line">
                    <Clock size={14} />
                    <span>Session Slot: {app.time}</span>
                  </div>
                  <div className="card_meta_line">
                    <FileText size={14} />
                    <span>Reference ID: {app.appointmentID}</span>
                  </div>
                </div>

                <div className="pat_book_card_lower">
                  <span
                    className={`status_badge status_${app.status.toLowerCase()}`}
                  >
                    {app.status}
                  </span>
                  <button className="btn_card_trigger">
                    View Appointment Details <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="no_bookings_state">
              <Calendar size={48} />
              <p>No medical records found.</p>
            </div>
          )}
        </div>
      </main>

      {selectedAppt && !isFormOpen && (
        <div
          className="center_modal_backdrop"
          onClick={() => setSelectedAppt(null)}
        >
          <aside
            className="center_detail_modal_container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="detail_panel_content">
              <button
                className="panel_close_x"
                onClick={() => setSelectedAppt(null)}
              >
                <X size={20} />
              </button>

              <div className="modal_profile_split_grid">
                <div className="modal_split_left_profile">
                  <div className="detail_avatar_large">
                    {selectedAppt.doctorPhoto ? (
                      <img
                        src={
                          selectedAppt.doctorPhoto && selectedAppt.doctorPhoto.trim() !== ""
                            ? `http://localhost:5000/uploads/${selectedAppt.doctorPhoto}`
                            : null
                        }
                        alt={selectedAppt.doctorName || "Specialist"}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            selectedAppt.doctorName || "Doctor"
                          )}&background=f0f7ff&color=007acc&size=80`;
                        }}
                      />

                    ) : (
                      <span>{selectedAppt.doctorName.charAt(0)}</span>
                    )}
                  </div>
                  <h2>Dr. {selectedAppt.doctorName}</h2>
                  <p className="modal_left_dept_string">
                    {selectedAppt.department} •{" "}
                    {selectedAppt.type || "Outpatient Consultation"}
                  </p>
                  <span
                    className={`status_badge_large status_${selectedAppt.status.toLowerCase()}`}
                  >
                    {selectedAppt.status}
                  </span>
                </div>

                <div className="modal_split_right_details">
                  <div className="detail_scroll_body_embedded">
                    {selectedAppt.status === "Upcoming" && (
                      <div className="detail_section action_box_upcoming">
                        <button
                          className="reschedule_btn"
                          disabled={
                            !canModifyAppointment(
                              selectedAppt.date,
                              selectedAppt.time,
                            )
                          }
                          onClick={() => {
                            setFormRescheduleMode(true);
                            setIsFormOpen(true);
                          }}
                        >
                          <CalendarClock size={16} />
                          {canModifyAppointment(
                            selectedAppt.date,
                            selectedAppt.time,
                          )
                            ? "Reschedule Appointment"
                            : "Reschedule (Locked < 24h)"}
                        </button>
                        <button
                          className="cancel_btn_booking"
                          disabled={
                            !canModifyAppointment(
                              selectedAppt.date,
                              selectedAppt.time,
                            )
                          }
                          onClick={() => handleCancelAppointment(selectedAppt)}
                          style={
                            !canModifyAppointment(
                              selectedAppt.date,
                              selectedAppt.time,
                            )
                              ? {
                                  background: "#f8fafc",
                                  color: "#94a3b8",
                                  borderColor: "#e2e8f0",
                                  cursor: "not-allowed",
                                }
                              : {}
                          }
                        >
                          <Trash2 size={16} />
                          {canModifyAppointment(
                            selectedAppt.date,
                            selectedAppt.time,
                          )
                            ? "Cancel Appointment"
                            : "Cancel (Locked < 24h)"}
                        </button>
                      </div>
                    )}

                    {selectedAppt.status === "Completed" && (
                      <div className="detail_section feedback_card_console">
                        <label className="feedback_console_label">
                          <CheckCircle size={13} /> Care Experience
                        </label>

                        {selectedAppt.hasFeedback ? (
                          <div className="feedback_submitted_display_view animate_slide_down">
                            <div className="feedback_success_banner_flat">
                              <ShieldCheck size={16} />
                              <span>
                                Your review is safely logged in our quality
                                index.
                              </span>
                            </div>

                            <div className="feedback_review_summary_box">
                              <div className="summary_stars_row">
                                {[1, 2, 3, 4, 5].map((starIdx) => (
                                  <span
                                    key={starIdx}
                                    className={`static_star_node ${starIdx <= (selectedAppt.feedbackRef?.rating || rating) ? "glow" : ""}`}
                                  >
                                    ★
                                  </span>
                                ))}
                                <span className="summary_rating_number">
                                  ({selectedAppt.feedbackRef?.rating || rating}
                                  /5)
                                </span>
                              </div>

                              {(selectedAppt.feedbackRef?.comments ||
                                comments) && (
                                <div className="summary_comment_quote">
                                  <p className="summary_feedback_text_paragraph">
                                    "
                                    {selectedAppt.feedbackRef?.comments ||
                                      comments}
                                    "
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="feedback_collapsible_wrapper">
                            {!selectedAppt.isReviewPanelOpen && (
                              <button
                                className="feedback_initiate_btn"
                                onClick={() =>
                                  setSelectedAppt((prev) => ({
                                    ...prev,
                                    isReviewPanelOpen: true,
                                  }))
                                }
                              >
                                <MessageSquareShare size={15} /> Rate This
                                Consultation Session
                              </button>
                            )}

                            {selectedAppt.isReviewPanelOpen && (
                              <div className="feedback_active_workspace animate_slide_down">
                                <div className="workspace_header_flex">
                                  <p className="feedback_prompt_heading">
                                    How would you rate your clinical
                                    consultation with{" "}
                                    <strong>
                                      Dr. {selectedAppt.doctorName}
                                    </strong>
                                    ?
                                  </p>
                                  <button
                                    className="feedback_close_mini"
                                    onClick={() =>
                                      setSelectedAppt((prev) => ({
                                        ...prev,
                                        isReviewPanelOpen: false,
                                      }))
                                    }
                                  >
                                    <X size={14} />
                                  </button>
                                </div>

                                <div className="star_rating_flex_row">
                                  {[1, 2, 3, 4, 5].map((starIdx) => (
                                    <button
                                      type="button"
                                      key={starIdx}
                                      className={`star_interactive_node ${starIdx <= (hover || rating) ? "glow" : ""}`}
                                      onClick={() => setRating(starIdx)}
                                      onMouseEnter={() => setHover(starIdx)}
                                      onMouseLeave={() => setHover(0)}
                                    >
                                      ★
                                    </button>
                                  ))}
                                </div>

                                <textarea
                                  className="feedback_clinical_textarea"
                                  placeholder="Provide details regarding diagnostic clarity, communication empathy, or checkup waiting times..."
                                  value={comments}
                                  onChange={(e) => setComments(e.target.value)}
                                  maxLength={500}
                                />

                                <div className="feedback_action_row_footer">
                                  <button
                                    className="feedback_cancel_flat_btn"
                                    onClick={() =>
                                      setSelectedAppt((prev) => ({
                                        ...prev,
                                        isReviewPanelOpen: false,
                                      }))
                                    }
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    className="feedback_dispatch_action_btn"
                                    onClick={handleDispatchFeedback}
                                    disabled={
                                      submittingFeedback || rating === 0
                                    }
                                  >
                                    {submittingFeedback ? (
                                      <Loader2 className="spinner" size={14} />
                                    ) : (
                                      "Submit Review"
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {selectedAppt.status === "Completed" &&
                      (prescriptionGroups.meds.length > 0 ||
                        prescriptionGroups.tests.length > 0) && (
                        <div className="detail_section pharmacy_lab_integration">
                          {prescriptionGroups.meds.length > 0 && (
                            <div className="integration_card_box">
                              <div className="integration_title_row">
                                <Pill size={16} />
                                <h4>
                                  Prescribed Medicines (
                                  {prescriptionGroups.meds.length})
                                </h4>
                              </div>
                              <button
                                className="integration_action_btn"
                                onClick={() =>
                                  openConfirmation(
                                    prescriptionGroups.meds,
                                    "Pharmacy",
                                  )
                                }
                              >
                                <PackageCheck size={14} /> Order Medicines
                              </button>
                            </div>
                          )}

                          {prescriptionGroups.tests.length > 0 && (
                            <div className="integration_card_box">
                              <div className="integration_title_row">
                                <FlaskConical size={16} />
                                <h4>
                                  Required Lab Tests (
                                  {prescriptionGroups.tests.length})
                                </h4>
                              </div>
                              <button
                                className="integration_action_btn"
                                onClick={() =>
                                  openConfirmation(
                                    prescriptionGroups.tests,
                                    "Laboratory",
                                  )
                                }
                              >
                                <ShieldCheck size={14} /> Book Diagnostics
                                Directly
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                    <div className="detail_section">
                      <label>
                        <FileText size={14} /> Clinical Observations
                      </label>
                      <div className="clinical_notes_box">
                        {selectedAppt.notes || "Awaiting observation summary."}
                      </div>
                    </div>

                    <div className="detail_section">
                      <label>
                        <Clock size={14} /> Timeline
                      </label>
                      <p className="modal_timeline_string">
                        {new Date(selectedAppt.date).toLocaleDateString(
                          "en-GB",
                          {
                            dateStyle: "long",
                          },
                        )}{" "}
                        at {selectedAppt.time}
                      </p>
                    </div>

                    {selectedAppt.status === "Completed" && (
                      <div className="detail_section download_action_box">
                        <button
                          className="download_rx_btn"
                          onClick={() =>
                            handleDownloadPrescription(selectedAppt)
                          }
                        >
                          <Download size={16} /> Download Prescription
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {showCheckout && (
        <div className="checkout_overlay">
          <div className="checkout_modal">
            <div className="checkout_header">
              <div className="header_icon_circle">
                <ShoppingCart size={24} />
              </div>
              <div className="header_text">
                <h3>Confirm Direct Order</h3>
                <p>
                  Purchasing {orderType} from Dr. {selectedAppt?.doctorName}
                </p>
              </div>
              <button
                className="close_checkout"
                onClick={() => setShowCheckout(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="checkout_summary_list">
              {checkoutItems.map((item, idx) => (
                <div key={idx} className="checkout_item_row">
                  <div className="item_name">{item.name}</div>
                  <div className="item_price">
                    {item.price ? `₹${item.price}` : "Included in Package"}
                  </div>
                </div>
              ))}
              <div className="checkout_total_row">
                <span>Total Amount</span>
                <span>
                  ₹
                  {checkoutItems.reduce(
                    (acc, curr) =>
                      acc +
                      Number(curr.price || 0) * Number(curr.quantity || 1),
                    0,
                  )}
                </span>
              </div>
            </div>

            <div className="checkout_info_banner">
              <Info size={16} />
              <p>Direct orders sync directly with central billing systems.</p>
            </div>

            <div className="checkout_actions">
              <button
                className="btn_back_confirm"
                onClick={() => setShowCheckout(false)}
              >
                Cancel
              </button>
              <button
                className="btn_pay_confirm"
                onClick={handleDirectPurchase}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="spinner" size={18} />
                ) : (
                  <>
                    <CreditCard size={18} /> Pay & Order Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <AppointmentForm
        isOpen={isFormOpen}
        onClose={handleCloseFormModal}
        existingData={selectedAppt}
        isRescheduleMode={formRescheduleMode}
      />
    </div>
  );
}
