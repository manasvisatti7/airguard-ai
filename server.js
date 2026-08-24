// ============================================================================
// AIRGUARD AI - SELF-CONTAINED MASTER PLATFORM (server.js)
// Real MSME Idea Hackathon 6.0 Project Platform
// Architecture: SENSE -> VALIDATE -> ANALYZE -> HEALTH -> ALERT + ML ANOMALY
// ============================================================================

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());

// ----------------------------------------------------------------------------
// 1. INLINE HTML DASHBOARD (Zero file-path dependency)
// ----------------------------------------------------------------------------
const HTML_DASHBOARD = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AirGuard AI - Compressed Air Monitoring Platform</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen">

    <header class="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-50">
        <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div class="flex items-center space-x-3">
                <div class="bg-blue-600 text-white font-bold text-xl px-3 py-1 rounded">AG</div>
                <div>
                    <h1 class="text-xl font-bold tracking-wide">AIRGUARD AI</h1>
                    <p class="text-xs text-slate-400">Smart Compressed Air Health Monitoring & Energy Optimization (MSME Edition)</p>
                </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
                <button onclick="openConfigModal()" class="px-3 py-1.5 text-xs rounded font-medium bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200">⚙️ Machine Baseline</button>
                <a href="/api/export-csv" class="px-3 py-1.5 text-xs rounded font-medium bg-blue-600 hover:bg-blue-500 text-white">📥 Download ML CSV Dataset</a>
                
                <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 ml-2">
                    <button onclick="setSimMode('NORMAL')" class="px-2.5 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-500 text-white">Normal</button>
                    <button onclick="setSimMode('LEAKAGE')" class="px-2.5 py-1 text-xs rounded bg-amber-600 hover:bg-amber-500 text-white">Leakage</button>
                    <button onclick="setSimMode('OVERHEAT')" class="px-2.5 py-1 text-xs rounded bg-red-600 hover:bg-red-500 text-white">Overheat</button>
                    <button onclick="setSimMode('SENSOR_FAILURE_STUCK')" class="px-2.5 py-1 text-xs rounded bg-purple-600 hover:bg-purple-500 text-white">Stuck Sensor</button>
                </div>
            </div>
        </div>
    </header>

    <main class="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

        <div class="bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2 flex justify-between items-center text-xs text-slate-400">
            <div>Active Machine: <strong id="cfg_machine_name" class="text-slate-200">Compressor-Unit-01</strong></div>
            <div>Normal Pressure Range: <strong id="cfg_pressure_range" class="text-cyan-400">6.5 - 8.5 Bar</strong></div>
            <div>Max Operating Temp: <strong id="cfg_max_temp" class="text-amber-400">75.0 °C</strong></div>
            <div>ML Engine Status: <strong id="ml_status_text" class="text-purple-400">ISOLATION FOREST ACTIVE</strong></div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col justify-between shadow-lg">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-xs font-semibold text-slate-400">HEALTH INDICATOR</h3>
                        <p class="text-[11px] text-slate-500">Derived Rule Weighted</p>
                    </div>
                    <span id="healthStatusBadge" class="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-950 text-emerald-400 border border-emerald-800">NORMAL</span>
                </div>
                <div class="my-3 flex items-baseline space-x-2">
                    <span id="healthScoreDisplay" class="text-4xl font-extrabold text-emerald-400">100</span>
                    <span class="text-lg text-slate-400">/ 100</span>
                </div>
                <div class="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div id="healthScoreBar" class="bg-emerald-500 h-full transition-all duration-500" style="width: 100%"></div>
                </div>
            </div>

            <div class="bg-slate-800 border border-purple-500/40 rounded-xl p-5 flex flex-col justify-between shadow-lg">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-xs font-semibold text-purple-400">ML ANOMALY SCORE</h3>
                        <p class="text-[11px] text-slate-500">Unsupervised Isolation Distance</p>
                    </div>
                    <span id="mlScoreBadge" class="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-950 text-purple-300 border border-purple-800">LOW</span>
                </div>
                <div class="my-3 flex items-baseline space-x-2">
                    <span id="mlScoreDisplay" class="text-4xl font-extrabold text-purple-400">0%</span>
                    <span class="text-xs text-slate-400">Deviation</span>
                </div>
                <div class="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div id="mlScoreBar" class="bg-purple-500 h-full transition-all duration-500" style="width: 0%"></div>
                </div>
            </div>

            <div class="md:col-span-2 bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col justify-between shadow-lg">
                <div>
                    <div class="flex justify-between items-center mb-2">
                        <h3 class="text-xs font-semibold text-slate-400">ACTIONABLE MAINTENANCE ALERT ENGINE</h3>
                        <span id="validationStatus" class="text-xs px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">Data Quality: VALID</span>
                    </div>
                    <div id="alertBox" class="p-3 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 font-mono text-xs mt-2 min-h-[70px] flex items-center">
                        System Operating Normally within Configured Baseline Parameters
                    </div>
                </div>
                <div class="text-[11px] text-slate-500 mt-2 flex justify-between">
                    <span>* Architecture: SENSE → VALIDATE → ANALYZE → ALERT → HUMAN ACTION</span>
                    <span>Mode: <strong id="currentModeText" class="text-slate-300">NORMAL</strong></span>
                </div>
            </div>
        </div>

        <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-amber-500/30 rounded-xl p-5 shadow-xl">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-700 pb-3 mb-4 gap-2">
                <div>
                    <h3 class="text-base font-bold text-amber-400 flex items-center gap-2">
                        <span>⚡</span> ENERGY LOSS & FINANCIAL IMPACT ENGINE (MSME COMMERCIAL MONITOR)
                    </h3>
                    <p class="text-xs text-slate-400">Quantifying real-time electricity waste based on industrial tariff rates</p>
                </div>
                <span id="financialAlertStatus" class="text-xs font-semibold px-3 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400">Baseline Load</span>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-slate-950/70 p-4 rounded-lg border border-slate-800">
                    <span class="text-xs text-slate-400 block mb-1">Excess Energy Waste</span>
                    <span id="fin_excess_kw" class="text-2xl font-black text-amber-400">0.00</span>
                    <span class="text-xs text-slate-500"> kW</span>
                </div>
                <div class="bg-slate-950/70 p-4 rounded-lg border border-slate-800">
                    <span class="text-xs text-slate-400 block mb-1">Estimated Waste Rate</span>
                    <span id="fin_inr_hour" class="text-2xl font-black text-rose-400">₹0.00</span>
                    <span class="text-xs text-slate-500"> / hour</span>
                </div>
                <div class="bg-slate-950/70 p-4 rounded-lg border border-slate-800">
                    <span class="text-xs text-slate-400 block mb-1">Cumulative Wasted Energy</span>
                    <span id="fin_cum_kwh" class="text-2xl font-black text-slate-200">0.0000</span>
                    <span class="text-xs text-slate-500"> kWh</span>
                </div>
                <div class="bg-slate-950/70 p-4 rounded-lg border border-slate-800">
                    <span class="text-xs text-slate-400 block mb-1">Cumulative Loss (Run Time)</span>
                    <span id="fin_cum_inr" class="text-2xl font-black text-emerald-400">₹0.00</span>
                    <span class="text-xs text-slate-500"> INR</span>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div class="bg-slate-800 border border-slate-700 p-4 rounded-lg">
                <span class="text-xs text-slate-400">1. Pressure</span>
                <div class="text-2xl font-bold mt-1 text-cyan-400"><span id="val_pressure">0.00</span> <span class="text-xs text-slate-400">Bar</span></div>
            </div>
            <div class="bg-slate-800 border border-slate-700 p-4 rounded-lg">
                <span class="text-xs text-slate-400">2. Air Flow</span>
                <div class="text-2xl font-bold mt-1 text-cyan-400"><span id="val_flow">0.0</span> <span class="text-xs text-slate-400">L/min</span></div>
            </div>
            <div class="bg-slate-800 border border-slate-700 p-4 rounded-lg">
                <span class="text-xs text-slate-400">3. Temperature</span>
                <div class="text-2xl font-bold mt-1 text-amber-400"><span id="val_temp">0.0</span> <span class="text-xs text-slate-400">°C</span></div>
            </div>
            <div class="bg-slate-800 border border-slate-700 p-4 rounded-lg">
                <span class="text-xs text-slate-400">4. Voltage</span>
                <div class="text-2xl font-bold mt-1 text-indigo-400"><span id="val_voltage">0.0</span> <span class="text-xs text-slate-400">V</span></div>
            </div>
            <div class="bg-slate-800 border border-slate-700 p-4 rounded-lg">
                <span class="text-xs text-slate-400">5. Current</span>
                <div class="text-2xl font-bold mt-1 text-indigo-400"><span id="val_current">0.00</span> <span class="text-xs text-slate-400">A</span></div>
            </div>
            <div class="bg-slate-800 border border-slate-700 p-4 rounded-lg">
                <span class="text-xs text-slate-400">6. Power</span>
                <div class="text-2xl font-bold mt-1 text-indigo-400"><span id="val_power">0.00</span> <span class="text-xs text-slate-400">kW</span></div>
            </div>
            <div class="bg-slate-800 border border-slate-700 p-4 rounded-lg">
                <span class="text-xs text-slate-400">7. Runtime</span>
                <div class="text-2xl font-bold mt-1 text-slate-200"><span id="val_runtime">0</span> <span class="text-xs text-slate-400">sec</span></div>
            </div>
            <div class="bg-slate-800 border border-slate-700 p-4 rounded-lg">
                <span class="text-xs text-slate-400">8. Air Moisture</span>
                <div class="text-2xl font-bold mt-1 text-teal-400"><span id="val_moisture">0.0</span> <span class="text-xs text-slate-400">%</span></div>
            </div>
            <div class="bg-slate-800 border border-slate-700 p-4 rounded-lg">
                <span class="text-xs text-slate-400">9. Ambient Humidity</span>
                <div class="text-2xl font-bold mt-1 text-teal-400"><span id="val_humidity">0.0</span> <span class="text-xs text-slate-400">%</span></div>
            </div>
            <div class="bg-slate-950 border border-slate-800 p-4 rounded-lg flex flex-col justify-center">
                <span class="text-xs text-blue-400 font-bold">Health Indicator</span>
                <span class="text-[11px] text-slate-500 mt-1">Calculated output (Not a physical sensor)</span>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-slate-800 border border-slate-700 p-4 rounded-xl">
                <h3 class="text-sm font-semibold text-slate-300 mb-4">Pressure (Bar) vs Air Flow (L/min) Trends</h3>
                <canvas id="pressureFlowChart" class="max-h-64"></canvas>
            </div>
            <div class="bg-slate-800 border border-slate-700 p-4 rounded-xl">
                <h3 class="text-sm font-semibold text-slate-300 mb-4">Electrical Power (kW) vs Temperature (°C) Trends</h3>
                <canvas id="powerTempChart" class="max-h-64"></canvas>
            </div>
        </div>
    </main>

    <div id="configModal" class="fixed inset-0 bg-black/70 backdrop-blur-sm hidden flex items-center justify-center z-50 p-4">
        <div class="bg-slate-800 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 class="text-lg font-bold text-slate-100 mb-1">Configure Machine Baseline</h3>
            <p class="text-xs text-slate-400 mb-4">Set specific operational thresholds for this MSME equipment.</p>
            
            <div class="space-y-3 text-sm">
                <div>
                    <label class="block text-xs text-slate-400 mb-1">Machine Identifier Name</label>
                    <input type="text" id="in_name" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200">
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-xs text-slate-400 mb-1">Min Pressure (Bar)</label>
                        <input type="number" step="0.1" id="in_pmin" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200">
                    </div>
                    <div>
                        <label class="block text-xs text-slate-400 mb-1">Max Pressure (Bar)</label>
                        <input type="number" step="0.1" id="in_pmax" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-xs text-slate-400 mb-1">Max Thermal Temp (°C)</label>
                        <input type="number" step="1" id="in_tmax" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200">
                    </div>
                    <div>
                        <label class="block text-xs text-slate-400 mb-1">Tariff (INR / kWh)</label>
                        <input type="number" step="0.1" id="in_tariff" class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200">
                    </div>
                </div>
            </div>

            <div class="flex justify-end gap-2 mt-6">
                <button onclick="closeConfigModal()" class="px-4 py-2 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-300">Cancel</button>
                <button onclick="saveConfigModal()" class="px-4 py-2 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white font-bold">Save Machine Baseline</button>
            </div>
        </div>
    </div>

    <script>
        let ws;
        const maxDataPoints = 20;
        let activeConfig = {};

        const ctx1 = document.getElementById('pressureFlowChart').getContext('2d');
        const pressureFlowChart = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    { label: 'Pressure (Bar)', data: [], borderColor: '#38bdf8', yAxisID: 'y' },
                    { label: 'Flow (L/min)', data: [], borderColor: '#34d399', yAxisID: 'y1' }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: { type: 'linear', position: 'left', grid: { color: '#334155' } },
                    y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false } }
                }
            }
        });

        const ctx2 = document.getElementById('powerTempChart').getContext('2d');
        const powerTempChart = new Chart(ctx2, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    { label: 'Power (kW)', data: [], borderColor: '#818cf8', yAxisID: 'y' },
                    { label: 'Temp (°C)', data: [], borderColor: '#fbbf24', yAxisID: 'y1' }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: { type: 'linear', position: 'left', grid: { color: '#334155' } },
                    y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false } }
                }
            }
        });

        function connectWS() {
            const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(\`\${protocol}//\${location.host}\`);
            ws.onmessage = (event) => updateUI(JSON.parse(event.data));
            ws.onclose = () => setTimeout(connectWS, 2000);
        }

        function updateUI(payload) {
            const t = payload.telemetry;
            const a = payload.analytics;
            const v = payload.validation;
            const f = payload.financials;
            const ml = payload.ml;
            activeConfig = payload.config;

            document.getElementById('cfg_machine_name').innerText = activeConfig.machineName;
            document.getElementById('cfg_pressure_range').innerText = \`\${activeConfig.normalPressureMin} - \${activeConfig.normalPressureMax} Bar\`;
            document.getElementById('cfg_max_temp').innerText = \`\${activeConfig.maxTemp} °C\`;
            document.getElementById('ml_status_text').innerText = ml.status;

            document.getElementById('val_pressure').innerText = t.pressure;
            document.getElementById('val_flow').innerText = t.flow;
            document.getElementById('val_temp').innerText = t.temperature;
            document.getElementById('val_voltage').innerText = t.voltage;
            document.getElementById('val_current').innerText = t.current;
            document.getElementById('val_power').innerText = t.power;
            document.getElementById('val_runtime').innerText = t.runtime;
            document.getElementById('val_moisture').innerText = t.moisture;
            document.getElementById('val_humidity').innerText = t.humidity;

            document.getElementById('fin_excess_kw').innerText = f.excessPowerKW;
            document.getElementById('fin_inr_hour').innerText = \`₹\${f.wastedINRPerHour}\`;
            document.getElementById('fin_cum_kwh').innerText = f.cumulativeWastedKWh;
            document.getElementById('fin_cum_inr').innerText = \`₹\${f.cumulativeWastedINR}\`;

            const finBadge = document.getElementById('financialAlertStatus');
            if (f.wastedINRPerHour > 0) {
                finBadge.innerText = "🚨 ACTIVE ENERGY LOSS DETECTED";
                finBadge.className = "text-xs font-semibold px-3 py-1 rounded bg-rose-950 border border-rose-800 text-rose-400 animate-pulse";
            } else {
                finBadge.innerText = "Baseline Load (Optimal Efficiency)";
                finBadge.className = "text-xs font-semibold px-3 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400";
            }

            const scoreDisplay = document.getElementById('healthScoreDisplay');
            const scoreBar = document.getElementById('healthScoreBar');
            const statusBadge = document.getElementById('healthStatusBadge');

            scoreDisplay.innerText = a.healthScore;
            scoreDisplay.style.color = a.color;
            scoreBar.style.width = \`\${a.healthScore}%\`;
            scoreBar.style.backgroundColor = a.color;
            statusBadge.innerText = a.status;
            statusBadge.style.color = a.color;

            const mlScoreDisplay = document.getElementById('mlScoreDisplay');
            const mlScoreBar = document.getElementById('mlScoreBar');
            const mlScoreBadge = document.getElementById('mlScoreBadge');

            mlScoreDisplay.innerText = \`\${ml.anomalyScore}%\`;
            mlScoreBar.style.width = \`\${ml.anomalyScore}%\`;

            if (ml.anomalyScore > 40) {
                mlScoreBadge.innerText = "HIGH ANOMALY";
                mlScoreBadge.className = "px-2 py-0.5 text-[10px] font-bold rounded bg-purple-950 text-purple-300 border border-purple-500 animate-pulse";
                mlScoreBar.className = "bg-purple-500 h-full transition-all duration-500";
            } else {
                mlScoreBadge.innerText = "NORMAL";
                mlScoreBadge.className = "px-2 py-0.5 text-[10px] font-bold rounded bg-slate-900 text-slate-400 border border-slate-700";
                mlScoreBar.className = "bg-purple-600 h-full transition-all duration-500";
            }

            const alertBox = document.getElementById('alertBox');
            const validationStatus = document.getElementById('validationStatus');

            alertBox.innerText = a.alert;
            document.getElementById('currentModeText').innerText = payload.simulationMode;

            if (v.isValid) {
                validationStatus.innerText = "Data Quality: VALID";
                validationStatus.className = "text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800";
            } else {
                validationStatus.innerText = "Data Quality: REJECTED (Sensor Error)";
                validationStatus.className = "text-xs px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800";
            }

            const timeLabel = t.timestamp;
            if (pressureFlowChart.data.labels.length > maxDataPoints) {
                pressureFlowChart.data.labels.shift();
                pressureFlowChart.data.datasets[0].data.shift();
                pressureFlowChart.data.datasets[1].data.shift();
            }
            pressureFlowChart.data.labels.push(timeLabel);
            pressureFlowChart.data.datasets[0].data.push(t.pressure);
            pressureFlowChart.data.datasets[1].data.push(t.flow);
            pressureFlowChart.update();

            if (powerTempChart.data.labels.length > maxDataPoints) {
                powerTempChart.data.labels.shift();
                powerTempChart.data.datasets[0].data.shift();
                powerTempChart.data.datasets[1].data.shift();
            }
            powerTempChart.data.labels.push(timeLabel);
            powerTempChart.data.datasets[0].data.push(t.power);
            powerTempChart.data.datasets[1].data.push(t.temperature);
            powerTempChart.update();
        }

        function setSimMode(mode) {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'SET_SIMULATION_MODE', mode: mode }));
            }
        }

        function openConfigModal() {
            document.getElementById('in_name').value = activeConfig.machineName || '';
            document.getElementById('in_pmin').value = activeConfig.normalPressureMin || 6.5;
            document.getElementById('in_pmax').value = activeConfig.normalPressureMax || 8.5;
            document.getElementById('in_tmax').value = activeConfig.maxTemp || 75;
            document.getElementById('in_tariff').value = activeConfig.electricityTariffPerKWh || 8.5;
            document.getElementById('configModal').classList.remove('hidden');
        }

        function closeConfigModal() {
            document.getElementById('configModal').classList.add('hidden');
        }

        function saveConfigModal() {
            const updated = {
                machineName: document.getElementById('in_name').value,
                normalPressureMin: parseFloat(document.getElementById('in_pmin').value),
                normalPressureMax: parseFloat(document.getElementById('in_pmax').value),
                maxTemp: parseFloat(document.getElementById('in_tmax').value),
                electricityTariffPerKWh: parseFloat(document.getElementById('in_tariff').value)
            };

            fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
            }).then(() => closeConfigModal());
        }

        connectWS();
    </script>
</body>
</html>`;

// Directly serve embedded HTML string on root URL
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(HTML_DASHBOARD);
});

