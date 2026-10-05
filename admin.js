const $ = id => document.getElementById(id);
let config = null;
let adminToken = '';
let apiBase = '';
const statusPage = () => location.hash === '#status';
function feedback(message, error = false) { $('feedback').textContent = message; $('feedback').classList.toggle('error', error); }
async function api(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, { ...options, headers: { 'X-Dragon-Admin': '1', 'Authorization': `Bearer ${adminToken}`, ...options.headers } });
  const data = await response.json();
  if (!response.ok) throw Error(data.message || 'คำขอไม่สำเร็จ');
  return data;
}
async function save() {
  await api('/admin/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
  feedback('บันทึกและเผยแพร่แล้ว');
}
function render() {
  $('login').hidden = true; $('editor').hidden = false;
  $('patch-page').hidden = statusPage(); $('status-page').hidden = !statusPage();
  $('patch-link').classList.toggle('active', !statusPage());
  $('status-link').classList.toggle('active', statusPage());
  $('maintenance').checked = config.maintenance; $('message').value = config.message;
  $('launch-url').value = config.launchURL;
  const list = $('patch-list'); list.replaceChildren();
  const replace = $('replace'); replace.replaceChildren(new Option('เพิ่มฟังก์ชันใหม่', ''));
  for (const patch of config.patches) {
    replace.add(new Option(`${patch.name} · ${patch.version}`, patch.id));
    const row = document.createElement('div'); row.className = 'patch-row';
    const details = document.createElement('div');
    const title = document.createElement('strong'); title.textContent = patch.name;
    const subtitle = document.createElement('small'); subtitle.textContent = `${patch.version} · ${patch.enabled ? 'แสดงในแอป' : 'ซ่อนจากแอป'}`;
    details.append(title, subtitle);
    const toggle = document.createElement('button'); toggle.className = 'ghost'; toggle.textContent = patch.enabled ? 'ซ่อน' : 'แสดง';
    toggle.onclick = async () => { patch.enabled = !patch.enabled; try { await save(); render(); } catch (error) { feedback(error.message, true); } };
    const remove = document.createElement('button'); remove.className = 'ghost danger'; remove.textContent = 'ลบรายการ';
    remove.onclick = async () => { config.patches = config.patches.filter(item => item.id !== patch.id); try { await save(); render(); } catch (error) { feedback(error.message, true); } };
    row.append(details, toggle, remove); list.append(row);
  }
  if (!config.patches.length) { const empty = document.createElement('p'); empty.className = 'muted'; empty.textContent = 'ยังไม่มีแพตช์'; list.append(empty); }
}
async function load() {
  try { config = await api('/admin/config'); render(); }
  catch (error) { if (error.message !== 'เข้าสู่ระบบผู้ดูแลก่อน') feedback(error.message, true); }
}
$('login-form').onsubmit = async event => {
  event.preventDefault();
  try {
    const url = new URL($('api-url').value.trim());
    if (url.protocol !== 'https:') throw Error('API ต้องเป็น HTTPS');
    apiBase = url.origin;
    adminToken = $('token').value;
    await api('/admin/login', { method: 'POST' });
    localStorage.setItem('dragon-free-api-url', apiBase);
    $('token').value = ''; feedback(''); await load();
  }
  catch (error) { feedback(error.message, true); }
};
$('patch-file').onchange = () => { $('file-name').textContent = $('patch-file').files?.[0]?.name || 'ยังไม่ได้เลือกไฟล์'; };
$('patch-form').onsubmit = async event => {
  event.preventDefault(); const button = $('upload'); const file = $('patch-file').files?.[0];
  if (!file || !file.name.toLowerCase().endsWith('.3105') || file.size > 100 * 1024 * 1024) return feedback('เลือกไฟล์ .3105 ขนาดไม่เกิน 100 MB', true);
  button.disabled = true; feedback('กำลังอัปโหลดแพตช์…');
  try {
    const result = await api(`/admin/patch-file?filename=${encodeURIComponent(file.name)}`, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: file });
    const old = config.patches.find(patch => patch.id === $('replace').value);
    const patch = { id: old?.id || `patch-${crypto.randomUUID()}`, name: $('name').value.trim(), subtitle: $('subtitle').value.trim(), version: $('version').value.trim(), password: $('password').value, enabled: old?.enabled ?? true, patchURL: result.url };
    config.patches = old ? config.patches.map(item => item.id === old.id ? patch : item) : [...config.patches, patch];
    await save(); $('patch-form').reset(); $('file-name').textContent = 'ยังไม่ได้เลือกไฟล์'; render();
  } catch (error) { feedback(error.message, true); }
  finally { button.disabled = false; }
};
$('save-launch').onclick = async () => { config.launchURL = $('launch-url').value.trim(); try { await save(); } catch (error) { feedback(error.message, true); } };
$('save-status').onclick = async () => { config.maintenance = $('maintenance').checked; config.message = $('message').value.trim(); try { await save(); } catch (error) { feedback(error.message, true); } };
$('logout').onclick = () => { adminToken = ''; config = null; $('editor').hidden = true; $('login').hidden = false; feedback('ออกจากระบบแล้ว'); };
$('api-url').value = localStorage.getItem('dragon-free-api-url') || '';
addEventListener('hashchange', () => { if (config) render(); });

