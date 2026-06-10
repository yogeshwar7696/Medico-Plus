import React, { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import {
  FileText,
  Search,
  Download,
  Eye,
  Plus,
  FileDigit,
  Loader2,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from "lucide-react";
import "./Patient_Vault.css";

export default function Patient_Vault() {
  const location = useLocation();
  const [activeCategory, setActiveCategory] = useState("All");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);

  const [searchQuery, setSearchQuery] = useState(
    location.state?.globalSearchQuery || "",
  );

  const categories = ["All", "Prescriptions", "Invoices", "Others"];
  const user = JSON.parse(localStorage.getItem("userData")) || {};

  useEffect(() => {
    if (location.state?.globalSearchQuery !== undefined) {
      setSearchQuery(location.state.globalSearchQuery);
    }
  }, [location.state?.globalSearchQuery]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const dbRes = await axios.get(
        `http://localhost:5000/api/patient/vault/${user._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setFiles(dbRes.data || []);
    } catch (err) {
      console.error("Vault access failed:", err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user._id) fetchRecords();
  }, [user._id]);

  const handleAutoOrder = async (file) => {
    if (
      !window.confirm(
        `Confirm order for ${file.name}? Stock will be reserved immediately.`,
      )
    )
      return;

    setOrderLoading(file._id);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:5000/api/procurement/auto-fulfill",
        {
          vaultId: file._id,
          resourceId: file.resourceId,
          quantity: file.quantity || 1,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      alert(
        "Order placed successfully! Visit the Pharmacy counter for pickup.",
      );
      fetchRecords();
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Order failed. Item might be out of stock.",
      );
    } finally {
      setOrderLoading(null);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("document", file);
    formData.append("patientId", user._id);

    formData.append(
      "type",
      activeCategory === "All" ||
        activeCategory === "Prescriptions" ||
        activeCategory === "Invoices"
        ? "Others"
        : activeCategory,
    );

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:5000/api/patient/vault/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      fetchRecords();
    } catch (err) {
      alert("Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this document? This action cannot be undone.",
      )
    ) {
      return;
    }

    setDeleteLoading(fileId);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/api/patient/vault/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setFiles((prevFiles) => prevFiles.filter((f) => f._id !== fileId));
    } catch (err) {
      console.error("Delete failed:", err);
      alert(err.response?.data?.message || "Failed to delete the file.");
    } finally {
      setDeleteLoading(null);
    }
  };

  const filteredFiles = useMemo(() => {
    return files
      .filter((f) => {
        const matchesSearch =
          (f.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (f.orderID || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (f._id || "").toLowerCase().includes(searchQuery.toLowerCase());

        if (activeCategory === "All") return matchesSearch;
        if (activeCategory === "Prescriptions")
          return f.type === "Prescriptions" && matchesSearch;
        if (activeCategory === "Invoices")
          return f.type === "Invoices" && matchesSearch;

        if (activeCategory === "Others") {
          return (
            f.type !== "Prescriptions" && f.type !== "Invoices" && matchesSearch
          );
        }

        return false;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [activeCategory, searchQuery, files]);

  if (loading && files.length === 0)
    return (
      <div className="pat_vau_loading">
        <Loader2 className="spinner" />
        <span>Decrypting Clinical Vault...</span>
      </div>
    );

  return (
    <div className="pat_vau_container unified_full_width_layout">
      <main className="pat_vau_main">
        <div className="pat_vau_header">
          <div className="pat_vau_title">
            <h1>
              Medical <span>Vault</span>
            </h1>
          </div>
          <div className="pat_vau_header_actions">
            <label className="pat_vau_upload_btn">
              <Plus size={18} /> Upload Document
              <input type="file" hidden onChange={handleFileUpload} />
            </label>
          </div>
        </div>

        <div className="pat_vau_controls">
          <div className="pat_vau_search_bar">
            <Search size={18} className="search_icon" />
            <input
              type="text"
              placeholder="Search by filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="pat_vau_tabs">
            {categories.map((cat) => (
              <button
                key={cat}
                className={activeCategory === cat ? "active" : ""}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="pat_vau_cards_grid">
          {filteredFiles.length > 0 ? (
            filteredFiles.map((file) => (
              <div className="pat_vau_file_card" key={file._id}>
                <div className="vau_card_upper">
                  <div
                    className={`file_icon ${file.type.replace(" ", "_").toLowerCase()}`}
                  >
                    {file.type === "Invoices" ? (
                      <FileDigit size={22} />
                    ) : (
                      <FileText size={22} />
                    )}
                  </div>

                  <span
                    className={`type_tag ${file.type.toLowerCase().replace(" ", "_")}`}
                  >
                    {file.type}
                  </span>
                </div>

                <div className="vau_card_body">
                  <h3 title={file.name}>{file.name}</h3>
                  <div className="file_meta_sub">
                    <span>{(file.size / 1024).toFixed(1)} KB</span>
                    <span className="meta_divider">•</span>
                    <span>
                      {new Date(file.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {file.isSystemGenerated && (
                    <span className="sys_badge">System Generated</span>
                  )}
                </div>

                <div className="vau_card_actions">
                  <div className="vau_actions_left">
                    {file.type === "Prescriptions" && file.resourceId && (
                      <div className="fulfillment_zone">
                        {file.isOrdered ? (
                          <span className="status_ordered">
                            <CheckCircle2 size={13} /> Fulfilled
                          </span>
                        ) : (
                          <button
                            className="vau_direct_order_btn"
                            onClick={() => handleAutoOrder(file)}
                            disabled={orderLoading === file._id}
                          >
                            {orderLoading === file._id ? (
                              <Loader2 size={13} className="spinner" />
                            ) : (
                              <ShoppingCart size={13} />
                            )}
                            Order
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="vau_actions_right">
                    <button
                      className="vau_icon_btn"
                      title="View Document"
                      onClick={() => {
                        if (file.isSystemGenerated) {
                          alert(
                            "System invoices can be acquired natively via your device downloads menu.",
                          );
                          return;
                        }
                        window.open(
                          `http://localhost:5000/uploads/${file.filename}`,
                          `_blank`,
                        );
                      }}
                    >
                      <Eye size={16} />
                    </button>

                    {file.isSystemGenerated ? (
                      <a
                        className="vau_icon_btn"
                        title="Download Invoice File"
                        href={file.fileUrl || "#"}
                        download={file.name}
                      >
                        <Download size={16} />
                      </a>
                    ) : (
                      <a
                        className="vau_icon_btn"
                        title="Download Local Asset Copy"
                        href={`http://localhost:5000/uploads/vault/${file.filename}`}
                        download={file.name}
                        target="_blank"
                        Ramos="noopener noreferrer"
                      >
                        <Download size={16} />
                      </a>
                    )}

                    <button
                      className="vau_icon_btn"
                      title="Delete Document"
                      onClick={() => handleDelete(file._id)}
                      disabled={deleteLoading === file._id}
                    >
                      {deleteLoading === file._id ? (
                        <Loader2 size={16} className="spinner" />
                      ) : (
                        <Trash2 size={16} color="red" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="pat_vau_empty">
              <AlertCircle size={40} />
              <p>No health records found in this category.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