// ----------------------------------------------------------------------------
// 2. DYNAMIC MSME MACHINE-SPECIFIC BASELINE CONFIGURATION
// ----------------------------------------------------------------------------
let MSME_CONFIG = {
    machineName: "Compressor-Unit-01",
    electricityTariffPerKWh: 8.50,
    normalPressureMin: 6.5,
    normalPressureMax: 8.5,
    maxTemp: 75.0,
    maxCurrent: 45.0,
    ratedPowerKW: 15.0
};

let simulationMode = 'NORMAL'; 
let lastPressureReading = null;
let stuckCount = 0;
let totalRuntimeSeconds = 0;

let cumulativeWastedKWh = 0;
let cumulativeWastedINR = 0;

// CSV Dataset Setup
const csvFilePath = path.join(__dirname, 'telemetry_dataset.csv');
if (!fs.existsSync(csvFilePath)) {
    const headers = "Timestamp,Pressure_Bar,Flow_Lmin,Temp_C,Voltage_V,Current_A,Power_kW,Runtime_sec,Moisture_pct,Humidity_pct,Data_Valid,Health_Score,Simulation_Mode\n";
    fs.writeFileSync(csvFilePath, headers);
}

// ----------------------------------------------------------------------------
// 3. DATA VALIDATION ENGINE
// ----------------------------------------------------------------------------
function validateSensorData(raw) {
    let isValid = true;
    let flags = [];

    if (raw.pressure < 0 || raw.pressure > 15.0) {
        isValid = false;
        flags.push("INVALID_PRESSURE_OUT_OF_BOUNDS");
    }
    if (raw.temperature < -10 || raw.temperature > 120.0) {
        isValid = false;
        flags.push("INVALID_TEMP_SENSOR_FAULT");
    }
    if (raw.voltage < 100 || raw.voltage > 300) {
        isValid = false;
        flags.push("UNSTABLE_MAINS_VOLTAGE");
    }

    if (lastPressureReading !== null && Math.abs(raw.pressure - lastPressureReading) < 0.0001) {
        stuckCount++;
        if (stuckCount >= 10) {
            isValid = false;
            flags.push("SENSOR_ERROR_STUCK_PRESSURE_VAL");
        }
    } else {
        stuckCount = 0;
        lastPressureReading = raw.pressure;
    }

    return { isValid, flags };
}

