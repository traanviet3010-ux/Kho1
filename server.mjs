import express from 'express';
import multer from 'multer';
import { randomUUID, createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ALLOWED_EXTENSIONS, MODES, cleanFilename, extensionOf, modeFor, publicJob, signSession, verifySession } from './lib.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'runtime-data'));
const JDIR = path.join(DATA, 'jobs');
const TDIR = path.join(DATA, 'uploads');
const PORT = Number(process.env.PORT || 10000);
const MAX_MB = Math.max(1, Math.min(100, Number(process.env.MAX_UPLOAD_MB) || 75));
const TIMEOUT = Math.max(10000, Math.min(600000, Number(process.env.REA_TIMEOUT_MS) || 180000));
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const PASSWORD = process.env.ADMIN_PASSWORD || '';
const SECRET = process.env.SESSION_SECRET || '';
const BIN = process.env.REA_EXECUTABLE || path.join(ROOT, 'node_modules', '.bin', 'rea');
if (PASSWORD.length < 12 || SECRET.length < 32) throw new Error('Set ADMIN_PASSWORD (12+ chars) and SESSION_SECRET (32+ chars)');
const salt = createHash('sha256').update(SECRET).digest();
const passwordHash = scryptSync(PASSWORD, salt, 64);
const jobs = new Map();
const attempts = new Map();
let queue = [], current = null, currentChild = null;
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; connect-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    'Cache-Control': req.path.startsWith('/api/') ? 'no-store' : 'no-cache',
  }); next();
});
app.use(express.json({ limit: '16kb', type: 'application/json' }));
app.use((req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const origin = req.get('origin'), host = req.get('host');
  if (origin && host && origin !== 'https://' + host && origin !== 'http://' + host)
    return res.status(403).json({ error: 'Yêu cầu khác nguồn bị từ chối.' });
  next();
});
const uploader = multer({
  dest: TDIR, limits: { fileSize: MAX_MB * 1024 * 1024, files: 1, fields: 2, parts: 3 },
  fileFilter: (_req, file, cb) => ALLOWED_EXTENSIONS.has(extensionOf(file.originalname))
    ? cb(null, true) : cb(new Error('Định dạng tệp chưa được cho phép.')),
});
const jf = id => path.join(JDIR, id);
const meta = id => path.join(jf(id), 'meta.json');
const report = id => path.join(jf(id), 'result.json');
const now = () => new Date().toISOString();
const fail = (res, status, msg) => res.status(status).json({ error: msg });
async function save(job) {
  await fs.writeFile(meta(job.id) + '.tmp', JSON.stringify(job), { mode: 0o600 });
  await fs.rename(meta(job.id) + '.tmp', meta(job.id));
}
async function initialize() {
  await fs.mkdir(JDIR, { recursive: true });
  await fs.mkdir(TDIR, { recursive: true });
  for (const entry of await fs.readdir(JDIR, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^[a-f0-9-]{36}$/.test(entry.name)) continue;
    try {
      const j = JSON.parse(await fs.readFile(meta(entry.name), 'utf8'));
      if (j.id !== entry.name) continue;
      if (['queued', 'running'].includes(j.status)) {
        j.status = 'failed'; j.error = 'Máy chủ khởi động lại trước khi hoàn thành.';
        j.finishedAt = now(); await save(j);
      }
      jobs.set(j.id, j);
    } catch (e) { console.error('Restore failed', entry.name, e.message); }
  }
  for (const file of await fs.readdir(TDIR))
    await fs.rm(path.join(TDIR, file), { force: true, recursive: true }).catch(() => {});
}
async function hashFile(file) {
  const sha = createHash('sha256');
  for await (const chunk of createReadStream(file)) sha.update(chunk);
  return sha.digest('hex');
}
function stop(child) {
  if (!child?.pid) return;
  try { process.platform === 'win32' ? child.kill('SIGKILL') : process.kill(-child.pid, 'SIGKILL'); }
  catch { try { child.kill('SIGKILL'); } catch {} }
}
async function analyze(job) {
  const target = path.join(jf(job.id), 'input' + extensionOf(job.filename));
  const child = spawn(BIN, [MODES[job.kind].command, target, '--json'], {
    cwd: jf(job.id), detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=384' },
  });
  currentChild = child;
  const dest = createWriteStream(report(job.id), { flags: 'wx', mode: 0o600 });
  let bytes = 0, oversized = false, stderr = '', timedOut = false;
  const timer = setTimeout(() => { timedOut = true; stop(child); }, TIMEOUT);
  child.stdout.on('data', chunk => {
    bytes += chunk.length;
    if (bytes > 16 * 1024 * 1024) { oversized = true; stop(child); return; }
    if (!dest.write(chunk)) {
      child.stdout.pause(); dest.once('drain', () => child.stdout.resume());
    }
  });
  child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-8000); });
  const outcome = await new Promise(resolve => {
    child.once('error', e => resolve({ code: -1, error: e.message }));
    child.once('close', (code, signal) => resolve({ code, signal }));
  });
  clearTimeout(timer);
  currentChild = null;
  await new Promise(resolve => dest.end(resolve));
  job.exitCode = outcome.code;
  const content = await fs.readFile(report(job.id), 'utf8').catch(() => '');
  job.preview = content.slice(0, 48000);
  job.truncated = content.length > 48000;
  if (job.status === 'cancelled') return;
  if (oversized) throw new Error('Báo cáo lớn hơn giới hạn 16 MB.');
  if (timedOut) throw new Error('Hết thời gian xử lý, tác vụ đã được dừng.');
  if (outcome.code !== 0) throw new Error((stderr || outcome.error || 'REA xử lý thất bại.').slice(-1400));
  if (!content.trim()) throw new Error('REA không trả về báo cáo.');
}
async function pump() {
  if (current || !queue.length) return;
  const id = queue.shift(), job = jobs.get(id);
  if (!job || job.status !== 'queued') return void pump();
  current = id; job.status = 'running'; job.startedAt = now();
  try {
    await save(job); await analyze(job);
    if (job.status === 'running') job.status = 'completed';
  } catch (e) {
    if (job.status !== 'cancelled') { job.status = 'failed'; job.error = String(e.message || e).slice(0, 1400); }
  } finally {
    job.finishedAt = now(); await save(job);
    current = null; setImmediate(() => void pump());
  }
}
function session(req) {
  const match = (req.get('cookie') || '').split(';').map(x => x.trim())
    .find(x => x.startsWith('rea_session='));
  return verifySession(match ? match.slice('rea_session='.length) : '', SECRET);
}
function auth(req, res, next) {
  if (!session(req)) return fail(res, 401, 'Phiên đăng nhập đã hết hạn.');
  next();
}
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'REA Web Việt Nam', version: '1.0.0', rea: '6.7.0' }));
app.post('/api/login', (req, res) => {
  const ip = req.ip || 'unknown';
  let attempt = attempts.get(ip) || { count: 0, until: Date.now() + 900000 };
  if (Date.now() > attempt.until) attempt = { count: 0, until: Date.now() + 900000 };
  if (attempt.count >= 8) return fail(res, 429, 'Thử lại sau 15 phút.');
  const username = typeof req.body?.username === 'string' ? req.body.username : '';
  const pass = typeof req.body?.password === 'string' ? req.body.password : '';
  if (pass.length > 2048) return fail(res, 400, 'Dữ liệu quá lớn.');
  const computed = scryptSync(pass, salt, 64);
  if (username !== ADMIN_USER || !timingSafeEqual(passwordHash, computed)) {
    attempt.count++; attempts.set(ip, attempt);
    return fail(res, 401, 'Sai tài khoản hoặc mật khẩu.');
  }
  attempts.delete(ip);
  const token = signSession({ role: 'admin', exp: Date.now() + 12 * 3600000 }, SECRET);
  res.cookie('rea_session', token, { httpOnly: true, sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 12 * 3600000 });
  res.json({ username: ADMIN_USER });
});
app.get('/api/me', auth, (_req, res) => res.json({ username: ADMIN_USER }));
app.post('/api/logout', auth, (_req, res) => {
  res.clearCookie('rea_session', { path: '/', sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
  res.json({ ok: true });
});
app.get('/api/capabilities', auth, (_req, res) => res.json({
  modes: MODES, maxUploadMb: MAX_MB, timeoutSeconds: TIMEOUT / 1000,
  notes: ['Không chạy file tải lên. Chỉ thực hiện các phép phân tích tĩnh từ danh sách cho phép.',
    'Ghidra/JADX và chức năng quan sát web động cần worker chuyên dụng, chưa bật.',
    'Muốn giữ lịch sử qua các lần triển khai, cần gắn Render Persistent Disk vào DATA_DIR.']
}));
app.get('/api/jobs', auth, (_req, res) => res.json({
  jobs: [...jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100).map(publicJob),
  runningId: current, queueLength: queue.length,
}));
app.post('/api/jobs', auth, (req, res, next) => uploader.single('file')(req, res, async err => {
  if (err) return fail(res, err.code === 'LIMIT_FILE_SIZE' ? 413 : 400, err.message || 'Không thể tải file.');
  if (!req.file) return fail(res, 400, 'Chưa chọn file.');
  const temporary = req.file.path;
  try {
    const name = cleanFilename(req.file.originalname);
    const kind = String(req.body?.kind || 'artifact');
    if (!modeFor(kind, name)) return fail(res, 400, 'Chế độ phân tích không phù hợp với file.');
    if (jobs.size >= 100) return fail(res, 429, 'Tối đa 100 tác vụ; hãy xóa lịch sử cũ.');
    const id = randomUUID();
    await fs.mkdir(jf(id), { mode: 0o700 });
    const target = path.join(jf(id), 'input' + extensionOf(name));
    await fs.rename(temporary, target);
    const job = { id, filename: name, kind, size: req.file.size,
      sha256: await hashFile(target), status: 'queued',
      createdAt: now(), startedAt: null, finishedAt: null, exitCode: null, error: null, preview: '', truncated: false };
    jobs.set(id, job); await save(job); queue.push(id);
    setImmediate(() => void pump());
    res.status(202).json({ job: publicJob(job) });
  } catch (e) { next(e); }
  finally { await fs.rm(temporary, { force: true }).catch(() => {}); }
}));
app.get('/api/jobs/:id', auth, (req, res) => {
  const j = jobs.get(req.params.id);
  return j ? res.json({ job: publicJob(j) }) : fail(res, 404, 'Không tìm thấy tác vụ.');
});
app.get('/api/jobs/:id/report', auth, (req, res) => {
  const j = jobs.get(req.params.id);
  if (!j || !existsSync(report(j.id))) return fail(res, 404, 'Chưa có báo cáo.');
  res.download(report(j.id), 'REA-' + j.id + '.json');
});
app.post('/api/jobs/:id/cancel', auth, async (req, res) => {
  const j = jobs.get(req.params.id);
  if (!j) return fail(res, 404, 'Không tìm thấy tác vụ.');
  if (!['queued', 'running'].includes(j.status)) return fail(res, 409, 'Tác vụ đã kết thúc.');
  j.status = 'cancelled'; j.error = 'Đã dừng theo yêu cầu.'; j.finishedAt = now();
  queue = queue.filter(x => x !== j.id);
  if (current === j.id) stop(currentChild);
  await save(j); res.json({ job: publicJob(j) });
});
app.delete('/api/jobs/:id', auth, async (req, res) => {
  const j = jobs.get(req.params.id);
  if (!j) return fail(res, 404, 'Không tìm thấy tác vụ.');
  if (['queued', 'running'].includes(j.status)) return fail(res, 409, 'Dừng tác vụ trước khi xóa.');
  jobs.delete(j.id);
  await fs.rm(jf(j.id), { recursive: true, force: true });
  res.json({ ok: true });
});
app.use('/api', (_req, res) => fail(res, 404, 'API không tồn tại.'));
app.use(express.static(path.join(ROOT, 'public'), { index: 'index.html', fallthrough: false }));
app.use((err, req, res, next) => {
  console.error('Request error:', err?.message || err);
  if (res.headersSent) return next(err);
  return fail(res, 500, 'Lỗi máy chủ.');
});
await initialize();
app.listen(PORT, '0.0.0.0', () => console.log('REA Web ready at port ' + PORT));
