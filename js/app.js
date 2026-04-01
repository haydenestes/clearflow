/**
 * ClearFlow — App Controller v2
 * Profile → Upload → Report flow
 */

// ── State ──────────────────────────────────────────────────
let profile = {
  incomes: [],   // [{label, keyword, cadence, range}]
  categories: [], // selected category keys
  customCats: [], // [{key, label, icon, color, keywords:[]}]
};

let files = { bank: null, credit: [], venmo: [] };
let lastResult = null;
let reportMonths = [];

// ── Income categories (shown in dropdown but not as expense pills) ──
const INCOME_CATS = [
  { key:'income',        label:'Income / Paycheck',     icon:'💰' },
  { key:'gift',          label:'Gift / Reimbursement',  icon:'🎁' },
];

// ── Default expense categories ─────────────────────────────
const DEFAULT_CATS = [
  { key:'rent',          label:'Rent / Mortgage',       icon:'🏠' },
  { key:'groceries',     label:'Groceries',              icon:'🛒' },
  { key:'dining',        label:'Dining & Bars',          icon:'🍽️' },
  { key:'amazon',        label:'Amazon',                 icon:'📦' },
  { key:'pets',          label:'Pets',                   icon:'🐾' },
  { key:'travel',        label:'Travel',                 icon:'✈️' },
  { key:'transportation',label:'Gas & Transport',        icon:'⛽' },
  { key:'shopping',      label:'Shopping & Retail',      icon:'🛍️' },
  { key:'subscriptions', label:'Subscriptions',          icon:'📱' },
  { key:'health',        label:'Health & Medical',       icon:'💊' },
  { key:'fitness',       label:'Gym & Fitness',          icon:'🏋️' },
  { key:'entertainment', label:'Entertainment',          icon:'🎉' },
];

const CADENCE_OPTIONS = ['Weekly','Bi-weekly','Semi-monthly','Monthly'];
const RANGE_OPTIONS   = ['< $500','$500–$1,000','$1,000–$1,500','$1,500–$2,000','$2,000–$3,000','$3,000–$5,000','$5,000+'];

// ── Init ───────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  buildCatGrid();
  addIncomeEntry(); // start with one
});

// ── Page nav ───────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  window.scrollTo(0,0);
}

// ── Income entries ─────────────────────────────────────────
let incomeCount = 0;