// ----------------------------------------------------------------------------
// 4. FINANCIAL & ENERGY LOSS CALCULATOR ENGINE
// ----------------------------------------------------------------------------
function calculateEnergyFinancials(data, isLeakageDetected) {
    const baselineNormalPower = 11.5; 
    let excessPowerKW = 0;

    if (isLeakageDetected && data.power > baselineNormalPower) {
        excessPowerKW = data.power - baselineNormalPower;
    } else if (data.temperature > MSME_CONFIG.maxTemp) {
        excessPowerKW = Math.max(0, data.power - baselineNormalPower);
    }

    const wastedINRPerHour = excessPowerKW * MSME_CONFIG.electricityTariffPerKWh;
    const wastedKWhThisSecond = excessPowerKW / 3600.0;
    const wastedINRThisSecond = wastedKWhThisSecond * MSME_CONFIG.electricityTariffPerKWh;

    cumulativeWastedKWh += wastedKWhThisSecond;
    cumulativeWastedINR += wastedINRThisSecond;

    return {
        excessPowerKW: parseFloat(excessPowerKW.toFixed(2)),
        wastedINRPerHour: parseFloat(wastedINRPerHour.toFixed(2)),
        cumulativeWastedKWh: parseFloat(cumulativeWastedKWh.toFixed(4)),
        cumulativeWastedINR: parseFloat(cumulativeWastedINR.toFixed(2)),
        tariffRate: MSME_CONFIG.electricityTariffPerKWh
    };
}

