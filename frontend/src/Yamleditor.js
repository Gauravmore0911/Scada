import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { Link } from "react-router-dom";
import logo from "./assets/logo.png";

const API_URL =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:12000/api"
    : "/api");

const YamlEditor = () => {
  const [machines, setMachines] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchYaml();
  }, []);

  const fetchYaml = async () => {
    try {
      const res = await axios.get(`${API_URL}/machines`);
      setMachines(res.data.data.machines || []);
    } catch (err) {
      console.error("Failed to fetch YAML:", err);
    }
  };

  const handleChange = (index, key, value) => {
    const updated = [...machines];
    updated[index][key] = value;
    setMachines(updated);
  };

  const handleAddMachine = () => {
    setMachines((prev) => [
      ...prev,
      {
        name: "",
        ip: "",
        gateway: "",
        kiosk_pc: "",
        uplink: "",
        source_switch: "",
        column: "",
        bay: "",
        section: "",
      },
    ]);
  };

  const handleRemoveMachine = (index) => {
    setMachines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      await axios.post(`${API_URL}/machines`, { machines });
      alert("✅ YAML saved successfully!");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to save YAML");
    }
  };

  // --- FILTER MACHINES ---
  const filteredMachines = useMemo(() => {
    if (!searchTerm.trim()) return machines;
    const term = searchTerm.toLowerCase();
    return machines.filter(
      (m) =>
        m.name?.toLowerCase().includes(term) ||
        m.ip?.toLowerCase().includes(term)
    );
  }, [machines, searchTerm]);

  return (
    <div className="container my-4">
      {/* HEADER */}
      <div className="d-flex align-items-center justify-content-center position-relative mb-4">
        <Link
          to="/"
          className="position-absolute start-0"
          style={{ left: "20px" }}
        >
          <img
            src={logo}
            alt="Logo"
            style={{
              width: "140px",
              height: "70px",
              cursor: "pointer",
            }}
          />
        </Link>
        <h2 className="text-primary m-0 text-center">Machine YAML Editor</h2>
      </div>

      {/* ACTION BAR */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <button className="btn btn-success" onClick={handleAddMachine}>
          ➕ Add New Machine
        </button>

        {/* 🔍 Search Bar */}
        <div className="input-group" style={{ width: "280px" }}>
          <span className="input-group-text bg-primary text-white">🔍</span>
          <input
            type="text"
            className="form-control"
            placeholder="Search by name or IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* TABLE GRID */}
      <div className="table-responsive shadow-sm">
        <table className="table table-bordered table-striped align-middle compact-table">
          <thead className="table-primary text-center">
            <tr>
              <th>#</th>
              <th>Machine Name</th>
              <th>Machine IP</th>
              <th>Gateway</th>
              <th>Kiosk</th>
              <th>Uplink</th>
              <th>Switch</th>
              <th>Column</th>
              <th>Bay</th>
              <th>Section</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMachines.length === 0 ? (
              <tr>
                <td colSpan="11" className="text-center text-muted">
                  No matching machines found.
                </td>
              </tr>
            ) : (
              filteredMachines.map((m, i) => (
                <tr key={i}>
                  <td className="text-center fw-bold">{i + 1}</td>
                  <td>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={m.name}
                      onChange={(e) => handleChange(i, "name", e.target.value)}
                      placeholder="Machine Name"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={m.ip || ""}
                      onChange={(e) => handleChange(i, "ip", e.target.value)}
                      placeholder="IP"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={m.gateway || ""}
                      onChange={(e) =>
                        handleChange(i, "gateway", e.target.value)
                      }
                      placeholder="Gateway"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={m.kiosk_pc || ""}
                      onChange={(e) =>
                        handleChange(i, "kiosk_pc", e.target.value)
                      }
                      placeholder="Kiosk"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={m.uplink || ""}
                      onChange={(e) =>
                        handleChange(i, "uplink", e.target.value)
                      }
                      placeholder="Uplink"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={m.source_switch || ""}
                      onChange={(e) =>
                        handleChange(i, "source_switch", e.target.value)
                      }
                      placeholder="Switch"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={m.column || ""}
                      onChange={(e) =>
                        handleChange(i, "column", e.target.value)
                      }
                      placeholder="Column"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={m.bay || ""}
                      onChange={(e) => handleChange(i, "bay", e.target.value)}
                      placeholder="Bay"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={m.section || ""}
                      onChange={(e) =>
                        handleChange(i, "section", e.target.value)
                      }
                      placeholder="Section"
                    />
                  </td>
                  <td className="text-center">
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleRemoveMachine(i)}
                    >
                      ✖
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* SAVE BUTTON */}
      <div className="text-end mt-3">
        <button className="btn btn-primary" onClick={handleSave}>
          💾 Save YAML
        </button>
      </div>

      {/* Compact table CSS */}
      <style>{`
        .compact-table td, .compact-table th {
          padding: 4px 6px !important;
          vertical-align: middle !important;
          white-space: nowrap;
        }
        .compact-table input {
          font-size: 13px;
        }
      `}</style>
    </div>
  );
};

export default YamlEditor;
