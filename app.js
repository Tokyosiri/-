// ── 데이터 생성 ──────────────────────────────────────────
const now = new Date();
const HOURS_BACK = 6;

// 날씨돌: 5분 단위 (6시간 = 72 포인트)
function genNdTimes() {
  const times = [];
  for (let i = 72; i >= 0; i--) {
    const t = new Date(now - i * 5 * 60000);
    times.push(t);
  }
  return times;
}

// 기상청: 1시간 단위 (6시간 = 6 포인트)
function genKmaTimes() {
  const times = [];
  for (let i = HOURS_BACK; i >= 0; i--) {
    const t = new Date(now - i * 60 * 60000);
    t.setMinutes(0, 0, 0);
    times.push(t);
  }
  return times;
}

function fmt(d) {
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function noise(base, amp, i) {
  return base + Math.sin(i * 0.3) * amp + (Math.random() - 0.5) * amp * 0.5;
}

const ndTimes = genNdTimes();
const kmaTimes = genKmaTimes();

// 날씨돌 데이터 (5분 간격, 변화가 세밀함)
const ndData = {
  temp:  ndTimes.map((_, i) => +noise(18.5, 3.5, i).toFixed(1)),
  feel:  ndTimes.map((_, i) => +noise(16.2, 4.2, i).toFixed(1)),
  rain:  ndTimes.map((_, i) => Math.max(0, +noise(0.4, 0.8, i + 2).toFixed(1))),
  wind:  ndTimes.map((_, i) => Math.max(0, +noise(3.2, 2.1, i + 5).toFixed(1))),
  humid: ndTimes.map((_, i) => Math.min(100, Math.max(30, +noise(65, 12, i + 1).toFixed(0)))),
  uv:    ndTimes.map((_, i) => Math.max(0, +noise(4.2, 2.5, i + 3).toFixed(1))),
  press: ndTimes.map((_, i) => +noise(1013.2, 3.5, i + 4).toFixed(1)),
};

// 기상청 데이터 (1시간 간격, 평탄화)
function kmaFromNd(ndArr, factor = 0.85) {
  return kmaTimes.map((_, hi) => {
    const ndIdx = Math.round(hi * 12);
    const slice = ndArr.slice(Math.max(0, ndIdx - 6), ndIdx + 6);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    return +(avg * factor + avg * (1 - factor) * 0.9).toFixed(1);
  });
}

const kmaData = {
  temp:  kmaTimes.map((_, i) => +noise(17.8, 2.1, i * 2).toFixed(1)),
  feel:  kmaTimes.map((_, i) => +noise(15.5, 2.8, i * 2).toFixed(1)),
  rain:  kmaTimes.map((_, i) => Math.max(0, +noise(0.3, 0.5, i * 2 + 2).toFixed(1))),
  wind:  kmaTimes.map((_, i) => Math.max(0, +noise(3.0, 1.5, i * 2 + 5).toFixed(1))),
  humid: kmaTimes.map((_, i) => Math.min(100, Math.max(30, +noise(63, 8, i * 2 + 1).toFixed(0)))),
  uv:    kmaTimes.map((_, i) => Math.max(0, +noise(4.0, 1.8, i * 2 + 3).toFixed(1))),
  press: kmaTimes.map((_, i) => +noise(1012.8, 2.5, i * 2 + 4).toFixed(1)),
};

// ── 차트 공통 옵션 ───────────────────────────────────────
const ND_COLOR  = '#00C8FF';
const ND_FILL   = 'rgba(0,200,255,0.12)';
const KMA_COLOR = '#FF8C42';
const KMA_FILL  = 'rgba(255,140,66,0.08)';

Chart.defaults.color = '#8899BB';
Chart.defaults.font.family = "'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif";

function baseOptions(yLabel = '') {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1A2235',
        borderColor: 'rgba(0,200,255,0.3)',
        borderWidth: 1,
        titleColor: '#8899BB',
        bodyColor: '#F0F4FF',
        padding: 10,
        callbacks: {
          title: (items) => items[0].label,
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { maxTicksLimit: 8, font: { size: 11 } }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.06)' },
        ticks: { font: { size: 11 } },
        title: { display: !!yLabel, text: yLabel, color: '#8899BB', font: { size: 11 } }
      }
    }
  };
}

function ndDataset(label, data, fill = false, borderWidth = 2.5) {
  return {
    label, data,
    borderColor: ND_COLOR,
    backgroundColor: fill ? ND_FILL : 'transparent',
    borderWidth,
    pointRadius: 0,
    pointHoverRadius: 5,
    pointHoverBackgroundColor: ND_COLOR,
    tension: 0.4,
    fill,
    order: 1,
  };
}

function kmaDataset(label, data, fill = false) {
  return {
    label, data,
    borderColor: KMA_COLOR,
    backgroundColor: fill ? KMA_FILL : 'transparent',
    borderWidth: 1.5,
    borderDash: [5, 4],
    pointRadius: 4,
    pointHoverRadius: 6,
    pointBackgroundColor: KMA_COLOR,
    tension: 0.3,
    fill,
    order: 2,
  };
}

// ── 차트 생성 ────────────────────────────────────────────
function makeChart(id, ndLabels, kmaLabels, datasets, options) {
  const ctx = document.getElementById(id).getContext('2d');
  return new Chart(ctx, { type: 'line', data: { labels: ndLabels, datasets }, options });
}

const ndLabels  = ndTimes.map(fmt);
const kmaLabels = kmaTimes.map(fmt);

