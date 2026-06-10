import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquareShare, Calendar, ChevronRight, X } from "lucide-react";
import "./Feedback_Panel.css";

export default function PendingFeedbackPanel({ appointments, loading }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const pendingReviews = Array.isArray(appointments)
    ? appointments.filter(
        (appt) =>
          appt && appt.status === "Completed" && !appt.hasFeedback && appt._id,
      )
    : [];

  useEffect(() => {
    const hasPromptedThisSession = sessionStorage.getItem(
      "feedback_prompted_this_session",
    );

    if (!loading && pendingReviews.length > 0 && !hasPromptedThisSession) {
      setIsOpen(true);
      sessionStorage.setItem("feedback_prompted_this_session", "true");
    }
  }, [loading, pendingReviews.length]);

  if (!isOpen || loading || pendingReviews.length === 0) return null;

  const handleRowClick = (appointmentId) => {
    setIsOpen(false);
    navigate("/patient/bookings", {
      state: { autoSelectId: appointmentId, openReviewPanel: true },
    });
  };

  return (
    <div className="feedback_modal_overlay">
      <div className="feedback_modal_window animate_popup">
        <button
          className="feedback_modal_close_btn"
          onClick={() => setIsOpen(false)}
        >
          <X size={16} />
        </button>

        <div className="feedback_panel_header">
          <div className="header_icon_bubble">
            <MessageSquareShare size={20} />
          </div>
          <div className="header_text_block">
            <h3>Recent Consultations Feedback</h3>
            <p>
              You have unreviewed sessions. Please select an appointment below
              to complete your service review evaluation.
            </p>
          </div>
        </div>

        <div className="feedback_pending_list_wrapper">
          {pendingReviews.map((appt) => (
            <div
              key={appt._id}
              className="feedback_pending_row_card"
              onClick={() => handleRowClick(appt._id)}
            >
              <div className="pending_card_left_zone">
                <div className="mini_calendar_badge_box">
                  <Calendar size={13} />
                  <span>
                    {new Date(appt.date).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </div>

                <div className="pending_card_clinical_meta">
                  <span className="doc_title_name">Dr. {appt.doctorName}</span>
                  <span className="dept_sub_tag">
                    {appt.department || "General Consultation"}
                  </span>
                </div>
              </div>

              <div className="pending_card_right_zone">
                <span className="action_interactive_hint">Review</span>
                <div className="chevron_circle_holder">
                  <ChevronRight size={14} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="feedback_modal_footer">
          <button
            className="feedback_skip_session_btn"
            onClick={() => setIsOpen(false)}
          >
            Review Later
          </button>
        </div>
      </div>
    </div>
  );
}
