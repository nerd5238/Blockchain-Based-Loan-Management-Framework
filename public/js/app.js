/* ── Page navigation ── */
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelector(`[onclick="showPage('${name}')"]`).classList.add('active');
  if (name === 'dashboard') loadDashboard();
}

/* ── Toast ── */
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3500);
}

/* ── Status check ── */
async function checkStatus() {
  try {
    const res = await fetch('/api/status');
    const d   = await res.json();
    setDot('mongo', d.mongo);
    setDot('chain', d.blockchain);
    document.getElementById('status-mongo').textContent = d.mongo  ? 'online' : 'offline';
    document.getElementById('status-chain').textContent = d.blockchain ? 'online' : 'offline';
  } catch {
    setDot('mongo', false); setDot('chain', false);
  }
}
function setDot(name, ok) {
  const el = document.getElementById('dot-' + name);
  el.className = 'status-dot ' + (ok ? 'ok' : 'err');
}

/* ── Dashboard ── */
async function loadDashboard() {
  try {
    const res  = await fetch('/api/loans/all');
    const data = await res.json();
    const loans = data.loans || [];

    document.getElementById('stat-total').textContent  = loans.length;
    document.getElementById('stat-active').textContent  = loans.filter(l => l.status === 'ACTIVE').length;
    document.getElementById('stat-repaid').textContent  = loans.filter(l => l.status === 'REPAID').length;
    document.getElementById('stat-hashes').textContent  = loans.reduce((a, l) => a + (l.hashHistory?.length || 0), 0);

    const tbody = document.getElementById('loans-tbody');
    if (!loans.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No loans yet. Create your first loan.</td></tr>';
      return;
    }
    tbody.innerHTML = loans.map(l => `
      <tr>
        <td><span class="loan-id">${esc(l.loanId)}</span></td>
        <td>${esc(l.userId)}</td>
        <td>₹${Number(l.amount).toLocaleString('en-IN')}</td>
        <td>${l.duration} mo</td>
        <td>${badge(l.status)}</td>
        <td class="mono">${l.currentHash ? l.currentHash.slice(0,16) + '…' : '—'}</td>
        <td>
          <button class="action-btn verify" onclick="quickVerify('${esc(l.loanId)}')">Verify</button>
          <button class="action-btn" onclick="prefillUpdate('${esc(l.loanId)}')">Update</button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    document.getElementById('loans-tbody').innerHTML =
      `<tr><td colspan="7" class="empty-row">Failed to load loans — is the server running?</td></tr>`;
  }
}

function badge(status) {
  const map = { ACTIVE: 'badge-active', REPAID: 'badge-repaid', DEFAULTED: 'badge-defaulted', PENDING: 'badge-pending' };
  return `<span class="badge ${map[status] || 'badge-pending'}">${status}</span>`;
}

/* ── Create loan ── */
async function createLoan() {
  const btn = event.currentTarget;
  const body = {
    loanId:   v('c-loanId'),
    userId:   v('c-userId'),
    amount:   Number(v('c-amount')),
    interest: Number(v('c-interest')),
    duration: Number(v('c-duration')),
    status:   v('c-status'),
  };

  if (!body.loanId || !body.userId || !body.amount || !body.interest || !body.duration) {
    toast('Please fill in all fields', 'err'); return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Recording on blockchain…';

  const res  = document.getElementById('create-result');
  res.style.display = 'none';

  try {
    const r    = await fetch('/api/loans/create-loan', { method: 'POST', headers: json(), body: JSON.stringify(body) });
    const data = await r.json();

    if (!r.ok) throw new Error(data.error || 'Failed');

    res.className = 'result-card result-valid';
    res.style.display = 'block';
    res.innerHTML = `
      <div class="result-header">
        <div class="result-status valid">Loan Created</div>
      </div>
      <div style="display:grid;gap:8px">
        ${kv('Loan ID', data.loanId, true)}
        ${kv('SHA-256 Hash', data.hash, true)}
        ${kv('Blockchain Tx', data.blockchainTxHash, true)}
      </div>
      <div style="margin-top:12px;font-size:12px;color:var(--text3)">
        This hash is now permanently stored on the Ganache blockchain and cannot be modified.
      </div>
    `;
    toast('Loan recorded on blockchain', 'ok');
    ['c-loanId','c-userId','c-amount','c-interest','c-duration'].forEach(id => { document.getElementById(id).value = ''; });
  } catch (e) {
    res.className = 'result-card result-error';
    res.style.display = 'block';
    res.innerHTML = `<div class="result-status error">${esc(e.message)}</div>`;
    toast(e.message, 'err');
  }

  btn.disabled = false;
  btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Create &amp; Record on Blockchain';
}

/* ── Update loan ── */
async function updateLoan() {
  const btn = event.currentTarget;
  const loanId = v('u-loanId');
  const status = v('u-status');
  if (!loanId) { toast('Enter a Loan ID', 'err'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Updating…';

  const res = document.getElementById('update-result');
  res.style.display = 'none';

  try {
    const r    = await fetch('/api/loans/update-loan', { method: 'POST', headers: json(), body: JSON.stringify({ loanId, status }) });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Failed');

    res.className = 'result-card result-valid';
    res.style.display = 'block';
    res.innerHTML = `
      <div class="result-header">
        <div class="result-status valid">Status Updated</div>
      </div>
      <div style="display:grid;gap:8px">
        ${kv('Loan ID', data.loanId, true)}
        ${kv('New Hash', data.newHash, true)}
        ${kv('Version Key', data.versionKey, true)}
        ${kv('Blockchain Tx', data.blockchainTxHash, true)}
      </div>
    `;
    toast('Status updated & hash appended to chain', 'ok');
    document.getElementById('u-loanId').value = '';
  } catch (e) {
    res.className = 'result-card result-error';
    res.style.display = 'block';
    res.innerHTML = `<div class="result-status error">${esc(e.message)}</div>`;
    toast(e.message, 'err');
  }

  btn.disabled = false;
  btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7a6 6 0 1 0 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M1 3v4h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Update &amp; Record New Hash';
}

/* ── Verify loan ── */
async function verifyLoan() {
  const loanId = v('v-loanId');
  if (!loanId) { toast('Enter a Loan ID to verify', 'err'); return; }
  await runVerify(loanId, 'verify-result');
}

async function quickVerify(loanId) {
  showPage('verify');
  document.getElementById('v-loanId').value = loanId;
  await runVerify(loanId, 'verify-result');
}

async function runVerify(loanId, containerId) {
  const btn = document.querySelector('#page-verify .btn-primary');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Checking blockchain…'; }

  const container = document.getElementById(containerId);
  container.style.display = 'none';

  try {
    const r    = await fetch(`/api/loans/verify-loan/${encodeURIComponent(loanId)}`);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Failed');

    const isValid    = data.integrity.includes('VALID') && !data.integrity.includes('TAMPERED');
    const statusClass = isValid ? 'valid' : 'tampered';
    const cardClass   = isValid ? 'result-valid' : 'result-tampered';

    const historyHtml = (data.hashHistory || []).map(h => `
      <div class="history-item">
        <span class="history-reason ${h.reason === 'CREATED' ? 'reason-created' : 'reason-updated'}">${h.reason}</span>
        <span class="history-hash">${h.hash}<br><span style="color:var(--text3);font-size:9px">tx: ${h.txHash || '—'}</span></span>
      </div>
    `).join('');

    container.className = `result-card ${cardClass}`;
    container.style.display = 'block';
    container.innerHTML = `
      <div class="result-header">
        <div class="result-status ${statusClass}">${data.integrity}</div>
      </div>
      <div class="hash-compare">
        <div class="hash-box">
          <div class="hash-box-label">Re-computed from DB</div>
          <div class="hash-box-val ${!isValid ? 'mismatch' : ''}">${data.recomputedHash}</div>
        </div>
        <div class="hash-box">
          <div class="hash-box-label">Stored on Blockchain</div>
          <div class="hash-box-val">${data.blockchainHash}</div>
        </div>
      </div>
      <div style="margin-top:14px;font-size:12px;color:var(--text3)">
        Blockchain timestamp: ${data.blockchainTimestamp || '—'}
      </div>
      ${historyHtml ? `<div class="section-title" style="margin-top:18px">Hash history</div><div class="history-list">${historyHtml}</div>` : ''}
    `;

    toast(isValid ? 'Integrity verified — VALID' : 'TAMPERED — hashes do not match!', isValid ? 'ok' : 'err');
  } catch (e) {
    container.className = 'result-card result-error';
    container.style.display = 'block';
    container.innerHTML = `<div class="result-status error">${esc(e.message)}</div>`;
    toast(e.message, 'err');
  }

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.5 3H12l-2.5 2 1 3L7 7.5 4.5 9l1-3L3 4h3.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg> Run Integrity Check';
  }
}

/* ── Helpers ── */
function prefillUpdate(loanId) {
  showPage('update');
  document.getElementById('u-loanId').value = loanId;
}

function v(id)    { return document.getElementById(id)?.value?.trim() || ''; }
function json()   { return { 'Content-Type': 'application/json' }; }
function esc(s)   { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function kv(label, val, mono = false) {
  return `
    <div style="display:flex;flex-direction:column;gap:3px">
      <span style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.07em">${label}</span>
      <span style="${mono ? 'font-family:var(--font-mono);font-size:11px;word-break:break-all;' : ''}color:var(--teal)">${esc(val || '—')}</span>
    </div>`;
}

/* ── Init ── */
checkStatus();
loadDashboard();
setInterval(checkStatus, 10000);