// 기상청 데이터를 날씨돌 타임라인 길이에 맞춰 sparse 배열로 변환
function sparseKma(kmaArr) {
  const out = new Array(ndTimes.length).fill(null);
  kmaTimes.forEach((kt, ki) => {
    // 가장 가까운 nd 인덱스
    let bestIdx = 0, bestDiff = Infinity;
    ndTimes.forEach((nt, ni) => {
      const diff = Math.abs(nt - kt);
      if (diff < bestDiff) { bestDiff = diff; bestIdx = ni; }
    });
    out[bestIdx] = kmaArr[ki];
  });
  return out;
}

// 온도 + 체감온도 (대형)
makeChart('tempChart', ndLabels, kmaLabels, [
  ndDataset('날씨돌 온도', ndData.temp, true),
  ndDataset('날씨돌 체감', ndData.feel, false, 1.8),
  { ...kmaDataset('기상청 온도', sparseKma(kmaData.temp)), spanGaps: false },
  { ...kmaDataset('기상청 체감', sparseKma(kmaData.feel)), spanGaps: false, borderDash: [3,6] },
], { ...baseOptions('°C'), plugins: { ...baseOptions().plugins } });

// 강수량
makeChart('rainChart', ndLabels, kmaLabels, [
  { ...ndDataset('날씨돌', ndData.rain, true), type: 'bar',
    backgroundColor: 'rgba(0,200,255,0.4)', borderColor: ND_COLOR, borderWidth: 1, borderRadius: 2, order: 1 },
  { ...kmaDataset('기상청', sparseKma(kmaData.rain)), type: 'bar',
    backgroundColor: 'rgba(255,140,66,0.3)', borderColor: KMA_COLOR, borderWidth: 1, borderRadius: 2, order: 2 },
], { ...baseOptions('mm'), scales: { ...baseOptions().scales } });

// 풍속
makeChart('windChart', ndLabels, kmaLabels, [
  ndDataset('날씨돌', ndData.wind, true),
  { ...kmaDataset('기상청', sparseKma(kmaData.wind)), spanGaps: false },
], baseOptions('m/s'));

// 습도
makeChart('humidChart', ndLabels, kmaLabels, [
  ndDataset('날씨돌', ndData.humid, true),
  { ...kmaDataset('기상청', sparseKma(kmaData.humid)), spanGaps: false },
], { ...baseOptions('%'), scales: { ...baseOptions().scales, y: { ...baseOptions().scales.y, min: 0, max: 100 } } });

// 자외선
makeChart('uvChart', ndLabels, kmaLabels, [
  ndDataset('날씨돌', ndData.uv, true),
  { ...kmaDataset('기상청', sparseKma(kmaData.uv)), spanGaps: false },
], baseOptions('지수'));

// 기압
makeChart('pressChart', ndLabels, kmaLabels, [
  ndDataset('날씨돌', ndData.press, false),
  { ...kmaDataset('기상청', sparseKma(kmaData.press)), spanGaps: false },
], baseOptions('hPa'));

// ── 요약 카드 업데이트 ────────────────────────────────────
function updateCards() {
  const last = (arr) => arr[arr.length - 1];
  const kmaLast = (arr) => arr[arr.length - 1];

  document.getElementById('nd-temp').textContent  = last(ndData.temp);
  document.getElementById('kma-temp').textContent = kmaLast(kmaData.temp);
  document.getElementById('nd-feel').textContent  = last(ndData.feel);
  document.getElementById('kma-feel').textContent = kmaLast(kmaData.feel);
  document.getElementById('nd-rain').textContent  = last(ndData.rain);
  document.getElementById('kma-rain').textContent = kmaLast(kmaData.rain);
  document.getElementById('nd-wind').textContent  = last(ndData.wind);
  document.getElementById('kma-wind').textContent = kmaLast(kmaData.wind);
  document.getElementById('nd-humid').textContent = last(ndData.humid);
  document.getElementById('kma-humid').textContent= kmaLast(kmaData.humid);
  document.getElementById('nd-uv').textContent    = last(ndData.uv);
  document.getElementById('kma-uv').textContent   = kmaLast(kmaData.uv);
  document.getElementById('nd-press').textContent = last(ndData.press);
  document.getElementById('kma-press').textContent= kmaLast(kmaData.press);
}
updateCards();

// ── 타임라인 렌더 ─────────────────────────────────────────
function renderTimeline() {
  const ndEl = document.getElementById('ndTimeline');
  const kmaEl = document.getElementById('kmaTimeline');
  ndEl.innerHTML = '';
  kmaEl.innerHTML = '';

  // 날씨돌: 72 + 1 = 73 포인트
  ndTimes.forEach((t, i) => {
    const dot = document.createElement('div');
    dot.className = 'nd-dot' + (i === ndTimes.length - 1 ? ' current' : '');
    dot.title = fmt(t);
    ndEl.appendChild(dot);
  });

  // 기상청: 7 포인트 — 날씨돌 타임라인 폭에 맞게 각 dot 너비 조절
  // 1시간 = 12 × 5분 포인트 → 각 dot 폭 = 12 * (8+3) - 3 = 129px
  kmaTimes.forEach((t, i) => {
    const dot = document.createElement('div');
    dot.className = 'kma-dot' + (i === kmaTimes.length - 1 ? ' current' : '');
    dot.style.width = (i === kmaTimes.length - 1 ? 8 : 11 * 12 - 3) + 'px';
    dot.title = fmt(t);
    kmaEl.appendChild(dot);
  });
}
renderTimeline();

// ── 시계 업데이트 ─────────────────────────────────────────
function updateClock() {
  document.getElementById('lastUpdate').textContent =
    new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}
updateClock();
setInterval(updateClock, 1000);