function addIncomeEntry(prefill = {}) {
  incomeCount++;
  const id = 'income-' + incomeCount;
  const div = document.createElement('div');
  div.className = 'income-entry';
  div.id = id;
  div.innerHTML = `
    <button class="remove-btn" onclick="removeEntry('${id}')" title="Remove">✕</button>
    <div style="margin-bottom:10px;">
      <label class="form-label" style="font-size:0.8em; margin-bottom:4px;">Employer / Source name</label>
      <input class="form-input" placeholder="e.g. KBS, UC Berkeley, Freelance" value="${prefill.label||''}" data-field="label" />
    </div>
    <div class="income-grid-3">
      <div>
        <label class="form-label" style="font-size:0.8em; margin-bottom:4px;">Pay cadence</label>
        <select class="form-input" data-field="cadence">
          ${CADENCE_OPTIONS.map(o => `<option ${prefill.cadence===o?'selected':''}>${o}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="form-label" style="font-size:0.8em; margin-bottom:4px;">Approx. per paycheck</label>
        <select class="form-input" data-field="range">
          ${RANGE_OPTIONS.map(o => `<option ${prefill.range===o?'selected':''}>${o}</option>`).join('')}
        </select>
      </div>
    </div>
  `;
  document.getElementById('income-entries').appendChild(div);
}

function removeEntry(id) {
  const el = document.getElementById(id);
  if (el && document.querySelectorAll('.income-entry').length > 1) el.remove();
}

function collectProfile() {
  profile.incomes = [];
  document.querySelectorAll('.income-entry').forEach(entry => {
    const label   = entry.querySelector('[data-field="label"]')?.value.trim();
    const cadence = entry.querySelector('[data-field="cadence"]')?.value;
    const range   = entry.querySelector('[data-field="range"]')?.value;
    if (label) profile.incomes.push({ label, cadence, range });
  });
  profile.categories = Array.from(document.querySelectorAll('.cat-pill.selected')).map(p => p.dataset.key);
}

// ── Category pills ─────────────────────────────────────────
function buildCatGrid() {
  const grid = document.getElementById('cat-grid');
  grid.innerHTML = '';
  DEFAULT_CATS.forEach(cat => {
    const pill = document.createElement('div');
    pill.className = 'cat-pill selected'; // all selected by default
    pill.dataset.key = cat.key;
    pill.innerHTML = `<span class="cat-icon">${cat.icon}</span>${cat.label}`;
    pill.onclick = () => pill.classList.toggle('selected');
    grid.appendChild(pill);
  });
}

function addCustomCat() {
  const input = document.getElementById('custom-cat-input');
  const val = input.value.trim();
  if (!val) return;
  const key = val.toLowerCase().replace(/\s+/g,'_');
  const cat = { key, label: val, icon: '📋', color: '#888', keywords: [val.toLowerCase()] };
  profile.customCats.push(cat);
  const grid = document.getElementById('cat-grid');
  const pill = document.createElement('div');
  pill.className = 'cat-pill selected';
  pill.dataset.key = key;
  pill.innerHTML = `<span class="cat-icon">📋</span>${val}`;
  pill.onclick = () => pill.classList.toggle('selected');
  grid.appendChild(pill);
  input.value = '';
}

function goToUpload() {
  collectProfile();
  showPage('upload');
}

// ── File handling ──────────────────────────────────────────
function handleFile(type, input) {
  const fileList = Array.from(input.files);
  const zone  = document.getElementById('zone-' + type);
  const label = document.getElementById('label-' + type);
  zone.classList.add('filled');
  if (type === 'bank') {
    files.bank = fileList[0];
    label.textContent = '✓ ' + fileList[0].name;
  } else {
    files[type] = fileList;
    label.textContent = fileList.length + ' file(s): ' + fileList.map(f=>f.name).join(', ');
  }
}

function readFileText(file) {
  return new Promise((res,rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = () => rej(new Error('Cannot read: ' + file.name));
    r.readAsText(file);
  });
}

function readXlsxAsCsv(file) {
  return new Promise((res,rej) => {
    const r = new FileReader();
    r.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, {type:'binary'});
        const sn = wb.SheetNames.find(n => n.toLowerCase().includes('detail')) || wb.SheetNames[0];
        res(XLSX.utils.sheet_to_csv(wb.Sheets[sn]));
      } catch(err) { rej(new Error('Cannot parse XLSX: ' + file.name)); }
    };
    r.onerror = () => rej(new Error('Cannot read: ' + file.name));
    r.readAsBinaryString(file);
  });
}

async function readAny(file) {
  if (file.name.match(/\.xlsx?$/i)) return readXlsxAsCsv(file);
  return readFileText(file);
}

// ── Process ────────────────────────────────────────────────
async function processFiles() {
  const btn = document.getElementById('generate-btn');
  const err = document.getElementById('upload-error');
  err.classList.remove('show');

  if (!files.bank) {
    err.textContent = 'Please upload a bank statement to continue.';
    err.classList.add('show');
    return;
  }

  btn.textContent = 'Processing…'; btn.disabled = true;

  try {
    const bankCsv   = await readFileText(files.bank);
    const creditCsv = (await Promise.all(files.credit.map(readAny))).join('\n');
    const venmoCsvs = await Promise.all(files.venmo.map(readFileText));

    const result = PersonalFinanceAdapter.adaptPersonalFinance(
      bankCsv, creditCsv, venmoCsvs, profile
    );
    showClarifyPage(result);
  } catch(e) {
    err.textContent = 'Error: ' + e.message;
    err.classList.add('show');
    console.error(e);
  } finally {
    btn.textContent = 'Generate My Report →'; btn.disabled = false;
  }
}

// ── Sample ─────────────────────────────────────────────────
function loadSample() {
  lastResult = buildSampleResult();
  renderReport(lastResult);
  showPage('report');
}

function buildSampleResult() {
  const months = { Jan:0, Feb:1, Mar:2 };
  return {
    summary: { total_income: 30362.61, total_expenses: 31643, net: -1280 },
    monthly: {
      Jan: { income: 12828.34, by_cat: { rent:3500, car_loan:281.44, utilities:76.66, fitness:0, groceries:122.95, dining:0, travel:0, subscriptions:2.99, entertainment:0, shopping:0, amazon:0, pets:0 } },
      Feb: { income: 8612.64,  by_cat: { rent:3500, car_loan:281.44, utilities:0,     fitness:218, groceries:70.92, dining:67.23, travel:1104.45, subscriptions:102.98, entertainment:342.22, shopping:458.43, amazon:0, pets:380.48 } },
      Mar: { income: 8921.63,  by_cat: { rent:3500, car_loan:281.44, utilities:153.30,fitness:169, groceries:0,    dining:143.43, travel:694.24+449, subscriptions:41.96, entertainment:843.20, shopping:0, amazon:525.15, pets:500.65 } },
    },
    transactions: [],
  };
}

// ── Render report ──────────────────────────────────────────
const fmt = n => '$' + Math.abs(n).toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2});
const fmtN = n => (n < 0 ? '–' : '') + fmt(n);

function renderReport(result) {
  const { summary } = result;

  document.getElementById('card-income').textContent   = fmt(summary.total_income);
  document.getElementById('card-expenses').textContent = fmt(summary.total_expenses);
  const net = summary.net || (summary.total_income - summary.total_expenses);
  document.getElementById('card-net').textContent      = fmtN(net);
  document.getElementById('card-net-sub').textContent  = net > 0 ? 'You came out ahead 🎉' : net < 0 ? 'Expenses exceeded income' : 'Break even';

  const months = Object.keys(result.monthly || {});
  reportMonths = months;
  const from = document.getElementById('date-from')?.value || '';
  const to   = document.getElementById('date-to')?.value   || '';
  document.getElementById('report-period').textContent = from && to ? from + ' – ' + to : 'YTD Report';

  renderCashFlow(result);
  renderSpending(result);
  renderTransactions(result);
}

// ── Cash flow table ────────────────────────────────────────
function renderCashFlow(result) {
  const months  = Object.keys(result.monthly || {});
  const monthly = result.monthly || {};
  const cats    = getActiveCats();

  // Build YTD totals
  const ytdIncome = months.reduce((s,m) => s + (monthly[m]?.income||0), 0);
  const ytdByCat  = {};
  cats.forEach(c => {
    ytdByCat[c.key] = months.reduce((s,m) => s + (monthly[m]?.by_cat?.[c.key]||0), 0);
  });
  const ytdExpenses = Object.values(ytdByCat).reduce((s,v)=>s+v,0);
  const ytdNet      = ytdIncome - ytdExpenses;

  let html = '<div style="overflow-x:auto;"><table class="report-table">';

  // Header
  html += '<thead><tr><th>Category</th>';
  months.forEach(m => html += `<th>${m}</th>`);
  html += '<th style="background:var(--bg2);">YTD</th></tr></thead>';
  html += '<tbody>';

  // Income section
  html += `<tr class="section-header"><td colspan="${months.length+2}">Income</td></tr>`;
  html += '<tr>';
  html += '<td>Total Income</td>';
  months.forEach(m => {
    const v = monthly[m]?.income || 0;
    html += `<td class="num-pos">${fmt(v)}</td>`;
  });
  html += `<td class="num-pos" style="background:var(--bg2);">${fmt(ytdIncome)}</td>`;
  html += '</tr>';

  // Expenses section
  html += `<tr class="section-header"><td colspan="${months.length+2}">Expenses</td></tr>`;
  cats.forEach(cat => {
    const hasAny = months.some(m => (monthly[m]?.by_cat?.[cat.key]||0) > 0) || ytdByCat[cat.key] > 0;
    if (!hasAny) return;
    html += '<tr>';
    html += `<td>${cat.icon} ${cat.label}</td>`;
    months.forEach(m => {
      const v = monthly[m]?.by_cat?.[cat.key] || 0;
      html += v > 0 ? `<td class="num-neg">${fmt(v)}</td>` : `<td class="num-zero">—</td>`;
    });
    html += `<td class="num-neg" style="background:var(--bg2);">${ytdByCat[cat.key]>0?fmt(ytdByCat[cat.key]):'—'}</td>`;
    html += '</tr>';
  });

  // Totals
  html += '<tr class="total-row">';
  html += '<td>Total Expenses</td>';
  months.forEach(m => {
    const v = cats.reduce((s,c) => s+(monthly[m]?.by_cat?.[c.key]||0), 0);
    html += `<td class="num-neg">${fmt(v)}</td>`;
  });
  html += `<td class="num-neg" style="background:var(--bg2);">${fmt(ytdExpenses)}</td>`;
  html += '</tr>';

  // Net
  html += '<tr class="net-row">';
  html += '<td>Net Income</td>';
  months.forEach(m => {
    const inc = monthly[m]?.income || 0;
    const exp = cats.reduce((s,c) => s+(monthly[m]?.by_cat?.[c.key]||0), 0);
    const n   = inc - exp;
    html += `<td class="${n>=0?'num-pos':'num-neg'}">${fmtN(n)}</td>`;
  });
  html += `<td class="${ytdNet>=0?'num-pos':'num-neg'}" style="background:var(--accent-light);">${fmtN(ytdNet)}</td>`;
  html += '</tr>';

  html += '</tbody></table></div>';
  document.getElementById('cashflow-content').innerHTML = html;
}

// ── Spending breakdown ─────────────────────────────────────
function renderSpending(result) {
  const monthly  = result.monthly || {};
  const months   = Object.keys(monthly);
  const cats     = getActiveCats();
  const COLORS   = window.MERCHANT_RULES || {};

  const totals = cats.map(cat => ({
    ...cat,
    total: months.reduce((s,m) => s+(monthly[m]?.by_cat?.[cat.key]||0), 0),
    color: COLORS[cat.key]?.color || '#aaa',
  })).filter(c => c.total > 0).sort((a,b) => b.total - a.total);

  if (!totals.length) {
    document.getElementById('spending-content').innerHTML = '<p style="color:var(--muted);padding:20px 0;">No expense data available.</p>';
    return;
  }

  const maxVal = totals[0].total;
  let html = '<div style="margin-top:8px;">';
  totals.forEach(c => {
    const pct = (c.total/maxVal*100).toFixed(0);
    html += `
      <div class="table-row">
        <span class="lbl"><span class="dot" style="background:${c.color}"></span>${c.icon} ${c.label}</span>
        <span class="val">${fmt(c.total)}</span>
      </div>
      <div class="progress-bar" style="margin-bottom:12px;">
        <div class="progress-fill" style="width:${pct}%;background:${c.color};"></div>
      </div>`;
  });
  html += '</div>';
  document.getElementById('spending-content').innerHTML = html;
}

// ── Transactions ───────────────────────────────────────────
function renderTransactions(result) {
  const txns = result.transactions || [];
  if (!txns.length) {
    document.getElementById('transactions-content').innerHTML = '<p style="color:var(--muted);padding:20px 0;">Upload statements to see transactions.</p>';
    return;
  }
  const allCats = [...INCOME_CATS, ...getActiveCats()];
  const catMap = Object.fromEntries(allCats.map(c=>[c.key,c]));
  let html = '<div style="overflow-x:auto;"><table class="report-table">';
  html += '<thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr></thead><tbody>';
  const displayTxns = txns.slice(0,300);
  displayTxns.forEach((t, idx) => {
    const cat   = catMap[t.category] || { icon:'•', label: t.category };
    const color = t.amount >= 0 ? 'var(--accent-dark)' : 'var(--danger)';
    const catOptions = allCats.map(c => `<option value="${c.key}" ${t.category===c.key?'selected':''}>${c.icon||''} ${c.label}</option>`).join('');
    const selectHtml = `<select data-txn="${idx}" onchange="changeTxnCat(${idx}, this.value, this)" style="margin-top:4px; font-size:0.8em; border:1px solid var(--border); border-radius:4px; padding:3px 6px; background:white; max-width:180px;">
      ${catOptions}
      <option value="__add__">➕ Add new category...</option>
    </select>`;
    html += `<tr>
      <td style="color:var(--muted);white-space:nowrap;">${t.date}</td>
      <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.description}</td>
      <td><span class="badge" style="background:var(--accent-light);color:var(--accent-dark);">${cat.icon||''} ${cat.label||t.category}</span>${selectHtml}</td>
      <td style="text-align:right;color:${color};font-weight:600;">${t.amount>=0?'+':'–'}${fmt(t.amount)}</td>
    </tr>`;
  });
  if (txns.length > 300) html += `<tr><td colspan="4" style="color:var(--muted);font-size:0.82em;padding:10px;">Showing 300 of ${txns.length}. Export CSV for full list.</td></tr>`;
  html += '</tbody></table></div>';
  document.getElementById('transactions-content').innerHTML = html;
}

// ── Tabs ───────────────────────────────────────────────────
function switchTab(name, btn) {
  ['cashflow','spending','transactions'].forEach(t => {
    document.getElementById('tab-'+t).style.display = t===name ? 'block' : 'none';
    document.getElementById('tab-btn-'+t)?.classList.toggle('active', t===name);
  });
}

// ── Helpers ────────────────────────────────────────────────
function getActiveCats() {
  const selected = profile.categories.length ? profile.categories : DEFAULT_CATS.map(c=>c.key);
  const base  = DEFAULT_CATS.filter(c => selected.includes(c.key));
  const custom = profile.customCats || [];
  return [...base, ...custom];
}

// ── Clarifying questions ───────────────────────────────────
function generateClarifyingQuestions(transactions) {
  const questions = [];
  const posBank = transactions.filter(t => t.amount > 0 && t.type !== 'non-operating' && !t.description.toLowerCase().includes('transfer'));

  // Flag large one-off deposits
  const largeSingle = posBank.filter(t => t.amount >= 5000 && !isRecurring(t.description, transactions));
  largeSingle.forEach(t => {
    questions.push({
      id: 'large_' + t.date,
      text: `We found a large deposit of $${t.amount.toFixed(2)} on ${t.date} (${t.description.trim().slice(0,40)}). What was this?`,
      type: 'radio',
      options: ['Paycheck / Salary', 'Gift', 'Bonus', 'Loan', 'Sale / Reimbursement', 'Other'],
      txn_ids: [t.date + '_' + t.description],
      cat_map: { 'Paycheck / Salary': 'income', 'Gift': 'gift', 'Bonus': 'income', 'Loan': 'non-operating', 'Sale / Reimbursement': 'income', 'Other': 'income' }
    });
  });

  // Flag recurring payees that look like rent
  const rentCandidates = transactions.filter(t => t.amount < -1000 && t.amount > -5000 && !['rent','housing'].includes(t.category));
  const rentMap = {};
  rentCandidates.forEach(t => { rentMap[t.description] = (rentMap[t.description]||0)+1; });
  Object.entries(rentMap).filter(([,c])=>c>=2).forEach(([desc, count]) => {
    const sample = rentCandidates.find(t=>t.description===desc);
    questions.push({
      id: 'rent_' + desc.slice(0,20),
      text: `We found ${count} payments to "${desc.trim().slice(0,40)}" of $${Math.abs(sample.amount).toFixed(2)}. Is this your rent?`,
      type: 'radio',
      options: ['Yes, this is rent', 'No, something else'],
      txn_ids: rentCandidates.filter(t=>t.description===desc).map(t=>t.date+'_'+t.description),
      cat_map: { 'Yes, this is rent': 'rent', 'No, something else': null }
    });
  });

  // Flag large uncategorized expenses
  const uncatLarge = transactions.filter(t => t.amount < -200 && t.category === 'other');
  if (uncatLarge.length > 0) {
    questions.push({
      id: 'uncat',
      text: `We found ${uncatLarge.length} transactions we couldn't categorize (over $200 each). Would you like to review them?`,
      type: 'radio',
      options: ['Yes, show me', 'No, skip'],
      show_if_yes: uncatLarge.slice(0,5).map(t => `${t.date}: ${t.description.slice(0,40)} — $${Math.abs(t.amount).toFixed(2)}`),
      txn_ids: []
    });
  }

  return questions.slice(0, 6); // cap at 6 questions
}

