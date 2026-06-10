import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import {
  FlaskConical,
  Search,
  Plus,
  Clock,
  Pill,
  Trash2,
  Edit3,
  Loader2,
  Activity,
  RefreshCw,
  Database,
  ThermometerSnowflake,
  AlertTriangle,
  Beaker,
  ShieldCheck,
  X,
  Zap,
  Layers,
  ShoppingBag,
  History,
  CalendarCheck,
  Filter,
  Save,
  User,
  Hash,
  IndianRupee,
  Fingerprint,
  LayoutGrid,
  FileText,
  Settings2,
} from "lucide-react";
import "./Pharmacy_Management.css";

export default function ResourceManagement() {
  /* ============================================================
     1. ERP STATE ENGINE ARCHITECTURE
     ============================================================ */
  const [viewMode, setViewMode] = useState("Registry");
  const [activeCategory, setActiveCategory] = useState("Diagnostics");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [lastSynced, setLastSynced] = useState(new Date().toLocaleTimeString());

  const [tests, setTests] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [testOrders, setTestOrders] = useState([]);
  const [medOrders, setMedOrders] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null); // Tracks resource targeted for updates
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    tat: "",
    stock: "",
    expiryDate: "",
    composition: "",
    storage: "Ambient",
    batchNo: "",
  });

  /* ============================================================
     2. MULTI-COLLECTION REFRESH SYSTEM
     ============================================================ */
  const syncHospitalERP = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [resTests, resMeds, resTestLogs, resMedLogs] = await Promise.all([
        axios.get("http://localhost:5000/api/tests/all", { headers }),
        axios.get("http://localhost:5000/api/medicines/all", { headers }),
        axios.get("http://localhost:5000/api/procurement/tests/history", {
          headers,
        }),
        axios.get("http://localhost:5000/api/procurement/medicines/history", {
          headers,
        }),
      ]);

      setTests(resTests.data || []);
      setMedicines(resMeds.data || []);
      setTestOrders(resTestLogs.data || []);
      setMedOrders(resMedLogs.data || []);
      setLastSynced(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Clinical ERP Sync Failure:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncHospitalERP();
    const interval = setInterval(syncHospitalERP, 300000);
    return () => clearInterval(interval);
  }, []);

  /* ============================================================
     3. INTERACTION & MUTATION CONTROLLERS
     ============================================================ */
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTriggerEdit = (item) => {
    setEditItem(item);
    setFormData({
      name: item.name || "",
      category: item.category || "",
      price: item.price || "",
      tat: item.turnaroundTime || "24 Hours",
      description: item.description || "",
      sampleRequired: item.sampleRequired || "None",
      stock: item.stock || "",
      expiryDate: item.expiryDate ? item.expiryDate.split("T")[0] : "",
      composition: item.composition || "",
      storage: item.storage || "Ambient",
      batchNo: item.batchNo || "",
    });
    setShowForm(true);
  };

  const handleRegistrySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const route = activeCategory === "Diagnostics" ? "tests" : "medicines";
      let targetedPayload = {};

      if (activeCategory === "Diagnostics") {
        targetedPayload = {
          name: formData.name.trim(),
          category: formData.category || "General",
          price: parseFloat(formData.price) || 0,
          turnaroundTime: String(formData.tat || "24 Hours"),
          description:
            formData.description || "Routine diagnostic evaluation procedure.",
          sampleRequired: formData.sampleRequired || "None",
        };
      } else {
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        const fallbackExpiryDateStr = nextYear.toISOString().split("T")[0];

        targetedPayload = {
          name: formData.name,
          composition: formData.composition || "Pharmacological Spec",
          storage: formData.storage || "Ambient",
          price: parseFloat(formData.price),
          stock: formData.stock ? parseInt(formData.stock, 10) : 0,
          expiryDate: formData.expiryDate || fallbackExpiryDateStr,
          batchNo: formData.batchNo || `BAT-${Date.now().toString().slice(-4)}`,
        };
      }

      if (editItem) {
        // Runs update pipeline if data mapping context exists
        await axios.put(
          `http://localhost:5000/api/${route}/update/${editItem._id}`,
          targetedPayload,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      } else {
        // Fallback to insertion endpoint
        await axios.post(
          `http://localhost:5000/api/${route}/add`,
          targetedPayload,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      }

      setShowForm(false);
      setEditItem(null);
      setFormData({
        name: "",
        category: "",
        price: "",
        tat: "",
        stock: "",
        expiryDate: "",
        composition: "",
        storage: "Ambient",
        batchNo: "",
      });
      syncHospitalERP();
    } catch (err) {
      alert(
        `ERP Validation Error: ${err.response?.data?.message || err.message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type, id) => {
    if (
      window.confirm(
        "Permanently decommission this resource from active catalog?",
      )
    ) {
      try {
        const token = localStorage.getItem("token");
        const route = type === "tests" ? "tests" : "medicines";
        await axios.delete(`http://localhost:5000/api/${route}/delete/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        syncHospitalERP();
      } catch (err) {
        alert(
          "Operational Failure: Item is currently linked to active orders.",
        );
      }
    }
  };

  /* ============================================================
     4. DATA PROCESSING VISUAL METRICS ENGINE
     ============================================================ */
  const processedData = useMemo(() => {
    let source = [];
    if (viewMode === "Registry") {
      source = activeCategory === "Diagnostics" ? [...tests] : [...medicines];
    } else {
      source =
        activeCategory === "Diagnostics" ? [...testOrders] : [...medOrders];
    }

    if (searchQuery) {
      source = source.filter(
        (item) =>
          (item.name || item.resourceName || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (item.orderId || item._id || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (item.orderedBy || item.category || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
      );
    }

    source.sort((a, b) => {
      const valA = a.name || a.resourceName || "";
      const valB = b.name || b.resourceName || "";
      if (sortBy === "name") return valA.localeCompare(valB);
      if (sortBy === "price")
        return (
          (a.price || a.totalAmount || 0) - (b.price || b.totalAmount || 0)
        );
      if (sortBy === "stock")
        return (a.stock || a.quantity || 0) - (b.stock || b.quantity || 0);
      return 0;
    });

    return source;
  }, [
    viewMode,
    activeCategory,
    tests,
    medicines,
    testOrders,
    medOrders,
    searchQuery,
    sortBy,
  ]);

  if (loading && tests.length === 0)
    return (
      <div className="adm_phar_m_loader_frame">
        <div className="admin_dash_load">
          <Loader2 className="adm_phar_m_spin" size={52} />
          <p>Synchronizing Pharmacy Registry...</p>
        </div>
      </div>
    );

  return (
    <div className="adm_phar_m_root_view">
      {/* ERP HEADER */}
      <header className="adm_phar_m_top_header">
        <div className="adm_phar_m_branding_zone">
          <h1>
            Clinical <span className="adm_phar_m_cyan_text">Intelligence</span>
          </h1>
          
        </div>

        <div className="adm_phar_m_header_actions">
          <div className="adm_phar_m_global_search">
            <Search size={18} />
            <input
              placeholder={`Search ${activeCategory.toLowerCase()} ${viewMode === "History" ? "logs" : "catalog"}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="adm_phar_m_view_toggle_group">
            <button
              className={viewMode === "Registry" ? "active" : ""}
              onClick={() => setViewMode("Registry")}
            >
              <LayoutGrid size={16} /> <span>Registry</span>
            </button>
            <button
              className={viewMode === "History" ? "active" : ""}
              onClick={() => setViewMode("History")}
            >
              <History size={16} /> <span>History</span>
            </button>
          </div>

          <button
            className="adm_phar_m_sync_btn_primary"
            onClick={syncHospitalERP}
            disabled={loading}
          >
            <Zap size={15} className={loading ? "adm_phar_m_spin" : ""} />{" "}
            <span>Sync Data</span>
          </button>

          {viewMode === "Registry" && (
            <button
              className="adm_phar_m_add_btn"
              onClick={() => {
                setEditItem(null);
                setFormData({
                  name: "",
                  category: "",
                  price: "",
                  tat: "",
                  stock: "",
                  expiryDate: "",
                  composition: "",
                  storage: "Ambient",
                  batchNo: "",
                });
                setShowForm(true);
              }}
            >
              <Plus size={20} /> Register Entry
            </button>
          )}
        </div>
      </header>

      {/* FILTER & CONTROL PANEL */}
      <div className="adm_phar_m_toolbar_row">
        <div className="adm_phar_m_tab_group">
          <button
            className={
              activeCategory === "Diagnostics"
                ? "adm_phar_m_tab active"
                : "adm_phar_m_tab"
            }
            onClick={() => {
              setActiveCategory("Diagnostics");
              setSearchQuery("");
            }}
          >
            <Beaker size={17} /> <span>Pathology Lab</span>
          </button>
          <button
            className={
              activeCategory === "Pharmacy"
                ? "adm_phar_m_tab active"
                : "adm_phar_m_tab"
            }
            onClick={() => {
              setActiveCategory("Pharmacy");
              setSearchQuery("");
            }}
          >
            <Pill size={17} /> <span>Pharma Depot</span>
          </button>
        </div>

        <div className="adm_phar_m_sort_wrapper">
          <div className="adm_phar_m_sort_label">
            <Filter size={14} /> Analytics Sort:
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="adm_phar_m_sort_select"
          >
            <option value="name">Alpha (A-Z)</option>
            <option value="price">Pricing Index</option>
            {viewMode === "Registry" && (
              <option value="stock">Inventory Depth</option>
            )}
          </select>
        </div>
      </div>

      {/* ERP REGISTRY ADD/EDIT MODAL */}
      {showForm && (
        <div className="adm_phar_m_modal_overlay">
          <div className="adm_phar_m_modal_card">
            <div className="adm_phar_m_modal_header">
              <div className="adm_phar_m_modal_title">
                {activeCategory === "Diagnostics" ? (
                  <FlaskConical size={20} />
                ) : (
                  <Pill size={20} />
                )}
                <h3>
                  {editItem ? "Configure System Record" : "New Medication"}:{" "}
                  {activeCategory}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditItem(null);
                }}
                className="adm_phar_m_close_modal"
              >
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={handleRegistrySubmit}
              className="adm_phar_m_form_grid"
            >
              <div className="adm_phar_m_form_field full">
                <label>
                  <Fingerprint size={12} /> Resource Name
                </label>
                <input
                  name="name"
                  value={formData.name}
                  required
                  placeholder="e.g. Lipoprotein Analysis"
                  onChange={handleInputChange}
                />
              </div>

              {activeCategory === "Diagnostics" ? (
                <>
                  <div className="adm_phar_m_form_field">
                    <label>
                      <Layers size={12} />  Category
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                    >
                      <option value="General">General Clinic</option>
                      <option value="Radiology">Radiology Imaging</option>
                      <option value="Pathology">Pathology Diagnostics</option>
                      <option value="Cardiology">Cardiology Lab</option>
                      <option value="Neurology">Neurology Unit</option>
                    </select>
                  </div>
                  <div className="adm_phar_m_form_field">
                    <label>
                      <Clock size={12} /> TAT Hours
                    </label>
                    <input
                      name="tat"
                      type="number"
                      value={formData.tat}
                      placeholder="e.g. 12"
                      onChange={handleInputChange}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="adm_phar_m_form_field">
                    <label>
                      <Zap size={12} /> Salt Composition
                    </label>
                    <input
                      name="composition"
                      value={formData.composition}
                      placeholder="e.g. Metformin 500mg"
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="adm_phar_m_form_field">
                    <label>Inventory Expiry Date</label>
                    <input
                      type="date"
                      name="expiryDate"
                      value={formData.expiryDate}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="adm_phar_m_form_field">
                    <label>
                      <ThermometerSnowflake size={12} /> Storage Type
                    </label>
                    <select
                      name="storage"
                      value={formData.storage}
                      onChange={handleInputChange}
                    >
                      <option value="Ambient">Ambient</option>
                      <option value="Cold">Cold Storage</option>
                      <option value="Frozen">Frozen</option>
                    </select>
                  </div>
                </>
              )}

              <div className="adm_phar_m_form_field">
                <label>
                  <IndianRupee size={12} /> Unit Pricing
                </label>
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  required
                  placeholder="0.00"
                  onChange={handleInputChange}
                />
              </div>
              <div className="adm_phar_m_form_field">
                <label>
                  <Database size={12} /> Opening Stock
                </label>
                <input
                  name="stock"
                  type="number"
                  value={formData.stock}
                  required
                  placeholder="Initial units"
                  onChange={handleInputChange}
                />
              </div>

              <div className="adm_phar_m_form_actions">
                <button
                  type="button"
                  className="adm_phar_m_btn_cancel"
                  onClick={() => {
                    setShowForm(false);
                    setEditItem(null);
                  }}
                >
                  Discard
                </button>
                <button type="submit" className="adm_phar_m_btn_submit">
                  <Save size={16} /> Save Registry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENDERING ENGINE SCREEN VIEWPORTS */}
      <main className="adm_phar_m_viewport">
        {viewMode === "History" ? (
          <div className="adm_phar_m_audit_terminal">
            <div className="adm_phar_m_audit_header">
              <div className="audit_summary">
                <ShoppingBag size={20} color="#007acc" />
                <div>
                  <h3>Transactional Audit</h3>
                  <p>
                    Complete history for {activeCategory}{" "}
                    requisitions.
                  </p>
                </div>
              </div>
              <div className="adm_phar_m_audit_count">
                {processedData.length} Records
              </div>
            </div>

            <div className="adm_phar_m_table_frame">
              <table className="adm_phar_m_audit_table">
                <thead>
                  <tr>
                    <th>Order Ref & Date</th>
                    <th>Authorizing Staff</th>
                    <th>Clinical Resource</th>
                    <th>Quantity</th>
                    <th>Fulfillment</th>
                    <th className="adm_phar_m_text_right">Total Billing</th>
                  </tr>
                </thead>
                <tbody>
                  {processedData.length > 0 ? (
                    processedData.map((order) => (
                      <tr key={order._id}>
                        <td
                          data-label="Order Ref & Date"
                          className="adm_phar_m_font_mono"
                        >
                          <div className="adm_phar_m_order_id">
                            <Hash size={14} />
                            <b>
                              {order.orderId ||
                                order._id.slice(-8).toUpperCase()}
                            </b>
                            <span>{order.date || "May 13, 2026"}</span>
                          </div>
                        </td>
                        <td data-label="Authorizing Staff">
                          <div className="adm_phar_m_staff_meta">
                            <div className="adm_phar_m_staff_icon">
                              <User size={14} />
                            </div>
                            <div>
                              <b>{order.orderedBy || "Med-Admin"}</b>
                              <span>ID: {order.staffId || "STF-ER-44"}</span>
                            </div>
                          </div>
                        </td>
                        <td data-label="Clinical Resource">
                          <div className="adm_phar_m_res_identity">
                            {order.isVaultOrder ? (
                              <ShieldCheck size={14} color="#10b981" />
                            ) : (
                              <ShoppingBag size={14} />
                            )}
                            <b>{order.resourceName || order.name}</b>
                            {order.isVaultOrder && (
                              <small className="vault_tag">FROM_VAULT</small>
                            )}
                          </div>
                        </td>
                        <td data-label="Quantity">
                          <b>{order.quantity || 1} SKU(s)</b>
                        </td>
                        <td data-label="Fulfillment">
                          <span
                            className={`adm_phar_m_status_pill ${order.status?.toLowerCase() || "completed"}`}
                          >
                            {order.status || "Completed"}
                          </span>
                        </td>
                        <td
                          data-label="Total Billing"
                          className="adm_phar_m_text_right"
                        >
                          <b className="adm_phar_m_valuation_text">
                            ₹{(order.totalAmount || 0).toLocaleString("en-IN")}
                          </b>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="adm_phar_m_table_empty">
                        <div className="empty_state_box">
                          <Activity size={48} />
                          <p>
                            No procurement history found for {activeCategory}.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="adm_phar_m_smart_grid">
            {processedData.length > 0 ? (
              processedData.map((item) => (
                <div
                  className={`adm_phar_m_resource_card ${activeCategory === "Pharmacy" && item.stock < 20 ? "critical_stock_alert" : ""}`}
                  key={item._id}
                >
                  <div className="adm_phar_m_card_head">
                    <div
                      className={`adm_phar_m_icon_box ${activeCategory === "Diagnostics" ? "diag_theme" : "pharm_theme"}`}
                    >
                      {activeCategory === "Diagnostics" ? (
                        <FlaskConical size={20} />
                      ) : (
                        <Pill size={20} />
                      )}
                    </div>
                    <div className="adm_phar_m_card_meta">
                      <span className="adm_phar_m_meta_tag">
                        {activeCategory === "Diagnostics"
                          ? "LAB_UNIT"
                          : "PHARMA_SKU"}
                      </span>
                      <span className="adm_phar_m_meta_id">
                        #{item._id.slice(-6).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="adm_phar_m_card_content">
                    <h3 className="adm_phar_m_item_title">{item.name}</h3>
                    <p className="adm_phar_m_item_sub">
                      {activeCategory === "Diagnostics" ? (
                        <>
                          <Layers size={12} />{" "}
                          {item.category || "General Pathology"}
                        </>
                      ) : (
                        <>
                          <FileText size={12} />{" "}
                          {item.composition || "Pharmacological Spec"}
                        </>
                      )}
                    </p>
                  </div>

                  <div className="adm_phar_m_metrics_row">
                    {activeCategory === "Diagnostics" ? (
                      <div className="adm_phar_m_diag_metrics">
                        <div className="adm_phar_m_metric_pill">
                          <Clock size={14} />
                          <span>
                            TAT Profile:{" "}
                            <strong>{item.turnaroundTime || "24 Hours"}</strong>
                          </span>
                        </div>
                        <div className="adm_phar_m_metric_pill adm_phar_m_price_pill">
                          <IndianRupee size={14} />
                          <span>{item.price?.toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="adm_phar_m_pharm_metrics">
                        <div className="adm_phar_m_metric_pill">
                          <Database size={14} />
                          <span>
                            Units: <strong>{item.stock}</strong>
                          </span>
                        </div>
                        <div
                          className={`adm_phar_m_metric_pill adm_phar_m_expiry_pill ${new Date(item.expiryDate) < new Date() ? "expired" : ""}`}
                        >
                          <CalendarCheck size={14} />
                          <span>
                            {item.expiryDate
                              ?.split("-")
                              .reverse()
                              .slice(0, 2)
                              .join("/")}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {activeCategory === "Pharmacy" && (
                    <div className="adm_phar_m_visual_pulse">
                      <div className="adm_phar_m_pulse_bg">
                        <div
                          className="adm_phar_m_pulse_fill"
                          style={{
                            width: `${Math.min((item.stock / 200) * 100, 100)}%`,
                            backgroundColor:
                              item.stock < 20 ? "#ef4444" : "#10b981",
                          }}
                        ></div>
                      </div>
                      {item.stock < 20 && (
                        <div className="adm_phar_m_critical_label">
                          <AlertTriangle size={12} />{" "}
                          <span>Low Inventory Re-order</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="adm_phar_m_card_footer_actions">
                    <button
                      className="adm_phar_m_action_edit"
                      onClick={() => handleTriggerEdit(item)}
                    >
                      <Edit3 size={14} /> <span>Configure</span>
                    </button>
                    <button
                      className="adm_phar_m_action_delete"
                      onClick={() =>
                        handleDelete(
                          activeCategory === "Diagnostics"
                            ? "tests"
                            : "medicines",
                          item._id,
                        )
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="adm_phar_m_registry_empty"></div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
