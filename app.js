const NOW = new Date();

const EVENTS = [
  { name: 'Stock Market Crash', location: 'New York, USA', severity: 97, hoursAgo: 3.2, description: 'Multi-index halt triggered by rapid selloff.' },
  { name: 'Regional Conflict Escalation', location: 'Kharkiv, UA', severity: 94, hoursAgo: 7.8, description: 'Heavy artillery exchange resumed overnight.' },
  { name: 'Pacific Earthquake', location: 'Sendai, JP', severity: 86, hoursAgo: 12.4, description: 'Strong quake with extensive transport disruption.' },
  { name: 'Subsea Cable Failure', location: 'Lisbon, PT', severity: 54, hoursAgo: 18.6, description: 'High-latency outages impacted international traffic.' },
  { name: 'Airliner Emergency Landing', location: 'Reykjavík, IS', severity: 41, hoursAgo: 20.1, description: 'Flight diverted after avionics anomaly.' },
  { name: 'Port Closure Strike', location: 'Rotterdam, NL', severity: 59, hoursAgo: 34.2, description: 'Labor action halted major cargo routes.' },
  { name: 'Flooding Event', location: 'Dhaka, BD', severity: 65, hoursAgo: 48.8, description: 'Rapid inundation displaced thousands.' },
  { name: 'Grid Instability', location: 'Johannesburg, ZA', severity: 51, hoursAgo: 70.3, description: 'Rolling outages due to generation imbalance.' },
  { name: 'Currency Shock', location: 'Buenos Aires, AR', severity: 72, hoursAgo: 90.4, description: 'Emergency controls imposed after steep devaluation.' },
  { name: 'Wildfire Expansion', location: 'Alberta, CA', severity: 63, hoursAgo: 126.7, description: 'Rapid spread prompted extended evacuations.' },
  { name: 'Orbital Debris Alert', location: 'LEO', severity: 33, hoursAgo: 220.5, description: 'Collision avoidance maneuvers executed.' },
  { name: 'Emergency Rate Action', location: 'London, UK', severity: 69, hoursAgo: 308.1, description: 'Central bank made unscheduled policy adjustment.' },
  { name: 'Bridge Collapse', location: 'Assam, IN', severity: 57, hoursAgo: 406.9, description: 'Critical transport link failed during heavy rain.' },
  { name: 'Volcanic Ash Reroute', location: 'Iceland', severity: 46, hoursAgo: 550.2, description: 'Flight corridors redirected from ash plume.' },
  { name: 'Refinery Fire', location: 'Gulf Coast, USA', severity: 61, hoursAgo: 680.5, description: 'Fuel production curtailed pending safety review.' },
];

const board = document.getElementById('board');
const raysBack = document.getElementById('raysBack');
const raysFront = document.getElementById('raysFront');
const zoomLayer = document.getElementById('zoomLayer');
const details = document.getElementById('details');
const detailTemplate = document.getElementById('detailTemplate');
const rangeButtons = [...document.querySelectorAll('.range')];

const CENTER = 600;
const INNER = 333;

const rangeHours = { '24h': 24, '4d': 96, month: 720 };

const state = {
  range: '24h',
  selectedId: null,
  scale: 1,
  tx: 0,
  ty: 0,
};

const eventData = EVENTS.map((evt, i) => {
  const date = new Date(NOW.getTime() - evt.hoursAgo * 3600000);
  return { ...evt, id: `e-${i}`, date, minutes: date.getHours() * 60 + date.getMinutes() };
});

function angleFromMinutes(minutes) {
  return (minutes / 1440) * 360 - 90;
}

function polarPoint(radius, angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(a), y: CENTER + radius * Math.sin(a) };
}

