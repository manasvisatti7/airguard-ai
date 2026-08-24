// ============================================================================
// AIRGUARD AI - MASTER SERVER & SENSOR SIMULATOR ENGINE (server.js)
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

// Serve static assets explicitly from the 'public' subfolder
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Fallback route to guarantee index.html loads on Render
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// ----------------------------------------------------------------------------
// 1. DYNAMIC MSME MACHINE-SPECIFIC BASELINE CONFIGURATION
// ----------------------------------------------------------------------------
let MSME_CONFIG = {
    machineName: "Compressor-Unit-01",
    electricityTariffPerKWh: 8.50, // INR / kWh
    normalPressureMin: 6.5,        // Bar
    normalPressureMax: 8.5,        // Bar
    maxTemp: 75.0,                 // °C
    maxCurrent: 45.0,              // Amps
    ratedPowerKW: 15.0             // kW
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
// 2. DATA VALIDATION ENGINE
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
// 3. FINANCIAL & ENERGY LOSS CALCULATOR ENGINE
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
// 4. IN-ENGINE STATISTICAL MACHINE LEARNING (Multi-Parameter Anomaly Engine)
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
// 5. MULTI-PARAMETER HEALTH SCORE & ALERT CALCULATOR
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
// 6. SYNTHETIC SENSOR GENERATOR
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

    // Append sample to CSV dataset
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
// 7. REST APIS & WEBSOCKET ENGINE
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

// Use Render's environment PORT dynamically, or fallback to local port 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` AIRGUARD AI PLATFORM RUNNING ON PORT ${PORT}`);
    console.log(`=======================================================`);
});