function isRecurring(desc, transactions) {
  return transactions.filter(t => t.description === desc).length > 1;
}

function showClarifyPage(result) {
  lastResult = result;
  const questions = generateClarifyingQuestions(result.transactions);

  if (questions.length === 0) {
    // No questions — go straight to report
    renderReport(result);
    showPage('report');
    return;
  }

  const container = document.getElementById('clarify-questions');
  container.innerHTML = '';

  questions.forEach((q, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.marginBottom = '16px';
    card.innerHTML = `
      <div style="font-weight:600; margin-bottom:12px; font-size:0.95em;">${q.text}</div>
      ${q.type === 'radio' ? q.options.map((opt,j) => `
        <label style="display:flex; align-items:center; gap:10px; margin-bottom:8px; cursor:pointer; font-size:0.9em;">
          <input type="radio" name="q_${i}" value="${opt}" style="accent-color:var(--accent);" />
          ${opt}
        </label>`).join('') : `<input class="form-input" name="q_${i}" placeholder="Your answer..." />`}
      ${q.show_if_yes ? `<div id="detail_${i}" style="display:none; background:var(--bg2); border-radius:6px; padding:12px; margin-top:10px; font-size:0.82em; color:var(--muted);">${q.show_if_yes.join('<br>')}</div>` : ''}
    `;
    // Show detail if "Yes" selected
    if (q.show_if_yes) {
      card.querySelectorAll('input[type=radio]').forEach(r => {
        r.addEventListener('change', () => {
          const detail = card.querySelector('#detail_' + i);
          if (detail) detail.style.display = r.value.startsWith('Yes') ? 'block' : 'none';
        });
      });
    }
    container.appendChild(card);
  });

  // Store questions for submission
  window._clarifyQuestions = questions;
  showPage('clarify');
}