function makeRayPath(angleDeg, length, spreadDeg) {
  const p1 = polarPoint(INNER, angleDeg - spreadDeg / 2);
  const p2 = polarPoint(INNER + length, angleDeg);
  const p3 = polarPoint(INNER, angleDeg + spreadDeg / 2);
  return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} Z`;
}

function formatTime(date) {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' }).format(date);
}

function filteredEvents() {
  return eventData.filter((e) => e.hoursAgo <= rangeHours[state.range]);
}

function renderDetails(event) {
  details.innerHTML = '';
  if (!event) {
    details.innerHTML = '<h2>Event details</h2><p class="hint">Select a ray to inspect event name, location, and local time.</p>';
    return;
  }

  const tpl = detailTemplate.content.cloneNode(true);
  tpl.querySelector('[data-field="name"]').textContent = event.name;
  tpl.querySelector('[data-field="location"]').textContent = event.location;
  tpl.querySelector('[data-field="time"]').textContent = formatTime(event.date);
  tpl.querySelector('[data-field="date"]').textContent = formatDate(event.date);
  tpl.querySelector('[data-field="severity"]').textContent = `${event.severity}/100`;
  tpl.querySelector('[data-field="description"]').textContent = event.description;
  details.appendChild(tpl);
}

function activateEvent(event) {
  state.selectedId = event.id;
  render();
  renderDetails(event);
}

function createRay(event, fuzzy = false) {
  const angle = angleFromMinutes(event.minutes);
  const length = 28 + (event.severity / 100) * 220;
  const spread = 1.2 + (event.severity / 100) * 6;

  const ray = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  ray.setAttribute('class', `ray${fuzzy ? ' fuzzy' : ''}${state.selectedId === event.id ? ' selected' : ''}`);
  ray.setAttribute('d', makeRayPath(angle, length, spread));
  if (!fuzzy) {
    ray.setAttribute('role', 'button');
    ray.setAttribute('tabindex', '0');
    ray.setAttribute('aria-label', `${event.name} at ${formatTime(event.date)} in ${event.location}`);
    ray.addEventListener('click', () => activateEvent(event));
    ray.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        activateEvent(event);
      }
    });
  }
  return ray;
}

function render() {
  raysBack.innerHTML = '';
  raysFront.innerHTML = '';

  const events = filteredEvents();

  events
    .slice()
    .sort((a, b) => a.severity - b.severity)
    .forEach((event) => {
      const hazeCount = 2 + Math.floor(event.severity / 35);
      for (let i = 0; i < hazeCount; i += 1) {
        const haze = createRay(event, true);
        const jitter = (Math.random() - 0.5) * 1.8;
        const scale = 0.9 + Math.random() * 0.32;
        haze.setAttribute('transform', `rotate(${jitter} ${CENTER} ${CENTER}) scale(${scale})`);
        raysBack.appendChild(haze);
      }
      raysFront.appendChild(createRay(event));
    });

  if (state.selectedId && !events.some((e) => e.id === state.selectedId)) {
    state.selectedId = null;
    renderDetails(null);
  }
}

function applyTransform() {
  zoomLayer.setAttribute('transform', `translate(${state.tx} ${state.ty}) scale(${state.scale})`);
}

function setupPanZoom() {
  let dragging = false;
  let startX = 0;
  let startY = 0;

  board.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    state.scale = Math.max(0.7, Math.min(5, state.scale * factor));
    applyTransform();
  });

  board.addEventListener('pointerdown', (e) => {
    dragging = true;
    startX = e.clientX - state.tx;
    startY = e.clientY - state.ty;
    board.classList.add('dragging');
    board.setPointerCapture(e.pointerId);
  });

  board.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    state.tx = e.clientX - startX;
    state.ty = e.clientY - startY;
    applyTransform();
  });

  board.addEventListener('pointerup', (e) => {
    dragging = false;
    board.classList.remove('dragging');
    board.releasePointerCapture(e.pointerId);
  });
}

rangeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    state.range = btn.dataset.range;
    state.selectedId = null;
    rangeButtons.forEach((b) => b.classList.toggle('active', b === btn));
    render();
    renderDetails(null);
  });
});

render();
renderDetails(null);
setupPanZoom();
applyTransform();
