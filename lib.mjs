import { createHmac, timingSafeEqual } from 'node:crypto';

export const MODES = Object.freeze({
  artifact: { label: 'Tổng quan tệp', command: 'inspect-artifact', extensions: null, note: 'Nhận dạng định dạng, cấu trúc và bằng chứng. Không thực thi tệp.' },
  managed: { label: '.NET — Assembly', command: 'inspect-managed-artifact', extensions: ['.exe', '.dll'], note: 'Đọc PE/CLI metadata của .NET.' },
  members: { label: '.NET — Thành viên', command: 'inspect-managed-members', extensions: ['.exe', '.dll'], note: 'Các kiểu, phương thức, CIL và tham chiếu.' },
  il2cpp: { label: 'Unity — IL2CPP', command: 'inspect-il2cpp-metadata', extensions: ['.dat'], note: 'Dành cho global-metadata.dat của Unity.' },
  javascript: { label: 'Electron — ASAR', command: 'analyze-javascript-application', extensions: ['.asar'], note: 'Phân tích tĩnh gói ASAR, không chạy ứng dụng.' },
  go: { label: 'Go — Binary', command: 'inspect-go-binary', extensions: ['.exe', '.bin', '.elf', '.so', '.dll'], note: 'Đọc thông tin Go nhúng trong binary.' },
  rust: { label: 'Rust — Binary', command: 'inspect-rust-binary', extensions: ['.exe', '.bin', '.elf', '.so', '.dll'], note: 'Phát hiện thông tin cargo-auditable.' },
  model: { label: 'AI — GGUF / Safetensors', command: 'inspect-model-artifact', extensions: ['.gguf', '.safetensors'], note: 'Đọc khai báo tensor và metadata mô hình.' },
  sqlite: { label: 'SQLite — Database', command: 'inspect-sqlite-database', extensions: ['.db', '.sqlite', '.sqlite3'], note: 'Xem schema và cấu trúc database.' },
  flutter: { label: 'Flutter — APK', command: 'identify-flutter-build', extensions: ['.apk'], note: 'Phân tích cấu trúc Flutter tĩnh; có thể không hỗ trợ mọi bản APK.' },
});

export const ALLOWED_EXTENSIONS = new Set([
  '.exe', '.dll', '.so', '.dylib', '.bin', '.dat', '.elf', '.apk', '.asar',
  '.zip', '.jar', '.pck', '.gguf', '.safetensors', '.wasm', '.db',
  '.sqlite', '.sqlite3', '.js', '.json', '.pak', '.pk2', '.ipa', '.aab',
]);

export function extensionOf(name) {
  if (typeof name !== 'string') return '';
  const found = name.toLowerCase().match(/(\.[a-z0-9]+)$/);
  return found?.[1] || '';
}

export function modeFor(kind, filename) {
  const selected = MODES[kind];
  if (!selected) return null;
  const ext = extensionOf(filename);
  if (!ALLOWED_EXTENSIONS.has(ext)) return null;
  if (selected.extensions && !selected.extensions.includes(ext)) return null;
  return selected;
}

export function cleanFilename(input) {
  return String(input || 'unknown')
    .replace(/[\\/\x00-\x1f\x7f]/g, '_')
    .slice(0, 140) || 'unknown';
}

export function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

export function signSession(payload, secret) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = createHmac('sha256', secret).update(data).digest('base64url');
  return data + '.' + mac;
}

export function verifySession(value, secret, now = Date.now()) {
  if (!value || typeof value !== 'string' || value.length > 1024) return null;
  const [data, mac, extra] = value.split('.');
  if (!data || !mac || extra !== undefined) return null;
  const expected = createHmac('sha256', secret).update(data).digest('base64url');
  if (!safeEqual(mac, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (parsed.role !== 'admin' || !Number.isSafeInteger(parsed.exp) || parsed.exp <= now) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function publicJob(job) {
  const { id, filename, kind, size, sha256, status, createdAt, startedAt, finishedAt, exitCode, error, preview, truncated } = job;
  return { id, filename, kind, size, sha256, status, createdAt, startedAt, finishedAt, exitCode, error, preview, truncated };
}
