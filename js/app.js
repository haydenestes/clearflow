/**
 * ClearFlow — App Controller
 */

const CATEGORY_COLORS = {
  housing:        '#b85c5c',
  travel:         '#5c8ab8',
  dining:         '#c9a84c',
  entertainment:  '#8b5e8b',
  groceries:      '#5ca87a',
  subscriptions:  '#6b8f71',
  utilities:      '#7a9ab8',
  health_fitness: '#c97a5c',
  income:         '#4a6e50',
  shared_income:  '#7aaa82',
  other:          '#aaa8a5',
};

const CATEGORY_LABELS = {
  housing:        'Housing & Rent',
  travel:         'Travel',
  dining:         'Dining & Bars',
  entertainment:  'Entertainment & Social',
  groceries:      'Groceries',
  subscriptions:  'Subscriptions',
  utilities:      'Utilities',
  health_fitness: 'Health & Fitness',
  income:         'Income',
  shared_income:  'Shared Income',
  other:          'Other',
};

// State
let files = { bank: null, credit: [], venmo: [] };
let lastResult = null;

// ── Page nav ──────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  window.scrollTo(0, 0);
}

// ── File handling ─────────────────────────────────────────
function handleFileSelect(type, input) {
  const fileList = Array.from(input.files);
  const zone = document.getElementById('zone-' + type);
  const label = document.getElementById('label-' + type);
  zone.classList.add('filled');

  if (type === 'venmo') {
    files.venmo = fileList;
    label.textContent = fileList.length + ' file(s): ' + fileList.map(f => f.name).join(', ');
  } else if (type === 'credit') {
    files.credit = fileList;
    label.textContent = fileList.length + ' file(s): ' + fileList.map(f => f.name).join(', ');
  } else {
    files[type] = fileList[0];
    label.textContent = '✓ ' + fileList[0].name;
  }
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read: ' + file.name));
    reader.readAsText(file);
  });
}

function readXlsxAsCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        // Find the Transaction Details sheet, or use first sheet
        const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('detail')) || wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        resolve(XLSX.utils.sheet_to_csv(ws));
      } catch (err) {
        reject(new Error('Failed to parse XLSX: ' + file.name));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read: ' + file.name));
    reader.readAsBinaryString(file);
  });
}

async function readAnyFile(file) {
  if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    return readXlsxAsCSV(file);
  }
  return readFile(file);
}

// ── Process ───────────────────────────────────────────────
async function processFiles() {
  const btn = document.getElementById('generate-btn');
  const errEl = document.getElementById('upload-error');
  errEl.classList.remove('show');

  if (!files.bank) {
    errEl.textContent = 'Please upload a bank statement to continue.';
    errEl.classList.add('show');
    return;
  }

  btn.textContent = 'Processing...';
  btn.disabled = true;

  try {
    const bankCsv = await readFile(files.bank);
    const creditCsvs = await Promise.all(files.credit.map(readAnyFile));
    const venmoCsvs = await Promise.all(files.venmo.map(readFile));

    const result = PersonalFinanceAdapter.adaptPersonalFinance(bankCsv, creditCsvs.join('\n'), venmoCsvs);
    lastResult = result;

    renderReport(result);
    showPage('report');
  } catch (err) {
    errEl.textContent = 'Error processing files: ' + err.message;
    errEl.classList.add('show');
    console.error(err);
  } finally {
    btn.textContent = 'Generate My Report →';
    btn.disabled = false;
  }
}

// ── Load sample data ──────────────────────────────────────
async function loadSample() {
  // Build a sample result from known Hayden YTD data
  const sampleResult = buildSampleResult();
  lastResult = sampleResult;
  renderReport(sampleResult);
  showPage('report');
}

