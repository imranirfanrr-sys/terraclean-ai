/* TerraClean AI - Dashboard Interactive Logic with Chart.js Telemetry
   Controls simulation state, live telemetry updates, visual dustbin animations,
   Web Audio API buzzer beep, terminal logs, Chart.js graph, and multi-bin fleet actions.
*/

// Configuration Constants
const BIN_TOTAL_HEIGHT_CM = 50;
const CRITICAL_DIST_CM = 10;
const WARNING_DIST_CM = 20;

// Application State Variables
let currentDistanceCm = 25;
let isAutoSimActive = false;
let autoSimInterval = null;
let audioContext = null;
let buzzerOscillator = null;
let isAudioMuted = true;
let telemetryChart = null;
let chartLabels = [];
let chartDataFill = [];
let chartDataDist = [];

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
  initChart();
  initApp();
});

function initApp() {
  updateDashboard(currentDistanceCm);
  setupAudioToggle();
  startSerialHeartbeat();
}

// Chart.js Live Sensor Telemetry Setup
function initChart() {
  const ctx = document.getElementById('telemetryChart');
  if (!ctx) return;

  // Generate initial 10 data points
  const now = new Date();
  for (let i = 9; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 3000);
    chartLabels.push(t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    chartDataFill.push(45);
    chartDataDist.push(25);
  }

  telemetryChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: 'Fill Level (%)',
          data: chartDataFill,
          borderColor: '#059669',
          backgroundColor: 'rgba(5, 150, 105, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          yAxisID: 'y'
        },
        {
          label: 'Ultrasonic Distance (cm)',
          data: chartDataDist,
          borderColor: '#0284c7',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          tension: 0.3,
          borderWidth: 2,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { family: 'Plus Jakarta Sans', weight: '600' } } }
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          min: 0,
          max: 100,
          title: { display: true, text: 'Fill Percentage (%)' }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          min: 0,
          max: 50,
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'Distance (cm)' }
        }
      }
    }
  });
}

function pushChartPoint(fill, dist) {
  if (!telemetryChart) return;
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  chartLabels.push(nowStr);
  chartDataFill.push(fill);
  chartDataDist.push(dist);

  if (chartLabels.length > 15) {
    chartLabels.shift();
    chartDataFill.shift();
    chartDataDist.shift();
  }

  telemetryChart.update('none');
}

