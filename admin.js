(function () {
  const LS_KEY = 'bikeAdminConnection';
  const API = 'https://api.github.com';

  let conn = null;      // { token, owner, repo, branch }
  let bikes = [];
  let bikesSha = null;
  let config = {};
  let configSha = null;
  let editingId = null;
  let pendingImageBase64 = null; // { data, name } when a file is chosen

  // ---------------- Connection persistence ----------------
  function loadConnection() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); }
    catch { return null; }
  }
  function saveConnection(c) { localStorage.setItem(LS_KEY, JSON.stringify(c)); }
  function clearConnection() { localStorage.removeItem(LS_KEY); }

  // ---------------- GitHub API helpers ----------------
  function ghHeaders() {
    return {
      Authorization: `token ${conn.token}`,
      Accept: 'application/vnd.github+json'
    };
  }

  function b64EncodeUtf8(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }
  function b64DecodeUtf8(b64) {
    return decodeURIComponent(escape(atob(b64.replace(/\n/g, ''))));
  }

  async function ghGetFile(path) {
    const url = `${API}/repos/${conn.owner}/${conn.repo}/contents/${path}?ref=${conn.branch}`;
    const res = await fetch(url, { headers: ghHeaders() });
    if (res.status === 404) return { content: null, sha: null };
    if (!res.ok) throw new Error(`GitHub read failed for ${path}: ${res.status} ${res.statusText}`);
    const data = await res.json();
    return { content: b64DecodeUtf8(data.content), sha: data.sha };
  }

  async function ghPutFile(path, contentStr, sha, message) {
    const url = `${API}/repos/${conn.owner}/${conn.repo}/contents/${path}`;
    const body = {
      message,
      content: b64EncodeUtf8(contentStr),
      branch: conn.branch
    };
    if (sha) body.sha = sha;
    const res = await fetch(url, { method: 'PUT', headers: { ...ghHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(`GitHub write failed for ${path}: ${res.status} ${errBody.message || res.statusText}`);
    }
    return res.json();
  }

  async function ghPutImage(filename, base64Data) {
    const path = `images/${filename}`;
    const url = `${API}/repos/${conn.owner}/${conn.repo}/contents/${path}`;
    const body = { message: `Add image ${filename}`, content: base64Data, branch: conn.branch };
    const res = await fetch(url, { method: 'PUT', headers: { ...ghHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(`Image upload failed: ${res.status} ${errBody.message || res.statusText}`);
    }
    return path; // relative path usable directly from index.html
  }

  // ---------------- Screen switching ----------------
  const setupScreen = document.getElementById('setup-screen');
  const adminApp = document.getElementById('admin-app');

  function showAdmin() { setupScreen.classList.add('hidden'); adminApp.classList.remove('hidden'); }
  function showSetup() { setupScreen.classList.remove('hidden'); adminApp.classList.add('hidden'); }

  // ---------------- Setup / Connect ----------------
  document.getElementById('s-connect').addEventListener('click', async () => {
    const token = document.getElementById('s-token').value.trim();
    const owner = document.getElementById('s-owner').value.trim();
    const repo = document.getElementById('s-repo').value.trim();
    const branch = document.getElementById('s-branch').value.trim() || 'main';
    const statusEl = document.getElementById('s-status');

    if (!token || !owner || !repo) {
      statusEl.textContent = 'Please fill in token, username and repo.';
      statusEl.className = 'status-msg err';
      return;
    }

    statusEl.textContent = 'Connecting…';
    statusEl.className = 'status-msg pending';
    conn = { token, owner, repo, branch };

    try {
      // Test by reading (or confirming absence of) data/bikes.json
      await ghGetFile('data/bikes.json');
      saveConnection(conn);
      statusEl.textContent = '';
      await bootAdmin();
    } catch (err) {
      statusEl.textContent = err.message || 'Connection failed. Check token and repo name.';
      statusEl.className = 'status-msg err';
    }
  });

  document.getElementById('disconnect-btn').addEventListener('click', () => {
    if (confirm('Disconnect this browser from GitHub? You will need to re-enter your token to edit again.')) {
      clearConnection();
      conn = null;
      showSetup();
    }
  });

  // ---------------- Boot ----------------
  async function bootAdmin() {
    showAdmin();
    await loadConfig();
    await loadBikes();
  }

  async function loadConfig() {
    const configStatus = document.getElementById('config-status');
    try {
      const { content, sha } = await ghGetFile('data/config.json');
      config = content ? JSON.parse(content) : {};
      configSha = sha;
      Object.keys(config).forEach(key => {
        const el = document.getElementById('c-' + key);
        if (el) el.value = config[key];
      });
    } catch (err) {
      configStatus.textContent = 'Could not load config.json: ' + err.message;
      configStatus.className = 'status-msg err';
    }
  }

  async function loadBikes() {
    const { content, sha } = await ghGetFile('data/bikes.json');
    bikes = content ? JSON.parse(content) : [];
    bikesSha = sha;
    renderStockTable();
  }

  // ---------------- Config save ----------------
  document.getElementById('save-config-btn').addEventListener('click', async () => {
    const statusEl = document.getElementById('config-status');
    const fields = ['businessName', 'tagline', 'city', 'phone', 'whatsapp', 'hours', 'address', 'aboutText'];
    const updated = {};
    fields.forEach(f => { updated[f] = document.getElementById('c-' + f).value; });

    statusEl.textContent = 'Saving…';
    statusEl.className = 'status-msg pending';
    try {
      const fresh = await ghGetFile('data/config.json'); // avoid stale sha
      await ghPutFile('data/config.json', JSON.stringify(updated, null, 2), fresh.sha, 'Update business info');
      config = updated;
      configSha = null;
      statusEl.textContent = 'Saved. Live in ~30–60 seconds.';
      statusEl.className = 'status-msg ok';
    } catch (err) {
      statusEl.textContent = err.message;
      statusEl.className = 'status-msg err';
    }
  });

  // ---------------- Bike form ----------------
  const bikeForm = document.getElementById('bike-form');
  const imgFileInput = document.getElementById('b-image-file');
  const imgUrlInput = document.getElementById('b-image-url');
  const imgPreview = document.getElementById('b-image-preview');

  imgFileInput.addEventListener('change', () => {
    const file = imgFileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result; // data:image/png;base64,XXXX
      pendingImageBase64 = { data: dataUrl.split(',')[1], name: sanitizeFilename(file.name) };
      imgPreview.innerHTML = `<img src="${dataUrl}" alt="preview" />`;
      imgUrlInput.value = '';
    };
    reader.readAsDataURL(file);
  });

  imgUrlInput.addEventListener('input', () => {
    if (imgUrlInput.value) {
      pendingImageBase64 = null;
      imgFileInput.value = '';
      imgPreview.innerHTML = `<img src="${imgUrlInput.value}" alt="preview" onerror="this.parentElement.innerHTML='<span>Could not load that URL</span>'" />`;
    }
  });

  function sanitizeFilename(name) {
    const ts = Date.now();
    const clean = name.replace(/[^a-zA-Z0-9._-]/g, '-');
    return `${ts}-${clean}`;
  }

  function resetBikeForm() {
    bikeForm.reset();
    editingId = null;
    pendingImageBase64 = null;
    imgPreview.innerHTML = '<span>No image selected</span>';
    document.getElementById('bike-submit-btn').textContent = 'Add Bike';
    document.getElementById('b-id').value = '';
  }

  document.getElementById('bike-cancel-btn').addEventListener('click', resetBikeForm);

  bikeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const statusEl = document.getElementById('bike-status');
    statusEl.textContent = 'Saving…';
    statusEl.className = 'status-msg pending';

    try {
      let imagePath = imgUrlInput.value.trim();

      if (pendingImageBase64) {
        statusEl.textContent = 'Uploading photo…';
        imagePath = await ghPutImage(pendingImageBase64.name, pendingImageBase64.data);
      }

      if (!imagePath) {
        // keep existing image if editing, otherwise placeholder
        const existing = bikes.find(b => b.id === editingId);
        imagePath = existing ? existing.image : '';
      }

      const bikeData = {
        id: editingId || `bk-${Date.now()}`,
        brand: document.getElementById('b-brand').value.trim(),
        model: document.getElementById('b-model').value.trim(),
        year: Number(document.getElementById('b-year').value),
        price: Number(document.getElementById('b-price').value),
        km: Number(document.getElementById('b-km').value),
        condition: document.getElementById('b-condition').value,
        ownership: document.getElementById('b-ownership').value.trim(),
        fuel: document.getElementById('b-fuel').value.trim(),
        color: document.getElementById('b-color').value.trim(),
        docs: document.getElementById('b-docs').value.trim(),
        status: document.getElementById('b-status').value,
        description: document.getElementById('b-description').value.trim(),
        image: imagePath
      };

      // refresh bikes + sha right before writing, to reduce clobbering concurrent edits
      const fresh = await ghGetFile('data/bikes.json');
      let freshBikes = fresh.content ? JSON.parse(fresh.content) : [];

      if (editingId) {
        freshBikes = freshBikes.map(b => (b.id === editingId ? bikeData : b));
      } else {
        freshBikes.unshift(bikeData);
      }

      await ghPutFile('data/bikes.json', JSON.stringify(freshBikes, null, 2), fresh.sha,
        editingId ? `Update bike ${bikeData.brand} ${bikeData.model}` : `Add bike ${bikeData.brand} ${bikeData.model}`);

      bikes = freshBikes;
      renderStockTable();
      resetBikeForm();
      statusEl.textContent = 'Saved. Live in ~30–60 seconds.';
      statusEl.className = 'status-msg ok';
    } catch (err) {
      statusEl.textContent = err.message;
      statusEl.className = 'status-msg err';
    }
  });

  // ---------------- Stock table ----------------
  function renderStockTable() {
    const tbody = document.getElementById('stock-tbody');
    document.getElementById('stock-count').textContent = bikes.length;
    tbody.innerHTML = bikes.map(b => `
      <tr>
        <td><img src="${b.image}" alt="" /></td>
        <td>${b.brand} ${b.model}</td>
        <td>${b.year}</td>
        <td>₹${Number(b.price).toLocaleString('en-IN')}</td>
        <td>${Number(b.km).toLocaleString('en-IN')}</td>
        <td><span class="status-badge ${b.status}">${b.status}</span></td>
        <td class="row-actions">
          <button data-action="edit" data-id="${b.id}">Edit</button>
          <button data-action="toggle" data-id="${b.id}">${b.status === 'sold' ? 'Mark Available' : 'Mark Sold'}</button>
          <button data-action="delete" data-id="${b.id}">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  document.getElementById('stock-tbody').addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    const bike = bikes.find(b => b.id === id);
    if (!bike) return;

    if (action === 'edit') {
      editingId = id;
      Object.entries(bike).forEach(([key, val]) => {
        const el = document.getElementById('b-' + key);
        if (el) el.value = val;
      });
      imgUrlInput.value = bike.image || '';
      imgPreview.innerHTML = bike.image ? `<img src="${bike.image}" alt="preview" />` : '<span>No image selected</span>';
      document.getElementById('bike-submit-btn').textContent = 'Update Bike';
      window.scrollTo({ top: document.getElementById('bike-form').offsetTop - 90, behavior: 'smooth' });
    }

    if (action === 'delete') {
      if (!confirm(`Delete ${bike.brand} ${bike.model}? This cannot be undone.`)) return;
      try {
        const fresh = await ghGetFile('data/bikes.json');
        let freshBikes = (fresh.content ? JSON.parse(fresh.content) : []).filter(b => b.id !== id);
        await ghPutFile('data/bikes.json', JSON.stringify(freshBikes, null, 2), fresh.sha, `Delete bike ${bike.brand} ${bike.model}`);
        bikes = freshBikes;
        renderStockTable();
      } catch (err) { alert(err.message); }
    }

    if (action === 'toggle') {
      try {
        const fresh = await ghGetFile('data/bikes.json');
        let freshBikes = fresh.content ? JSON.parse(fresh.content) : [];
        freshBikes = freshBikes.map(b => b.id === id ? { ...b, status: b.status === 'sold' ? 'available' : 'sold' } : b);
        await ghPutFile('data/bikes.json', JSON.stringify(freshBikes, null, 2), fresh.sha, `Toggle status for ${bike.brand} ${bike.model}`);
        bikes = freshBikes;
        renderStockTable();
      } catch (err) { alert(err.message); }
    }
  });

  // ---------------- Init ----------------
  conn = loadConnection();
  if (conn) {
    bootAdmin().catch(err => {
      alert('Saved connection failed: ' + err.message + '\nPlease reconnect.');
      clearConnection();
      showSetup();
    });
  } else {
    showSetup();
  }
})();
