import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // Added for navigation
import AppointmentForm from "../Appointment_Form/Appointment_Form";
import PendingFeedbackPanel from "../Feedback/Feedback_Panel"; // Adjust path if needed
import {
  Activity,
  Scale,
  Ruler,
  HeartPulse,
  Wind,
  Clock,
  Zap,
  ArrowRight,
  ChevronRight,
  Calendar as CalIcon,
} from "lucide-react";
import "./Patient_Dashboard.css";


import doctor from "../../Assets/Images/Doctor/doctor_dashboard_2.png";

export default function Patient_Dashboard() {
  const [dateTime, setDateTime] = useState(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate(); 

  const user = useMemo(() => {
    return (
      JSON.parse(localStorage.getItem("userData")) || { name: "Guest User" }
    );
  }, []);

  const getStatus = (apptDate) => {
    const today = new Date().toISOString().split("T")[0];
    if (apptDate === today) return "Today";
    return apptDate < today ? "Past" : "Upcoming";
  };

 
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const identifier = user._id || user.id;

        const [apptRes, docsRes] = await Promise.all([
          axios.get(
            `http://localhost:5000/api/appointments/list/${identifier}`,
            { headers },
          ),
          axios.get("http://localhost:5000/api/doctors/list", { headers }),
        ]);

        const structuredData = (apptRes.data || []).map((appt) => {
          const matchDoc = (docsRes.data || []).find(
            (d) => d.name === appt.doctorName,
          );
          return { ...appt, doctorPhoto: matchDoc?.photo || null };
        });

        setAppointments(structuredData);
      } catch (err) {
        console.error("Dashboard sync failed");
      } finally {
        setLoading(false);
      }
    };

    if (user.name) fetchAppointments();
  }, [user._id, user.name]);


  const handleItemClick = (apptId) => {
    
    navigate("/patient/patient_bookings", { state: { autoSelectId: apptId } });
  };


  const nextAppt = useMemo(
    () => appointments.find((a) => a.status === "Upcoming"),
    [appointments],
  );

  const upcomingList = useMemo(
    () => appointments.filter((a) => a.status === "Upcoming").slice(0, 3),
    [appointments],
  );

  const pastList = useMemo(
    () => appointments.filter((a) => a.status === "Completed").slice(0, 3),
    [appointments],
  );


  const calculateBMI = () => {
    if (user.height && user.weight) {
      const heightInMeters = user.height / 100;
      return (user.weight / (heightInMeters * heightInMeters)).toFixed(1);
    }
    return "--";
  };


  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = dateTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getCalendarCells = () => {
    const year = dateTime.getFullYear();
    const month = dateTime.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingEmptyCells = (firstDayOfMonth.getDay() + 6) % 7;
    return Array.from(
      { length: leadingEmptyCells + daysInMonth },
      (_, index) =>
        index < leadingEmptyCells ? null : index - leadingEmptyCells + 1,
    );
  };

  if (loading && user.name !== "Guest User") {
    return (
      <div className="pat_dash_loading">Loading your health portal...</div>
    );
  }

  return (
    <div className="pat_dash_container">
      {/* Main Content Area */}
      <div className="pat_dash_main_content">
        {/* Header Greeting */}
        <div className="pat_dash_row_1">
          <div className="pat_dash_welcome">
            <h1 className="pat_dash_h1">
              {getGreeting()},{" "}
              <span className="pat_dash_span">{user.name}!</span>{" "}
            </h1>
            <p className="pat_dash_p">How are You Feeling Today?</p>
          </div>
        </div>
        <PendingFeedbackPanel appointments={appointments} loading={loading} />
        {/* Branding Hero Banner */}
        <div className="pat_dash_row_2">
          <div className="pat_dash_hero_banner">
            <div className="pat_dash_hero_text_content">
              <h2 className="pat_dash_h2">
                Welcome to <span className="pat_dash_span">Medico+</span>
              </h2>
              <p className="pat_dash_p">
                Manage your appointments and medical records in one place.
              </p>
            </div>
            <img
              src={doctor}
              alt="Doctor"
              className="pat_dash_hero_floating_img"
            />
          </div>
        </div>

        {/* Fast Booking Strip */}
        <div className="pat_dash_row_booking_strip">
          <div className="pat_dash_booking_card">
            <div className="pat_dash_booking_left">
              <div className="pat_dash_booking_icon_box">
                <CalIcon size={24} color="#007acc" />
              </div>
              <div className="pat_dash_booking_text">
                <h4 className="pat_dash_h4">Need a Consultation?</h4>
                <p className="pat_dash_p">
                  Schedule a session with our specialized doctors in just a few
                  clicks.
                </p>
              </div>
            </div>
            <button
              className="pat_dash_book_btn_animated"
              onClick={() => setIsFormOpen(true)}
            >
              <span>Book Appointment Now</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Vital Signs Monitor */}
        <div className="pat_dash_row_3_vitals">
          <div className="pat_dash_vitals_section_header">
            <h3 className="pat_dash_h3">Health Metrics</h3>
          </div>
          <div className="pat_dash_vitals_cards_grid">
            <div className="pat_dash_vital_card">
              <Scale size={20} color="#007acc" />
              <div className="pat_dash_vital_info">
                <span className="pat_dash_span">Weight</span>
                <strong className="pat_dash_strong">
                  {user.weight || "--"} <small>kg</small>
                </strong>
              </div>
            </div>
            <div className="pat_dash_vital_card">
              <Ruler size={20} color="#007acc" />
              <div className="pat_dash_vital_info">
                <span className="pat_dash_span">Height</span>
                <strong className="pat_dash_strong">
                  {user.height || "--"} <small>cm</small>
                </strong>
              </div>
            </div>
            <div className="pat_dash_vital_card">
              <Activity size={20} color="#8b5cf6" />
              <div className="pat_dash_vital_info">
                <span className="pat_dash_span">BMI Score</span>
                <strong className="pat_dash_strong">{calculateBMI()}</strong>
              </div>
            </div>
            <div className="pat_dash_vital_card">
              <Wind size={20} color="#10b981" />
              <div className="pat_dash_vital_info">
                <span className="pat_dash_span">Blood Group</span>
                <strong className="pat_dash_strong">
                  {user.bloodGroup || "N/A"}
                </strong>
              </div>
            </div>
            <div className="pat_dash_vital_card">
              <HeartPulse size={20} color="#f43f5e" />
              <div className="pat_dash_vital_info">
                <span className="pat_dash_span">Age</span>
                <strong className="pat_dash_strong">
                  {user.age || "--"} <small>Yrs</small>
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      
      <aside className="pat_dash_sidebar_widgets">
        
        <div className="pat_dash_sidebar_widget pat_dash_widget_calendar">
          <div className="pat_dash_widget_calendar_header">
            <Clock size={20} color="#007acc" />
            <div className="pat_dash_calendar_time_group">
              <span className="pat_dash_calendar_live_clock">
                {dateTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
              <span className="pat_dash_calendar_full_date">
                {dateTime.toLocaleDateString(undefined, { weekday: "long" })},{" "}
                {dateTime.toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
          <div className="pat_dash_calendar_grid_ui">
            {daysOfWeek.map((day, idx) => (
              <span key={idx} className="pat_dash_calendar_day_label">
                {day}
              </span>
            ))}
            {getCalendarCells().map((day, i) => (
              <span
                key={i}
                className={`pat_dash_calendar_date_cell ${day === dateTime.getDate() ? "pat_dash_calendar_today_active" : ""}`}
              >
                {day || ""}
              </span>
            ))}
          </div>
        </div>

        {/* Priority Appointment Card */}
        <div className="pat_dash_sidebar_widget pat_dash_widget_on_deck">
          <div className="pat_dash_on_deck_header">
            <div className="pat_dash_on_deck_flex">
              <Zap size={16} color="#007acc" fill="#007acc" />
              <h3 className="pat_dash_h3">Next Session</h3>
            </div>
          </div>

          {nextAppt ? (
            <div
              className="pat_dash_on_deck_content_wrapper"
              onClick={() => handleItemClick(nextAppt._id)}
              style={{ cursor: "pointer" }}
            >
              <div className="pat_dash_on_deck_hero">
                <div className="pat_dash_on_deck_avatar">
                  {nextAppt.doctorPhoto ? (
                   <img
                    src={
                      nextAppt.doctorPhoto && nextAppt.doctorPhoto.trim() !== ""
                        ? `http://localhost:5000/uploads/${nextAppt.doctorPhoto}`
                        : null
                    }
                    alt={nextAppt.doctorName || "Specialist"}
                    className="pat_dash_on_deck_img_cropped"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        nextAppt.doctorName || "Doctor"
                      )}&background=f0f7ff&color=007acc&size=80`;
                    }}
                  />

                  ) : (
                    <span className="pat_dash_on_deck_initials_fallback">
                      {nextAppt.doctorName?.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="pat_dash_on_deck_meta">
                  <strong className="pat_dash_strong">
                    {nextAppt.doctorName}
                  </strong>
                  <span className="pat_dash_span">{nextAppt.type}</span>
                </div>
              </div>
              <div className="pat_dash_on_deck_bento_stats">
                <div className="pat_dash_bento_tile">
                  <span className="pat_dash_span">Time</span>
                  <strong className="pat_dash_strong">{nextAppt.time}</strong>
                </div>
                <div className="pat_dash_bento_tile">
                  <span className="pat_dash_span">Date</span>
                  <strong className="pat_dash_strong">{nextAppt.date}</strong>
                </div>
              </div>
              <button className="pat_dash_on_deck_action_btn">
                Join Lobby <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className="pat_dash_on_deck_empty_container">
              <p className="pat_dash_p">No sessions for today.</p>
            </div>
          )}
        </div>
      </aside>

      {/* Full Width Appointment Lists */}
      <div className="pat_dash_row_4_full_width">
        <div className="pat_dash_list_card_half">
          <div className="pat_dash_list_header">
            <h3 className="pat_dash_h3">Upcoming Schedule</h3>
          </div>
          <div className="pat_dash_list_body">
            {upcomingList.length > 0 ? (
              upcomingList.map((appt, i) => (
                <div
                  key={i}
                  className="pat_dash_list_item"
                  onClick={() => handleItemClick(appt._id)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="pat_dash_item_info">
                    <strong className="pat_dash_strong">
                      {appt.doctorName}
                    </strong>
                    <span className="pat_dash_span">
                      {appt.type} • {appt.time}
                    </span>
                  </div>
                  <ChevronRight size={18} className="pat_dash_list_chevron" />
                </div>
              ))
            ) : (
              <p className="pat_dash_empty_text">No upcoming appointments</p>
            )}
          </div>
        </div>

        <div className="pat_dash_list_card_half">
          <div className="pat_dash_list_header">
            <h3 className="pat_dash_h3">History</h3>
          </div>
          <div className="pat_dash_list_body">
            {pastList.length > 0 ? (
              pastList.map((appt, i) => (
                <div
                  key={i}
                  className="pat_dash_list_item"
                  onClick={() => handleItemClick(appt._id)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="pat_dash_item_info">
                    <strong className="pat_dash_strong">
                      {appt.doctorName}
                    </strong>
                    <span className="pat_dash_span">
                      Completed on {appt.date}
                    </span>
                  </div>
                  <div className="pat_dash_status_badge_done">
                    {getStatus(appt.date)}
                  </div>
                </div>
              ))
            ) : (
              <p className="pat_dash_empty_text">No history found</p>
            )}
          </div>
        </div>
      </div>

      <AppointmentForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />
    </div>
  );
}