function submitClarifications() {
  const questions = window._clarifyQuestions || [];
  questions.forEach((q, i) => {
    const selected = document.querySelector(`input[name="q_${i}"]:checked`);
    const answer = selected ? selected.value : null;
    if (!answer || !q.cat_map) return;
    const newCat = q.cat_map[answer];
    if (!newCat || !q.txn_ids) return;
    // Apply to matching transactions
    lastResult.transactions.forEach(t => {
      if (q.txn_ids.includes(t.date + '_' + t.description)) {
        t.category = newCat;
        if (newCat !== 'non-operating') t.type = newCat === 'income' ? 'income' : 'expense';
      }
    });
  });
  // Rebuild monthly from updated transactions
  lastResult = rebuildMonthly(lastResult);
  renderReport(lastResult);
  showPage('report');
}

function rebuildMonthly(result) {
  const monthly = {};
  for (const t of result.transactions) {
    const dateStr = t.date || '';
    let year, month;
    if (dateStr.includes('/')) { const p = dateStr.split('/'); month = p[0]?.padStart(2,'0'); year = p[2]?.slice(-4); }
    else { year = dateStr.slice(0,4); month = dateStr.slice(5,7); }
    if (!year || !month) continue;
    const key = new Date(parseInt(year), parseInt(month)-1, 1).toLocaleString('en-US',{month:'short'});
    if (!monthly[key]) monthly[key] = { income: 0, by_cat: {} };
    if (t.type === 'income') monthly[key].income += t.amount;
    else if (t.type === 'expense') {
      const cat = t.category || 'other';
      monthly[key].by_cat[cat] = (monthly[key].by_cat[cat]||0) + Math.abs(t.amount);
    }
  }
  const totalIncome = result.transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const totalExpenses = result.transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+Math.abs(t.amount),0);
  return { ...result, monthly, summary: { ...result.summary, total_income: totalIncome, total_expenses: totalExpenses, net: totalIncome-totalExpenses }};
}

