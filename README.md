\# AirGuard AI 🌬️🤖

> \*\*"AI-Powered Smart Compressed Air System Health Monitoring \& Energy Optimization Platform for MSMEs"\*\*



\*Developed for MSME Idea Hackathon 6.0\*



\---



\## 📌 Core Philosophy

\*\*DATA → INTELLIGENCE → ACTION\*\*  

\*(SENSE → VALIDATE → ANALYZE → ALERT → ACT)\*



> \*"Before deciding whether the machine is faulty, we first make sure the data itself is trustworthy."\*



\---



\## 🚀 Key Features



\* \*\*9 Sensing Parameters:\*\* Pressure, Flow, Temperature, Voltage, Current, Power, Runtime, Moisture, Ambient Humidity.

\* \*\*Derived Health Indicator:\*\* Real-time multi-parameter weighted score ($0-100\\%$).

\* \*\*Edge Data Validation Engine:\*\* Range checks, stuck-value detection, and communication verification to eliminate false machine alarms.

\* \*\*Energy Loss \& Financial Engine:\*\* Real-time calculation of excess energy waste ($\\text{kW}$) and financial loss rate ($\\text{₹/hour}$) based on commercial Indian industrial electricity tariffs.

\* \*\*Dynamic Machine Baselines:\*\* Customizable operating thresholds per MSME factory floor.

\* \*\*Local Machine Learning Anomaly Detection:\*\* Multi-parameter statistical deviation scoring.

\* \*\*Dataset Export:\*\* One-click telemetry logging for training custom anomaly models.



\---



\## 🏗️ Architecture Stack



\* \*\*Edge Firmware / Hardware (Proposed):\*\* ESP32, PZEM-004T v3.0, 0–1.2 MPa Pressure Transducer, YF-DN50 Flowmeter, DHT22.

\* \*\*Backend:\*\* Node.js, Express.js, WebSockets (`ws`).

\* \*\*Frontend:\*\* HTML5, Tailwind CSS, Chart.js.

\* \*\*ML / Analytics:\*\* In-Engine Statistical Mahalanobis \& Z-Score Distance Engine + CSV Telemetry Exporter.



\---



\## 💻 Local Setup \& Installation



1\. Clone the repository:

&#x20;  ```bash

&#x20;  git clone \[https://github.com/YOUR\_GITHUB\_USERNAME/airguard-ai.git](https://github.com/YOUR\_GITHUB\_USERNAME/airguard-ai.git)

&#x20;  cd airguard-ai

