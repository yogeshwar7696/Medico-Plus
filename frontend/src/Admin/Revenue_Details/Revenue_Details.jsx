import React, { useState, useMemo, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import axios from "axios";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import { Loader2, RefreshCw, Printer, FileText } from "lucide-react";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

import "./Revenue_Details.css";

// ChartJS Configuration
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

export default function Revenue_Details() {
  /* --- 1. MERN LIVE DATA STATES --- */
  const [loading, setLoading] = useState(true);
  const [dbData, setDbData] = useState({
    appointments: [],
    patients: [],
    doctors: [],
    orders: [],
  });

  /* --- 2. ORIGINAL UI STATES --- */
  const [trendView, setTrendView] = useState("Month");
  const [trendWeek, setTrendWeek] = useState("2026-W14");
  const [trendYear, setTrendYear] = useState(2026);
  // Automatically generates a string matching the current year and month (e.g., "2026-05")
  const currentYearMonthString = new Date().toISOString().slice(0, 7);

  const [deptMonth, setDeptMonth] = useState(currentYearMonthString);
  const [contributorMonth, setContributorMonth] = useState(
    currentYearMonthString,
  );
  const [patientView, setPatientView] = useState("Age");
  const [lastSynced, setLastSynced] = useState(new Date().toLocaleTimeString());

  /* --- 3. DATA SYNCHRONIZATION LOGIC --- */
  const syncHospitalFinancials = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [apptRes, patRes, docRes, orderRes] = await Promise.all([
        axios.get("http://localhost:5000/api/appointments/all", { headers }),
        axios.get("http://localhost:5000/api/patients/all", { headers }),
        axios.get("http://localhost:5000/api/doctors/list", { headers }),
        // Hits the master global order registry route instead of single-user endpoints
        axios
          .get("http://localhost:5000/api/orders/all", { headers })
          .catch((err) => {
            console.warn(
              "Global orders endpoint mismatch, falling back to empty ledger matrix.",
              err.message,
            );
            return { data: [] }; // Safe fallback container array ensures app doesn't crash if collection is unpopulated
          }),
      ]);

      setDbData({
        appointments: apptRes.data || [],
        patients: patRes.data || [],
        doctors: docRes.data || [],
        orders: orderRes.data || [],
      });
      setLastSynced(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Clinical Revenue Sync Failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncHospitalFinancials();
    const interval = setInterval(syncHospitalFinancials, 30000);
    return () => clearInterval(interval);
  }, []);

  /* --- 4. CALCULATION HELPERS --- */
  const getApptRevenue = (doctorName) => {
    const doctor = dbData.doctors.find(
      (d) =>
        (d.name || d.doctorName || "").toLowerCase() ===
        (doctorName || "").toLowerCase(),
    );
    return doctor ? doctor.fee || 500 : 500;
  };

  const isDateInWeek = (dateStr, weekStr) => {
    if (!dateStr || !weekStr) return false;
    const targetDate = new Date(dateStr);
    if (isNaN(targetDate.getTime())) return false;

    // Isolate week constraints from raw input string
    const [filterYear, filterWeek] = weekStr.split("-W");
    const weekNum = parseInt(filterWeek, 10);

    // Determine target date week value
    const target = new Date(targetDate.valueOf());
    const dayNr = (targetDate.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    const computedWeek = 1 + Math.ceil((firstThursday - target) / 604800000);

    return (
      target.getFullYear().toString() === filterYear && computedWeek === weekNum
    );
  };

  /* --- 5. MEMOIZED ANALYTICS --- */

  // Global Financial Statistics
  const globalStats = useMemo(() => {
    let consultationRevenue = 0;
    let infrastructureRevenue = 0;
    const deptTotals = {};

    // A. Parse Consultation Yields matching doctor fees
    dbData.appointments.forEach((appt) => {
      if (appt.status !== "Cancelled") {
        const fee = getApptRevenue(appt.doctorName || appt.doctor);
        consultationRevenue += fee;
        const dName = appt.department || "General Medicine";
        deptTotals[dName] = (deptTotals[dName] || 0) + fee;
      }
    });

    // B. Parse E-Commerce Orders (Medicines AND Lab Tests concurrently)
    dbData.orders.forEach((order) => {
      if (order.status !== "Cancelled" && order.paymentStatus === "Paid") {
        infrastructureRevenue += order.totalAmount || 0;

        // Distribute line items across clinical departments dynamically
        if (Array.isArray(order.items)) {
          order.items.forEach((item) => {
            const itemDept =
              item.type === "Test" ? "Pathology Lab" : "Pharmacy Depot";
            deptTotals[itemDept] =
              (deptTotals[itemDept] || 0) + item.price * item.quantity;
          });
        }
      }
    });

    const aggregateLifetimeYield = consultationRevenue + infrastructureRevenue;
    const highestDept =
      Object.entries(deptTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "General Clinic";
    const divisor = aggregateLifetimeYield > 0 ? 100000 : 1;

    return {
      lifetime: (aggregateLifetimeYield / divisor).toFixed(1),
      avgAppt:
        dbData.appointments.length > 0
          ? (aggregateLifetimeYield / dbData.appointments.length).toFixed(0)
          : 0,
      highestDept,
      totalRegistry: dbData.patients.length,
      staffCount: dbData.doctors.length,
    };
  }, [dbData]);

  // Revenue Trend Analytics
  // Revenue Trend Analytics
  const trendData = useMemo(() => {
    if (trendView === "Week") {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const currentWeek = [0, 0, 0, 0, 0, 0, 0];

      dbData.appointments.forEach((appt) => {
        if (appt.status !== "Cancelled" && isDateInWeek(appt.date, trendWeek)) {
          const dayIdx = (new Date(appt.date).getDay() + 6) % 7;
          currentWeek[dayIdx] += getApptRevenue(appt.doctorName || appt.doctor);
        }
      });

      dbData.orders.forEach((order) => {
        const orderDate = order.date || order.createdAt;
        if (
          order.status !== "Cancelled" &&
          order.paymentStatus === "Paid" &&
          isDateInWeek(orderDate, trendWeek)
        ) {
          const dayIdx = (new Date(orderDate).getDay() + 6) % 7;
          currentWeek[dayIdx] += order.totalAmount || 0;
        }
      });

      return {
        labels: days,
        datasets: [
          {
            label: "Total Yield (Weekly)",
            data: currentWeek,
            borderColor: "#007acc",
            backgroundColor: "rgba(0, 122, 204, 0.06)",
            fill: true,
            tension: 0.35,
          },
        ],
      };
    } else {
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
      const yearlyMonthlyData = Array(12).fill(0);

      dbData.appointments.forEach((appt) => {
        if (
          appt.status !== "Cancelled" &&
          appt.date &&
          appt.date.startsWith(trendYear.toString())
        ) {
          const splitParts = appt.date.split("-");
          if (splitParts[1]) {
            const monthIdx = parseInt(splitParts[1], 10) - 1;
            yearlyMonthlyData[monthIdx] += getApptRevenue(
              appt.doctorName || appt.doctor,
            );
          }
        }
      });

      dbData.orders.forEach((order) => {
        const orderDate = order.date || order.createdAt;
        if (
          order.status !== "Cancelled" &&
          order.paymentStatus === "Paid" &&
          orderDate &&
          orderDate.startsWith(trendYear.toString())
        ) {
          const splitParts = orderDate.split("-");
          if (splitParts[1]) {
            const monthIdx = parseInt(splitParts[1], 10) - 1;
            yearlyMonthlyData[monthIdx] += order.totalAmount || 0;
          }
        }
      });

      return {
        labels: months,
        datasets: [
          {
            label: "Total Yield (Monthly)",
            data: yearlyMonthlyData,
            borderColor: "#007acc",
            backgroundColor: "rgba(0, 122, 204, 0.06)",
            fill: true,
            tension: 0.35,
          },
        ],
      };
    }
  }, [dbData, trendView, trendWeek, trendYear]);

  // Contributor Leaderboard logic
  const topDoctors = useMemo(() => {
    const docMap = {};
    const [filterYear, filterMonth] = contributorMonth.split("-");

    dbData.appointments.forEach((a) => {
      if (!a.date) return;

      const apptDateStr =
        typeof a.date === "string" ? a.date : new Date(a.date).toISOString();
      const matchYear = apptDateStr.includes(filterYear);
      const matchMonth = apptDateStr.includes(`-${filterMonth}`);

      if (matchYear && matchMonth) {
        const name = a.doctorName || a.doctor;
        if (name) {
          docMap[name] = (docMap[name] || 0) + getApptRevenue(name);
        }
      }
    });

    return Object.entries(docMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, rev]) => {
        const doctorDoc = dbData.doctors.find(
          (d) =>
            (d.name || "").toLowerCase().trim() === name.toLowerCase().trim(),
        );
        return {
          name: name.startsWith("Dr.") ? name : `Dr. ${name}`,
          rev: `₹${(rev / 1000).toFixed(1)}K`,
          dept: doctorDoc?.department || "Clinical Specialist",
        };
      });
  }, [dbData, contributorMonth]);

  // Departmental Performance logic
  const deptData = useMemo(() => {
    const dynamicDepts = Array.from(
      new Set(
        dbData.appointments
          .map((a) => a.department)
          .filter((dept) => dept && dept.trim() !== ""),
      ),
    );

    const fallbackDepts =
      dynamicDepts.length > 0
        ? dynamicDepts
        : [
            "Cardiology",
            "Orthopedics",
            "Neurology",
            "Pediatrics",
            "Gastroenterology",
          ];

    const filtered = dbData.appointments.filter(
      (a) => a.date && a.date.startsWith(deptMonth),
    );

    const totals = fallbackDepts.map((d) =>
      filtered
        .filter(
          (a) =>
            (a.department || "").toLowerCase().trim() ===
            d.toLowerCase().trim(),
        )
        .reduce((s, c) => s + getApptRevenue(c.doctorName || c.doctor), 0),
    );

    return {
      labels: fallbackDepts.map((d) =>
        d.length > 10 ? d.slice(0, 8) + "..." : d,
      ),
      datasets: [
        {
          label: "Actual Yield Generated",
          data: totals,
          backgroundColor: "#007acc",
          borderRadius: 6,
          barThickness: 24,
        },
      ],
    };
  }, [dbData, deptMonth]);

  // Patient Demographics logic
  const patientData = useMemo(() => {
    const isAge = patientView === "Age";
    const values = isAge
      ? [
          dbData.patients.filter((p) => p.age >= 19 && p.age < 60).length,
          dbData.patients.filter((p) => p.age < 19).length,
          dbData.patients.filter((p) => p.age >= 60).length,
        ]
      : [
          dbData.patients.filter((p) => p.gender === "Male").length,
          dbData.patients.filter((p) => p.gender === "Female").length,
          dbData.patients.filter(
            (p) => p.gender !== "Male" && p.gender !== "Female",
          ).length,
        ];
    return {
      labels: isAge
        ? ["Adults", "Children", "Seniors"]
        : ["Male", "Female", "Other"],
      datasets: [
        {
          data: values,
          backgroundColor: ["#007acc", "#00d2ff", "#1e293b"],
          borderWidth: 0,
        },
      ],
    };
  }, [dbData, patientView]);

  if (loading)
    return (
      <div className="admin_dash_load">
        <Loader2 className="spin" /> Synchronizing Revenue Details...
      </div>
    );

  return (
    <div className="admin_rev_m_wrapper">
      <header className="admin_rev_m_header">
        <div className="admin_rev_m_header_text">
          <h1>
            Revenue <span>Hub</span>
          </h1>
        </div>
        <div className="admin_rev_m_export_suite">
          <button
            className="admin_rev_m_export_btn"
            title="Sync Registry"
            onClick={syncHospitalFinancials}
          >
            <RefreshCw size={14} />
          </button>
          <button className="admin_rev_m_export_btn" title="Download Report">
            <FileText size={14} />
          </button>
          <button
            className="admin_rev_m_export_btn"
            title="Print Hub"
            onClick={() => window.print()}
          >
            <Printer size={14} />
          </button>
        </div>
      </header>

      {/* KPI Stats Grid */}
      <div className="admin_rev_m_stats_bento">
        <div className="admin_rev_m_stat_card admin_rev_m_primary">
          <div className="admin_rev_m_pulse_ring"></div>
          <span className="admin_rev_m_label">Lifetime Revenue</span>
          <h2 className="admin_rev_m_value">₹{globalStats.lifetime}L</h2>
        </div>
        <div className="admin_rev_m_stat_card">
          <span className="admin_rev_m_label">Patient Registry</span>
          <h2 className="admin_rev_m_value">{globalStats.totalRegistry}</h2>
          <div className="admin_rev_m_pill_up">+12% ↑</div>
        </div>
        <div className="admin_rev_m_stat_card">
          <span className="admin_rev_m_label">Avg Consulting</span>
          <h2 className="admin_rev_m_value">₹{globalStats.avgAppt}</h2>
        </div>
        <div className="admin_rev_m_stat_card admin_rev_m_highlight">
          <span className="admin_rev_m_label">Lead Wing</span>
          <h2 className="admin_rev_m_value" style={{ fontSize: "0.9rem" }}>
            {globalStats.highestDept}
          </h2>
        </div>
        <div className="admin_rev_m_stat_card">
          <span className="admin_rev_m_label">Clinical Staff</span>
          <h2 className="admin_rev_m_value">{globalStats.staffCount}</h2>
        </div>
      </div>

      {/* Primary Analytics Section */}
      <div className="admin_rev_m_bento_row">
        <div className="admin_rev_m_span_2">
          <div className="admin_rev_m_card_head">
            <div className="admin_rev_m_title_with_toggle">
              <h3>Revenue Trend</h3>
              <div className="admin_rev_m_filter_cluster">
                <div className="admin_rev_m_mini_tabs">
                  <button
                    className={
                      trendView === "Month" ? "admin_rev_m_active" : ""
                    }
                    onClick={() => setTrendView("Month")}
                  >
                    Yearly
                  </button>
                  <button
                    className={trendView === "Week" ? "admin_rev_m_active" : ""}
                    onClick={() => setTrendView("Week")}
                  >
                    Weekly
                  </button>
                </div>
                <div className="admin_rev_m_calendar_input">
                  {trendView === "Week" ? (
                    <input
                      type="week"
                      className="admin_rev_m_year_select"
                      value={trendWeek}
                      onChange={(e) => setTrendWeek(e.target.value)}
                    />
                  ) : (
                    <input
                      type="number"
                      className="admin_rev_m_year_select"
                      value={trendYear}
                      onChange={(e) =>
                        setTrendYear(parseInt(e.target.value, 10) || 2026)
                      }
                      style={{ width: "85px" }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="admin_rev_m_canvas_holder">
            <Line
              data={trendData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { grid: { display: false } } },
              }}
            />
          </div>
        </div>

        <div className="admin_rev_m_bento_item">
          <div className="admin_rev_m_card_head">
            <div className="admin_rev_m_title_with_toggle">
              <h3>Contributors</h3>
              <input
                type="month"
                className="admin_rev_m_year_select"
                value={contributorMonth}
                onChange={(e) => setContributorMonth(e.target.value)}
                style={{ fontSize: "0.7rem", padding: "4px 8px" }}
              />
            </div>
          </div>
          <div className="admin_rev_m_doc_leaderboard">
            {topDoctors.length > 0 ? (
              topDoctors.map((doc, i) => (
                <div key={i} className="admin_rev_m_list_row">
                  <div className="admin_rev_m_list_info">
                    <strong>{doc.name}</strong>
                    <span>{doc.dept}</span>
                  </div>
                  <div className="admin_rev_m_list_val">{doc.rev}</div>
                </div>
              ))
            ) : (
              <p
                style={{
                  textAlign: "center",
                  color: "#94a3b8",
                  marginTop: "40px",
                }}
              >
                No activity logs
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Analytics Section */}
      <div className="admin_rev_m_bento_row">
        <div className="admin_rev_m_bento_item admin_rev_m_patient_card">
          <div className="admin_rev_m_card_head">
            <div className="admin_rev_m_title_with_toggle">
              <h3>Demographics</h3>
              <div className="admin_rev_m_mini_tabs">
                <button
                  className={patientView === "Age" ? "admin_rev_m_active" : ""}
                  onClick={() => setPatientView("Age")}
                >
                  Age
                </button>
                <button
                  className={
                    patientView === "Gender" ? "admin_rev_m_active" : ""
                  }
                  onClick={() => setPatientView("Gender")}
                >
                  Gender
                </button>
              </div>
            </div>
          </div>
          <div className="admin_rev_m_patient_content">
            <div className="admin_rev_m_doughnut_box">
              <Doughnut
                data={patientData}
                options={{
                  cutout: "80%",
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                }}
              />
              <div className="admin_rev_m_center_insight">
                <span className="admin_rev_m_insight_label">Registry</span>
                <strong className="admin_rev_m_insight_val">
                  {dbData.patients.length}
                </strong>
              </div>
            </div>
          </div>
          <div className="admin_rev_m_legend">
            {patientData.labels.map((label, idx) => (
              <div key={idx} className="admin_rev_m_legend_pill">
                <span
                  className="admin_rev_m_dot"
                  style={{
                    backgroundColor: ["#007acc", "#00d2ff", "#1e293b"][idx],
                  }}
                ></span>
                <span className="admin_rev_m_pill_text">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="admin_rev_m_bento_item admin_rev_m_span_2">
          <div className="admin_rev_m_card_head">
            <div className="admin_rev_m_title_with_toggle">
              <h3>Wing Performance</h3>
              <input
                type="month"
                className="admin_rev_m_year_select"
                value={deptMonth}
                onChange={(e) => setDeptMonth(e.target.value)}
              />
            </div>
          </div>
          <div className="admin_rev_m_canvas_holder_compact">
            <Bar
              data={deptData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
