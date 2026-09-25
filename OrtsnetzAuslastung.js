// Shelly script for Ortsnetz-Auslastung.
// Set the four values in CONFIG before enabling the script.

let CONFIG = {
  apiUrl: "https://www.ortsnetz-auslastung.de/v1/measurements",
  latitude: 48.165459,
  longitude: 11.316752,
  smartmeterModel: "Shelly Mini PM",
  intervalMs: 300000
};

let VERSION = "0.1.0";

function validVoltage(value) {
  return typeof value === "number" && value >= 150 && value <= 300;
}

function validFrequency(value) {
  return typeof value === "number" && value >= 45 && value <= 55;
}

function reportResult(result, errorCode, errorMessage) {
  if (errorCode !== 0) {
    console.log("Ortsnetz request failed: " + errorMessage);
    return;
  }
  if (result.code < 200 || result.code >= 300) {
    console.log("Ortsnetz API returned HTTP " + result.code);
  }
}

function sendMeasurement() {
  let pm1 = Shelly.getComponentStatus("pm1:0");
  if( pm1 === null || !validVoltage(pm1.voltage) )
  {
    console.log("Ortsnetz: voltage is unavailable or outside 150-300 V");
    return;
  }

  let payload = {
    observed_at: new Date().toISOString(),
    latitude: CONFIG.latitude,
    longitude: CONFIG.longitude,
    l1_v: pm1.voltage,
    l2_v: -1,
    l3_v: -1,
    grid_frequency_hz: validFrequency(pm1.freq) ? pm1.freq : null,
    smartmeter_model: CONFIG.smartmeterModel,
    integration_version: "shelly-" + VERSION
  };

  Shelly.call("HTTP.Request", {
    method: "POST",
    url: CONFIG.apiUrl,
    body: JSON.stringify(payload),
    headers: {"Content-Type": "application/json"},
    timeout: 10
  }, reportResult);
}

sendMeasurement();
Timer.set(CONFIG.intervalMs, true, sendMeasurement);
