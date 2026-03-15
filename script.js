const assets = [
  { symbol: 'BTC', bias: 'buy', target: '$150,000 (2026)' },
  { symbol: 'SOL', bias: 'buy', target: '$250 (2026) / $2,000 (2030)' },
  { symbol: 'XRP', bias: 'hold', target: '$28 (2030)' },
  { symbol: 'BNB', bias: 'hold', target: 'Dynamic (on-chain + TA)' },
  { symbol: 'TON', bias: 'buy', target: '$7.5 weekly / $47 (2030)' }
];

function pickSignal(asset) {
  const random = Math.random();
  if (asset.bias === 'buy') {
    return random > 0.2 ? 'buy' : 'hold';
  }

  if (asset.bias === 'hold') {
    return random > 0.7 ? 'sell' : 'hold';
  }

  return 'sell';
}

function confidenceBySignal(signal) {
  if (signal === 'buy') return Math.floor(74 + Math.random() * 20);
  if (signal === 'hold') return Math.floor(55 + Math.random() * 22);
  return Math.floor(45 + Math.random() * 15);
}

function signalLabel(signal) {
  return {
    buy: 'КУПИТЬ',
    hold: 'ДЕРЖАТЬ',
    sell: 'ПРОДАТЬ'
  }[signal];
}

function renderSignals() {
  const signalGrid = document.getElementById('signalGrid');

  signalGrid.innerHTML = assets.map((asset) => {
    const signal = pickSignal(asset);
    const confidence = confidenceBySignal(signal);

    return `
      <article class="card signal-card">
        <div class="signal-row">
          <span class="symbol">${asset.symbol}</span>
          <span class="badge ${signal}">${signalLabel(signal)}</span>
        </div>
        <div class="signal-row">
          <span>Уверенность</span>
          <strong>${confidence}%</strong>
        </div>
        <div class="progress">
          <span style="width: ${confidence}%"></span>
        </div>
        <div class="signal-row">
          <span>Target</span>
          <span>${asset.target}</span>
        </div>
      </article>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  renderSignals();

  const recalcButton = document.getElementById('recalcBtn');
  recalcButton.addEventListener('click', renderSignals);
});
