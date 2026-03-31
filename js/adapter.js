/**
 * Personal Finance Adapter
 * Converts bank/credit/Venmo statements → trial balance for personal finance modeling
 */

const PERSONAL_ACCOUNT_CLASSIFIER = {
  // Income accounts (credit balance = revenue)
  'income': {
    keywords: ['salary', 'kbs', 'deposit', 'paycheck', 'ksv', 'venmo', 'check deposit'],
    subcategories: {
      'employer_salary': ['kbs', 'kbs-osv', 'salary'],
      'employment_income': ['uc berkeley', 'ug', 'gi', 'gsi', 'ta', 'teaching'],
      'other_income': ['bonus', 'dividend', 'interest', 'refund'],
    }
  },

  // Asset accounts (debit balance)
  'assets': {
    'checking': {
      keywords: ['us bank', 'bank checking', 'checking account'],
    },
    'savings': {
      keywords: ['savings', 'money market'],
    },
    'investments': {
      keywords: ['brokerage', 'u.s. bancorp', 'investment'],
    },
  },

  // Liability accounts (credit balance)
  'liabilities': {
    'credit_cards': {
      keywords: ['amex', 'citi', 'chase', 'autopay', 'epayment'],
    },
    'loans': {
      keywords: ['loan', 'car loan', 'student loan', 'dept education', 'usbank loan'],
    },
  },

  // Expense accounts (debit balance = expense)
  'expenses': {
    'housing': {
      keywords: ['rent', 'carolyn silk', 'landlord', 'mortgage'],
    },
    'utilities': {
      keywords: ['sonic net', 'internet', 'electric', 'gas', 'water'],
    },
    'transportation': {
      keywords: ['car loan', 'gas', 'fuel', 'parking'],
    },
    'health_fitness': {
      keywords: ['funky door', 'gym', 'yoga', 'fitness'],
    },
    'groceries': {
      keywords: ['costco', 'raley', 'grocery', 'food', 'market'],
    },
    'dining': {
      keywords: ['restaurant', 'coffee', 'bar', 'cafe', 'pizza', 'tap in', 'taproom', 'brewery', 'bakery', 'snarf', 'saul', 'cask'],
    },
    'travel': {
      keywords: ['airasia', 'hotel', 'hilton', 'bali', 'tahoe', 'carmel', 'transportation'],
    },
    'entertainment': {
      keywords: ['movie', 'concert', 'event', 'sports', 'game', 'madness', 'poker', 'bracket'],
    },
    'subscriptions': {
      keywords: ['apple', 'prime', 'adobe', 'netflix', 'spotify'],
    },
    'personal_care': {
      keywords: ['salon', 'haircut', 'doctor', 'pharmacy', 'health'],
    },
  },

  // Special transfers (non-operating)
  'transfers': {
    keywords: ['transfer', 'deposit 8917', 'deposit 9129', 'deposit 3687'],
  },

  'education': {
    keywords: ['dept education', 'student loan', 'tuition'],
  },

  'shared_expenses': {
    keywords: ['hayley', 'venmo', 'split'],
  }
};

/**
 * Classify a transaction using merchant rules + user profile
 */
