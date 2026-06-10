import React, { useState, useMemo, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import axios from "axios";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import { Loader2, RefreshCw } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

import "./Statistics.css";

// ChartJS registration
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

export default function Normal_Stats() {
  /* --- 1. REAL-TIME DATA & UTILS CONFIG --- */
  const [loading, setLoading] = useState(true);
  const [dbData, setDbData] = useState({
    appointments: [],
    patients: [],
    doctors: [],
  });

  const [activeCategory, setActiveCategory] = useState("Patients");
  const [lastSynced, setLastSynced] = useState(new Date().toLocaleTimeString());

  const currentYearInt = new Date().getFullYear(); // e.g. 2026
  const currentMonthStr = new Date().toISOString().slice(0, 7); // e.g. "2026-05"

  const currentWeekStr = useMemo(() => {
    const target = new Date();
    const dayNr = (target.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    const weekNum = 1 + Math.ceil((firstThursday - target) / 604800000);
    return `${currentYearInt}-W${weekNum.toString().padStart(2, "0")}`;
  }, [currentYearInt]);

  const [patAcqYear, setPatAcqYear] = useState(currentYearInt);
  const [patDemoFilter, setPatDemoFilter] = useState("Gender");
  const [appVolWeek, setAppVolWeek] = useState(currentWeekStr);
  const [appPeakMonth, setAppPeakMonth] = useState(currentMonthStr);
  const [appPeakType, setAppPeakType] = useState("Day");
  const [docWorkYear, setDocWorkYear] = useState(currentYearInt);
  const [docAppMonth, setDocAppMonth] = useState(currentMonthStr);

  /* --- 2. MULTI-COLLECTION REGISTRY Fetch --- */
  const syncClinicalIntelligence = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [apptRes, patRes, docRes, feedbackRes] = await Promise.all([
        axios.get("http://localhost:5000/api/appointments/all", { headers }),
        axios.get("http://localhost:5000/api/patients/all", { headers }),
        axios.get("http://localhost:5000/api/doctors/list", { headers }),
        axios
          .get("http://localhost:5000/api/feedback/all", { headers })
          .catch(() => ({ data: [] })),
      ]);

      setDbData({
        appointments: apptRes.data || [],
        patients: patRes.data || [],
        doctors: docRes.data || [],
        feedback: feedbackRes.data || [],
      });
      setLastSynced(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Clinical Intelligence Sync Failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncClinicalIntelligence();
    const interval = setInterval(syncClinicalIntelligence, 30000);
    return () => clearInterval(interval);
  }, []);

  const palette = [
    "#007acc",
    "#00d2ff",
    "#1e293b",
    "#94a3b8",
    "#10b981",
    "#ef4444",
  ];

  const isDateInSelectedWeek = (dateStr, weekStr) => {
    if (!dateStr || !weekStr) return false;
    try {
      const d = new Date(dateStr);
      const [year, week] = weekStr.split("-W");
      const firstDayOfYear = new Date(year, 0, 1);
      const days = Math.floor((d - firstDayOfYear) / (24 * 60 * 60 * 1000));
      const weekNum = Math.ceil((days + firstDayOfYear.getDay() + 1) / 7);
      return (
        d.getFullYear().toString() === year &&
        weekNum.toString().padStart(2, "0") === week
      );
    } catch (e) {
      return false;
    }
  };

  /* --- 3. PATIENT ANALYTICS LOGIC --- */
  const patientCharts = useMemo(() => {
    const data = dbData.patients;

    const patientVisitCounts = {};
    dbData.appointments.forEach((appt) => {
      const pId = appt.patientId || appt.patientName;
      if (pId) patientVisitCounts[pId] = (patientVisitCounts[pId] || 0) + 1;
    });

    const frequencyBuckets = [0, 0, 0, 0];
    data.forEach((p) => {
      const count =
        patientVisitCounts[p._id] || patientVisitCounts[p.name] || 0;
      if (count === 1) frequencyBuckets[0]++;
      else if (count >= 2 && count <= 4) frequencyBuckets[1]++;
      else if (count >= 5 && count <= 10) frequencyBuckets[2]++;
      else if (count > 10) frequencyBuckets[3]++;
    });

    const globalReviews = dbData.feedback || [];
    const starMatrix = [5, 4, 3, 2, 1].map((star) => {
      const matchedCount = globalReviews.filter(
        (r) => Number(r.rating) === star,
      ).length;
      return {
        star,
        count: matchedCount,
        pct:
          globalReviews.length > 0
            ? Math.round((matchedCount / globalReviews.length) * 100)
            : 0,
      };
    });

    const demoData =
      patDemoFilter === "Age"
        ? [
            data.filter((p) => p.age <= 18).length,
            data.filter((p) => p.age > 18 && p.age <= 60).length,
            data.filter((p) => p.age > 60).length,
          ]
        : [
            data.filter((p) => (p.gender || "").toLowerCase() === "male")
              .length,
            data.filter((p) => (p.gender || "").toLowerCase() === "female")
              .length,
            data.filter((p) => {
              const g = (p.gender || "").toLowerCase();
              return g !== "male" && g !== "female";
            }).length,
          ];

    const total = demoData.reduce((a, b) => a + b, 0);
    const percentages = demoData.map((v) =>
      total > 0 ? ((v / total) * 100).toFixed(1) + "%" : "0%",
    );

    const monthlyCounts = Array(12).fill(0);
    data.forEach((patient) => {
      const targetDate = patient.createdAt || patient.date;
      if (targetDate) {
        const safeDateStr =
          typeof targetDate === "string"
            ? targetDate
            : new Date(targetDate).toISOString();
        const parts = safeDateStr.split("T")[0].split("-");
        if (parts.length >= 2) {
          if (parts[0] && parseInt(parts[0], 10) === parseInt(patAcqYear, 10)) {
            const mIdx = parseInt(parts[1], 10) - 1;
            if (mIdx >= 0 && mIdx < 12) monthlyCounts[mIdx]++;
          }
        }
      }
    });

    return {
      acquisition: {
        labels: [
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
        ],
        datasets: [
          {
            label: `New Patients (${patAcqYear})`,
            data: monthlyCounts,
            borderColor: "#007acc",
            backgroundColor: "rgba(0, 122, 204, 0.1)",
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            borderWidth: 3,
          },
        ],
      },
      demographics: {
        labels:
          patDemoFilter === "Age"
            ? ["Child", "Adult", "Old"]
            : ["Men", "Women", "Other"],
        datasets: [
          {
            data: demoData,
            backgroundColor: palette,
            hoverOffset: 20,
            borderWidth: 0,
          },
        ],
        percentages: percentages,
      },
      frequency: {
        labels: ["1 Visit", "2-4 Visits", "5-10 Visits", "10+ Visits"],
        datasets: [
          {
            label: "Patient Count",
            data: frequencyBuckets,
            backgroundColor: palette[1],
            borderRadius: 8,
            barThickness: 45,
          },
        ],
      },
      ratingDistribution: starMatrix,
    };
  }, [
    dbData.patients,
    dbData.appointments,
    dbData.feedback,
    patAcqYear,
    patDemoFilter,
  ]);

  /* --- 4. DOCTOR PERFORMANCE LOGIC --- */
  const doctorCharts = useMemo(() => {
    const distinctDeptsList = Array.from(
      new Set(
        dbData.doctors
          .map((d) => d.department)
          .filter((dept) => dept && dept.trim() !== ""),
      ),
    );
    const fallbackWingsArray =
      distinctDeptsList.length > 0
        ? distinctDeptsList
        : [
            "Cardiology",
            "Orthopedics",
            "Neurology",
            "Pediatrics",
            "Gastroenterology",
          ];

    const specData = fallbackWingsArray.map(
      (d) =>
        dbData.doctors.filter(
          (doc) =>
            (doc.department || "").toLowerCase().trim() ===
            d.toLowerCase().trim(),
        ).length,
    );
    const totalSpec = specData.reduce((a, b) => a + b, 0);
    const specPercentages = specData.map((v) =>
      totalSpec > 0 ? ((v / totalSpec) * 100).toFixed(1) + "%" : "0%",
    );

    const yearlyWorkload = Array(12).fill(0);
    dbData.appointments.forEach((appt) => {
      if (appt.date) {
        const parts = appt.date.split("T")[0].split("-");
        if (
          parts.length >= 2 &&
          parts[0] &&
          parseInt(parts[0], 10) === parseInt(docWorkYear, 10)
        ) {
          const mIdx = parseInt(parts[1], 10) - 1;
          if (mIdx >= 0 && mIdx < 12) yearlyWorkload[mIdx]++;
        }
      }
    });

    const filteredAppts = dbData.appointments.filter(
      (a) => a.date && a.date.startsWith(docAppMonth),
    );
    const docCounts = filteredAppts.reduce((acc, curr) => {
      const name = curr.doctorName || curr.doctor;
      if (name) acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});

    const sortedDocs = Object.entries(docCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const topDocName =
      sortedDocs.length > 0 ? sortedDocs[0][0] : "No Active Consultant";

    const topDocObj = dbData.doctors.find(
      (d) =>
        (d.name || d.doctorName || "").toLowerCase() ===
        topDocName.toLowerCase(),
    );

    return {
      workload: {
        labels: [
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
        ],
        datasets: [
          {
            label: `Total Appointments (${docWorkYear})`,
            data: yearlyWorkload,
            borderColor: "#007acc",
            backgroundColor: "rgba(0, 122, 204, 0.08)",
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            borderWidth: 2,
          },
        ],
      },
      specialty: {
        labels: fallbackWingsArray,
        datasets: [{ data: specData, backgroundColor: palette, cutout: "75%" }],
        percentages: specPercentages,
      },
      bestPerformer: {
        name: topDocName,
        img: topDocObj?.photo
          ? `http://localhost:5000/uploads/${topDocObj.photo}`
          : `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%23e2e8f0"/><text x="50%" y="55%" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="%2394a3b8" dominant-baseline="middle" text-anchor="middle">${(topDocName || "D").charAt(0).toUpperCase()}</text></svg>`,
        degree: topDocObj?.degrees || "MD / Consultant",
        dept: topDocObj?.department || "General OP Specialist",
        appointments: docCounts[topDocName] || 0,
      },
      appointmentsTrend: {
        labels:
          sortedDocs.length > 0
            ? sortedDocs.map((d) => d[0].split(" ").pop())
            : ["No Data"],
        datasets: [
          {
            label: `Appointments`,
            data: sortedDocs.length > 0 ? sortedDocs.map((d) => d[1]) : [0],
            backgroundColor: [
              "#007acc",
              "#00d2ff",
              "#1e293b",
              "#94a3b8",
              "#10b981",
            ],
            borderRadius: 6,
          },
        ],
      },
    };
  }, [dbData.doctors, dbData.appointments, docWorkYear, docAppMonth]);

  /* --- 5. APPOINTMENT FLOW LOGIC --- */
  const appointmentCharts = useMemo(() => {
    const weeklyDayCounts = [0, 0, 0, 0, 0, 0, 0];
    dbData.appointments.forEach((a) => {
      if (isDateInSelectedWeek(a.date, appVolWeek)) {
        const dayIdx = (new Date(a.date).getDay() + 6) % 7;
        weeklyDayCounts[dayIdx]++;
      }
    });

    const monthlyAppts = dbData.appointments.filter(
      (a) => a.date && a.date.startsWith(appPeakMonth),
    );
    const intensityDayCounts = [0, 0, 0, 0, 0, 0, 0];
    const intensityTimeCounts = Array(7).fill(0);

    const trafficMap = {};

    monthlyAppts.forEach((a) => {
      const d = new Date(a.date).getDay();
      intensityDayCounts[d === 0 ? 6 : d - 1]++;

      const wingName = a.department || "General Ops";
      trafficMap[wingName] = (trafficMap[wingName] || 0) + 1;

      const hourStr = a.time?.split(":")[0];
      if (hourStr) {
        const hour = parseInt(hourStr, 10);
        const hour24 =
          a.time?.includes("PM") && hour !== 12
            ? hour + 12
            : a.time?.includes("AM") && hour === 12
              ? 0
              : hour;
        if (hour24 >= 8 && hour24 < 10) intensityTimeCounts[0]++;
        else if (hour24 >= 10 && hour24 < 12) intensityTimeCounts[1]++;
        else if (hour24 >= 12 && hour24 < 14) intensityTimeCounts[2]++;
        else if (hour24 >= 14 && hour24 < 16) intensityTimeCounts[3]++;
        else if (hour24 >= 16 && hour24 < 18) intensityTimeCounts[4]++;
        else if (hour24 >= 18 && hour24 < 20) intensityTimeCounts[5]++;
        else if (hour24 >= 20) intensityTimeCounts[6]++;
      }
    });

    const trafficLabels =
      Object.keys(trafficMap).length > 0
        ? Object.keys(trafficMap)
        : ["Cardiology", "Pediatrics", "Orthopedics", "Neurology", "General"];
    const trafficValues =
      Object.keys(trafficMap).length > 0
        ? Object.values(trafficMap)
        : [120, 145, 98, 160, 220];

    return {
      volume: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [
          {
            label: `Bookings`,
            data: weeklyDayCounts,
            backgroundColor: "#007acc",
            borderRadius: 8,
          },
        ],
      },
      peak: {
        labels:
          appPeakType === "Day"
            ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            : ["8AM", "10AM", "12PM", "2PM", "4PM", "6PM", "8PM"],
        datasets: [
          {
            label: `${appPeakType} Intensity`,
            data:
              appPeakType === "Day" ? intensityDayCounts : intensityTimeCounts,
            borderColor: "#007acc",
            backgroundColor: "rgba(0, 122, 204, 0.08)",
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            borderWidth: 3,
          },
        ],
      },
      traffic: {
        labels: trafficLabels,
        datasets: [
          {
            label: "Registry Volume",
            data: trafficValues,
            backgroundColor: "#00d2ff",
            borderRadius: 6,
          },
        ],
      },
      statusMix: {
        labels: ["Completed", "Cancelled", "Upcoming", "In-Patient"],
        datasets: [
          {
            data: [
              dbData.appointments.filter((a) => a.status === "Completed")
                .length,
              dbData.appointments.filter((a) => a.status === "Cancelled")
                .length,
              dbData.appointments.filter(
                (a) => a.status === "Upcoming" || a.status === "Pending",
              ).length,
              dbData.appointments.filter(
                (a) => a.status === "In-Patient" || a.type === "In-Patient",
              ).length,
            ],
            backgroundColor: ["#10b981", "#ef4444", "#007acc", "#94a3b8"],
            borderWidth: 0,
          },
        ],
      },
      totalWeekly: weeklyDayCounts.reduce((a, b) => a + b, 0),
    };
  }, [dbData.appointments, appPeakType, appPeakMonth, appVolWeek]);

  if (loading)
    return (
      <div className="admin_dash_load">
        <Loader2 className="spin" /> Synchronizing Statistics...
      </div>
    );

  return (
    <div className="admin_stat_m_revenue_wrapper doc_home_view_fade_in">
      {/* Module Header */}
      <header className="admin_stat_m_revenue_header">
        <div className="admin_stat_m_header_text">
          <h1>
            Medico+ <span>Analytics</span>
          </h1>
        </div>

        {/* Category Toggle */}
        <div className="admin_stat_m_category_nav_main">
          {["Patients", "Appointments", "Doctors"].map((cat) => (
            <button
              key={cat}
              className={`admin_stat_m_nav_tab ${activeCategory === cat ? "active" : ""}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="admin_stat_m_export_suite">
          <button
            className="admin_stat_m_export_btn"
            onClick={syncClinicalIntelligence}
          >
            <RefreshCw size={14} />
          </button>
          <button
            className="admin_stat_m_export_btn"
            onClick={() => window.print()}
          >
            🖨️
          </button>
        </div>
      </header>

      {/* KPI Stats Strip */}
      <div className="admin_stat_m_stats_bento">
        {activeCategory === "Patients" && (
          <>
            <div className="admin_stat_m_stat_card primary">
              <span className="admin_stat_m_label">Registry Size</span>
              <h2 className="admin_stat_m_value">{dbData.patients.length}</h2>
            </div>
            <div className="admin_stat_m_stat_card">
              <span className="admin_stat_m_label">Retention</span>
              <h2 className="admin_stat_m_value">88%</h2>
            </div>
            <div className="admin_stat_m_stat_card">
              <span className="admin_stat_m_label">Satisfaction</span>
              <h2 className="admin_stat_m_value">4.8/5</h2>
            </div>
            <div className="admin_stat_m_stat_card highlight">
              <span className="admin_stat_m_label">Weekly Growth</span>
              <h2 className="admin_stat_m_value">+12%</h2>
            </div>
            <div className="admin_stat_m_stat_card">
              <span className="admin_stat_m_label">Avg Age</span>
              <h2 className="admin_stat_m_value">32</h2>
            </div>
          </>
        )}
        {activeCategory === "Appointments" && (
          <>
            <div className="admin_stat_m_stat_card primary">
              <span className="admin_stat_m_label">Total Bookings</span>
              <h2 className="admin_stat_m_value">
                {dbData.appointments.length}
              </h2>
            </div>
            <div className="admin_stat_m_stat_card">
              <span className="admin_stat_m_label">Completed</span>
              <h2 className="admin_stat_m_value">
                {
                  dbData.appointments.filter((a) => a.status === "Completed")
                    .length
                }
              </h2>
            </div>
            <div className="admin_stat_m_stat_card">
              <span className="admin_stat_m_label">Waiting Time</span>
              <h2 className="admin_stat_m_value">8m</h2>
            </div>
            <div className="admin_stat_m_stat_card highlight">
              <span className="admin_stat_m_label">Throughput</span>
              <h2 className="admin_stat_m_value">84%</h2>
            </div>
            <div className="admin_stat_m_stat_card">
              <span className="admin_stat_m_label">Emergency</span>
              <h2 className="admin_stat_m_value">
                {
                  dbData.appointments.filter((a) => a.type === "Emergency")
                    .length
                }
              </h2>
            </div>
          </>
        )}
        {activeCategory === "Doctors" && (
          <>
            <div className="admin_stat_m_stat_card primary">
              <div className="admin_stat_m_pulse_ring"></div>
              <span className="admin_stat_m_label">Consultants</span>
              <h2 className="admin_stat_m_value">{dbData.doctors.length}</h2>
            </div>
            <div className="admin_stat_m_stat_card">
              <span className="admin_stat_m_label">Duty Rate</span>
              <h2 className="admin_stat_m_value">
                {dbData.doctors.length > 0
                  ? Math.round(
                      (dbData.doctors.filter(
                        (d) => d.availability === "Available",
                      ).length /
                        dbData.doctors.length) *
                        100,
                    )
                  : 0}
                %
              </h2>
            </div>
            <div className="admin_stat_m_stat_card">
              <span className="admin_stat_m_label">Avg Rating</span>
              <h2 className="admin_stat_m_value">4.9/5</h2>
            </div>
            <div className="admin_stat_m_stat_card highlight">
              <span className="admin_stat_m_label">Wings</span>
              <h2 className="admin_stat_m_value">
                {new Set(dbData.doctors.map((d) => d.department)).size}
              </h2>
            </div>
            <div className="admin_stat_m_stat_card">
              <span className="admin_stat_m_label">Avg Load</span>
              <h2 className="admin_stat_m_value">10/Day</h2>
            </div>
          </>
        )}
      </div>

      {/* Main Analysis Section */}
      <div className="admin_stat_m_category_container">
        {activeCategory === "Patients" && (
          <>
            <div className="admin_stat_m_bento_row_sync">
              <div className="admin_stat_m_bento_item span_2">
                <div className="admin_stat_m_card_head">
                  <h3>Patient Acquisition Trend</h3>
                  <input
                    type="number"
                    value={patAcqYear}
                    onChange={(e) => setPatAcqYear(e.target.value)}
                    className="admin_stat_m_calendar_input_v2"
                    style={{ width: "90px" }}
                  />
                </div>
                <div className="admin_stat_m_canvas_holder_reduced">
                  <Line
                    data={patientCharts.acquisition}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                </div>
              </div>
              <div className="admin_stat_m_bento_item">
                <div className="admin_stat_m_card_head">
                  <h3>Demographics</h3>
                  <div className="admin_stat_m_mini_tabs">
                    <button
                      className={patDemoFilter === "Age" ? "active" : ""}
                      onClick={() => setPatDemoFilter("Age")}
                    >
                      Age
                    </button>
                    <button
                      className={patDemoFilter === "Gender" ? "active" : ""}
                      onClick={() => setPatDemoFilter("Gender")}
                    >
                      Gen
                    </button>
                  </div>
                </div>
                <div className="admin_stat_m_patient_center_content">
                  <div className="admin_stat_m_chart_focus_mini">
                    <Doughnut
                      data={patientCharts.demographics}
                      options={{
                        cutout: "75%",
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                      }}
                    />
                  </div>
                </div>
                <div className="admin_stat_m_custom_legend_grid">
                  {patientCharts.demographics.labels.map((label, i) => (
                    <div key={i} className="admin_stat_m_legend_pill">
                      <span
                        className="admin_stat_m_dot"
                        style={{ backgroundColor: palette[i] }}
                      ></span>
                      <span className="admin_stat_m_pill_text">
                        {label}{" "}
                        <strong>
                          ({patientCharts.demographics.percentages[i]})
                        </strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="admin_stat_m_bento_row_sync">
              <div className="admin_stat_m_bento_item span_2">
                <div className="admin_stat_m_card_head">
                  <h3>Visit Frequency Analysis</h3>
                </div>
                <div className="admin_stat_m_canvas_holder_compact">
                  <Bar
                    data={patientCharts.frequency}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                </div>
              </div>
              <div className="admin_stat_m_bento_item">
                <div className="admin_stat_m_card_head">
                  <h3>Experience Rating</h3>
                </div>
                <div className="admin_stat_m_ratings_distribution">
                  {patientCharts.ratingDistribution.map((row, i) => (
                    <div key={i} className="admin_stat_m_dist_row">
                      <span className="admin_stat_m_dist_label">
                        {row.star} ★
                      </span>
                      <div className="admin_stat_m_dist_bar_bg">
                        <div
                          className="admin_stat_m_dist_bar_fill"
                          style={{ width: `${row.pct}%` }}
                        ></div>
                      </div>
                      <span className="admin_stat_m_dist_count">
                        {row.count}
                      </span>
                    </div>
                  ))}
                </div>
                <button className="admin_stat_m_view_more_full">
                  Extract Review Logs
                </button>
              </div>
            </div>
          </>
        )}

        {activeCategory === "Doctors" && (
          <>
            <div className="admin_stat_m_bento_row_sync">
              <div className="admin_stat_m_bento_item span_2">
                <div className="admin_stat_m_card_head">
                  <h3>Doctor Workload Trend</h3>
                  <input
                    type="number"
                    value={docWorkYear}
                    onChange={(e) => setDocWorkYear(e.target.value)}
                    className="admin_stat_m_calendar_input_v2"
                    style={{ width: "90px" }}
                  />
                </div>
                <div className="admin_stat_m_canvas_holder_reduced">
                  <Line
                    data={doctorCharts.workload}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                </div>
              </div>
              <div className="admin_stat_m_bento_item">
                <div className="admin_stat_m_card_head">
                  <h3>Specialty Matrix</h3>
                </div>
                <div className="admin_stat_m_patient_center_content">
                  <div className="admin_stat_m_chart_focus_mini">
                    <Doughnut
                      data={doctorCharts.specialty}
                      options={{
                        cutout: "75%",
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                      }}
                    />
                  </div>
                </div>
                <div className="admin_stat_m_custom_legend_grid wrap">
                  {doctorCharts.specialty.labels.map((label, i) => (
                    <div key={i} className="admin_stat_m_legend_pill">
                      <span
                        className="admin_stat_m_dot"
                        style={{ backgroundColor: palette[i] }}
                      ></span>
                      <span className="admin_stat_m_pill_text">
                        {label}{" "}
                        <strong>
                          ({doctorCharts.specialty.percentages[i]})
                        </strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="admin_stat_m_bento_row_sync">
              <div className="admin_stat_m_bento_item span_3">
                <div className="admin_stat_m_card_head">
                  <h3>Performance Distribution</h3>
                  <input
                    type="month"
                    value={docAppMonth}
                    onChange={(e) => setDocAppMonth(e.target.value)}
                    className="admin_stat_m_calendar_input_v2"
                    id="stat_filter"
                  />
                </div>
                <div className="admin_stat_m_canvas_holder_compact">
                  <Bar
                    data={doctorCharts.appointmentsTrend}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      indexAxis: "y",
                    }}
                  />
                </div>
              </div>
              <div className="admin_stat_m_bento_item">
                <div className="admin_stat_m_card_head">
                  <h3>Lead Specialist</h3>
                </div>
                <div className="admin_stat_m_best_doctor_profile">
                  <div className="admin_stat_m_doc_identity">
                    <img
                      src={doctorCharts.bestPerformer.img}
                      alt="Doc Identity Profile Avatar"
                    />
                    <div className="admin_stat_m_doc_name_group">
                      <h4>{doctorCharts.bestPerformer.name}</h4>
                      <span>{doctorCharts.bestPerformer.degree}</span>
                    </div>
                  </div>
                  <div className="admin_stat_m_doc_info_row">
                    <div className="admin_stat_m_info_box">
                      <span>Specialty</span>
                      <strong>{doctorCharts.bestPerformer.dept}</strong>
                    </div>
                    <div className="admin_stat_m_info_box">
                      <span>Total Cases</span>
                      <strong>{doctorCharts.bestPerformer.appointments}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeCategory === "Appointments" && (
          <>
            <div className="admin_stat_m_bento_row_equal">
              <div className="admin_stat_m_bento_item">
                <div className="admin_stat_m_card_head">
                  <h3>Weekly Volume</h3>
                  <input
                    type="week"
                    value={appVolWeek}
                    onChange={(e) => setAppVolWeek(e.target.value)}
                    className="admin_stat_m_calendar_input_v2"
                    style={{ minWidth: "150px" }}
                  />
                </div>
                <div className="admin_stat_m_vol_summary_compact">
                  <span className="admin_stat_m_vol_label">Week Total: </span>
                  <span className="admin_stat_m_vol_value_mini">
                    {appointmentCharts.totalWeekly}
                  </span>
                </div>
                <div className="admin_stat_m_canvas_holder_reduced">
                  <Bar
                    data={appointmentCharts.volume}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                </div>
              </div>
              <div className="admin_stat_m_bento_item">
                <div className="admin_stat_m_card_head">
                  <h3>Flow Intensity</h3>
                  <div
                    className="admin_stat_m_mini_tabs"
                    style={{ display: "flex", gap: "8px" }}
                  >
                    <input
                      type="month"
                      value={appPeakMonth}
                      onChange={(e) => setAppPeakMonth(e.target.value)}
                      id="stat_filter"
                      className="admin_stat_m_calendar_input_v2"
                      style={{ width: "125px" }}
                    />
                    <div className="admin_stat_m_mini_tabs">
                      <button
                        className={appPeakType === "Day" ? "active" : ""}
                        onClick={() => setAppPeakType("Day")}
                      >
                        Day
                      </button>
                      <button
                        className={appPeakType === "Time" ? "active" : ""}
                        onClick={() => setAppPeakType("Time")}
                      >
                        Time
                      </button>
                    </div>
                  </div>
                </div>
                <div className="admin_stat_m_canvas_holder_reduced">
                  <Line
                    data={appointmentCharts.peak}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                </div>
              </div>
            </div>
            <div className="admin_stat_m_bento_row_sync">
              <div className="admin_stat_m_bento_item span_2">
                <div className="admin_stat_m_card_head">
                  <h3>Clinical Traffic load</h3>
                </div>
                <div className="admin_stat_m_canvas_holder_compact">
                  <Bar
                    data={appointmentCharts.traffic}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                    }}
                  />
                </div>
              </div>
              <div className="admin_stat_m_bento_item">
                <div className="admin_stat_m_card_head">
                  <h3>Registry Status Mix</h3>
                </div>
                <div className="admin_stat_m_canvas_holder_compact">
                  <Doughnut
                    data={appointmentCharts.statusMix}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: "bottom" } },
                    }}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
