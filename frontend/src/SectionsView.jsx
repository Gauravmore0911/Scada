// SectionsView.jsx (Final Grid Layout with Active Status in Modal)
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { socket, SOCKET_URL } from "./socket.jsx";
import "bootstrap/dist/css/bootstrap.min.css";

// --- CSS Keyframes for Blinking/Pulsing Effect ---
const BLINK_KEYFRAMES = `
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }`;

// --- StatusDot Component (Still needed for the grid view) ---
const StatusDot = ({ color }) => {
  const bg = color === "green" ? "#28a745" : color === "orange" ? "#fd7e14" : "#dc3545";
  const isBlinking = color === 'green' || color === 'red' || color === 'orange';

  const blinkStyle = isBlinking
    ? {
        animation: "blink 1s step-start infinite",
      }
    : {};

  return (
    <>
      <style>{BLINK_KEYFRAMES}</style>
      <span
        style={{
          display: "inline-block",
          height: 12, 
          width: 12,
          borderRadius: "50%",
          marginLeft: 6,
          border: "1px solid #333",
          verticalAlign: "middle",
          backgroundColor: bg,
          boxShadow: '0 0 4px rgba(0,0,0,0.2)',
          ...blinkStyle,
        }}
      />
    </>
  );
};

// --- Switch Info Parser (Unchanged) ---
const parseSwitchInfo = (source_switch) => {
  if (!source_switch) return null;
  const match = source_switch.match(/^([A-Z])(\d+)-(\d+)$/i);
  if (!match) return null;
  return {
    bay: match[1].toUpperCase(),
    column: Number(match[2]),
    ports: Number(match[3]),
  };
};

// --- Machine Card Styles (Unchanged) ---
const machineCardStyle = {
  cursor: "pointer",
  fontSize: "12px",
  transition: "transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out",
};
const machineCardHoverStyle = {
  transform: "translateY(-1px)",
  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  backgroundColor: "#fefefe",
};