function classifyTransaction(date, description, amount, source = 'bank', profile = null) {
  const desc = description.toLowerCase().trim();
  const isExpense = amount < 0;
  const isIncome  = amount > 0;

  // ── Income matching via profile keywords ──────────────────
  if (isIncome && profile?.incomes?.length) {
    for (const inc of profile.incomes) {
      const kw = (inc.keyword || inc.label || '').toLowerCase();
      if (kw && desc.includes(kw)) {
        return { category: 'income', subcategory: inc.label || kw, type: 'income' };
      }
    }
  }

  // ── Hard-coded income signals ─────────────────────────────
  if (isIncome) {
    if (desc.includes('kbs')) return { category: 'income', subcategory: 'salary', type: 'income' };
    if (desc.includes('electronic deposit') || desc.includes('direct deposit')) {
      return { category: 'income', subcategory: 'direct_deposit', type: 'income' };
    }
    if (desc.includes('check deposit')) return { category: 'income', subcategory: 'check', type: 'income' };
  }

  // ── Non-operating / balance-sheet items ───────────────────
  if (desc.includes('dept education') || desc.includes('student loan')) {
    return { category: 'student_loan', subcategory: 'payment', type: 'non-operating' };
  }
  if (desc.includes('u.s. bancorp inv') || desc.includes('web transfer to inv') || desc.includes('electronic withdrawal u.s. bancorp')) {
    return { category: 'investments', subcategory: 'brokerage', type: 'non-operating' };
  }
  if (desc.match(/funds transfer|mobile banking transfer|internet banking transfer|transfer deposit/)) {
    return { category: 'transfers', subcategory: 'internal', type: 'non-operating' };
  }
  if (desc.includes('autopay') && (desc.includes('amex') || desc.includes('citi') || desc.includes('chase'))) {
    return { category: 'cc_payment', subcategory: 'autopay', type: 'non-operating' };
  }
  if (desc.includes('usbank loan')) {
    return { category: 'car_loan', subcategory: 'payment', type: 'expense' };
  }

  // ── Merchant rules (if available) ─────────────────────────
  if (typeof MERCHANT_RULES !== 'undefined') {
    for (const [key, rule] of Object.entries(MERCHANT_RULES)) {
      for (const kw of rule.keywords) {
        if (desc.includes(kw)) {
          return { category: key, subcategory: kw, type: isExpense ? 'expense' : isIncome ? 'income' : 'transfer' };
        }
      }
    }
  }

  // ── Fallback keyword rules ────────────────────────────────
  if (isExpense) {
    if (desc.includes('sonic net') || desc.includes('comcast') || desc.includes('att ') || desc.includes('verizon')) {
      return { category: 'utilities', subcategory: 'internet_phone', type: 'expense' };
    }
    if (desc.includes('funky door') || desc.includes('mindbody') || desc.includes('gym')) {
      return { category: 'fitness', subcategory: 'gym', type: 'expense' };
    }
    if (desc.includes('venmo')) {
      return { category: 'entertainment', subcategory: 'social', type: 'expense' };
    }
  }

  if (isIncome) {
    return { category: 'income', subcategory: 'other', type: 'income' };
  }

  return { category: 'other', subcategory: 'uncategorized', type: isExpense ? 'expense' : isIncome ? 'income' : 'non-operating' };
}

/**
 * Parse bank statement CSV
 */
function parseBankStatement(csv, profile) {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const transactions = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Simple CSV parse (handle quoted fields)
    const parts = line.match(/("([^"]*)"|[^,]+)/g).map(x => x.replace(/^"|"$/g, '').trim());
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = parts[idx] || '';
    });

    const date = obj['Date'] || obj['date'];
    const description = obj['Description'] || obj['Name'] || obj['description'] || '';
    const amount = parseFloat(obj['Amount'] || obj['amount'] || '0');

    if (!date || !amount) continue;

    const classified = classifyTransaction(date, description, amount, 'bank', profile);
    transactions.push({ date, description, amount, ...classified });
  }

  return transactions;
}

/**
 * Parse Citi credit card CSV
 */
