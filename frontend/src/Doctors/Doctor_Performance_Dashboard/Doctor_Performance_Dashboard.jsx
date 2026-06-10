import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
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
import { Bar, Line, Doughnut } from "react-chartjs-2";
import { Award, CheckCircle, Activity, Star, Zap, Loader2 } from "lucide-react";
import "./Doctor_Performance_Dashboard.css";

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

function getISOWeekString(dateString) {
  if (!dateString) return "";
  const target = new Date(dateString);
  if (isNaN(target.getTime())) return "";
  const dayNr = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNum = 1 + Math.ceil((firstThursday - target) / 604800000);
  return `${target.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export default function PerformanceDashboard() {
  const currentYearStr = new Date().getFullYear().toString();
  const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const currentISOWeekStr =
    getISOWeekString(new Date()) || `${new Date().getFullYear()}-W01`;

  const [lastSynced, setLastSynced] = useState(new Date().toLocaleTimeString());
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [doctorsList, setDoctorsList] = useState([]);
  const [appointmentsData, setAppointmentsData] = useState([]);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [patientProfiles, setPatientProfiles] = useState([]);

  const [bookingView, setBookingView] = useState("Month");
  const [selectedYear, setSelectedYear] = useState(currentYearStr);
  const [selectedWeek, setSelectedWeek] = useState(currentISOWeekStr);
  const [rankMonth, setRankMonth] = useState(currentMonthStr);

  const doctorUser = JSON.parse(localStorage.getItem("userData")) || {};

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const targetDocId = doctorUser._id || doctorUser.doctorId || "";

      const [docRes, apptRes, leaveRes, patientRes, feedbackRes] =
        await Promise.all([
          axios.get("http://localhost:5000/api/doctors/list", { headers }),
          axios.get("http://localhost:5000/api/appointments/all", { headers }),
          targetDocId
            ? axios
                .get(
                  `http://localhost:5000/api/leaves/history/${targetDocId}?doctorName=${encodeURIComponent(doctorUser.name || "")}`,
                  { headers },
                )
                .catch(() => ({ data: [] }))
            : Promise.resolve({ data: [] }),
          axios
            .get("http://localhost:5000/api/patients/all", { headers })
            .catch(() => ({ data: [] })),
          doctorUser.name
            ? axios
                .get(
                  `http://localhost:5000/api/feedback/doctor?doctorName=${encodeURIComponent(doctorUser.name)}`,
                  { headers },
                )
                .catch(() => ({ data: [] }))
            : Promise.resolve({ data: [] }),
        ]);

      setDoctorsList(docRes.data || []);
      setAppointmentsData(apptRes.data || []);
      setLeaveHistory(leaveRes.data || []);
      setPatientProfiles(patientRes.data || []);
      setFeedbackList(feedbackRes.data || []); // Save to state
      setLastSynced(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Clinical Intelligence sync failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const currentDoc = useMemo(() => {
    const matched = doctorsList.find(
      (doc) =>
        doc.doctorId === doctorUser.doctorId || doc._id === doctorUser._id,
    );
    return matched || doctorUser;
  }, [doctorsList, doctorUser]);

  const myAppointments = useMemo(() => {
    if (!currentDoc.name) return [];
    return appointmentsData.filter((a) => a.doctorName === currentDoc.name);
  }, [appointmentsData, currentDoc.name]);

  const kpis = useMemo(() => {
    const completedCount = myAppointments.filter(
      (a) => a.status === "Completed",
    ).length;

    /* =========================================================================
       FIXED RATING CALCULATION ENGINE (PULLS FROM FEDBACK STATE ARRAY)
       ========================================================================= */
    const validRatings = feedbackList
      .map((r) => r.rating)
      .filter((rate) => rate !== undefined && rate > 0);

    const avgRating = validRatings.length
      ? (
          validRatings.reduce((sum, current) => sum + current, 0) /
          validRatings.length
        ).toFixed(1)
      : "0.0";

    const totalEventsCount = leaveHistory.filter(
      (l) => l.leaveType === "Slot_Block" && l.status === "Approved",
    ).length;
    const totalApprovedLeaves = leaveHistory.filter(
      (l) => l.leaveType === "Full_Day" && l.status === "Approved",
    ).length;

    return {
      total: myAppointments.length,
      completed: completedCount,
      rating: avgRating,
      events: totalEventsCount,
      leaves: totalApprovedLeaves,
    };
  }, [myAppointments, leaveHistory, feedbackList]);

  /* =========================================================================
     CORRECTED PATIENT DEMOGRAPHICS & DIAGNOSIS ANALYSIS (ROBUST KEYS EXTRATION)
     ========================================================================= */
  const demographics = useMemo(() => {
    const ageRanges = { "0-18": 0, "19-40": 0, "41-60": 0, "60+": 0 };
    const diagnosisCounts = {};

    myAppointments.forEach((appt) => {
      // 1. Diagnosis extraction fallback cascade mapping
      const condition =
        appt.disease ||
        appt.type ||
        appt.notes?.slice(0, 15) ||
        "General Checkup";
      diagnosisCounts[condition] = (diagnosisCounts[condition] || 0) + 1;

      // 2. Cross-check dynamic age extraction fallback mapping loops
      let isolatedAge = parseInt(appt.patientAge || appt.age, 10);

      if (isNaN(isolatedAge) && appt.patientName) {
        const matchedProfile = patientProfiles.find(
          (p) => p.name === appt.patientName,
        );
        if (matchedProfile && matchedProfile.age) {
          isolatedAge = parseInt(matchedProfile.age, 10);
        }
      }

      if (!isNaN(isolatedAge)) {
        if (isolatedAge <= 18) ageRanges["0-18"]++;
        else if (isolatedAge <= 40) ageRanges["19-40"]++;
        else if (isolatedAge <= 60) ageRanges["41-60"]++;
        else ageRanges["60+"]++;
      }
    });

    const ageData = {
      labels: Object.keys(ageRanges),
      datasets: [
        {
          label: "Patient Volume",
          data: Object.values(ageRanges),
          backgroundColor: "#007acc",
          borderRadius: 8,
        },
      ],
    };

    const totalCases = myAppointments.length || 1;
    const dynamicallyComputedMix = Object.keys(diagnosisCounts)
      .map((key) => ({
        label: key,
        value: `${Math.round((diagnosisCounts[key] / totalCases) * 100)}%`,
        raw: diagnosisCounts[key],
      }))
      .sort((a, b) => b.raw - a.raw);

    const topThreeConditions = dynamicallyComputedMix.slice(0, 3);
    const remainingCount = dynamicallyComputedMix
      .slice(3)
      .reduce((sum, item) => sum + item.raw, 0);

    const caseMixLabels = topThreeConditions.map((c) => c.label);
    const caseMixChartData = topThreeConditions.map((c) =>
      parseInt(c.value, 10),
    );

    if (remainingCount > 0) {
      caseMixLabels.push("Others");
      caseMixChartData.push(Math.round((remainingCount / totalCases) * 100));
    }

    const caseMixChart = {
      labels: caseMixLabels,
      datasets: [
        {
          data: caseMixChartData,
          backgroundColor: ["#007acc", "#00d2ff", "#10b981", "#f59e0b"],
          borderWidth: 0,
          cutout: "75%",
        },
      ],
    };

    return { ageData, caseMixChart, topConditions: topThreeConditions };
  }, [myAppointments, patientProfiles]);

  const rankAnalysis = useMemo(() => {
    if (!doctorsList.length)
      return {
        currentRank: 0,
        percentile: 0,
        totalSessions: 0,
        systemAvgRate: "0.0",
      };

    const [year, month] = rankMonth.split("-");

    const leaderboard = doctorsList
      .map((doc) => {
        const docApptsCount = appointmentsData.filter(
          (a) =>
            a.doctorName === doc.name && a.date?.startsWith(`${year}-${month}`),
        ).length;
        return { id: doc._id || doc.doctorId, count: docApptsCount };
      })
      .sort((a, b) => b.count - a.count);

    const myIndex = leaderboard.findIndex(
      (d) => d.id === currentDoc._id || d.id === currentDoc.doctorId,
    );
    const myRank = myIndex !== -1 ? myIndex + 1 : leaderboard.length;
    const totalSessions =
      leaderboard.find(
        (d) => d.id === currentDoc._id || d.id === currentDoc.doctorId,
      )?.count || 0;

    const percentile =
      leaderboard.length > 1
        ? Math.round(((leaderboard.length - myRank) / leaderboard.length) * 100)
        : 0;

    const totalSystemWideAppointments = leaderboard.reduce(
      (acc, curr) => acc + curr.count,
      0,
    );
    const calculatedSystemAvg = leaderboard.length
      ? (totalSystemWideAppointments / leaderboard.length).toFixed(1)
      : "0.0";

    return {
      currentRank: totalSessions > 0 ? myRank : 0,
      percentile: totalSessions > 0 ? percentile : 0,
      totalSessions,
      totalDocs: doctorsList.length,
      systemAvgRate: calculatedSystemAvg,
    };
  }, [rankMonth, currentDoc, doctorsList, appointmentsData]);

  const bookingData = useMemo(() => {
    if (bookingView === "Month") {
      const monthlyCounts = Array(12).fill(0);
      myAppointments.forEach((appt) => {
        if (!appt.date) return;
        const [y, m] = appt.date.split("-");
        if (y === selectedYear) {
          monthlyCounts[parseInt(m, 10) - 1]++;
        }
      });

      return {
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
            label: `Appointments (${selectedYear})`,
            data: monthlyCounts,
            borderColor: "#007acc",
            backgroundColor: "rgba(0, 122, 204, 0.08)",
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 5,
          },
        ],
      };
    } else {
      const dayCounts = Array(7).fill(0);
      myAppointments.forEach((appt) => {
        if (!appt.date) return;
        const apptISOWeek = getISOWeekString(appt.date);
        if (apptISOWeek === selectedWeek) {
          const d = new Date(appt.date);
          const dayIdx = (d.getDay() + 6) % 7;
          dayCounts[dayIdx]++;
        }
      });

      return {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [
          {
            label: `Daily Flow (${selectedWeek})`,
            data: dayCounts,
            backgroundColor: "#007acc",
            borderRadius: 8,
            barThickness: 32,
          },
        ],
      };
    }
  }, [bookingView, selectedYear, selectedWeek, myAppointments]);

  /* =========================================================================
     EXPANDED PATIENT COMPOSITION DIMENSIONS ENGINE (ADDED CHRONIC METRICS)
     ========================================================================= */
  const compositionData = useMemo(() => {
    const patientCounts = {};
    myAppointments.forEach((a) => {
      if (a.patientName) {
        patientCounts[a.patientName] = (patientCounts[a.patientName] || 0) + 1;
      }
    });

    const totalUniquePatients = Object.keys(patientCounts).length || 1;

    let firstTime = 0;
    let standardFollowUp = 0;
    let chronicCareRegular = 0;

    Object.values(patientCounts).forEach((count) => {
      if (count === 1) firstTime++;
      else if (count <= 4) standardFollowUp++;
      else chronicCareRegular++;
    });

    return {
      totalUnique: totalUniquePatients,
      firstTime,
      standardFollowUp,
      chronicCareRegular,
      firstTimePerc: Math.round((firstTime / totalUniquePatients) * 100),
      followUpPerc: Math.round((standardFollowUp / totalUniquePatients) * 100),
      chronicPerc: Math.round((chronicCareRegular / totalUniquePatients) * 100),
      labels: ["First Visit", "Follow-Up (2-4)", "Chronic Care (5+)"],
      datasets: [
        {
          data: [firstTime, standardFollowUp, chronicCareRegular],
          backgroundColor: ["#00d2ff", "#007acc", "#10b981"],
          borderWidth: 0,
          cutout: "75%",
        },
      ],
    };
  }, [myAppointments]);

  if (loading)
    return (
      <div className="doc_perf_loading">
        <Loader2 className="doc_perf_m_spin" /> Opening Intelligence Vault...
      </div>
    );

  return (
    <div className="doc_perf_dash_wrapper doc_perf_dash_fade_in">
      <header className="doc_perf_dash_header">
        <div className="doc_perf_dash_header_text">
          <h1>
            Clinical <span>Intelligence</span>
          </h1>
          <p>
            {currentDoc.name || "Dr. Guest"} •{" "}
            {currentDoc.department || "General Operational"} • Sync:{" "}
            {lastSynced}
          </p>
        </div>
        <button className="doc_perf_dash_btn_primary" onClick={fetchData}>
          <Zap size={14} /> Sync Data
        </button>
      </header>

      <div className="doc_perf_dash_stats_row">
        <div className="doc_perf_dash_stat_card doc_perf_dash_primary">
          <span className="doc_perf_dash_label">Total Appointments</span>
          <h2 className="doc_perf_dash_value_small">{kpis.total}</h2>
        </div>

        <div className="doc_perf_dash_stat_card">
          <span className="doc_perf_dash_label">Completed Sessions</span>
          <h2
            className="doc_perf_dash_value_small"
            style={{ color: "#10b981" }}
          >
            {kpis.completed}
          </h2>
        </div>

        <div className="doc_perf_dash_stat_card">
          <span className="doc_perf_dash_label">Patient Rating</span>
          <h2 className="doc_perf_dash_value_small">
            <Star
              size={18}
              fill="#f59e0b"
              stroke="#f59e0b"
              style={{
                marginRight: "6px",
                display: "inline-block",
                verticalAlign: "middle",
              }}
            />{" "}
            {kpis.rating}
          </h2>
        </div>

        <div className="doc_perf_dash_stat_card">
          <span className="doc_perf_dash_label">Events Attended</span>
          <h2 className="doc_perf_dash_value_small">{kpis.events}</h2>
        </div>

        <div className="doc_perf_dash_stat_card">
          <span className="doc_perf_dash_label">Leaves Taken</span>
          <h2
            className="doc_perf_dash_value_small"
            style={{ color: "#ef4444" }}
          >
            {leaveHistory.length}
          </h2>
        </div>
      </div>

      <div className="doc_perf_dash_dual_row">
        <div className="doc_perf_dash_bento_item flex_2">
          <div className="doc_perf_dash_card_head">
            <h3>Professional Dynamics</h3>
            <div className="doc_perf_dash_header_actions">
              <div className="doc_perf_dash_mini_tabs">
                <button
                  className={
                    bookingView === "Month" ? "doc_perf_dash_active" : ""
                  }
                  onClick={() => setBookingView("Month")}
                >
                  Monthly
                </button>
                <button
                  className={
                    bookingView === "Week" ? "doc_perf_dash_active" : ""
                  }
                  onClick={() => setBookingView("Week")}
                >
                  Weekly
                </button>
              </div>
              <input
                type={bookingView === "Month" ? "number" : "week"}
                className="doc_perf_dash_select_filter_mini"
                value={bookingView === "Month" ? selectedYear : selectedWeek}
                onChange={(e) =>
                  bookingView === "Month"
                    ? setSelectedYear(e.target.value)
                    : setSelectedWeek(e.target.value)
                }
              />
            </div>
          </div>
          <div className="doc_perf_dash_canvas_holder">
            <Line
              data={bookingData}
              options={{ responsive: true, maintainAspectRatio: false }}
            />
          </div>
        </div>

        {/* COMPOSITION BLOCK IMPLEMENTED WITH ADVANCED CLINICAL DATA DIMENSIONS */}
        <div className="doc_perf_dash_bento_item flex_1">
          <div className="doc_perf_dash_card_head">
            <h3>Patient Retention Tiers</h3>
          </div>
          <div className="doc_perf_dash_chart_focus_mini">
            <div className="doc_perf_dash_canvas_wrapper_donut">
              <Doughnut
                data={compositionData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                }}
              />
            </div>
            <div className="doc_perf_dash_donut_center">
              <strong>{compositionData.totalUnique}</strong>
              <span>Total Case Files</span>
            </div>
          </div>
          <div className="doc_perf_dash_comp_legend">
            <div className="doc_perf_dash_comp_pill">
              <div className="doc_perf_dash_comp_info">
                <span
                  className="doc_perf_dash_dot"
                  style={{ background: "#00d2ff" }}
                ></span>
                <span className="doc_perf_dash_comp_name">First Visit</span>
              </div>
              <span className="doc_perf_dash_comp_perc">
                {compositionData.firstTimePerc}%
              </span>
            </div>
            <div className="doc_perf_dash_comp_pill">
              <div className="doc_perf_dash_comp_info">
                <span
                  className="doc_perf_dash_dot"
                  style={{ background: "#007acc" }}
                ></span>
                <span className="doc_perf_dash_comp_name">Follow-Up (2-4)</span>
              </div>
              <span className="doc_perf_dash_comp_perc">
                {compositionData.followUpPerc}%
              </span>
            </div>
            <div className="doc_perf_dash_comp_pill">
              <div className="doc_perf_dash_comp_info">
                <span
                  className="doc_perf_dash_dot"
                  style={{ background: "#10b981" }}
                ></span>
                <span className="doc_perf_dash_comp_name">
                  Chronic Care (5+)
                </span>
              </div>
              <span className="doc_perf_dash_comp_perc">
                {compositionData.chronicPerc}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="doc_perf_dash_bento_item doc_perf_dash_margin_top">
        <div className="doc_perf_dash_card_head">
          <h3>Rank Authority Hub</h3>
          <input
            type="month"
            className="doc_perf_dash_select_filter_mini"
            value={rankMonth}
            onChange={(e) => setRankMonth(e.target.value)}
          />
        </div>
        <div className="doc_perf_dash_rank_ribbon">
          <div className="doc_perf_dash_rank_focus_box">
            <div className="doc_perf_dash_rank_num_hero">
              {rankAnalysis.currentRank || "0"}
            </div>
            <div className="doc_perf_dash_rank_meta_label">Global Position</div>
          </div>
          <div className="doc_perf_dash_rank_stats_grid">
            <div className="doc_perf_dash_rank_stat_node">
              <Award className="doc_perf_dash_node_icon" size={20} />
              <div>
                <label>Percentile</label>
                <strong>{rankAnalysis.percentile}%</strong>
              </div>
            </div>
            <div className="doc_perf_dash_rank_stat_node">
              <CheckCircle className="doc_perf_dash_node_icon" size={20} />
              <div>
                <label>Month Sessions</label>
                <strong>{rankAnalysis.totalSessions}</strong>
              </div>
            </div>
            <div className="doc_perf_dash_rank_stat_node">
              <Activity className="doc_perf_dash_node_icon" size={20} />
              <div>
                <label>System Avg Vol</label>
                <strong>{rankAnalysis.systemAvgRate}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="doc_perf_dash_dual_row doc_perf_dash_margin_top">
        <div className="doc_perf_dash_bento_item doc_perf_dash_flex_half">
          <div className="doc_perf_dash_card_head">
            <h3>Patient Age Demographics</h3>
          </div>
          {myAppointments.length > 0 ? (
            <div className="doc_perf_dash_canvas_holder">
              <Bar
                data={demographics.ageData}
                options={{ responsive: true, maintainAspectRatio: false }}
              />
            </div>
          ) : (
            <div
              className="doc_perf_dash_empty_diagnosis_notice"
              style={{
                display: "flex",
                flex: 1,
                alignItems: "center",
                justifycontent: "center",
                color: "#64748b",
                fontSize: "0.9rem",
                fontStyle: "italic",
                padding: "40px 0",
              }}
            >
              No structural demographics tracking variables mapped for this
              profile.
            </div>
          )}
        </div>

        <div className="doc_perf_dash_bento_item doc_perf_dash_flex_half">
          <div className="doc_perf_dash_card_head">
            <h3>Top Diagnoses (Case Mix)</h3>
          </div>
          {demographics.topConditions.length > 0 ? (
            <>
              <div className="doc_perf_dash_chart_focus_mini">
                <div className="doc_perf_dash_canvas_wrapper_donut">
                  <Doughnut
                    data={demographics.caseMixChart}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                    }}
                  />
                </div>
                <div className="doc_perf_dash_donut_center">
                  <strong>{demographics.topConditions.length}</strong>
                  <span>Clusters</span>
                </div>
              </div>

              <div className="doc_perf_dash_custom_legend_v2">
                {demographics.topConditions.map((item, idx) => (
                  <div key={idx} className="doc_perf_dash_legend_row">
                    <div className="doc_perf_dash_legend_left">
                      <span
                        className="doc_perf_dash_legend_dot"
                        style={{
                          backgroundColor:
                            demographics.caseMixChart.datasets[0]
                              .backgroundColor[idx],
                        }}
                      ></span>
                      <span
                        className="doc_perf_dash_legend_label"
                        style={{
                          fontSize: "0.85rem",
                          color: "#1e293b",
                          fontWeight: "600",
                        }}
                      >
                        {item.label}
                      </span>
                    </div>
                    <span
                      className="doc_perf_dash_legend_value"
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: "700",
                        color: "#475569",
                      }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div
              className="doc_perf_dash_empty_diagnosis_notice"
              style={{
                display: "flex",
                flex: 1,
                alignItems: "center",
                justifycontent: "center",
                color: "#64748b",
                fontSize: "0.9rem",
                fontStyle: "italic",
                padding: "40px 0",
              }}
            >
              No tracked clinical diagnoses recorded for this timeline profile.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
