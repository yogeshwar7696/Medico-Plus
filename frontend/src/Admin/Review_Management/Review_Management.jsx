import React, { useState, useMemo, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import axios from "axios";
import {
  Star,
  Trash2,
  ArrowLeft,
  RefreshCw,
  Loader2,
  Award,
  AlertCircle,
  CheckCircle2,
  Activity,
  Quote,
  TrendingUp,
  TrendingDown,
  Filter,
  Search,
  Flag,
  Calendar,
  MessageSquare,
  ShieldAlert,
  SlidersHorizontal,
  BarChart3,
  Lightbulb,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import "./Review_Management.css";

export default function ReviewManagement() {
  /* ============================================================
     1. CLINICAL FEEDBACK ERP CORE STATES
     ============================================================ */
  const [reviews, setReviews] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [workspaceFilter, setWorkspaceFilter] = useState("all");
  const [globalStarFilter, setGlobalStarFilter] = useState(null);
  const [lastSynced, setLastSynced] = useState(new Date().toLocaleTimeString());

  /* ============================================================
     2. ADMINISTRATIVE INTELLIGENCE SYNC ENGINE
     ============================================================ */
  const syncIntelligence = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Session Expired: Please log out and log back in.");
        setLoading(false);
        return;
      }

      const headers = {
        Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
      };

      const [revRes, docRes] = await Promise.all([
        axios.get("http://localhost:5000/api/feedback/all", { headers }),
        axios.get("http://localhost:5000/api/doctors/list", { headers }),
      ]);

      setReviews(revRes.data || []);
      setDoctors(docRes.data || []);
      setLastSynced(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Administrative Intelligence Pipeline Failure:", err);
      alert(`Sync Interrupted: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncIntelligence();
  }, []);

  /* ============================================================
     3. SEMANTIC TEXT MINING & ANALYTICS PIPELINE
     ============================================================ */
  const analytics = useMemo(() => {
    const distribution = [5, 4, 3, 2, 1].map((star) => {
      const count = reviews.filter((r) => Number(r.rating) === star).length;
      return {
        star,
        count,
        pct: reviews.length > 0 ? (count / reviews.length) * 100 : 0,
      };
    });

    const docStats = doctors.map((doc) => {
      const docReviews = reviews.filter(
        (r) =>
          (r.doctorName || r.doctor || "").toLowerCase().trim() ===
          (doc.name || "").toLowerCase().trim(),
      );
      const total = docReviews.length;
      const totalScoreSum = docReviews.reduce(
        (sum, current) => sum + Number(current.rating || 0),
        0,
      );
      const avg = total > 0 ? (totalScoreSum / total).toFixed(1) : "0.0";
      const recentReviews = docReviews.slice(-3);
      const recentScoreSum = recentReviews.reduce(
        (sum, current) => sum + Number(current.rating || 0),
        0,
      );
      const recentAvg =
        recentReviews.length > 0 ? recentScoreSum / recentReviews.length : 5.0;
      const trend = recentAvg >= parseFloat(avg) ? "up" : "down";

      return { ...doc, avgRating: parseFloat(avg), totalReviews: total, trend };
    });

    const highPerformers = docStats
      .filter((d) => d.avgRating >= 4.5 && d.totalReviews > 0)
      .sort((a, b) => b.avgRating - a.avgRating);
    const lowPerformers = docStats
      .filter((d) => d.avgRating < 3.5 && d.totalReviews > 0)
      .sort((a, b) => a.avgRating - b.avgRating);
    const mostImproved = docStats
      .filter((d) => d.trend === "up" && d.totalReviews > 0)
      .slice(0, 3);

    const totalPromoters = reviews.filter((r) => Number(r.rating) >= 4).length;
    const totalDetractors = reviews.filter((r) => Number(r.rating) <= 2).length;
    const npsScore =
      reviews.length > 0
        ? (((totalPromoters - totalDetractors) / reviews.length) * 100).toFixed(
            0,
          )
        : "0";

    const deptDeficits = {};
    docStats.forEach((d) => {
      if (d.avgRating < 4.0 && d.department) {
        deptDeficits[d.department] =
          (deptDeficits[d.department] || 0) + d.totalReviews;
      }
    });
    const leakDepartment =
      Object.keys(deptDeficits).sort(
        (a, b) => deptDeficits[b] - deptDeficits[a],
      )[0] || "None Flagged";

    const stopWords = [
      "the",
      "and",
      "a",
      "to",
      "in",
      "is",
      "was",
      "for",
      "of",
      "with",
      "dr",
      "doctor",
      "very",
      "good",
      "great",
    ];
    const tokenCounts = {};
    reviews.forEach((r) => {
      const rawText = r.comments || r.comment || r.feedback || "";
      const words = rawText
        .toLowerCase()
        .replace(/[^a-zA-Z ]/g, "")
        .split(" ");
      words.forEach((w) => {
        const cleanedWord = w.trim();
        if (cleanedWord.length > 3 && !stopWords.includes(cleanedWord)) {
          tokenCounts[cleanedWord] = (tokenCounts[cleanedWord] || 0) + 1;
        }
      });
    });
    const topKeywords = Object.keys(tokenCounts)
      .sort((a, b) => tokenCounts[b] - tokenCounts[a])
      .slice(0, 4);

    return {
      distribution,
      highPerformers,
      lowPerformers,
      mostImproved,
      insights: { npsScore, leakDepartment, topKeywords },
    };
  }, [reviews, doctors]);

  /* ============================================================
     4. WORKSPACE DRILLED QUANTITATIVE ROUTING
     ============================================================ */
  const workspaceData = useMemo(() => {
    if (!selectedDoctorId) return null;
    const doc = doctors.find((d) => d._id === selectedDoctorId);
    if (!doc) return null;

    let filtered = reviews.filter(
      (r) =>
        (r.doctorName || r.doctor || "").toLowerCase().trim() ===
        (doc.name || "").toLowerCase().trim(),
    );

    if (workspaceFilter === "5star")
      filtered = filtered.filter((r) => Number(r.rating) === 5);
    if (workspaceFilter === "critical")
      filtered = filtered.filter((r) => Number(r.rating) <= 2);

    if (searchQuery) {
      filtered = filtered.filter((r) => {
        const pName = (r.patientName || "").toLowerCase();
        const commentBody = (
          r.comments ||
          r.comment ||
          r.feedback ||
          ""
        ).toLowerCase();
        const query = searchQuery.toLowerCase();
        return pName.includes(query) || commentBody.includes(query);
      });
    }

    const totalScoreSum = filtered.reduce(
      (sum, current) => sum + Number(current.rating || 0),
      0,
    );
    const dynamicAvg =
      filtered.length > 0
        ? (totalScoreSum / filtered.length).toFixed(1)
        : "0.0";

    return { doc: { ...doc, avgRating: dynamicAvg }, docReviews: filtered };
  }, [selectedDoctorId, doctors, reviews, workspaceFilter, searchQuery]);

  const macroFilteredReviews = useMemo(() => {
    if (!globalStarFilter) return reviews;
    return reviews.filter((r) => Number(r.rating) === globalStarFilter);
  }, [reviews, globalStarFilter]);

  /* ============================================================
     5. ADMINISTRATIVE MANAGEMENT INTERCEPTORS
     ============================================================ */
  const handleFlag = (id) =>
    alert(`Review ${id} flagged for Administrative Quality Audit Review.`);

  const handleDelete = async (id) => {
    if (
      window.confirm(
        "Archive this patient feedback permanently from active reporting tables?",
      )
    ) {
      try {
        const token = localStorage.getItem("token");
        const headers = {
          Authorization: token.startsWith("Bearer ")
            ? token
            : `Bearer ${token}`,
        };
        await axios.delete(`http://localhost:5000/api/feedback/delete/${id}`, {
          headers,
        });
        syncIntelligence();
      } catch (err) {
        alert("Archive operational failure sequence tracking lost.");
      }
    }
  };

  if (loading && reviews.length === 0 && doctors.length === 0) {
    return (
      <div className="admin_dash_load">
        <Loader2 className="admin_rev_intel_spin" size={40} />
        <p>Synchronizing Patient Reviews...</p>
      </div>
    );
  }

  return (
    <div className="admin_rev_intel_root doc_home_view_fade_in">
      {/* ============================================================
         WORKSPACE SUB-PANEL: SINGLE CLINICIAN DEEP SENTIMENT VIEW
         ============================================================ */}
      {selectedDoctorId && workspaceData?.doc ? (
        <div className="admin_rev_intel_workspace_scope">
          <div className="admin_rev_intel_workspace_nav">
            <button
              className="admin_rev_intel_back_btn"
              onClick={() => {
                setSelectedDoctorId(null);
                setWorkspaceFilter("all");
                setSearchQuery("");
              }}
            >
              <ArrowLeft size={18} /> Exit Workspace
            </button>
            <div className="admin_rev_intel_ws_controls">
              <div className="admin_rev_intel_search_mini">
                <Search size={14} />
                <input
                  placeholder="Search within text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                value={workspaceFilter}
                onChange={(e) => setWorkspaceFilter(e.target.value)}
              >
                <option value="all">All Feedback</option>
                <option value="5star">5 Star Only</option>
                <option value="critical">Critical Only</option>
              </select>
            </div>
          </div>

          <div className="admin_rev_intel_workspace_hero">
            <div className="admin_rev_intel_hero_identity">
              <img
                src={
                  workspaceData.doc.photo
                    ? `http://localhost:5000/uploads/${workspaceData.doc.photo}`
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(workspaceData.doc.name || "DR")}&size=150&background=f0f7ff&color=007acc&bold=true`
                }
                alt={workspaceData.doc.name}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(workspaceData.doc.name || "DR")}&background=e2e8f0&color=64748b`;
                }}
              />
              <div>
                <div className="admin_rev_intel_status_tag">
                  Active Analysis
                </div>
                <h2>{workspaceData.doc.name}</h2>
                <p>{workspaceData.doc.department} • Clinical Specialist</p>
              </div>
            </div>
            <div className="admin_rev_intel_hero_stats">
              <div className="admin_rev_intel_h_stat">
                <small>Clinical Rating</small>
                <strong>
                  {workspaceData.doc.avgRating} <Star size={20} fill="#fff" />
                </strong>
              </div>
              <div className="admin_rev_intel_h_stat">
                <small>Volume</small>
                <strong>{workspaceData.docReviews.length}</strong>
              </div>
              <div className="admin_rev_intel_h_stat">
                <small>Trend</small>
                <strong>
                  {workspaceData.doc.trend === "up" ? (
                    <TrendingUp color="#4ade80" />
                  ) : (
                    <TrendingDown color="#fb7185" />
                  )}
                </strong>
              </div>
            </div>
          </div>

          <div className="admin_rev_intel_masonry">
            {workspaceData.docReviews.length > 0 ? (
              workspaceData.docReviews.map((rev) => (
                <div
                  className={`admin_rev_intel_card ${Number(rev.rating) <= 2 ? "critical_border" : ""}`}
                  key={rev._id}
                >
                  <div className="admin_rev_intel_card_header">
                    <div className="admin_rev_intel_patient_info">
                      <div className="admin_rev_intel_p_avatar">
                        {(rev.patientName || "P").charAt(0).toUpperCase()}
                      </div>
                      <b>{rev.patientName}</b>
                    </div>
                    <div className="admin_rev_intel_stars">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          fill={i < Number(rev.rating) ? "#facc15" : "none"}
                          color="#facc15"
                        />
                      ))}
                    </div>
                  </div>
                  <div className="admin_rev_intel_card_content">
                    <Quote size={18} className="admin_rev_intel_quote_icon" />
                    <p className="admin_rev_intel_text">
                      {rev.comments ||
                        "No textual comment submitted for this session entry."}
                    </p>
                  </div>
                  <div className="admin_rev_intel_card_footer">
                    <div className="admin_rev_intel_meta_group">
                      <Calendar size={12} />
                      <span className="admin_rev_intel_date">
                        {rev.date ||
                          (rev.createdAt
                            ? new Date(rev.createdAt).toLocaleDateString()
                            : "May 2026")}
                      </span>
                    </div>
                    <div className="admin_rev_intel_card_actions">
                      <button
                        className="admin_rev_intel_action_icon"
                        onClick={() => handleFlag(rev._id)}
                        title="Flag Review"
                      >
                        <Flag size={14} />
                      </button>
                      <button
                        className="admin_rev_intel_delete"
                        onClick={() => handleDelete(rev._id)}
                        title="Archive Record"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="admin_rev_intel_empty_state_full">
                <Activity size={48} />
                <h3>No Feedback Matches</h3>
                <p>
                  Try adjusting your search query inputs or category filters for
                  this specialist entry.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ============================================================
           MAIN SCREEN STATE: MASTER EXECUTIVE ANALYTICS CONSOLE
           ============================================================ */
        <div className="admin_rev_intel_dashboard_scope">
          <header className="admin_rev_intel_header">
            <div className="admin_rev_intel_branding">
              <h1>
                Sentiment{" "}
                <span className="admin_rev_intel_cyan">Intelligence</span>
              </h1>
              <p>
                Hospital Reputation & Specialist Performance Hub
              </p>
            </div>
            <div className="admin_rev_intel_header_btns">
              <button
                className="admin_rev_intel_sync_btn"
                onClick={syncIntelligence}
                title="Refresh Core Matrix Streams"
              >
                <RefreshCw
                  size={16}
                  className={loading ? "admin_rev_intel_spin" : ""}
                />
              </button>
              <button
                className="admin_rev_intel_primary_btn"
                onClick={() => window.print()}
              >
                <MessageSquare size={16} /> Export Summary
              </button>
            </div>
          </header>

          <div className="admin_rev_intel_kpi_grid">
            <div className="admin_rev_intel_kpi_card">
              <div className="admin_rev_intel_kpi_icon blue">
                <Award size={20} />
              </div>
              <div className="admin_rev_intel_kpi_info">
                <span>Top Specialist</span>
                <strong>{analytics.highPerformers[0]?.name || "N/A"}</strong>
              </div>
            </div>
            <div className="admin_rev_intel_kpi_card">
              <div className="admin_rev_intel_kpi_icon green">
                <BarChart3 size={20} />
              </div>
              <div className="admin_rev_intel_kpi_info">
                <span>Avg Patient Score</span>
                <strong>{analytics.insights.npsScore}% Score</strong>
              </div>
            </div>
            <div className="admin_rev_intel_kpi_card">
              <div className="admin_rev_intel_kpi_icon red">
                <ShieldAlert size={20} />
              </div>
              <div className="admin_rev_intel_kpi_info">
                <span>Critical Alerts</span>
                <strong>{analytics.lowPerformers.length} Cases</strong>
              </div>
            </div>
          </div>

          <section className="adm_rev_intel_star_filter_matrix">
            <div className="adm_rev_intel_matrix_header">
              <div className="adm_rev_intel_header_label">
                <SlidersHorizontal size={14} />
                <span>Rating Distribution </span>
              </div>
              {globalStarFilter && (
                <button
                  className="adm_rev_intel_reset_btn"
                  onClick={() => setGlobalStarFilter(null)}
                >
                  Clear Matrix
                </button>
              )}
            </div>

            <div className="adm_rev_intel_matrix_body">
              {analytics.distribution.map((item) => (
                <div
                  key={item.star}
                  className={`adm_rev_intel_matrix_row ${globalStarFilter === item.star ? "active" : ""}`}
                  onClick={() =>
                    setGlobalStarFilter(
                      globalStarFilter === item.star ? null : item.star,
                    )
                  }
                >
                  <span className="adm_rev_intel_star_label">
                    {item.star} ★
                  </span>
                  <div className="adm_rev_intel_track_bg">
                    <div
                      className="adm_rev_intel_track_fill"
                      style={{
                        width: `${item.pct}%`,
                        backgroundColor:
                          item.star >= 4
                            ? "#10b981"
                            : item.star === 3
                              ? "#facc15"
                              : "#ef4444",
                      }}
                    />
                  </div>
                  <span className="adm_rev_intel_track_count">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div className="admin_rev_intel_leaderboard_grid">
            <div className="admin_rev_intel_leaderboard_col">
              <div className="admin_rev_intel_col_header_group">
                <h3 className="admin_rev_intel_col_title">
                  <Award size={18} color="#10b981" /> High-Performance Registry
                </h3>
                <span className="admin_rev_intel_count_pill">
                  {analytics.highPerformers.length}
                </span>
              </div>
              <div className="admin_rev_intel_list">
                {analytics.highPerformers.slice(0, 6).map((doc) => (
                  <div
                    className="admin_rev_intel_row"
                    key={doc._id}
                    onClick={() => setSelectedDoctorId(doc._id)}
                  >
                    <div className="admin_rev_intel_row_main">
                      <img
                        src={
                          doc.photo
                            ? `http://localhost:5000/uploads/${doc.photo}`
                            : `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.name || "DR")}&background=e2e8f0&color=64748b`
                        }
                        alt={doc.name}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.name || "DR")}&background=e2e8f0&color=64748b`;
                        }}
                      />
                      <div className="admin_rev_intel_row_info">
                        <strong>{doc.name}</strong>
                        <span>{doc.department}</span>
                      </div>
                    </div>
                    <div className="admin_rev_intel_score positive">
                      {Number(doc.avgRating).toFixed(1)} ★
                    </div>
                  </div>
                ))}
                {analytics.highPerformers.length === 0 && (
                  <div className="admin_rev_intel_perfect_state">
                    <p>
                      No specialists currently logged within high performance
                      thresholds.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="admin_rev_intel_leaderboard_col">
              <div className="admin_rev_intel_col_header_group">
                <h3 className="admin_rev_intel_col_title">
                  <AlertCircle size={18} color="#ef4444" /> Needs Immediate
                  Oversight
                </h3>
                <span className="admin_rev_intel_count_pill red">
                  {analytics.lowPerformers.length}
                </span>
              </div>
              <div className="admin_rev_intel_list">
                {analytics.lowPerformers.length > 0 ? (
                  analytics.lowPerformers.slice(0, 6).map((doc) => (
                    <div
                      className="admin_rev_intel_row"
                      key={doc._id}
                      onClick={() => setSelectedDoctorId(doc._id)}
                    >
                      <div className="admin_rev_intel_row_main">
                        <img
                          src={
                            doc.photo
                              ? `http://localhost:5000/uploads/${doc.photo}`
                              : `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.name || "DR")}&background=e2e8f0&color=64748b`
                          }
                          alt={doc.name}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.name || "DR")}&background=e2e8f0&color=64748b`;
                          }}
                        />
                        <div className="admin_rev_intel_row_info">
                          <strong>{doc.name}</strong>
                          <span>{doc.department}</span>
                        </div>
                      </div>
                      <div className="admin_rev_intel_score negative">
                        {Number(doc.avgRating).toFixed(1)} ★
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="admin_rev_intel_perfect_state">
                    <CheckCircle2 size={32} color="#10b981" />
                    <p>
                      All specialists are currently maintaining high
                      satisfaction standards.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {globalStarFilter && (
            <div className="admin_rev_intel_drilldown_container">
              <h3 className="admin_rev_intel_drilldown_title">
                <Filter size={18} color="#0284c7" /> Isolated Focus Segment Logs
                ({globalStarFilter} Star Feedback Nodes)
              </h3>
              <div className="admin_rev_intel_drilldown_grid">
                {macroFilteredReviews.length > 0 ? (
                  macroFilteredReviews.map((rev) => (
                    <div
                      key={rev._id}
                      className="admin_rev_intel_drilldown_card"
                    >
                      <div className="admin_rev_intel_drilldown_card_top">
                        <strong>{rev.patientName || "Verified Patient"}</strong>
                        <span>To: {rev.doctorName || rev.doctor}</span>
                      </div>
                      <p>
                        "
                        {rev.comments ||
                          "No additional feedback comment written."}
                        "
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="admin_rev_intel_drilldown_empty">
                    No specific standalone records found logging this rating
                    criteria threshold.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
