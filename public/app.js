'use strict';
const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];
const state = { jobs: [], modes: {}, current: null, selected: null, page: 'overview', active: false, maxUploadMb: 25, polling: null };
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const statusName = { queued:'Đang chờ', running:'Đang phân tích', completed:'Hoàn thành', failed:'Thất bại', cancelled:'Đã hủy' };
const humanBytes = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
const humanDate = x => x ? new Date(x).toLocaleString('vi-VN') : '—';
let toastTimer;
function notify(message) {
  const el = $('#toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 4300);
}
async function api(url, options = {}) {
  const res = await fetch(url, { credentials: 'same-origin', ...options });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && url !== '/api/login') showLogin();
    throw new Error(json.error || 'Lỗi HTTP ' + res.status);
  }
  return json;
}
function showLogin() {
  state.active = false;
  if (state.polling) clearInterval(state.polling);
  $('#login-screen').classList.remove('hidden');
  $('#app-shell').classList.add('hidden');
  hideDrawer();
}
async function showApp() {
  state.active = true;
  $('#login-screen').classList.add('hidden');
  $('#app-shell').classList.remove('hidden');
  const c = await api('/api/capabilities');
  state.modes = c.modes || {};
  state.maxUploadMb = c.maxUploadMb || 25;
  $('#upload-limit').textContent = 'Tối đa ' + state.maxUploadMb + ' MB';
  $('#mode').innerHTML = Object.entries(state.modes).map(([key,m]) => '<option value="' + escapeHtml(key) + '">' + escapeHtml(m.label) + '</option>').join('');
  $('#mode-note').textContent = state.modes.artifact?.note || '';
  $('#mode-list').innerHTML = Object.entries(state.modes).map(([key,m]) =>
    '<div class="tool-line"><strong>' + escapeHtml(m.label) + '</strong><span>' + escapeHtml(m.note) +
    ' <small class="muted">(' + escapeHtml(m.command) + ')</small></span></div>').join('');
  $('#storage-notes').innerHTML = (c.notes || []).map(n => '<div class="tool-line">' + escapeHtml(n) + '</div>').join('');
  $('#server-status').textContent = 'REA ' + '6.7.0 · Tác vụ chạy tuần tự · Giới hạn ' + (c.timeoutSeconds || 180) + ' giây mỗi tác vụ.';
  await refresh();
  if (state.polling) clearInterval(state.polling);
  state.polling = setInterval(() => { if (state.active) refresh().catch(() => {}); }, 2500);
}
function go(page) {
  state.page = page;
  $$('.page').forEach(el => el.classList.toggle('hidden', el.id !== 'page-' + page));
  $$('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  const labels = { overview:'Tổng quan', new:'Phân tích mới', history:'Lịch sử tác vụ', tools:'Công cụ & thiết lập' };
  $('#crumb').textContent = labels[page] || 'Tổng quan';
  if (page === 'history') $('#search').focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function row(job) {
  return '<tr>' +
    '<td><span class="file-title">' + escapeHtml(job.filename) + '</span><span class="file-sub">' + escapeHtml(state.modes[job.kind]?.label || job.kind) + '</span></td>' +
    '<td>' + humanBytes(job.size) + '</td>' +
    '<td><span class="status status-' + escapeHtml(job.status) + '">' + escapeHtml(statusName[job.status] || job.status) + '</span></td>' +
    '<td>' + escapeHtml(humanDate(job.createdAt)) + '</td>' +
    '<td><button type="button" class="row-action" data-action="view" data-id="' + escapeHtml(job.id) + '">Xem chi tiết →</button></td></tr>';
}
function table(items) {
  if (!items.length) return '<div class="empty"><div>⌁</div><strong>Chưa có tác vụ nào</strong><p>Tải file lên để bắt đầu tạo báo cáo REA.</p></div>';
  return '<table class="data-table"><thead><tr><th>Tên file</th><th>Dung lượng</th><th>Trạng thái</th><th>Ngày tạo</th><th>Chi tiết</th></tr></thead><tbody>' +
    items.map(row).join('') + '</tbody></table>';
}
async function refresh() {
  const data = await api('/api/jobs');
  state.jobs = data.jobs || [];
  const jobs = state.jobs;
  $('#metric-total').textContent = jobs.length;
  $('#metric-done').textContent = jobs.filter(j => j.status === 'completed').length;
  $('#metric-busy').textContent = jobs.filter(j => ['queued','running'].includes(j.status)).length;
  $('#metric-failed').textContent = jobs.filter(j => j.status === 'failed').length;
  $('#recent-jobs').innerHTML = table(jobs.slice(0, 6));
  const query = ($('#search').value || '').trim().toLowerCase();
  $('#all-jobs').innerHTML = table(query ? jobs.filter(j =>
    j.filename.toLowerCase().includes(query) || j.sha256?.toLowerCase().includes(query)) : jobs);
  if (state.selected) {
    const job = jobs.find(j => j.id === state.selected);
    if (job) renderDetail(job);
    else hideDrawer();
  }
}
function showDrawer(id) {
  state.selected = id;
  const job = state.jobs.find(j => j.id === id);
  if (!job) return;
  $('#drawer').classList.remove('hidden');
  $('#drawer-backdrop').classList.remove('hidden');
  renderDetail(job);
}
function hideDrawer() {
  state.selected = null;
  $('#drawer').classList.add('hidden');
  $('#drawer-backdrop').classList.add('hidden');
}
function renderDetail(job) {
  const running = ['queued','running'].includes(job.status);
  const output = $('#drawer-content');
  const body = '<div class="detail-title">' + escapeHtml(job.filename) + '</div>' +
    '<div class="detail-grid">' +
    '<div><small>Trạng thái</small><span class="status status-' + escapeHtml(job.status) + '">' + escapeHtml(statusName[job.status]) + '</span></div>' +
    '<div><small>Chế độ phân tích</small><strong>' + escapeHtml(state.modes[job.kind]?.label || job.kind) + '</strong></div>' +
    '<div><small>Kích thước tệp</small><strong>' + humanBytes(job.size) + '</strong></div>' +
    '<div><small>Thời gian bắt đầu</small><strong>' + escapeHtml(humanDate(job.startedAt || job.createdAt)) + '</strong></div>' +
    '<div style="grid-column:span 2"><small>SHA-256</small><strong>' + escapeHtml(job.sha256) + '</strong></div></div>' +
    (job.error ? '<p class="field-error">' + escapeHtml(job.error) + '</p>' : '') +
    '<div class="drawer-buttons">' +
    (running ? '<button class="secondary-btn danger" data-action="cancel" data-id="' + escapeHtml(job.id) + '">Dừng tác vụ</button>' : '') +
    (!running ? '<a class="secondary-btn" href="/api/jobs/' + encodeURIComponent(job.id) + '/report">↓ Tải báo cáo</a>' +
      '<button class="secondary-btn danger" data-action="delete" data-id="' + escapeHtml(job.id) + '">Xóa tác vụ</button>' : '') + '</div>' +
    '<div class="report-label">Kết quả và bằng chứng từ REA</div>' +
    '<pre class="report-pre" id="detail-output"></pre>' +
    (job.truncated ? '<p class="muted">Đang xem bản rút gọn; tải file để xem kết quả đầy đủ.</p>' : '');
  // Avoid rerendering identical details while the user selects/copies report text.
  const fingerprint = JSON.stringify([job.status, job.error, job.preview?.length, job.exitCode]);
  if (output.dataset.fingerprint === fingerprint && output.dataset.job === job.id) return;
  output.dataset.fingerprint = fingerprint;
  output.dataset.job = job.id;
  output.innerHTML = body;
  const pre = $('#detail-output');
  if (job.preview) {
    let rendered = job.preview;
    try { rendered = JSON.stringify(JSON.parse(rendered), null, 2); } catch {}
    pre.textContent = rendered;
  } else pre.textContent = running ? 'REA đang xếp hàng hoặc xử lý file. Dữ liệu sẽ cập nhật tự động...' : 'Không có nội dung kết quả.';
}
$('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.target.querySelector('button[type=submit]');
  button.disabled = true;
  $('#login-error').textContent = '';
  try {
    await api('/api/login', { method:'POST', headers:{ 'Content-Type':'application/json' },
      body:JSON.stringify({ username:$('#username').value, password:$('#password').value }) });
    $('#password').value = '';
    await showApp();
  } catch (e) { $('#login-error').textContent = e.message; }
  finally { button.disabled = false; }
});
$('#logout').addEventListener('click', async () => {
  await api('/api/logout', { method:'POST' }).catch(() => {});
  showLogin(); notify('Đã đăng xuất.');
});
$$('[data-page]').forEach(el => el.addEventListener('click', () => go(el.dataset.page)));
$$('[data-goto]').forEach(el => el.addEventListener('click', () => go(el.dataset.goto)));
$('#search').addEventListener('input', () => {
  const query = $('#search').value.toLowerCase();
  $('#all-jobs').innerHTML = table(state.jobs.filter(j =>
    j.filename.toLowerCase().includes(query) || j.sha256?.toLowerCase().includes(query)));
});
$('#mode').addEventListener('change', () => {
  $('#mode-note').textContent = state.modes[$('#mode').value]?.note || '';
});
const zone = $('#dropzone'), fileField = $('#file');
zone.addEventListener('click', () => fileField.click());
zone.addEventListener('keydown', ev => { if (['Enter',' '].includes(ev.key)) { ev.preventDefault(); fileField.click(); } });
zone.addEventListener('dragover', ev => { ev.preventDefault(); zone.classList.add('drag-over'); });
zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
zone.addEventListener('drop', ev => {
  ev.preventDefault(); zone.classList.remove('drag-over');
  if (ev.dataTransfer?.files?.length) { fileField.files = ev.dataTransfer.files; fileField.dispatchEvent(new Event('change')); }
});
fileField.addEventListener('change', () => {
  const file = fileField.files?.[0];
  const el = $('#chosen-file');
  el.classList.toggle('hidden', !file);
  if (!file) return;
  el.textContent = '◈ ' + file.name + '  ·  ' + humanBytes(file.size);
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (state.modes[$('#mode').value]?.extensions && !state.modes[$('#mode').value].extensions.includes(ext)) {
    $('#mode').value = 'artifact'; $('#mode').dispatchEvent(new Event('change'));
  }
});
$('#upload-form').addEventListener('submit', async event => {
  event.preventDefault();
  const file = fileField.files?.[0];
  if (!file) return notify('Hãy chọn tệp cần phân tích.');
  if (file.size > state.maxUploadMb * 1024 * 1024) return notify('File vượt giới hạn ' + state.maxUploadMb + ' MB.');
  const button = $('#start-analysis'); button.disabled = true; button.textContent = 'Đang tải lên và tạo tác vụ...';
  try {
    const fd = new FormData(); fd.append('file', file); fd.append('kind', $('#mode').value);
    const result = await api('/api/jobs', { method:'POST', body:fd });
    notify('Đã tạo tác vụ thành công.');
    fileField.value = ''; $('#chosen-file').classList.add('hidden');
    await refresh();
    go('history');
    showDrawer(result.job.id);
  } catch (e) { notify(e.message); }
  finally { button.disabled = false; button.textContent = '⚡ Bắt đầu phân tích →'; }
});
document.addEventListener('click', async ev => {
  const el = ev.target.closest('[data-action]');
  if (!el) return;
  const { action, id } = el.dataset;
  if (action === 'view') return showDrawer(id);
  if (action === 'cancel') {
    try { await api('/api/jobs/' + encodeURIComponent(id) + '/cancel', { method:'POST' }); notify('Đã gửi yêu cầu dừng.'); await refresh(); }
    catch (e) { notify(e.message); }
  }
  if (action === 'delete') {
    if (!confirm('Xóa tác vụ và dữ liệu đã tải lên?')) return;
    try { await api('/api/jobs/' + encodeURIComponent(id), { method:'DELETE' }); hideDrawer(); await refresh(); notify('Đã xóa tác vụ.'); }
    catch (e) { notify(e.message); }
  }
});
$('#close-drawer').addEventListener('click', hideDrawer);
$('#drawer-backdrop').addEventListener('click', hideDrawer);
document.addEventListener('keydown', ev => { if (ev.key === 'Escape') hideDrawer(); });
api('/api/me').then(showApp).catch(showLogin);