function parseCitiStatement(csv) {
  const lines = csv.trim().split('\n');
  const transactions = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Detect format by checking if row has "Status,Date,Description"
    const parts = line.split(',');
    if (parts.length < 5) continue;

    // Amex format: Date is col 0, Description col 1, Amount col 4
    const maybeDate = (parts[0] || '').replace(/"/g, '').trim();
    const isAmexRow = /^\d{2}\/\d{2}\/\d{4}$/.test(maybeDate);

    // Citi format: Status col 0, Date col 1, Description col 2, Debit col 3, Credit col 4
    const isCitiRow = (parts[0] || '').replace(/"/g, '').trim() === 'Cleared';

    if (isAmexRow) {
      // Amex: positive = charge, negative = payment/credit
      try {
        const date = maybeDate;
        const description = (parts[1] || '').replace(/"/g, '').trim();
        const amount = parseFloat((parts[4] || '0').replace(/"/g, '').trim());
        if (!amount || amount < 0) continue; // skip payments/credits
        const classified = classifyTransaction(date, description, -amount, 'amex');
        transactions.push({ date, description, amount: -amount, ...classified });
      } catch(e) { continue; }
    } else if (isCitiRow) {
      try {
        const date = (parts[1] || '').replace(/"/g, '').trim();
        const description = (parts[2] || '').replace(/"/g, '').trim();
        const debit = parseFloat((parts[3] || '0').replace(/"/g, '').trim() || '0');
        const credit = parseFloat((parts[4] || '0').replace(/"/g, '').trim() || '0');
        const amount = credit - debit;
        if (!date || !amount) continue;
        const classified = classifyTransaction(date, description, amount, 'citi');
        transactions.push({ date, description, amount, ...classified });
      } catch(e) { continue; }
    }
  }

  return transactions;
}

/**
 * Parse Venmo CSV
 */
function parseVenmoStatement(csv) {
  const lines = csv.trim().split('\n');
  const transactions = [];
  let inData = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('Datetime') || line.includes('Account Activity')) {
      inData = true;
      continue;
    }

    if (!inData || !line.trim() || line.includes('Disclaimer')) break;

    // Parse Venmo CSV (complex format)
    const parts = line.split(',');
    if (parts.length < 10) continue;

    let datetime = parts[2]?.trim().replace(/"/g, '') || '';
    let note = parts[5]?.trim().replace(/"/g, '') || '';
    let amount = parts[8]?.trim().replace(/"/g, '').replace(/[+\-$, ]/g, '') || '0';

    if (!datetime || !amount) continue;

    // Parse amount (+ means inflow, - means outflow)
    const amountText = parts[8]?.trim();
    const isInflow = amountText.includes('+');
    const isMoney = parseFloat(amount) > 0;

    const finalAmount = isInflow ? Math.abs(parseFloat(amount)) : -Math.abs(parseFloat(amount));
    const date = datetime.split('T')[0];

    const classified = classifyTransaction(date, note, finalAmount, 'venmo');
    transactions.push({
      date,
      description: note,
      amount: finalAmount,
      ...classified
    });
  }

  return transactions;
}

/**
 * Aggregate transactions into trial balance format
 */
function aggregateToTrialBalance(allTransactions) {
  const accounts = {};

  for (const txn of allTransactions) {
    const key = txn.category + '|' + txn.subcategory;
    if (!accounts[key]) {
      accounts[key] = {
        account_name: txn.category + ': ' + txn.subcategory,
        account_code: generateAccountCode(txn.category, txn.subcategory),
        balance: 0,
        type: txn.type,
      };
    }
    accounts[key].balance += txn.amount;
  }

  // Convert to trial balance rows
  const trialBalance = [];
  for (const [key, acct] of Object.entries(accounts)) {
    if (acct.balance !== 0) {
      trialBalance.push({
        'Account No.': acct.account_code,
        'Account Name': acct.account_name,
        'Net Balance': acct.balance
      });
    }
  }

  return trialBalance;
}

/**
 * Generate account code based on GL standards
 */
function generateAccountCode(category, subcategory) {
  const codes = {
    'income': '4000',
    'shared_income': '4100',
    'assets': '1000',
    'checking': '1010',
    'savings': '1020',
    'investments': '1500',
    'liabilities': '2000',
    'credit_cards': '2100',
    'loans': '2200',
    'housing': '6100',
    'utilities': '6200',
    'transportation': '6300',
    'health_fitness': '6400',
    'groceries': '6500',
    'dining': '6510',
    'travel': '6600',
    'entertainment': '6700',
    'subscriptions': '6800',
    'personal_care': '6900',
    'education': '2300',
  };

  return codes[category] || '9999';
}

/**
 * Main adapter: takes CSV strings + optional profile, returns categorized result
 */
function adaptPersonalFinance(bankCsv, citiCsv, venmoCsvArray, profile) {
  const bankTxns  = bankCsv ? parseBankStatement(bankCsv, profile) : [];
  const citiTxns  = citiCsv ? parseCitiStatement(citiCsv) : [];
  const venmoTxns = venmoCsvArray.flatMap(csv => parseVenmoStatement(csv));

  const allTxns = [...bankTxns, ...citiTxns, ...venmoTxns];

  // Build monthly breakdown
  const monthly = {};
  for (const t of allTxns) {
    const dateStr = t.date || '';
    // Normalize date to YYYY-MM-DD
    let year, month;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      month = parts[0]?.padStart(2,'0');
      year  = parts[2]?.slice(-4);
    } else {
      year  = dateStr.slice(0,4);
      month = dateStr.slice(5,7);
    }
    if (!year || !month) continue;
    const key = new Date(year+'-'+month+'-01').toLocaleString('en-US',{month:'short'});
    if (!monthly[key]) monthly[key] = { income: 0, by_cat: {} };

    if (t.type === 'income') {
      monthly[key].income += t.amount;
    } else if (t.type === 'expense') {
      const cat = t.category || 'other';
      monthly[key].by_cat[cat] = (monthly[key].by_cat[cat] || 0) + Math.abs(t.amount);
    }
  }

  const totalIncome   = allTxns.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const totalExpenses = allTxns.filter(t=>t.type==='expense').reduce((s,t)=>s+Math.abs(t.amount),0);

  return {
    transactions: allTxns,
    monthly,
    summary: {
      total_transactions: allTxns.length,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      net: totalIncome - totalExpenses,
    }
  };
}

// Export for browser
if (typeof window !== 'undefined') {
  window.PersonalFinanceAdapter = {
    classifyTransaction,
    parseBankStatement,
    parseCitiStatement,
    parseVenmoStatement,
    aggregateToTrialBalance,
    adaptPersonalFinance
  };
}
