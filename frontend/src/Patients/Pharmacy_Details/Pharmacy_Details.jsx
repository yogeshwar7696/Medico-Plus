import React, { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import {
  ShoppingBag,
  Pill,
  FlaskConical,
  Search,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Loader2,
  Clock,
  CheckCircle2,
  Filter,
  Calendar,
  FileText,
  Download,
  X,
  ChevronRight,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./Pharmacy_Details.css";

export default function Pharmacy_Details() {
  const location = useLocation();
  const [medicines, setMedicines] = useState([]);
  const [tests, setTests] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);

  const [historyFilter, setHistoryFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [medLimit, setMedLimit] = useState(4);
  const [testLimit, setTestLimit] = useState(4);

  const [searchTerm, setSearchTerm] = useState(
    location.state?.globalSearchQuery || "",
  );

  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem("userData")) || {};

  const [cartItems, setCartItems] = useState(() => {
    const savedCart = localStorage.getItem("pharma_cart");
    return savedCart ? JSON.parse(savedCart) : [];
  });

  


  useEffect(() => {
    if (location.state?.globalSearchQuery !== undefined) {
      setSearchTerm(location.state.globalSearchQuery);
    }
  }, [location.state?.globalSearchQuery]);

  useEffect(() => {
    localStorage.setItem("pharma_cart", JSON.stringify(cartItems));
  }, [cartItems]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [medRes, testRes, historyRes] = await Promise.all([
        axios.get("http://localhost:5000/api/medicines/all", { headers }),
        axios.get("http://localhost:5000/api/tests/all", { headers }),
        axios
          .get(`http://localhost:5000/api/orders/patient/${user._id}`, {
            headers,
          })
          .catch(() => ({ data: [] })),
      ]);

      setMedicines(medRes.data || []);
      setTests(testRes.data || []);
      setOrderHistory(historyRes.data || []);
    } catch (err) {
      console.error("Clinical System Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const availableMonths = useMemo(() => {
    const months = orderHistory.map((order) => {
      const date = new Date(order.createdAt);
      return date.toLocaleString("default", { month: "long", year: "numeric" });
    });
    return ["All", ...new Set(months)];
  }, [orderHistory]);

  const filteredHistory = useMemo(() => {
    return orderHistory.filter((order) => {
      const statusMatch =
        historyFilter === "All" || order.status === historyFilter;
      const orderMonth = new Date(order.createdAt).toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
      const monthMatch = monthFilter === "All" || orderMonth === monthFilter;
      return statusMatch && monthMatch;
    });
  }, [orderHistory, historyFilter, monthFilter]);

  const totalAmount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  );

  const handleDownloadInvoice = (order) => {
    const token = localStorage.getItem("token");
    const doc = new jsPDF();
    const dateStr = new Date(order.createdAt).toLocaleDateString();

    doc.setFillColor(0, 122, 204);
    doc.rect(0, 0, 210, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("MEDICOPlus", 20, 24);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Pharmacy Invoice & Laboratory Diagnostics Receipt", 20, 32);

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("PATIENT ACCOUNT STATEMENT", 20, 52);

    doc.setDrawColor(226, 232, 240);
    doc.line(20, 55, 190, 55);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Transaction ID: #${order.orderID}`, 20, 65);
    doc.text(`Billing Date:   ${dateStr}`, 20, 72);
    doc.text(`Patient Name:   ${user.name || "Verified Account"}`, 20, 79);

    const tableRows = order.items.map((item) => [
      item.name,
      item.type,
      item.quantity,
      `₹${item.price}`,
      `₹${item.price * item.quantity}`,
    ]);

    autoTable(doc, {
      startY: 90,
      margin: { left: 20, right: 20 },
      head: [
        ["Item Description", "Category", "Quantity", "Unit Rate", "Amount"],
      ],
      body: tableRows,
      theme: "striped",
      headStyles: { fillColor: [0, 122, 204], fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 4, verticalAlign: "middle" },
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    doc.text(`Subtotal: ₹${order.totalAmount - 50}.00`, 130, finalY);
    doc.text(`Logistics: ₹50.00`, 130, finalY + 7);
    doc.setFont("helvetica", "bold");
    doc.text(`GRAND TOTAL: ₹${order.totalAmount+50}.00`, 130, finalY + 15);

    const fileName = `Invoice_${order.orderID}.pdf`;
    doc.save(fileName);

    const pdfBlob = doc.output("blob");
    const formData = new FormData();
    formData.append("document", pdfBlob, fileName);
    formData.append("patientId", user._id || user.id);
    formData.append("type", "Invoices");

    axios
      .post("http://localhost:5000/api/patient/vault/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      })
      .then(() => {
        alert(
          "Success! Invoice downloaded and securely archived in your digital Patient Vault.",
        );
      })
      .catch((vaultErr) => {
        console.error("Vault archive sync error:", vaultErr);
        alert(
          "Invoice downloaded locally, but failed to sync to your Patient Vault cloud.",
        );
      });
  };

  const handleAddToCart = (item, category) => {
    if (category === "Medicine" && item.stock <= 0) return;
    setCartItems((prev) => {
      const existing = prev.find(
        (i) => i._id === item._id && i.type === category,
      );
      if (existing) {
        if (category === "Medicine" && existing.quantity >= item.stock)
          return prev;
        return prev.map((i) =>
          i._id === item._id && i.type === category
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        );
      }
      return [...prev, { ...item, quantity: 1, type: category }];
    });
  };

  const updateQuantity = (id, type, delta) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item._id === id && item.type === type) {
          const newQty = item.quantity + delta;
          const masterItem = medicines.find((m) => m._id === id);
          if (
            type === "Medicine" &&
            delta > 0 &&
            newQty > (masterItem?.stock || 0)
          )
            return item;
          return { ...item, quantity: Math.max(1, newQty) };
        }
        return item;
      }),
    );
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const token = localStorage.getItem("token");
      const orderPayload = {
        patientId: user._id,
        patientName: user.name,
        items: cartItems.map((i) => ({
          itemId: i._id,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          type: i.type,
        })),
        totalAmount: totalAmount + 50,
        status: "Pending",
      };

      const res = await axios.post(
        "http://localhost:5000/api/orders/create",
        orderPayload,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.status === 201) {
        setCartItems([]);
        fetchData();
        alert(`Order Placed: #${res.data.orderID}`);
      }
    } catch (err) {
      alert("Checkout failed. Check stock levels.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="pat_pharma_loading">
        <Loader2 className="spinner" />
        <span>Synchronizing Clinical Registries...</span>
      </div>
    );
  }

  return (
    <div className="pat_pharma_container">
      <main className="pat_pharma_main">
        <div className="pat_pharma_header">
          <h1>
            Medical <span>Supplies</span>
          </h1>
          <div className="pat_pharma_search">
            <Search size={18} className="search_icon" />
            <input
              type="text"
              placeholder="Search medicines or tests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <section className="pat_pharma_section">
          <div className="pat_pharma_sec_head">
            <div className="flex_align">
              <Pill size={20} /> <h2>Medicines Catalog</h2>
            </div>
            <button
              className="pat_pharma_text_btn"
              onClick={() => setMedLimit(medLimit === 4 ? 12 : 4)}
            >
              {medLimit === 4 ? "Expand Grid" : "Collapse Grid"}
            </button>
          </div>
          <div className="pat_pharma_grid">
            {medicines
              .filter((m) => {
                const medName = m.name || "";
                const medComp = m.composition || "";
                const medCat = m.category || "";
                return (
                  medName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  medComp.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  medCat.toLowerCase().includes(searchTerm.toLowerCase())
                );
              })
              .slice(0, medLimit)
              .map((med) => (
                <div
                  className={`pat_pharma_card ${med.stock <= 0 ? "out_of_stock" : ""}`}
                  key={med._id}
                >
                  <div className="pat_pharma_tag">{med.category}</div>
                  <div className="pat_pharma_body">
                    <h3>{med.name}</h3>
                    <p>{med.composition}</p>
                    <span className="stock_indicator">
                      Available Stock: {med.stock}
                    </span>
                  </div>
                  <div className="pat_pharma_footer">
                    <strong>₹{med.price}</strong>
                    <button
                      disabled={med.stock <= 0}
                      onClick={() => handleAddToCart(med, "Medicine")}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </section>

        <section className="pat_pharma_section">
          <div className="pat_pharma_sec_head">
            <div className="flex_align">
              <FlaskConical size={20} /> <h2>Lab Diagnostics</h2>
            </div>
            <button
              className="pat_pharma_text_btn"
              onClick={() => setTestLimit(testLimit === 4 ? 12 : 4)}
            >
              {testLimit === 4 ? "Expand Grid" : "Collapse Grid"}
            </button>
          </div>
          <div className="pat_pharma_grid">
            {tests
              .filter((t) => {
                const testName = t.name || "";
                const testCat = t.category || "";
                return (
                  testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  testCat.toLowerCase().includes(searchTerm.toLowerCase())
                );
              })
              .slice(0, testLimit)
              .map((test) => (
                <div className="pat_pharma_card test_card" key={test._id}>
                  <div className="pat_pharma_tag">{test.category}</div>
                  <div className="pat_pharma_body">
                    <h3>{test.name}</h3>
                    <div className="test_meta">
                      <Clock size={12} />{" "}
                      <span>TAT: {test.turnaroundTime}</span>
                    </div>
                  </div>
                  <div className="pat_pharma_footer">
                    <strong>₹{test.price}</strong>
                    <button
                      onClick={() => handleAddToCart(test, "Test")}
                      className="book_btn"
                    >
                      Book Test
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </section>
      </main>

      <aside className="pat_pharma_sidebar">
        <div className="sidebar_grid_wrapper">
          <div className="sidebar_section_cart clinical_ledger_cart">
            <div className="ledger_cart_title">
              <ShoppingBag size={18} />
              <h3>Your Medical Cart</h3>
            </div>

            <div className="cart_ledger_list premium_scroll">
              {cartItems.map((item) => (
                <div
                  className="ledger_cart_row animate_slide_down"
                  key={item._id}
                >
                  <div className="ledger_item_info_block">
                    <span className="ledger_product_name">{item.name}</span>
                    <span className="ledger_product_subtotal">
                      ₹{item.price * item.quantity}
                    </span>
                  </div>

                  <div className="ledger_item_controls_block">
                    <div className="ledger_counter_stepper">
                      <button
                        onClick={() => updateQuantity(item._id, item.type, -1)}
                        className="ledger_counter_btn"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="ledger_counter_number">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item._id, item.type, 1)}
                        className="ledger_counter_btn"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                    <button
                      className="ledger_delete_btn"
                      onClick={() =>
                        setCartItems((prev) =>
                          prev.filter((i) => i._id !== item._id),
                        )
                      }
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}

              {cartItems.length === 0 && (
                <div className="ledger_blank_state">
                  <p>Prescription Bag Empty</p>
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="ledger_summary_footer">
                <div className="ledger_total_summary_line">
                  

                  <span>Grand Total</span>
                  <strong>₹{totalAmount + 50}</strong>
                </div>
                <button
                  className="ledger_checkout_action_btn"
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? (
                    <Loader2 className="spin" size={16} />
                  ) : (
                    <CreditCard size={16} />
                  )}{" "}
                  Place Order
                </button>
              </div>
            )}
          </div>

          <div className="sidebar_section_history">
            <div className="sidebar_label">
              <Clock size={18} /> <h3>Order History</h3>
            </div>
            <div className="history_filter_strip">
              <div className="mini_filter">
                <Filter size={12} />
                <select
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value)}
                >
                  <option value="All">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>{" "}
                </select>
              </div>
              <div className="mini_filter">
                <Calendar size={12} />
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                >
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {m === "All" ? "All Months" : m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="history_list_unified premium_scroll">
              {filteredHistory.map((order) => (
                <div
                  className="history_card_compact"
                  key={order._id}
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="h_card_top">
                    <span className="h_id">#{order.orderID}</span>
                    <span className={`h_status ${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="h_card_bottom">
                    <span>
                      {new Date(order.createdAt).toLocaleDateString("en-GB")}
                    </span>
                    <strong>₹{order.totalAmount}</strong>
                    <ChevronRight size={14} className="history_arrow" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {selectedOrder && (
        <div
          className="order_details_overlay"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="order_details_panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="details_header">
              <div className="header_title_set">
                <FileText size={24} />
                <div>
                  <h2>Clinical Order Details</h2>
                  <p>Order Reference: #{selectedOrder.orderID}</p>
                </div>
              </div>
              <button
                className="close_panel"
                onClick={() => setSelectedOrder(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="details_body">
              <div className="status_badge_row">
                <span
                  className={`full_status ${selectedOrder.status.toLowerCase()}`}
                >
                  {selectedOrder.status === "Delivered" ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <Clock size={16} />
                  )}{" "}
                  {selectedOrder.status} Status
                </span>
              </div>

              <div className="items_ledger">
                <label>Order Breakdown</label>
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="ledger_row">
                    <div className="l_info">
                      <strong>{item.name}</strong>
                      <span>
                        {item.quantity} x {item.type}
                      </span>
                    </div>
                    <strong>₹{item.price * item.quantity}</strong>
                  </div>
                ))}
              </div>

              <div className="billing_summary_box">
                <div className="b_row">
                  
                  
                </div>
                <div className="b_row">
                  <span>Logistic & Handling Charges</span>
                  <span>₹50</span>
                </div>
                <div className="b_row b_total">
                  <span>Grand Total</span>
                  <span>₹{selectedOrder.totalAmount+50}</span>
                </div>
              </div>
            </div>

            <div className="details_footer">
              <button
                className="download_invoice_action"
                onClick={() => handleDownloadInvoice(selectedOrder)}
              >
                <Download size={18} /> Download Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