// ── Category change on transactions ───────────────────────
function changeTxnCat(idx, value, selectEl) {
  if (value === '__add__') {
    const newCat = prompt('Enter new category name:');
    if (!newCat) { selectEl.value = lastResult.transactions[idx].category; return; }
    const key = newCat.toLowerCase().replace(/\s+/g,'_');
    profile.customCats.push({ key, label: newCat, icon: '📋', color: '#888', keywords: [] });
    // add option to all selects
    document.querySelectorAll('select[data-txn]').forEach(s => {
      const opt = document.createElement('option');
      opt.value = key; opt.textContent = '📋 ' + newCat;
      s.insertBefore(opt, s.lastElementChild);
    });
    selectEl.value = key;
    value = key;
  }
  lastResult.transactions[idx].category = value;
  lastResult.transactions[idx].type = ['income','gift'].includes(value) ? 'income' : value === 'non-operating' ? 'non-operating' : 'expense';
  lastResult = rebuildMonthly(lastResult);
  // Re-render cash flow and spending (not transactions, to preserve scroll)
  renderCashFlow(lastResult);
  renderSpending(lastResult);
  // Update summary cards
  const s = lastResult.summary;
  document.getElementById('card-income').textContent = fmt(s.total_income);
  document.getElementById('card-expenses').textContent = fmt(s.total_expenses);
  const net = s.net;
  document.getElementById('card-net').textContent = fmtN(net);
}

function downloadCSV() {
  if (!lastResult?.transactions?.length) {
    alert('No transaction data. Run a report with uploaded files first.');
    return;
  }
  const csv = 'Date,Description,Amount,Category,Type\n' +
    lastResult.transactions.map(t=>`"${t.date}","${t.description}",${t.amount},"${t.category}","${t.type}"`).join('\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv],{type:'text/csv'})),
    download: 'clearflow-transactions.csv',
  });
  a.click();
}