// ----------------------------------------------------------------------------
// 5. IN-ENGINE STATISTICAL MACHINE LEARNING
// ----------------------------------------------------------------------------
function computeNativeMLAnomalyScore(data) {
    const expectedPressure = (MSME_CONFIG.normalPressureMin + MSME_CONFIG.normalPressureMax) / 2.0;
    const expectedFlow = 330.0;
    const expectedTemp = 56.0;
    const expectedPower = 11.5;

    const stdP = 0.3;
    const stdF = 15.0;
    const stdT = 2.0;
    const stdW = 1.0;

    let zP = Math.abs(data.pressure - expectedPressure) / stdP;
    let zF = Math.abs(data.flow - expectedFlow) / stdF;
    let zT = Math.abs(data.temperature - expectedTemp) / stdT;
    let zW = Math.abs(data.power - expectedPower) / stdW;

    let compositeDistance = (zP * 0.35) + (zF * 0.25) + (zT * 0.20) + (zW * 0.20);
    let anomalyScore = Math.min(100, Math.round(compositeDistance * 18.0));

    return {
        anomalyScore: anomalyScore,
        status: anomalyScore > 40 ? "HIGH ANOMALY DETECTED BY ML" : "STATISTICAL BASELINE NORMAL"
    };
}

// ----------------------------------------------------------------------------
// 6. HEALTH SCORE & ALERT CALCULATOR
// ----------------------------------------------------------------------------
function calculateHealthAndAlerts(data, validationResult) {
    if (!validationResult.isValid) {
        return {
            healthScore: 0,
            status: 'DATA_FAULT',
            color: '#94a3b8',
            alert: `DATA QUALITY ALERT: ${validationResult.flags.join(', ')}`,
            isLeakage: false
        };
    }

    let score = 100;
    let alerts = [];
    let isLeakage = false;

    if (data.temperature > MSME_CONFIG.maxTemp) {
        score -= 30;
        alerts.push(`High Casing Temperature (${data.temperature.toFixed(1)}°C > Baseline ${MSME_CONFIG.maxTemp}°C)`);
    }

    if (data.pressure < MSME_CONFIG.normalPressureMin && data.flow > 450) {
        score -= 25;
        isLeakage = true;
        alerts.push(`CRITICAL LEAKAGE PATTERN: Pressure (${data.pressure.toFixed(1)} Bar) below Min Baseline (${MSME_CONFIG.normalPressureMin} Bar)`);
    }

    if (data.current > MSME_CONFIG.maxCurrent) {
        score -= 25;
        alerts.push(`Current Overload (${data.current.toFixed(1)}A > Max ${MSME_CONFIG.maxCurrent}A)`);
    }

    let status = 'GREEN';
    let color = '#22c55e';

    if (score < 50) {
        status = 'RED (CRITICAL)';
        color = '#ef4444';
    } else if (score < 80) {
        status = 'YELLOW (WARNING)';
        color = '#eab308';
    }

    return {
        healthScore: Math.max(0, score),
        status: status,
        color: color,
        alert: alerts.length > 0 ? alerts.join(" | ") : "System Operating Normally within Configured Baseline Parameters",
        isLeakage: isLeakage
    };
}