function buildSampleResult() {
  return {
    summary: {
      total_transactions: 120,
      total_income: 30362.61,
      total_expenses: 14006.01,
    },
    by_category: {
      housing:        { total: -10500, label: 'Housing & Rent', txn_count: 3 },
      car_loan:       { total: -844.32, label: 'Car Loan', txn_count: 3 },
      utilities:      { total: -229.96, label: 'Internet (Sonic Net)', txn_count: 3 },
      health_fitness: { total: -387, label: 'Gym (Funky Door)', txn_count: 2 },
      groceries:      { total: -193.87, label: 'Groceries', txn_count: 5 },
      dining:         { total: -210.66, label: 'Dining & Bars', txn_count: 12 },
      travel:         { total: -242.85, label: 'Travel', txn_count: 8 },
      entertainment:  { total: -1185.42, label: 'Entertainment & Social', txn_count: 18 },
      subscriptions:  { total: -147.93, label: 'Subscriptions', txn_count: 8 },
    },
    monthly: {
      Jan: { income: 12828.34, expenses: 3984.04, net: 8844.30 },
      Feb: { income: 8612.64, expenses: 4697.24, net: 3915.40 },
      Mar: { income: 8921.63, expenses: 5325.73, net: 3595.90 },
    },
    transactions: [],
    trial_balance: [],
  };
}

// ── Render ────────────────────────────────────────────────
function renderReport(result) {
  const fmt = n => '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const s = result.summary;

  document.getElementById('card-income').textContent = fmt(s.total_income);
  document.getElementById('card-expenses').textContent = fmt(s.total_expenses);
  const net = s.total_income - s.total_expenses;
  document.getElementById('card-net').textContent = (net < 0 ? '–' : '') + fmt(net);
  document.getElementById('card-net-sub').textContent = net >= 0 ? 'You came out ahead 🎉' : 'Spending exceeded income';

  renderSpending(result);
  renderCashFlow(result);
  renderTransactions(result);
}

function renderSpending(result) {
  const container = document.getElementById('spending-breakdown');
  const cats = result.by_category || {};
  const expenses = Object.entries(cats)
    .filter(([k, v]) => v.total < 0)
    .sort((a, b) => a[1].total - b[1].total);

  if (!expenses.length) {
    container.innerHTML = '<p style="color:var(--muted); padding: 20px 0;">No spending data available.</p>';
    return;
  }

  const maxAbs = Math.max(...expenses.map(([, v]) => Math.abs(v.total)));

  let html = '<div>';
  for (const [key, cat] of expenses) {
    const abs = Math.abs(cat.total);
    const pct = (abs / maxAbs * 100).toFixed(0);
    const color = CATEGORY_COLORS[key] || '#aaa';
    const label = CATEGORY_LABELS[key] || cat.label || key;

    html += `
      <div class="table-row">
        <span class="lbl">
          <span class="dot" style="background:${color}"></span>
          ${label}
        </span>
        <span class="val">$${abs.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      </div>
      <div class="progress-bar" style="margin-bottom: 12px;">
        <div class="progress-fill" style="width:${pct}%; background:${color};"></div>
      </div>`;
  }
  html += '</div>';
  container.innerHTML = html;
}

