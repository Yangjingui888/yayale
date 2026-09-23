/* ============ 本机账号体系：注册 / 登录 / 会话 / 超管管理（数据全部存当前浏览器） ============ */
const Auth = (() => {
  const AKEY = 'qiqu-accounts-v1';
  const CKEY = 'qiqu-current';
  const ADMIN = 'admin';
  const ADMIN_INIT_PASS = 'yayale-admin';
  const AVATARS = ['🦊', '🐰', '🐼', '🐨', '🦁', '🐷', '🐸', '🐵', '🦄', '🐝', '🐙', '🦖'];

  function loadAll() { try { return JSON.parse(localStorage.getItem(AKEY)) || {}; } catch (e) { return {}; } }
  function saveAll(map) { try { localStorage.setItem(AKEY, JSON.stringify(map)); } catch (e) {} }
  function randSalt() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

  /* 密码散列：安全上下文用 SHA-256；http+IP 访问回退 djb2 双哈希（本机防窥级，不做强安全） */
  async function hash(pass, salt) {
    const text = salt + pass;
    if (window.crypto && crypto.subtle && window.isSecureContext) {
      try {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return 's$' + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {}
    }
    let h1 = 5381, h2 = 53687091;
    for (let i = 0; i < text.length; i++) {
      h1 = ((h1 * 33) ^ text.charCodeAt(i)) >>> 0;
      h2 = (h2 * 31 + text.charCodeAt(i) * (i + 7)) >>> 0;
    }
    return 'd$' + h1.toString(36) + h2.toString(36);
  }

  const norm = u => String(u || '').trim().toLowerCase();
  const validName = u => /^[\u4e00-\u9fa5a-z0-9_]{2,12}$/.test(u);

  /* 首次运行种入内置超管（忘记密码时用它重置其他账号） */
  async function ensureAdmin() {
    const map = loadAll();
    if (map[ADMIN]) return;
    const salt = randSalt();
    map[ADMIN] = { u: ADMIN, salt, passHash: await hash(ADMIN_INIT_PASS, salt), nickname: '超级管理员', avatar: '🛡️', role: 'admin', createdAt: new Date().toISOString() };
    saveAll(map);
  }

  async function register(username, password, nickname, avatar) {
    const u = norm(username);
    if (!validName(u)) return { ok: false, err: '账号需 2-12 位，可用汉字 / 字母 / 数字 / 下划线' };
    if (!password || password.length < 4) return { ok: false, err: '密码至少 4 位' };
    const map = loadAll();
    if (map[u]) return { ok: false, err: '这个账号已经存在，请直接登录' };
    const salt = randSalt();
    map[u] = {
      u, salt, passHash: await hash(password, salt),
      nickname: (String(nickname || '').trim().slice(0, 8) || u),
      avatar: avatar || AVATARS[Math.random() * AVATARS.length | 0],
      role: 'user', createdAt: new Date().toISOString(),
    };
    saveAll(map);
    localStorage.setItem(CKEY, u);
    return { ok: true, u };
  }

  async function login(username, password) {
    const u = norm(username);
    const acc = loadAll()[u];
    if (!acc) return { ok: false, err: '账号不存在，可以先注册' };
    if (await hash(String(password), acc.salt) !== acc.passHash) return { ok: false, err: '密码不对，再试一次' };
    localStorage.setItem(CKEY, u);
    return { ok: true, u };
  }

  function logout() { localStorage.removeItem(CKEY); }
  function current() { const u = norm(localStorage.getItem(CKEY)); return u && loadAll()[u] ? u : null; }
  function get(u) { return loadAll()[norm(u === undefined ? current() : u)] || null; }
  function isAdmin(u) { const a = get(u); return !!a && a.role === 'admin'; }

  function updateProfile(patch, u = current()) {
    const map = loadAll();
    if (!map[u]) return false;
    if (patch.nickname !== undefined) map[u].nickname = String(patch.nickname).trim().slice(0, 8) || map[u].nickname;
    if (patch.avatar !== undefined && AVATARS.includes(patch.avatar)) map[u].avatar = patch.avatar;
    saveAll(map);
    return true;
  }

  async function changePassword(oldPass, newPass, u = current()) {
    if (!newPass || newPass.length < 4) return { ok: false, err: '新密码至少 4 位' };
    const map = loadAll();
    if (!map[u]) return { ok: false, err: '账号不存在' };
    if (await hash(String(oldPass), map[u].salt) !== map[u].passHash) return { ok: false, err: '旧密码不对' };
    map[u].salt = randSalt();
    map[u].passHash = await hash(newPass, map[u].salt);
    saveAll(map);
    return { ok: true };
  }

  /* ---------- 超管专用 ---------- */
  async function resetPasswordByAdmin(target, newPass) {
    if (!isAdmin()) return { ok: false, err: '只有超级管理员可以重置密码' };
    if (!newPass || newPass.length < 4) return { ok: false, err: '新密码至少 4 位' };
    const map = loadAll();
    if (!map[norm(target)]) return { ok: false, err: '账号不存在' };
    map[norm(target)].salt = randSalt();
    map[norm(target)].passHash = await hash(newPass, map[norm(target)].salt);
    saveAll(map);
    return { ok: true };
  }
  function listUsers() {
    return Object.values(loadAll()).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  }
  function deleteUser(target) {
    if (!isAdmin()) return { ok: false, err: '只有超级管理员可以删除账号' };
    const u = norm(target);
    const map = loadAll();
    if (!map[u]) return { ok: false, err: '账号不存在' };
    if (u === ADMIN) return { ok: false, err: '超级管理员账号不可删除' };
    if (u === current()) return { ok: false, err: '不能删除当前登录的账号' };
    delete map[u];
    saveAll(map);
    try { localStorage.removeItem(Store.SAVE_PREFIX + u); } catch (e) {}
    return { ok: true };
  }

  return { ADMIN, ADMIN_INIT_PASS, AVATARS, validName, ensureAdmin, register, login, logout, current, get, isAdmin, updateProfile, changePassword, resetPasswordByAdmin, listUsers, deleteUser };
})();