// --- Main Component ---
export default function SectionsView() {
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [hoveredMachineName, setHoveredMachineName] = useState(null);
  const [arrows, setArrows] = useState([]);
  const [searchParams] = useSearchParams();
  const { section: sectionParam } = useParams();
  const navigate = useNavigate();

  const machineRefs = useRef({});
  const switchRefs = useRef({});
  const sectionRefs = useRef({});

  const MAX_COLUMNS = 50;

  useEffect(() => {
    const API_BASE = SOCKET_URL === "/" ? "" : SOCKET_URL;
    fetch(`${API_BASE}/api/machines`)
      .then((r) => r.json())
      .then((j) => {
        if (j?.data?.machines) setMachines(j.data.machines);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleNetwork = (data) => setMachines(data.machines);
    socket.on("network-status", handleNetwork);
    return () => socket.off("network-status", handleNetwork);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setSelectedMachine(null);
    };
    if (selectedMachine) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedMachine]);


  /** 1. Generate Switches Automatically from source_switch (Unchanged) */
  const switches = useMemo(() => {
    const map = {};
    const sections = new Set();

    machines.forEach((m) => {
      if (m.section) sections.add(m.section);

      const sw = parseSwitchInfo(m.source_switch);
      if (!sw) return;

      if (!map[m.source_switch]) {
        map[m.source_switch] = {
          id: m.source_switch,
          bay: sw.bay,
          column: sw.column,
          ports: sw.ports,
          connected: [],
          section: m.section
        };
      }
      map[m.source_switch].connected.push(m);
    });

    sections.forEach(sectionName => {
      const mainSwitchId = `${sectionName}_MAIN`;
      map[mainSwitchId] = {
        id: "MAIN SWITCH",
        bay: "A",
        column: 1,
        ports: 'N/A',
        section: sectionName,
        connected: [],
      };
    });

    return map;
  }, [machines]);

  useEffect(() => {
    const newArrows = [];
    Object.keys(sectionRefs.current).forEach(section => {
      const sectionEl = sectionRefs.current[section];
      if (!sectionEl) return;
      const sectionRect = sectionEl.getBoundingClientRect();
      const mainSwitchId = `${section}_MAIN`;
      const mainSwitchEl = switchRefs.current[mainSwitchId];
      if (!mainSwitchEl) return;
      const mainRect = mainSwitchEl.getBoundingClientRect();
      Object.values(switches).forEach(sw => {
        if (sw.section === section && sw.id !== "MAIN SWITCH") {
          const switchEl = switchRefs.current[sw.id];
          if (switchEl) {
            const switchRect = switchEl.getBoundingClientRect();
            newArrows.push({
              from: { x: switchRect.left + switchRect.width / 2 - sectionRect.left, y: switchRect.top + switchRect.height / 2 - sectionRect.top },
              to: { x: mainRect.left + mainRect.width / 2 - sectionRect.left, y: mainRect.top + mainRect.height / 2 - sectionRect.top },
              color: 'red'
            });
          }
        }
      });
      machines.forEach(m => {
        if (m.section === section) {
          const machineEl = machineRefs.current[m.name];
          const switchEl = switchRefs.current[m.source_switch];
          if (machineEl && switchEl) {
            const machineRect = machineEl.getBoundingClientRect();
            const switchRect = switchEl.getBoundingClientRect();
            newArrows.push({
              from: { x: machineRect.left + machineRect.width / 2 - sectionRect.left, y: machineRect.top + machineRect.height / 2 - sectionRect.top },
              to: { x: switchRect.left + switchRect.width / 2 - sectionRect.left, y: switchRect.top + switchRect.height / 2 - sectionRect.top },
              color: 'blue'
            });
          }
        }
      });
    });
    setArrows(newArrows);
  }, [machines, switches]);


  /** 2. Organize into GRID (Unchanged) */
  /** 2. Organize into GRID (STRICT LOCATION PRIORITY LOGIC) */
    const grid = useMemo(() => {
        const layout = {};
        // Switch locations are still needed to render the switches themselves
        const switchLocations = Object.values(switches).reduce((acc, sw) => {
          acc[sw.id] = { bay: sw.bay, column: sw.column, section: sw.section };
          return acc;
        }, {});
    
        machines.forEach((m) => {
          const section = m.section || "Unknown";
          let bay;
          let col;
    
          // --- CORE LOCATION LOGIC: New fields override old fields ---
          
          // PRIORITY 1: Check for the new explicit location fields
          if (m.machine_row && m.machine_column) {
              bay = m.machine_row;
              col = Number(m.machine_column);
          } 
          // PRIORITY 2: FALLBACK to the machine's existing location fields (as is)
          else {
              // Use m.bay and m.column. If they are also missing, default to "0" and 0.
              bay = m.bay || "0";
              col = Number(m.column || 0);
          }
          // -----------------------------------------------------------
    
          if (!layout[section]) layout[section] = {};
          if (!layout[section][bay]) layout[section][bay] = {};
          if (!layout[section][bay][col]) layout[section][bay][col] = [];
    
          layout[section][bay][col].push(m);
        });
        
        Object.keys(layout).forEach(section => {
            // Ensure Main Switch position (A1) is available
   if (!layout[section]['A']) layout[section]['A'] = {};
              if (!layout[section]['A'][1]) layout[section]['A'][1] = [];
          });
    
         return layout;
      }, [machines, switches]);


  // --- Helper Functions ---
  const getOverallColor = (m) =>
    m.results?.ip?.color || m.results?.gateway?.color || m.results?.kiosk_pc?.color || "red";

  const selectedSection = sectionParam || searchParams.get("section") || "";
  const setSection = (section) => {
    navigate(section ? `/sections/${encodeURIComponent(section)}` : `/sections`);
  };

  // --- Modal Renderer (***ADDED ACTIVE STATUS***) ---
  const renderDetailsModal = () => {
    if (!selectedMachine) return null;
    const m = selectedMachine;
    
    // Determine overall status
    const overallColor = getOverallColor(m);
    const isActive = overallColor === 'green';

    const dataList = [
      { label: 'IP Address', value: m.ip || m.results?.ip?.ip || "-" },
      { label: 'Gateway', value: m.gateway || m.results?.gateway?.ip || "-" },
      { label: 'Kiosk PC', value: m.kiosk_pc || m.results?.kiosk_pc?.ip || "-" },
      { label: 'Section', value: m.section || "-" },
      { label: 'Bay', value: m.bay || "-" },
      { label: 'Column', value: m.column || "-" },
      { label: 'Uplink ID', value: m.uplink || "-" },
      { label: 'Source Switch', value: m.source_switch || "-" },
    ];
  
    return (
      <div className="modal fade show" style={{ display: "block", backgroundColor: 'rgba(0,0,0,0.4)' }} tabIndex="-1" role="dialog">
        <div className="modal-dialog modal-lg modal-dialog-centered" role="document" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content shadow-lg" style={{ borderRadius: 8 }}>
            
            {/* Header: Bright Blue background */}
            <div className="modal-header bg-primary text-white p-3" style={{ borderBottom: 'none' }}>
              <h5 className="modal-title fw-bold" style={{ fontSize: '1.4rem' }}>{m.name} Details</h5>
              <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedMachine(null)}></button>
            </div>
            
            <div className="modal-body p-0"> 
              
              {/* === Machine Active Status Indicator === */}
              <div className="p-3 border-bottom" style={{ 
                    backgroundColor: isActive ? '#d4edda' : '#f8d7da', // Green or Red background for high visibility
                    color: isActive ? '#155724' : '#721c24' // Matching text color
                }}>
                <h5 className="fw-bolder mb-0 d-flex align-items-center">
                    <i className={`bi me-2 ${isActive ? 'bi-check-circle-fill' : 'bi-x-octagon-fill'}`} style={{ fontSize: '1.5rem' }}></i>
                    Status: {isActive ? 'ACTIVE (Online)' : 'INACTIVE (Offline)'}
                </h5>
              </div>
              
              {/* Primary Network Info Section - Light Blue/Gray Background */}
              <div className="p-4" style={{ backgroundColor: '#f0f8ff' }}> 
                <h6 className="text-secondary fw-semibold mb-3" style={{ fontSize: '1rem' }}>Primary Network Info</h6>
                <div className="row g-4"> 
                  {dataList.slice(0, 3).map((item, index) => (
                    <div className="col-4" key={index}> 
                      <strong className="d-block text-muted small mb-1">{item.label}</strong>
                      <span className="fw-semibold text-dark" style={{ fontSize: '1.1rem' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Physical Location Section - White Background */}
              <div className="p-4">
                <h6 className="text-secondary fw-semibold mb-3" style={{ fontSize: '1rem' }}>Physical Location & Uplink</h6>
                <div className="row g-4">
                  {dataList.slice(3).map((item, index) => (
                    <div className="col-4" key={index}> 
                        <strong className="d-block text-muted small mb-1">{item.label}</strong>
                        <span className="fw-semibold text-dark" style={{ fontSize: '1.1rem' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="modal-footer d-flex justify-content-end p-3" style={{ borderTop: '1px solid #dee2e6' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedMachine(null)}>Close</button>
            </div>
          </div>
        </div>
        <div className="modal-backdrop fade show" onClick={() => setSelectedMachine(null)}></div>
      </div>
    );
  };

  // --- Render Method (Unchanged) ---
  return (
    <div className="container-fluid mt-4">
      {/* Header and Controls */}
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
        <h3 className="text-primary fw-light">
          <i className="bi bi-diagram-3 me-2"></i>SCADA View
        </h3>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-primary" 
            onClick={() => navigate("/")}
            title="Switch to list view"
          >
            <i className="bi bi-table me-1"></i>Table View
          </button>
          <button className="btn btn-warning" onClick={() => navigate("/yaml-editor")}>
            <i className="bi bi-code-slash me-1"></i>Edit YAML
          </button>
        </div>
      </div>

      {/* Section Loop - Renders one table per section */}
      {Object.entries(grid).map(([section, bays]) =>
        (!selectedSection || section === selectedSection) && (
        <div key={section} ref={el => sectionRefs.current[section] = el} className="mb-5 p-5 rounded-3 shadow-sm bg-light">
          <h4 className="fw-bolder text-dark mb-5 border-bottom pb-2">
            <i className="bi bi-building me-2 text-primary"></i>SECTION: {section}
          </h4>

          <div style={{ overflowX: "auto" }}>
            <table
              className="table table-bordered text-center align-middle"
              style={{ minWidth: `${MAX_COLUMNS * 100}px`, borderSpacing: "0", borderCollapse: "separate" }}
            >
              <thead>
                <tr className="bg-white">
                  <th style={{ width: "50px" }} className="fw-bold">Bay</th>
                  {/* Column Headers (1 to MAX_COLUMNS) */}
                  {Array.from({ length: MAX_COLUMNS }, (_, i) => (
                    <th key={i} style={{ width: "30px", fontSize: "10px", padding: "4px" }} className="text-muted fw-normal">
                      C{i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Bay Loop (Table Rows) - CUSTOM SORTING: Letters (A-Z) first, then numbers/others */}
                {Object.entries(bays)
                    .sort(([bayA], [bayB]) => {
                        const isLetterA = /^[A-Z]$/i.test(bayA);
                        const isLetterB = /^[A-Z]$/i.test(bayB);

                        if (isLetterA && !isLetterB) {
                            return -1; 
                        }
                        if (!isLetterA && isLetterB) {
                            return 1;  
                        }
                        
                        return bayA.localeCompare(bayB, undefined, { numeric: true }); 
                    })
                    .map(([bay, columns]) => (
                  <tr key={bay}>
                    <td className="fw-bold bg-secondary text-white">{bay}</td>

                    {/* Column Loop (Table Cells) */}
                    {Array.from({ length: MAX_COLUMNS }, (_, colIndex) => {
                      const col = colIndex + 1;
                      let items = columns[col] || [];

                      // --- Switch Lookup ---
                      const regularSwitchHere = Object.values(switches).find(
                        (sw) => sw.bay === bay && sw.column === col && sw.section === section && sw.id !== "MAIN SWITCH"
                      );
                        
                      const mainSwitchHere = 
                        bay === "A" && col === 1 && 
                        Object.values(switches).find(sw => sw.section === section && sw.id === "MAIN SWITCH");
                        
                      const switchHere = regularSwitchHere || mainSwitchHere; 
                      // --- End Switch Lookup ---

                      return (
                        <td
                          key={col}
                          style={{
                            padding: 4,
                            minWidth: 100,
                            verticalAlign: "top",
                            backgroundColor: (items.length > 0 || switchHere) ? '#f8f9fa' : 'transparent',
                          }}
                        >
                          {/* ✅ Show Switch */}
                          {switchHere && (
                            <div
                              ref={el => switchRefs.current[switchHere.id] = el}
                              className={
                                switchHere.id === "MAIN SWITCH"
                                  ? "p-1 bg-danger text-white rounded border mb-2 fw-bolder shadow-lg"
                                  : "p-1 bg-info text-dark rounded border border-dark mb-2 fw-bold shadow-sm"
                              }
                              style={{ fontSize: "11px" }}
                            >
                              {switchHere.id === "MAIN SWITCH" ? (
                                <>
                                  <i className="bi bi-gear-fill me-1"></i>
                                  MAIN SWITCH
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-diagram-3 me-1"></i>SW: {switchHere.id} <br />
                                  <span className="fw-normal">Ports: {switchHere.ports}</span>
                                </>
                              )}
                            </div>
                          )}

                          {/* ✅ Show Machines */}
                          {items.length > 0 &&
                            items.map((m) => (
                              <div
                                key={m.name}
                                ref={el => machineRefs.current[m.name] = el}
                                onClick={() => setSelectedMachine(m)}
                                onMouseEnter={() => setHoveredMachineName(m.name)}
                                onMouseLeave={() => setHoveredMachineName(null)}
                                className="p-2 bg-white rounded border mb-3 d-flex align-items-center justify-content-between shadow-sm"
                                style={
                                    hoveredMachineName === m.name
                                      ? { ...machineCardStyle, ...machineCardHoverStyle, borderColor: '#007bff' }
                                      : machineCardStyle
                                }
                              >
                                <span>{m.name}</span>
                                <StatusDot color={getOverallColor(m)} />
                              </div>
                            ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* SVG Overlay for Arrows */}
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            {arrows.map((arrow, index) => (
              <line
                key={index}
                x1={arrow.from.x}
                y1={arrow.from.y}
                x2={arrow.to.x}
                y2={arrow.to.y}
                stroke={arrow.color}
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
            ))}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="currentColor"
                />
              </marker>
            </defs>
          </svg>
        </div>
      ))}

      {renderDetailsModal()}
    </div>
  );
}