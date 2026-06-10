import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Line, Bar, Pie } from "react-chartjs-2";
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
} from "chart.js";
import {
  Clock,
  ExternalLink,
  User,
  Activity,
  CheckCircle,
  Clock4,
  Loader2,
} from "lucide-react";
import "./Admin_Dashboard.css";

ChartJS.register(
  LineElement,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
);

export default function Admin_Dashboard() {
  /* --- 1. MERN LIVE DATA STATES --- */
  const [loading, setLoading] = useState(true);
  const [liveData, setLiveData] = useState({
    doctors: [],
    patients: [],
    appointments: [],
  });

  const [counts, setCounts] = useState({
    doctors: 0,
    patients: 0,
    appointments: 0,
  });
  const [dateTime, setDateTime] = useState(new Date());
  const navigate = useNavigate();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().toLocaleString("default", { month: "long" });
  const [globalEvents, setGlobalEvents] = useState([]);

  const dynamicDepartmentLoadStats = useMemo(() => {
    const appts = liveData.appointments || [];
    const deptCountsMap = {};

    appts.forEach((appt) => {
      if (appt.department) {
        const sanitizedDept = appt.department.trim();
        deptCountsMap[sanitizedDept] = (deptCountsMap[sanitizedDept] || 0) + 1;
      }
    });

    return {
      labels: Object.keys(deptCountsMap),
      counts: Object.values(deptCountsMap),
    };
  }, [liveData.appointments]);
  /* --- 2. MULTI-COLLECTION SYNCHRONIZATION --- */
  const parseEventDateDetails = (rawDateStr) => {
    if (!rawDateStr || typeof rawDateStr !== "string") {
      return { day: "•", month: "Event" };
    }
    const dateParts = rawDateStr.split("-");

    if (dateParts.length === 3) {
      const year = dateParts[0];
      const monthIndex = parseInt(dateParts[1], 10) - 1;
      const day = parseInt(dateParts[2], 10);

      const monthsShort = [
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

      return {
        day: String(day).padStart(2, "0"),
        month: monthsShort[monthIndex] || "Event",
      };
    }

    return { day: "•", month: "Event" };
  };
  const patientRegistrationTrends = useMemo(() => {
    const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
    liveData.patients.forEach((patient) => {
      if (patient.createdAt) {
        const dayIndex = new Date(patient.createdAt).getDay();
        const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
        weekdayCounts[adjustedIndex]++;
      }
    });
    return weekdayCounts;
  }, [liveData.patients]);
  /* --- 2. MULTI-COLLECTION SYNCHRONIZATION --- */
  const fetchGlobalStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [docRes, patRes, apptRes, eventRes] = await Promise.all([
        axios.get("http://localhost:5000/api/doctors/list", { headers }),
        axios.get("http://localhost:5000/api/patients/all", { headers }),
        axios.get("http://localhost:5000/api/appointments/all", { headers }),
        axios.get("http://localhost:5000/api/events/all", { headers }),
      ]);

      setLiveData({
        doctors: docRes.data || [],
        patients: patRes.data || [],
        appointments: apptRes.data || [],
      });

      setGlobalEvents(eventRes.data || []);
    } catch (err) {
      console.error("MERN Global Synchronization Failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalStats();
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /* --- 3. COUNTER ANIMATION ENGINE --- */
  useEffect(() => {
    if (loading) return;

    let d = 0,
      p = 0,
      a = 0;
    const targetD = liveData.doctors.length;
    const targetP = liveData.patients.length;
    const targetA = liveData.appointments.length;

    const interval = setInterval(() => {
      let updated = false;

      if (d < targetD) {
        d++;
        updated = true;
      }
      if (p < targetP) {
        p += Math.ceil(targetP / 30) || 1;
        updated = true;
      }
      if (a < targetA) {
        a += Math.ceil(targetA / 30) || 1;
        updated = true;
      }

      setCounts({
        doctors: d > targetD ? targetD : d,
        patients: p > targetP ? targetP : p,
        appointments: a > targetA ? targetA : a,
      });

      if (!updated || (d >= targetD && p >= targetP && a >= targetA)) {
        setCounts({
          doctors: targetD,
          patients: targetP,
          appointments: targetA,
        });
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [loading, liveData]);

  const departmentCaseloadDistribution = useMemo(() => {
    const sectors = [
      "Cardiology",
      "Orthopedics",
      "General Medicine",
      "Pediatrics",
    ];
    const sectorCounts = [0, 0, 0, 0];
    liveData.appointments.forEach((appt) => {
      const deptName = appt.department || "";
      if (deptName.includes("Cardio")) sectorCounts[0]++;
      else if (deptName.includes("Ortho")) sectorCounts[1]++;
      else if (deptName.includes("Gen") || deptName.includes("Patient"))
        sectorCounts[2]++;
      else if (deptName.includes("Ped") || deptName.includes("Child"))
        sectorCounts[3]++;
    });
    return { labels: sectors, counts: sectorCounts };
  }, [liveData.appointments]);

  const weeklyClinicalRevenue = useMemo(() => {
    const weeklyBuckets = [0, 0, 0, 0];
    liveData.appointments.forEach((appt) => {
      if (appt.status === "Completed" && Array.isArray(appt.prescribedItems)) {
        const apptDate = new Date(appt.date || appt.createdAt);
        const dayOfMonth = apptDate.getDate();
        let bucketIndex = Math.floor((dayOfMonth - 1) / 7);
        if (bucketIndex > 3) bucketIndex = 3;

        const sessionSum = appt.prescribedItems.reduce(
          (acc, item) => acc + (item.price || 0) * (item.quantity || 1),
          0,
        );
        weeklyBuckets[bucketIndex] += sessionSum;
      }
    });
    return weeklyBuckets;
  }, [liveData.appointments]);
  /* --- 4. MEMOIZED ANALYTICS SUMMARY --- */
  const pieCounts = useMemo(() => {
    const data = liveData.patients || [];
    return [
      data.filter((p) => p.age > 60).length,
      data.filter(
        (p) =>
          (p.gender || "").toLowerCase() === "female" &&
          p.age <= 60 &&
          p.age >= 18,
      ).length,
      data.filter(
        (p) =>
          (p.gender || "").toLowerCase() === "male" &&
          p.age <= 60 &&
          p.age >= 18,
      ).length,
      data.filter((p) => p.age < 18).length,
    ];
  }, [liveData.patients]);

  const calendarCells = useMemo(() => {
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
  }, [dateTime]);

  if (loading) {
    return (
      <div className="admin_dash_load">
        <Loader2 className="spin" /> Synchronizing Global Details
      </div>
    );
  }

  return (
    <div className="adm_dash__dashboard-container">
      <div className="adm_dash__top-section">
        <div className="adm_dash__left-column">
          <div className="adm_dash__stats-cards">
            <div className="adm_dash__stat-card">
              <h3>Total Doctors</h3>
              <p>{counts.doctors}</p>
            </div>
            <div className="adm_dash__stat-card">
              <h3>Total Patients</h3>
              <p>{counts.patients}</p>
            </div>
            <div className="adm_dash__stat-card">
              <h3>Total Appointments</h3>
              <p>{counts.appointments}</p>
            </div>
          </div>

          <div className="adm_dash__charts-grid">
            <div className="adm_dash__chart-card">
              <div className="adm_dash__chart-header-ui">
                <div className="adm_dash__header-main-group">
                  <h3>
                    Weekly trend{" "}
                    <span className="adm_dash__inline-tag">{currentYear}</span>
                  </h3>
                </div>
                <button
                  className="adm_dash__view-btn"
                  onClick={() => navigate("/admin/statistics")}
                >
                  <ExternalLink size={14} />
                </button>
              </div>
              <div className="adm_dash__chart-wrap">
                <Line
                  data={{
                    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                    datasets: [
                      {
                        label: "New Patient Registrations",
                        data: patientRegistrationTrends,
                        borderColor: "#007acc",
                        backgroundColor: "rgba(0, 122, 204, 0.1)",
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 4,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { precision: 0 },
                      },
                    },
                  }}
                />
              </div>
            </div>

            <div className="adm_dash__chart-card">
              <div className="adm_dash__chart-header-ui">
                <div className="adm_dash__header-main-group">
                  <h3>
                    Revenue Trend{" "}
                    <span className="adm_dash__inline-tag">{currentMonth}</span>
                  </h3>
                </div>
                <button
                  className="adm_dash__view-btn"
                  onClick={() => navigate("/admin/revenue_details")}
                >
                  <ExternalLink size={14} />
                </button>
              </div>
              <div className="adm_dash__chart-wrap">
                <Bar
                  data={{
                    labels: ["W1", "W2", "W3", "W4"],
                    datasets: [
                      {
                        label: "Revenue",
                        data: weeklyClinicalRevenue,
                        backgroundColor: "rgba(0,198,255,0.7)",
                        borderRadius: 6,
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

            <div className="adm_dash__chart-card">
              <div className="adm_dash__chart-header-ui">
                <h3>Patients by Type</h3>
                <button
                  className="adm_dash__view-btn"
                  onClick={() => navigate("/admin/patients_management")}
                >
                  <ExternalLink size={14} />
                </button>
              </div>
              <div className="adm_dash__chart-wrap-pie">
                <div className="adm_dash__pie-container">
                  <Pie
                    data={{
                      labels: ["Elders", "Women", "Men", "Children"],
                      datasets: [
                        {
                          data: pieCounts,
                          backgroundColor: [
                            "#ff6384",
                            "#36a2eb",
                            "#ffcd56",
                            "#4bc0c0",
                          ],
                          borderWidth: 1,
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

                <div className="adm_dash__pie-legend-slim">
                  {["Elders", "Women", "Men", "Children"].map((label, i) => (
                    <div
                      key={`${label}-${i}`}
                      className="adm_dash__legend-item-compact"
                    >
                      <span
                        className="adm_dash__dot-mini"
                        style={{
                          backgroundColor: [
                            "#ff6384",
                            "#36a2eb",
                            "#ffcd56",
                            "#4bc0c0",
                          ][i],
                        }}
                      ></span>
                      <span className="adm_dash__txt-mini">
                        {label} <strong>{pieCounts[i] || 0}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="adm_dash__chart-card">
              <div className="adm_dash__chart-header-ui">
                <div className="adm_dash__header-main-group">
                  <h3>
                    Dept Statistics{" "}
                    <span className="adm_dash__inline-tag">Global</span>
                  </h3>
                </div>
                <button
                  className="adm_dash__view-btn"
                  onClick={() => navigate("/admin/departments_management")}
                >
                  <ExternalLink size={14} />
                </button>
              </div>
              <div className="adm_dash__chart-wrap">
                <Bar
                  data={{
                    labels:
                      dynamicDepartmentLoadStats.labels.length > 0
                        ? dynamicDepartmentLoadStats.labels
                        : ["No Records"],
                    datasets: [
                      {
                        label: "Active Caseload",
                        data:
                          dynamicDepartmentLoadStats.counts.length > 0
                            ? dynamicDepartmentLoadStats.counts
                            : [0],
                        backgroundColor: [
                          "#007acc",
                          "#00c6ff",
                          "#36a2eb",
                          "#ff6384",
                          "#4bc0c0",
                          "#ffcd56",
                          "#ff9f40",
                        ],
                        borderRadius: 6,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { precision: 0 },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="adm_dash__right-column">
          <div className="adm_dash__calendar-card">
            <div className="adm_dash__widget-header">
              <Clock size={20} color="#007acc" />
              <div className="adm_dash__live-time-group">
                <span className="adm_dash__live-time">
                  {dateTime.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
                <div className="adm_dash__live-date-single-line">
                  <span className="adm_dash__full-date-text">
                    {dateTime.toLocaleDateString(undefined, {
                      weekday: "long",
                    })}
                    ,{" "}
                    {dateTime.toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
            <div className="adm_dash__calendar-widget-ui">
              <div className="adm_dash__cal-grid">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <span
                    key={`cal-day-header-${d}-${i}`}
                    className="admin_dashboard_cal-day-label"
                  >
                    {d}
                  </span>
                ))}
                {calendarCells.map((day, i) => (
                  <span
                    key={i}
                    className={`adm_dash__cal-date ${day === dateTime.getDate() ? "adm_dash__current" : ""}`}
                  >
                    {day || ""}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="adm_dash__events-section">
            <div className="adm_dash__modern-header">
              <div className="adm_dash__header-info">
                <Activity size={16} color="#007acc" />
                <h3>Upcoming Events</h3>
              </div>
              <button
                className="adm_dash__text-btn"
                onClick={() => navigate("/admin/events_management")}
              >
                View All
              </button>
            </div>
            <div className="adm_dash__events-list">
              {Array.isArray(globalEvents) &&
              globalEvents
                .filter(
                  (e) => e.status !== "Completed" && e.status !== "Cancelled",
                )
                .slice(0, 2).length > 0 ? (
                globalEvents
                  .filter(
                    (e) => e.status !== "Completed" && e.status !== "Cancelled",
                  )
                  .slice(0, 2)
                  .map((evt, index) => {
                    const dateParts = evt.date
                      ? String(evt.date).split("-")
                      : [];
                    const dayNum = dateParts[2] || "•";
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
                      ? months[parseInt(dateParts[1], 10) - 1]
                      : "Event";

                    const cardClassStyle =
                      index % 3 === 0
                        ? "adm_dash__pink"
                        : index % 3 === 1
                          ? "adm_dash__blue"
                          : "";

                    return (
                      <div
                        key={`live-event-card-item-${index}`}
                        className={`adm_dash__event-card ${cardClassStyle}`}
                        onClick={() => navigate("/admin/events_management")}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="adm_dash__event-date-badge">
                          <span>{dayNum}</span>
                          <span>{monthName}</span>
                        </div>
                        <div className="adm_dash__event-info">
                          <strong className="adm_dash__event-name">
                            {evt.title}
                          </strong>
                          <span className="adm_dash__event-time">
                            {evt.startTime || "TBD"} —{" "}
                            {evt.location || "Virtual/Unassigned"}
                          </span>
                          <small
                            style={{
                              display: "block",
                              color: "#64748b",
                              fontSize: "0.7rem",
                              marginTop: "3px",
                            }}
                          >
                            Sectors:{" "}
                            {Array.isArray(evt.department)
                              ? evt.department.join(", ")
                              : evt.department || "Unassigned Spec"}
                          </small>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div
                  className="adm_dash__txt-mini"
                  style={{
                    padding: "20px 0",
                    color: "#64748b",
                    textAlign: "center",
                    fontStyle: "italic",
                  }}
                >
                  No active medical events or conferences recorded on the
                  calendar schedule.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="adm_dash__bottom-section">
        <div className="adm_dash__info-card-modern">
          <div className="adm_dash__modern-header">
            <div className="adm_dash__header-info">
              <Activity size={16} color="#007acc" />
              <h3>Doctors Status</h3>
            </div>
            <button
              className="adm_dash__text-btn"
              onClick={() => navigate("/admin/doctors_management")}
            >
              View All
            </button>
          </div>
          <div className="adm_dash__modern-grid">
            {liveData.doctors &&
              liveData.doctors.slice(0, 3).map((doc, idx) => (
                <div
                  className="adm_dash__modern-item-card"
                  key={`doc-status-row-${idx}`}
                  onClick={() => navigate("/admin/doctors_management")}
                >
                  <div className="adm_dash__item-main">
                    <div className="admin_dashboard_item-avatar">
                      {doc?.photo ? (
                        <img
                          src={`http://localhost:5000/uploads/${doc.photo}`}
                          alt={doc.name}
                          className="admin_dashboard_doc_avatar_img"
                          onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.name || "Doctor")}&background=f0f7ff&color=007acc&bold=true`;
                          }}
                        />
                      ) : (
                        <div className="admin_dashboard_item-avatar">
                          <User size={14} />
                        </div>
                      )}
                    </div>
                    <div className="adm_dash__item-details">
                      <strong>{doc?.name || `Dr. Unassigned`}</strong>
                      <span>{doc?.department || "General OPD"}</span>
                    </div>
                  </div>
                  <div
                    className={`adm_dash__modern-badge ${(doc?.availability || "On Leave").toLowerCase() === "available" ? "adm_dash__bg-green" : "adm_dash__bg-red"}`}
                  >
                    {(doc?.availability || "On Leave").toLowerCase() ===
                    "available" ? (
                      <CheckCircle size={10} />
                    ) : (
                      <Clock4 size={10} />
                    )}
                    {doc?.availability || "On Leave"}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Appointment Queue List */}
        <div className="adm_dash__info-card-modern">
          <div className="adm_dash__modern-header">
            <div className="adm_dash__header-info">
              <Clock4 size={16} color="#007acc" />
              <h3>Upcoming Queue</h3>
            </div>
            <button
              className="adm_dash__text-btn"
              onClick={() => navigate("/admin/appointments_management")}
            >
              Schedule
            </button>
          </div>
          <div className="adm_dash__modern-grid">
            {liveData.appointments &&
              liveData.appointments.slice(0, 3).map((app, idx) => (
                <div
                  className="adm_dash__modern-item-card"
                  key={`appt-queue-row-${idx}`}
                  onClick={() => navigate("/admin/appointments_management")}
                >
                  <div className="adm_dash__item-main">
                    <div className="admin_dashboard_item-avatar-wrapper">
                      {app?.patientId?.photo || app?.photo ? (
                        <img
                          src={`http://localhost:5000/uploads/${app?.patientId?.photo || app?.photo}`}
                          alt={app?.patientName}
                          className="admin_dashboard_patient_avatar_img"
                          onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(app?.patientName || "Patient")}&background=e0f2fe&color=007acc&bold=true`;
                          }}
                        />
                      ) : (
                        <div className="admin_dashboard_item-avatar admin_dashboard_blue">
                          <User size={14} />
                        </div>
                      )}
                    </div>
                    <div className="adm_dash__item-details">
                      <strong>
                        {app?.patientName || "No Name Registered"}
                      </strong>
                      <span>{app?.type || "Standard Visit"}</span>
                    </div>
                  </div>
                  <div className="adm_dash__modern-time-tag">
                    {app?.time || "TBD"}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