// Main Dashboard Update Engine
function updateDashboard(distCm) {
  currentDistanceCm = Math.max(3, Math.min(50, distCm));
  
  // Calculate Fill Percentage: 50cm = 0%, 3cm = 94%
  let fillPercent = Math.round(((BIN_TOTAL_HEIGHT_CM - currentDistanceCm) / BIN_TOTAL_HEIGHT_CM) * 100);
  fillPercent = Math.max(0, Math.min(100, fillPercent));

  // Determine Condition Status
  let status = "NORMAL";
  let statusClass = "normal";

  if (currentDistanceCm <= CRITICAL_DIST_CM) {
    status = "CRITICAL OVERFLOW";
    statusClass = "critical";
  } else if (currentDistanceCm <= WARNING_DIST_CM) {
    status = "WARNING";
    statusClass = "warning";
  }

  // 1. Update Metrics Cards
  const valFillPercent = document.getElementById('val-fill-percent');
  const valDistance = document.getElementById('val-distance');
  const valBinStatus = document.getElementById('val-bin-status');
  const valFillSub = document.getElementById('val-fill-status-sub');

  if (valFillPercent) valFillPercent.innerText = `${fillPercent}%`;
  if (valDistance) valDistance.innerHTML = `${currentDistanceCm.toFixed(1)} <span style="font-size:1rem;font-weight:600;">cm</span>`;
  
  if (valBinStatus) {
    valBinStatus.innerText = status;
    valBinStatus.style.color = (statusClass === 'critical') ? 'var(--status-critical)' :
                               (statusClass === 'warning') ? 'var(--status-warning)' : 'var(--primary-emerald)';
  }

  if (valFillSub) {
    if (statusClass === 'critical') {
      valFillSub.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color:var(--status-critical)"></i> Bin Full - Collection Needed`;
    } else if (statusClass === 'warning') {
      valFillSub.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="color:var(--status-warning)"></i> Reaching warning capacity`;
    } else {
      valFillSub.innerHTML = `<i class="fa-solid fa-circle-check" style="color:var(--primary-emerald)"></i> Bin capacity normal`;
    }
  }

  // 2. Update Animated Visual Dustbin Fill Level
  const binWasteFill = document.getElementById('bin-waste-level-fill');
  const binLevelInnerLabel = document.getElementById('bin-level-inner-label');

  if (binWasteFill && binLevelInnerLabel) {
    const visualFillHeight = Math.max(10, Math.round(fillPercent * 0.72));
    binWasteFill.style.height = `${visualFillHeight}%`;
    binLevelInnerLabel.innerText = `${fillPercent}% (${status})`;

    binWasteFill.classList.remove('warning', 'critical');
    if (statusClass === 'warning') binWasteFill.classList.add('warning');
    if (statusClass === 'critical') binWasteFill.classList.add('critical');
  }

  // 3. Update Critical Alert Banner & Indicators
  const alertBanner = document.getElementById('critical-alert-banner');
  const alertDesc = document.getElementById('alert-banner-desc');

  if (alertBanner) {
    if (statusClass === 'critical') {
      alertBanner.classList.remove('hidden');
      if (alertDesc) {
        alertDesc.innerHTML = `Waste distance is <strong>${currentDistanceCm.toFixed(1)} cm</strong> (${fillPercent}% Fill Level). Recommended Action: <strong>Bin collection required immediately.</strong>`;
      }
      playBuzzerSound();
    } else {
      alertBanner.classList.add('hidden');
      stopBuzzerSound();
    }
  }

  // 4. Update Sensor Panel Values
  const sensorDist = document.getElementById('sensor-val-dist');
  const sensorFill = document.getElementById('sensor-val-fill');
  const sensorCond = document.getElementById('sensor-val-cond');
  const sensorBuzzer = document.getElementById('sensor-val-buzzer');
  const sensorLed = document.getElementById('sensor-val-led');

  if (sensorDist) sensorDist.innerText = `${currentDistanceCm.toFixed(1)} cm`;
  if (sensorFill) sensorFill.innerText = `${fillPercent} %`;
  if (sensorCond) {
    sensorCond.innerText = status;
    sensorCond.style.color = (statusClass === 'critical') ? 'var(--status-critical)' :
                             (statusClass === 'warning') ? 'var(--status-warning)' : 'var(--primary-emerald)';
  }
  if (sensorBuzzer) {
    sensorBuzzer.innerText = (statusClass === 'critical') ? 'BEEPING' : 'OFF';
    sensorBuzzer.style.color = (statusClass === 'critical') ? 'var(--status-critical)' : 'var(--text-muted)';
  }
  if (sensorLed) {
    sensorLed.innerText = (statusClass === 'critical') ? 'FLASHING' : 'NORMAL';
    sensorLed.style.color = (statusClass === 'critical') ? 'var(--status-critical)' : 'var(--primary-emerald)';
  }

  // 5. Sync Slider Controls
  const slider = document.getElementById('dist-slider');
  const sliderLabel = document.getElementById('slider-dist-val');
  if (slider) slider.value = currentDistanceCm;
  if (sliderLabel) sliderLabel.innerText = `${currentDistanceCm.toFixed(1)} cm`;

  // 6. Update Chart Point & Serial Log
  pushChartPoint(fillPercent, currentDistanceCm);
  appendTerminalLog(`Distance=${currentDistanceCm.toFixed(1)}cm | Fill=${fillPercent}% | Status=${status} | Buzzer=${statusClass === 'critical' ? 'HIGH' : 'LOW'}`);
}

// Handle Slider Input
function updateFromSlider(val) {
  if (isAutoSimActive) stopAutoSim();
  updateDashboard(parseFloat(val));
}

// Preset Buttons
function setPreset(dist) {
  if (isAutoSimActive) stopAutoSim();
  
  const btns = document.querySelectorAll('.preset-btns .btn-preset');
  btns.forEach(btn => btn.classList.remove('active'));
  if (event && event.target) event.target.classList.add('active');

  updateDashboard(dist);
}

// Auto Simulation Mode Handler
function toggleAutoSim() {
  const btn = document.getElementById('auto-sim-btn');
  if (isAutoSimActive) {
    stopAutoSim();
  } else {
    isAutoSimActive = true;
    if (btn) {
      btn.innerHTML = `<i class="fa-solid fa-pause"></i> Pause Sim`;
      btn.style.background = 'var(--terracotta-clay)';
      btn.style.color = 'white';
    }
    
    let direction = -2;
    autoSimInterval = setInterval(() => {
      let nextDist = currentDistanceCm + direction;
      if (nextDist <= 4) {
        direction = 2;
      } else if (nextDist >= 45) {
        direction = -2;
      }
      updateDashboard(nextDist);
    }, 900);
  }
}

function stopAutoSim() {
  isAutoSimActive = false;
  if (autoSimInterval) clearInterval(autoSimInterval);
  const btn = document.getElementById('auto-sim-btn');
  if (btn) {
    btn.innerHTML = `<i class="fa-solid fa-play"></i> Auto Simulate`;
    btn.style.background = 'var(--bg-surface-elevated)';
    btn.style.color = 'var(--text-muted)';
  }
}

// Serial Terminal Window Logger
function appendTerminalLog(msg) {
  const terminal = document.getElementById('serial-terminal');
  if (!terminal) return;

  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];

  const logLine = document.createElement('div');
  logLine.className = 'log-line';
  
  let statusBadge = '<span class="log-status-ok">DATA:</span>';
  if (msg.includes('CRITICAL')) statusBadge = '<span class="log-status-crit">ALERT:</span>';
  else if (msg.includes('WARNING')) statusBadge = '<span class="log-status-warn">WARN:</span>';

  logLine.innerHTML = `<span class="log-time">[${timeStr}]</span> ${statusBadge} ${msg}`;
  
  terminal.appendChild(logLine);

  while (terminal.children.length > 25) {
    terminal.removeChild(terminal.firstChild);
  }

  terminal.scrollTop = terminal.scrollHeight;
}

function startSerialHeartbeat() {
  setInterval(() => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const lastUpdatedEl = document.getElementById('val-last-updated');
    if (lastUpdatedEl) {
      lastUpdatedEl.innerHTML = `<i class="fa-regular fa-clock"></i> Updated: ${timeStr}`;
    }
  }, 10000);
}

// Web Audio API Beep Simulator
function setupAudioToggle() {
  const checkbox = document.getElementById('audio-toggle-checkbox');
  if (checkbox) {
    checkbox.addEventListener('change', (e) => {
      isAudioMuted = !e.target.checked;
      if (!isAudioMuted && currentDistanceCm <= CRITICAL_DIST_CM) {
        playBuzzerSound();
      } else {
        stopBuzzerSound();
      }
    });
  }
}

function playBuzzerSound() {
  if (isAudioMuted) return;
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    if (!buzzerOscillator) {
      buzzerOscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      buzzerOscillator.type = 'square';
      buzzerOscillator.frequency.setValueAtTime(900, audioContext.currentTime);

      gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);

      buzzerOscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      buzzerOscillator.start();
    }
  } catch (err) {
    console.log('Audio synth playback:', err);
  }
}

function stopBuzzerSound() {
  if (buzzerOscillator) {
    try {
      buzzerOscillator.stop();
      buzzerOscillator.disconnect();
    } catch(e) {}
    buzzerOscillator = null;
  }
}

// Copy Code Snippet Helper
function copyArduinoCode() {
  const codeText = document.getElementById('code-snippet').innerText;
  navigator.clipboard.writeText(codeText).then(() => {
    const btn = document.querySelector('.btn-copy');
    if (btn) {
      btn.innerHTML = `<i class="fa-solid fa-check"></i> Copied!`;
      setTimeout(() => {
        btn.innerHTML = `<i class="fa-regular fa-copy"></i> Copy Code`;
      }, 2000);
    }
  });
}

// Fleet Actions
function dispatchTruck(binId) {
  alert(`✅ Collection Dispatch Signal Sent for ${binId}.\nMunicipal collection truck notified for immediate pickup.`);
  
  const fleetTable = document.getElementById('fleet-table-body');
  if (fleetTable && binId === 'BIN-001') {
    fleetTable.rows[0].cells[3].innerHTML = `<span class="status-tag tag-normal"><i class="fa-solid fa-circle"></i> DISPATCHED</span>`;
    fleetTable.rows[0].cells[6].innerHTML = `<span style="color:var(--primary-emerald)">Truck En Route</span>`;
  }
}

function addSampleLogEvent() {
  const alertHistory = document.getElementById('alert-history-body');
  if (!alertHistory) return;

  const now = new Date();
  const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newRow = document.createElement('tr');
  newRow.innerHTML = `
    <td>${timeStr}</td>
    <td><strong>BIN-00${Math.floor(Math.random()*4)+1}</strong></td>
    <td>${Math.floor(Math.random()*20)+80}%</td>
    <td><span class="status-tag tag-critical">Critical Overflow</span></td>
    <td>Collection Required</td>
  `;

  alertHistory.insertBefore(newRow, alertHistory.firstChild);
}

function refreshFleetData() {
  appendTerminalLog("Fleet Telemetry Refreshed. All 4 Bins active.");
}

function exportProjectReport() {
  window.print();
}

function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth' });
  }
}
