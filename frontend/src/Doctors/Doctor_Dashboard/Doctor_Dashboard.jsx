import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import {
  ExternalLink,
  User,
  CheckCircle,
  Clock4,
  Star,
  ArrowRight,
  Calendar,
  Zap,
  Loader2,
  X,
  MapPin,
  Layers,
  ChevronRight,
} from "lucide-react";
import "./Doctor_Dashboard.css";

ChartJS.register(
  LineElement,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
);

export default function Dashboard() {
  const navigate = useNavigate();

  const doctorUser = JSON.parse(localStorage.getItem("userData")) || {};
  const loggedInDoctorName = doctorUser.name;
  const doctorId = doctorUser.doctorId || doctorUser._id;

  const [docAppts, setDocAppts] = useState([]);
  const [performanceStats, setPerformanceStats] = useState([0, 0, 0, 0]);
  const [globalEvents, setGlobalEvents] = useState([]);
  const [selectedEventDetail, setSelectedEventDetail] = useState(null);
  const [feedbackList, setFeedbackList] = useState([]);
  const [counts, setCounts] = useState({ total: 0, completed: 0, upcoming: 0 });
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toISOString().split("T")[0];

  /* --- LOGIC: DATA ASYNC HANDSHAKE ENGINE --- */
  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [apptRes, profRes, eventRes, feedbackRes] = await Promise.all([
        axios.get(
          `http://localhost:5000/api/appointments/doctor/${encodeURIComponent(loggedInDoctorName)}`,
          { headers },
        ),
        axios.get(
          `http://localhost:5000/api/doctors/profile/${doctorUser.doctorId}`,
          {
            headers,
          },
        ),
        axios.get("http://localhost:5000/api/events/all", { headers }),
        axios.get(
          `http://localhost:5000/api/feedback/doctor?doctorName=${encodeURIComponent(loggedInDoctorName)}`,
          { headers },
        ),
      ]);

      setDocAppts(apptRes.data || []);
      setPerformanceStats(profRes.data?.performanceStats || [10, 25, 45, 30]);
      setGlobalEvents(eventRes.data || []);
      setFeedbackList(feedbackRes.data || []);
    } catch (err) {
      console.error("Dashboard Data Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loggedInDoctorName) fetchDashboardData();
  }, [loggedInDoctorName]);

  /* --- LOGIC: CARD COUNT ODOMETER RUNNERS --- */
  useEffect(() => {
    if (docAppts.length === 0) return;

    let t = 0,
      c = 0,
      u = 0;
    const targetT = docAppts.length;
    const targetC = docAppts.filter((a) => a.status === "Completed").length;
    const targetU = docAppts.filter((a) => a.status === "Upcoming").length;

    const interval = setInterval(() => {
      let updated = false;
      if (t < targetT) {
        t++;
        updated = true;
      }
      if (c < targetC) {
        c++;
        updated = true;
      }
      if (u < targetU) {
        u++;
        updated = true;
      }

      setCounts({ total: t, completed: c, upcoming: u });
      if (!updated) clearInterval(interval);
    }, 20);
    return () => clearInterval(interval);
  }, [docAppts]);

  /* --- LOGIC: COMPUTE QUEUES --- */
  const nextPat = useMemo(() => {
    return [...docAppts]
      .filter((a) => a.date === todayStr && a.status === "Upcoming")
      .sort((a, b) => {
        const parseTimeTo24h = (timeStr) => {
          if (!timeStr) return 0;
          const [time, modifier] = timeStr.split(" ");
          let [hours, minutes] = time.split(":").map(Number);
          if (hours === 12) hours = 0;
          if (modifier === "PM") hours += 12;
          return hours * 60 + minutes;
        };
        return parseTimeTo24h(a.time) - parseTimeTo24h(b.time);
      })[0];
  }, [docAppts, todayStr]);

  const upcomingDoctorEvents = useMemo(() => {
    return globalEvents
      .filter((event) => {
        const speakers = Array.isArray(event.doctors) ? event.doctors : [];
        const isPanelist = speakers.some((name) =>
          (name || "")
            .toLowerCase()
            .trim()
            .includes((loggedInDoctorName || "").toLowerCase().trim()),
        );
        return (
          isPanelist &&
          event.status !== "Completed" &&
          event.status !== "Cancelled"
        );
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);
  }, [globalEvents, loggedInDoctorName]);

  const ratingData = useMemo(() => {
    const valid = feedbackList.filter((r) => r.rating > 0);
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    valid.forEach((r) => {
      const clampedScore = Math.max(1, Math.min(5, Math.round(r.rating)));
      counts[clampedScore]++;
    });
    return { counts };
  }, [feedbackList]);

  const consultationMixData = useMemo(() => {
    const completedSessions = docAppts.filter((a) => a.status === "Completed");
    if (completedSessions.length === 0) return [1, 0];
    const followUps = completedSessions.filter(
      (a) =>
        /follow-up|review|routine|checkup/i.test(a.notes || "") ||
        a.type === "Follow-up",
    ).length;
    return [completedSessions.length - followUps, followUps];
  }, [docAppts]);

  if (loading)
    return (
      <div className="doc_dash_loading">
        <Loader2 className="doc_dash_spin" /> Synchronizing Medical Intel...
      </div>
    );

  return (
    <div className="doc_dash_container doc_dash_view_fade_in">
      {/* MASTER ROW 1: 2:1 SEPARATION CONTAINER */}
      <div className="doc_dash_master_upper_split">
        {/* COLUMN 1 (LEFT): 2x SPATIAL DEPTH GRIDS */}
        <div className="doc_dash_left_analytics_stack">
          {/* STACK ROW 1: STATS TILES */}
          <div className="doc_dash_stats_cards_row">
            <div className="doc_dash_stat_tile">
              <h3>Total Appointments</h3>
              <p>{counts.total}</p>
            </div>
            <div className="doc_dash_stat_tile">
              <h3>Completed</h3>
              <p>{counts.completed}</p>
            </div>
            <div className="doc_dash_stat_tile">
              <h3>Upcoming</h3>
              <p>{counts.upcoming}</p>
            </div>
          </div>

          {/* STACK ROW 2: GRAPH SEGMENT A (50% WIDTH EACH) */}
          <div className="doc_dash_charts_bento_row">
            <div className="doc_dash_chart_card">
              <div className="doc_dash_chart_head">
                <h3>
                  Patient Traffic <span className="doc_dash_tag">Live</span>
                </h3>
                <button
                  className="doc_dash_view_btn"
                  onClick={() =>
                    navigate("/doctor/doctor_performance_dashboard")
                  }
                >
                  <ExternalLink size={14} />
                </button>
              </div>
              <div className="doc_dash_chart_box">
                <Line
                  data={{
                    labels: ["Q1", "Q2", "Q3", "Q4"],
                    datasets: [
                      {
                        label: "Performance Metrics",
                        data: performanceStats,
                        borderColor: "#007acc",
                        backgroundColor: "rgba(0,122,204,0.06)",
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                        borderWidth: 3,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                  }}
                />
              </div>
            </div>

            <div className="doc_dash_chart_card">
              <div className="doc_dash_chart_head">
                <h3>Consultation Mix</h3>
              </div>
              <div className="doc_dash_chart_box_pie">
                <div className="doc_dash_pie_wrap">
                  <Doughnut
                    data={{
                      labels: ["New Cases", "Follow-ups"],
                      datasets: [
                        {
                          data: consultationMixData,
                          backgroundColor: ["#007acc", "#00d2ff"],
                          borderWidth: 0,
                          cutout: "75%",
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                    }}
                  />
                </div>
                <div className="doc_dash_pie_legend">
                  <div className="doc_dash_leg_item">
                    <span className="doc_dash_dot doc_dash_bg_blue"></span>
                    <span>New ({consultationMixData[0]})</span>
                  </div>
                  <div className="doc_dash_leg_item">
                    <span className="doc_dash_dot doc_dash_bg_cyan"></span>
                    <span>Follow-up ({consultationMixData[1]})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STACK ROW 3: GRAPH SEGMENT B (50% WIDTH EACH) */}
          <div className="doc_dash_charts_bento_row">
            <div className="doc_dash_chart_card">
              <div className="doc_dash_chart_head">
                <h3>Appointments Overview</h3>
                <button
                  className="doc_dash_view_btn"
                  onClick={() => navigate("/doctor/appointments")}
                >
                  <ExternalLink size={14} />
                </button>
              </div>
              <div className="doc_dash_chart_box">
                <Bar
                  data={{
                    labels: ["Upcoming Queue", "Completed Files"],
                    datasets: [
                      {
                        label: "Volume Data",
                        data: [counts.upcoming, counts.completed],
                        backgroundColor: ["#007acc", "#10b981"],
                        borderRadius: 6,
                        barThickness: 32,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                  }}
                />
              </div>
            </div>

            <div className="doc_dash_chart_card">
              <div className="doc_dash_chart_head">
                <h3>Patient Satisfaction</h3>
                <button
                  className="doc_dash_view_btn"
                  onClick={() => navigate("/doctor/reviews")}
                >
                  <ExternalLink size={14} />
                </button>
              </div>
              <div className="doc_dash_ratings_stack">
                {[5, 4, 3, 2, 1].map((star) => {
                  const starCounts = ratingData?.counts || {
                    5: 0,
                    4: 0,
                    3: 0,
                    2: 0,
                    1: 0,
                  };
                  const totalForStar = starCounts[star] || 0;
                  const totalReviews = Object.values(starCounts).reduce(
                    (s, c) => s + c,
                    0,
                  );
                  const barPct =
                    totalReviews > 0
                      ? ((totalForStar / totalReviews) * 100).toFixed(0)
                      : "0";

                  return (
                    <div key={star} className="doc_dash_rating_line">
                      <div className="doc_dash_star_val">
                        {star} <Star size={10} fill="#ffcd56" color="#ffcd56" />
                      </div>
                      <div className="doc_dash_bar_bg">
                        <div
                          className="doc_dash_bar_fill"
                          style={{ width: `${barPct}%` }}
                        ></div>
                      </div>
                      <div className="doc_dash_rating_total">
                        {totalForStar}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2 (RIGHT): 50% HEIGHT SEGREGATED OVERVIEW PANELS */}
        <div className="doc_dash_right_priority_stack">
          {/* PANEL ROW 1: ON DECK PATIENT CARD */}
          <div className="doc_dash_next_pat_card_elite">
            <div className="doc_dash_card_title_row">
              <div className="doc_dash_flex_center">
                <Zap size={16} className="doc_dash_zap_icon" />
                <h3>Next Appointment</h3>
              </div>
              <span className="doc_dash_priority_tag">On Deck</span>
            </div>
            {nextPat ? (
              <div className="doc_dash_pat_profile_ui">
                <div className="doc_dash_pat_hero">
                  <div className="doc_dash_pat_avatar">
                    {nextPat.patientName?.charAt(0).toUpperCase()}
                  </div>
                  <div className="doc_dash_pat_meta">
                    <strong>{nextPat.patientName}</strong>
                    <span>
                      REF:{" "}
                      {nextPat.appointmentID ||
                        nextPat._id?.slice(-6).toUpperCase()}
                    </span>
                  </div>
                </div>
                <button
                  className="doc_dash_btn_initiate_consult"
                  onClick={() =>
                    navigate("/doctor/doctor_appointments_management", {
                      state: { autoSelectId: nextPat._id },
                    })
                  }
                >
                  Initiate <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              <div className="doc_dash_empty_msg_bounded">
                <div className="doc_dash_empty_msg_inner">
                  No appointments scheduled on deck for today.
                </div>
              </div>
            )}
          </div>

          {/* PANEL ROW 2: CLINICAL EVENTS TIMELINE */}
          <div className="doc_dash_events_panel_elite">
            <div className="doc_dash_card_title_row">
              <div className="doc_dash_flex_center">
                <Calendar size={16} color="#007acc" />
                <h3>Clinical Conferences ({upcomingDoctorEvents.length})</h3>
              </div>
            </div>
            <div className="doc_dash_event_list_scroll">
              {upcomingDoctorEvents.length > 0 ? (
                upcomingDoctorEvents.map((evt) => {
                  const dateParts = evt.date ? evt.date.split("-") : [];
                  const dayNum = dateParts[2] || "15";
                  const months = [
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                  ];
                  const monthName = dateParts[1]
                    ? months[parseInt(dateParts[1]) - 1]
                    : "May";
                  const cardClassStyle =
                    evt.type === "Conference"
                      ? "doc_dash_pink"
                      : "doc_dash_blue";

                  return (
                    <div
                      className={`doc_dash_event_card ${cardClassStyle}`}
                      key={evt._id}
                    >
                      <div className="doc_dash_event_main_flex">
                        <div className="doc_dash_date_badge">
                          <span>{dayNum}</span>
                          <span>{monthName}</span>
                        </div>
                        <div className="doc_dash_event_info">
                          <strong>{evt.title}</strong>
                          <span>
                            {evt.startTime || "09:00 AM"} • {evt.location}
                          </span>
                        </div>
                      </div>
                      <button
                        className="doc_dash_event_trigger_btn"
                        onClick={() => setSelectedEventDetail(evt)}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="doc_dash_empty_msg">
                  No upcoming assigned panels recorded in calendar registry.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MASTER ROW 2: LOWER QUEUE MATRIX PANELS (50% / 50% SPLIT WIDTH) */}
      <div className="doc_dash_bottom_section">
        <div className="doc_dash_info_card_modern">
          <div className="doc_dash_modern_header">
            <div className="doc_dash_header_info">
              <CheckCircle size={16} color="#10b981" />
              <h3>Recently Completed</h3>
            </div>
          </div>
          <div className="doc_dash_modern_grid">
            {docAppts
              .filter((a) => a.status === "Completed")
              .slice(0, 3)
              .map((app) => (
                <div className="doc_dash_modern_item_card" key={app._id}>
                  <div className="doc_dash_item_main">
                    <div className="doc_dash_item_avatar">
                      <User size={14} />
                    </div>
                    <div className="doc_dash_item_details">
                      <strong>{app.patientName}</strong>
                      <span>{app.type || "General Checkup"}</span>
                    </div>
                  </div>
                  <button
                    className="doc_dash_view_more_link_btn"
                    onClick={() =>
                      navigate("/doctor/doctor_appointments_management", {
                        state: { autoSelectId: app._id },
                      })
                    }
                  >
                    View Case
                  </button>
                </div>
              ))}
            {docAppts.filter((a) => a.status === "Completed").length === 0 && (
              <div className="doc_dash_empty_msg">
                No completed files indexed yet.
              </div>
            )}
          </div>
        </div>

        <div className="doc_dash_info_card_modern">
          <div className="doc_dash_modern_header">
            <div className="doc_dash_header_info">
              <Clock4 size={16} color="#007acc" />
              <h3>Upcoming Queue</h3>
            </div>
          </div>
          <div className="doc_dash_modern_grid">
            {docAppts
              .filter((a) => a.status === "Upcoming")
              .slice(0, 3)
              .map((app) => (
                <div className="doc_dash_modern_item_card" key={app._id}>
                  <div className="doc_dash_item_main">
                    <div className="doc_dash_item_avatar doc_dash_blue_avatar">
                      <User size={14} />
                    </div>
                    <div className="doc_dash_item_details">
                      <strong>{app.patientName}</strong>
                      <span>{app.time || "Scheduled"}</span>
                    </div>
                  </div>
                  <button
                    className="doc_dash_view_more_link_btn"
                    onClick={() =>
                      navigate("/doctor/doctor_appointments_management", {
                        state: { autoSelectId: app._id },
                      })
                    }
                  >
                    Open Slot
                  </button>
                </div>
              ))}
            {docAppts.filter((a) => a.status === "Upcoming").length === 0 && (
              <div className="doc_dash_empty_msg">
                No matching records scheduled inside the upcoming queue.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DETAILED LOG OVERLAY MODALS */}
      {selectedEventDetail && (
        <div
          className="doc_dash_modal_overlay"
          onClick={() => setSelectedEventDetail(null)}
        >
          <div
            className="doc_dash_modal_card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="doc_dash_modal_close_btn"
              onClick={() => setSelectedEventDetail(null)}
            >
              <X size={20} />
            </button>
            <div className="doc_dash_modal_header_accent">
              <span className="doc_dash_modal_pill_type">
                {selectedEventDetail.type || "Symposium Workshop"}
              </span>
              <h2>{selectedEventDetail.title}</h2>
            </div>
            <div className="doc_dash_modal_details_grid">
              <div>
                <label>
                  <Calendar size={12} className="doc_dash_mini_icon" /> Schedule
                  Target
                </label>
                <strong>
                  {selectedEventDetail.date} •{" "}
                  {selectedEventDetail.startTime || "09:00 AM"}
                </strong>
              </div>
              <div>
                <label>
                  <MapPin size={12} className="doc_dash_mini_icon" /> Location
                  Facility
                </label>
                <strong>{selectedEventDetail.location || "Auditorium"}</strong>
              </div>
            </div>
            <div className="doc_dash_modal_tracks_box">
              <label>
                <Layers size={12} className="doc_dash_mini_icon" /> Medical
                Tracks Covered
              </label>
              <strong>
                {Array.isArray(selectedEventDetail.department)
                  ? selectedEventDetail.department.join(", ")
                  : selectedEventDetail.department}
              </strong>
            </div>
            <div>
              <label className="doc_dash_modal_sublabel">
                Administrative Notes
              </label>
              <p className="doc_dash_modal_notes_text">
                "
                {selectedEventDetail.notes ||
                  "No extra session outlines provided by clinical administration arrays for this calendar track index slot."}
                "
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
