const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const yaml = require("js-yaml");
const ping = require("ping");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});
const ENV = process.env.NODE_ENV || "development";

const PORT = process.env.PORT || 12000;
// ✅ Define YAML paths
const devYamlPath = path.join(__dirname, "machines.yml");
const prodYamlPath = "/usr/src/app/machines.yml";

// ✅ Determine which YAML file to use
const YAML_FILE =
  process.env.YAML_PATH ||
  (ENV === "production" ? prodYamlPath : devYamlPath);

console.log("=======================================");
console.log(`Environment: ${ENV}`);
console.log(`YAML file path: ${YAML_FILE}`);
console.log(`Server running on port: ${PORT}`);
console.log("=======================================");

// const YAML_FILE = process.env.YAML_PATH || path.join(__dirname, "machines.yml");
// //  const YAML_FILE = process.env.YAML_PATH || "/usr/src/app/machines.yml";
// ✅ Choose based on environment, with .env override support


// ✅ Configurable values
const BROADCAST_INTERVAL = parseInt(
  process.env.BROADCAST_INTERVAL_MS || "15000"
);
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "20");

let machinesData = { machines: [] };

// --- Load YAML file into memory ---
function loadMachines() {
  try {
    const file = fs.readFileSync(YAML_FILE, "utf8");
    machinesData = yaml.load(file) || { machines: [] };
    console.log(
      `✅ YAML loaded successfully (${machinesData.machines.length} machines)`
    );
  } catch (err) {
    console.error("❌ Failed to read YAML:", err.message);
    machinesData = { machines: [] };
  }
}

// --- Save YAML file ---
function saveMachines(data) {
  try {
    const yamlStr = yaml.dump(data);
    fs.writeFileSync(YAML_FILE, yamlStr, "utf8");
    console.log("💾 YAML saved successfully!");

    // ✅ Reload latest YAML and broadcast instantly
    loadMachines();
    broadcastStatus();
  } catch (err) {
    console.error("❌ Failed to save YAML:", err.message);
  }
}

// --- Determine color based on ping ---
function getColor(pingMs, alive) {
  if (!alive) return "red";
  if (pingMs <= 10) return "green";
  if (pingMs <= 100) return "orange";
  return "red";
}

// --- Ping multiple IPs per machine ---
async function checkMachine(machine) {
  const results = {};
  const ips = ["ip", "gateway", "kiosk_pc"];

  for (const key of ips) {
    const ip = machine[key];
    if (!ip) continue;

    try {
      const res = await ping.promise.probe(ip, { timeout: 2 });
      const ms = parseFloat(res.time) || 0;
      results[key] = {
        ip,
        alive: res.alive,
        ping: ms,
        color: getColor(ms, res.alive),
      };
    } catch {
      results[key] = { ip, alive: false, ping: 0, color: "red" };
    }
  }

  return { ...machine, results };
}

// --- Process IP checks in batches to reduce lag ---
async function processInBatches(items, fn, batchSize = BATCH_SIZE) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const res = await Promise.all(batch.map(fn));
    results.push(...res);
  }
  return results;
}

// --- Perform network checks ---
async function checkNetworkStatus() {
  const checked = await processInBatches(machinesData.machines, checkMachine);
  return checked;
}

// --- Broadcast data to all clients ---
async function broadcastStatus() {
  try {
    const machines = await checkNetworkStatus();
    io.emit("network-status", { machines, ts: Date.now() });
    console.log(`📡 Broadcasted ${machines.length} machine statuses`);
  } catch (err) {
    console.error("❌ Error broadcasting network status:", err);
  }
}

// --- Socket.IO handling ---
io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  // 🔹 Send last known data immediately
  if (machinesData.machines?.length > 0) {
    socket.emit("network-status", {
      machines: machinesData.machines,
      ts: Date.now(),
    });
  }

  // 🔹 Then run a fresh ping check
  broadcastStatus();

  socket.on("disconnect", () =>
    console.log("🔴 Client disconnected:", socket.id)
  );
});

// --- Automatic periodic updates (backup refresh) ---
setInterval(broadcastStatus, BROADCAST_INTERVAL);

// --- REST API ---
// Get YAML data
app.get("/api/machines", (req, res) => {
  res.json({ success: true, data: machinesData });
});

// Save YAML data
app.post("/api/machines", (req, res) => {
  const newData = req.body;
  if (!newData || !newData.machines) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid data format" });
  }

  saveMachines(newData);
  res.json({
    success: true,
    message: "YAML updated and broadcasted instantly",
  });
});

// --- Watch for external file changes ---
fs.watchFile(YAML_FILE, { interval: 2000 }, () => {
  console.log("🔄 Detected external YAML modification...");
  loadMachines();
  broadcastStatus();
});

// --- Start the server ---
loadMachines();
server.listen(PORT, () =>
  console.log(
    `🚀 Server running on port ${PORT} | Interval: ${
      BROADCAST_INTERVAL / 1000
    }s | Batch size: ${BATCH_SIZE}`
  )
);