function renderCashFlow(result) {
  const container = document.getElementById('cashflow-table');
  const months = result.monthly || {};

  let html = '<table style="width:100%; border-collapse: collapse; font-size: 0.9em;">';
  html += '<thead><tr style="border-bottom: 2px solid var(--border);">';
  html += '<th style="text-align:left; padding: 10px 0; color: var(--muted); font-weight:700; font-size:0.78em; text-transform:uppercase; letter-spacing:0.08em;">Category</th>';
  Object.keys(months).forEach(m => {
    html += `<th style="text-align:right; padding: 10px 0; color: var(--muted); font-weight:700; font-size:0.78em; text-transform:uppercase; letter-spacing:0.08em;">${m}</th>`;
  });
  html += '<th style="text-align:right; padding: 10px 0; color: var(--muted); font-weight:700; font-size:0.78em; text-transform:uppercase; letter-spacing:0.08em;">YTD</th>';
  html += '</tr></thead><tbody>';

  const rows = ['income', 'expenses', 'net'];
  const labels = { income: 'Total Income', expenses: 'Total Expenses', net: 'Net Income' };

  for (const row of rows) {
    const isNet = row === 'net';
    let ytd = 0;
    html += `<tr style="border-bottom: 1px solid var(--border); ${isNet ? 'font-weight:700;' : ''}">`;
    html += `<td style="padding: 11px 0;">${labels[row]}</td>`;
    Object.values(months).forEach(m => {
      const val = m[row] || 0;
      ytd += val;
      const color = isNet ? (val >= 0 ? 'var(--accent-dark)' : 'var(--danger)') : '';
      html += `<td style="text-align:right; padding: 11px 0; color:${color};">$${Math.abs(val).toLocaleString('en-US', {minimumFractionDigits:2})}</td>`;
    });
    const ytdColor = isNet ? (ytd >= 0 ? 'var(--accent-dark)' : 'var(--danger)') : '';
    html += `<td style="text-align:right; padding: 11px 0; color:${ytdColor};">$${Math.abs(ytd).toLocaleString('en-US', {minimumFractionDigits:2})}</td>`;
    html += '</tr>';
  }

  html += '</tbody></table>';
  container.innerHTML = html;
}

function renderTransactions(result) {
  const container = document.getElementById('transactions-table');
  const txns = result.transactions || [];

  if (!txns.length) {
    container.innerHTML = '<p style="color:var(--muted); padding: 20px 0;">No transaction data available in sample mode.</p>';
    return;
  }

  let html = '<table style="width:100%; border-collapse:collapse; font-size:0.88em;">';
  html += '<thead><tr style="border-bottom: 2px solid var(--border);">';
  ['Date','Description','Category','Amount'].forEach(h => {
    html += `<th style="text-align:left; padding: 10px 0; color:var(--muted); font-weight:700; font-size:0.75em; text-transform:uppercase; letter-spacing:0.08em;">${h}</th>`;
  });
  html += '</tr></thead><tbody>';

  for (const t of txns.slice(0, 200)) {
    const color = t.amount >= 0 ? 'var(--accent-dark)' : 'var(--danger)';
    const label = CATEGORY_LABELS[t.category] || t.category;
    html += `<tr style="border-bottom:1px solid var(--border);">
      <td style="padding:9px 0; color:var(--muted); white-space:nowrap;">${t.date}</td>
      <td style="padding:9px 0; max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${t.description}</td>
      <td style="padding:9px 0;"><span class="badge" style="background:var(--accent-light); color:var(--accent-dark);">${label}</span></td>
      <td style="padding:9px 0; text-align:right; color:${color}; font-weight:600;">
        ${t.amount >= 0 ? '+' : ''}$${Math.abs(t.amount).toLocaleString('en-US', {minimumFractionDigits:2})}
      </td>
    </tr>`;
  }

  html += '</tbody></table>';
  if (txns.length > 200) html += `<p style="color:var(--muted); font-size:0.82em; margin-top:10px;">Showing 200 of ${txns.length} transactions. Export CSV for full list.</p>`;
  container.innerHTML = html;
}

// ── Tabs ──────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('[id^="tab-"]').forEach(t => t.style.display = 'none');

  document.getElementById('tab-' + name).style.display = 'block';
  event.target.classList.add('active');
}

// ── Export ────────────────────────────────────────────────
function downloadCSV() {
  if (!lastResult?.transactions?.length) {
    alert('No transaction data to export. Run a report with uploaded statements first.');
    return;
  }
  const txns = lastResult.transactions;
  const csv = 'Date,Description,Amount,Category,Subcategory,Type\n' +
    txns.map(t => `"${t.date}","${t.description}",${t.amount},"${t.category}","${t.subcategory}","${t.type}"`).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'clearflow-transactions.csv';
  a.click();
  URL.revokeObjectURL(url);
}