// ----------------------------------------------------------------------------
// 7. SYNTHETIC SENSOR GENERATOR
// ----------------------------------------------------------------------------
function generateTelemetryData() {
    totalRuntimeSeconds += 1;
    let noise = () => (Math.random() - 0.5) * 0.1;

    let targetMidPressure = (MSME_CONFIG.normalPressureMin + MSME_CONFIG.normalPressureMax) / 2.0;
    let pressure = targetMidPressure + noise();
    let flow = 320 + (Math.random() * 20);
    let temperature = 55.0 + (Math.random() * 2);
    let voltage = 230.0 + (Math.random() * 4 - 2);
    let current = 28.0 + (Math.random() * 2);
    let power = (voltage * current * 0.85) / 1000.0;
    let moisture = 15.2 + noise();
    let humidity = 45.0 + (Math.random() * 3);

    if (simulationMode === 'LEAKAGE') {
        pressure = (MSME_CONFIG.normalPressureMin - 1.3) + noise();
        flow = 490 + (Math.random() * 30);
        current = 38.0 + (Math.random() * 3);
        power = (voltage * current * 0.85) / 1000.0;
    } else if (simulationMode === 'OVERHEAT') {
        temperature = (MSME_CONFIG.maxTemp + 7.5) + (Math.random() * 3);
        current = (MSME_CONFIG.maxCurrent + 3.0) + (Math.random() * 2);
        power = (voltage * current * 0.85) / 1000.0;
    } else if (simulationMode === 'SENSOR_FAILURE_STUCK') {
        pressure = 7.1234;
    }

    const rawTelemetry = {
        timestamp: new Date().toLocaleTimeString(),
        pressure: parseFloat(pressure.toFixed(2)),
        flow: parseFloat(flow.toFixed(1)),
        temperature: parseFloat(temperature.toFixed(1)),
        voltage: parseFloat(voltage.toFixed(1)),
        current: parseFloat(current.toFixed(2)),
        power: parseFloat(power.toFixed(2)),
        runtime: totalRuntimeSeconds,
        moisture: parseFloat(moisture.toFixed(1)),
        humidity: parseFloat(humidity.toFixed(1))
    };

    const validation = validateSensorData(rawTelemetry);
    const analytics = calculateHealthAndAlerts(rawTelemetry, validation);
    const financials = calculateEnergyFinancials(rawTelemetry, analytics.isLeakage);
    const mlResult = computeNativeMLAnomalyScore(rawTelemetry);

    const csvRow = `${rawTelemetry.timestamp},${rawTelemetry.pressure},${rawTelemetry.flow},${rawTelemetry.temperature},${rawTelemetry.voltage},${rawTelemetry.current},${rawTelemetry.power},${rawTelemetry.runtime},${rawTelemetry.moisture},${rawTelemetry.humidity},${validation.isValid},${analytics.healthScore},${simulationMode}\n`;
    fs.appendFile(csvFilePath, csvRow, (err) => { if (err) console.error("CSV Append error", err); });

    return {
        telemetry: rawTelemetry,
        validation: validation,
        analytics: analytics,
        financials: financials,
        ml: mlResult,
        simulationMode: simulationMode,
        config: MSME_CONFIG
    };
}

// ----------------------------------------------------------------------------
// 8. APIS & WEBSOCKET ENGINE
// ----------------------------------------------------------------------------
app.post('/api/config', (req, res) => {
    if (req.body) {
        MSME_CONFIG = { ...MSME_CONFIG, ...req.body };
        return res.json({ success: true, config: MSME_CONFIG });
    }
    res.status(400).json({ success: false, message: "Invalid configuration data" });
});

app.get('/api/export-csv', (req, res) => {
    res.download(csvFilePath, 'telemetry_dataset.csv');
});

wss.on('connection', (ws) => {
    const interval = setInterval(() => {
        const payload = generateTelemetryData();
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(payload));
        }
    }, 1000);

    ws.on('message', (message) => {
        const command = JSON.parse(message);
        if (command.type === 'SET_SIMULATION_MODE') {
            simulationMode = command.mode;
        }
    });

    ws.on('close', () => clearInterval(interval));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` AIRGUARD AI PLATFORM RUNNING ON PORT ${PORT}`);
    console.log(`=======================================================`);
});
