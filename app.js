// Arya Messenger - Prototype
// Admin phone is intentionally not exposed in the UI.

const STORAGE_KEY = 'arya_messenger_v1';
const ADMIN_PHONE_HASH = btoa('09389726420'); // obfuscated, not displayed anywhere

let state = {
  currentUser: null,
  chats: [],
  channels: [],
  messages: {},
  activeId: null,
  activeType: null, // 'chat' | 'channel'
  isAdmin: false
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = { ...state, ...parsed };
    }
  } catch (e) {}
}

function saveState() {
  const toSave = {
    currentUser: state.currentUser,
    chats: state.chats,
    channels: state.channels,
    messages: state.messages
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

function isAdminPhone(phone) {
  return btoa(phone.replace(/\s/g, '')) === ADMIN_PHONE_HASH;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
}

// ---------- Auth ----------
document.getElementById('login-btn').addEventListener('click', () => {
  const phone = document.getElementById('phone-input').value.trim();
  const name = document.getElementById('name-input').value.trim() || 'کاربر';

  if (!/^09\d{9}$/.test(phone)) {
    alert('شماره موبایل باید به صورت 09xxxxxxxxx باشد');
    return;
  }

  state.currentUser = { phone, name, id: phone };
  state.isAdmin = isAdminPhone(phone);
  saveState();
  showMain();
});

function showMain() {
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('main-screen').classList.add('active');

  document.getElementById('user-name').textContent = state.currentUser.name;
  document.getElementById('user-avatar').textContent = state.currentUser.name.charAt(0);

  const adminBtn = document.getElementById('admin-btn');
  if (state.isAdmin) {
    adminBtn.style.display = 'block';
  } else {
    adminBtn.style.display = 'none';
  }

  renderLists();
}

document.getElementById('logout-btn').addEventListener('click', () => {
  state.currentUser = null;
  state.isAdmin = false;
  state.activeId = null;
  saveState();
  document.getElementById('main-screen').classList.remove('active');
  document.getElementById('auth-screen').classList.add('active');
});

// ---------- Tabs ----------
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderLists();
  });
});

function getActiveTab() {
  return document.querySelector('.tab.active').dataset.tab;
}

function renderLists() {
  const list = document.getElementById('chat-list');
  list.innerHTML = '';
  const tab = getActiveTab();

  if (tab === 'chats') {
    if (state.chats.length === 0) {
      list.innerHTML = '<p style="padding:1rem;color:var(--text-muted);font-size:0.9rem">هنوز چتی ندارید</p>';
      return;
    }
    state.chats.forEach(c => {
      const item = createListItem(c.id, c.name, c.lastMessage || 'شروع گفتگو', null, 'chat');
      list.appendChild(item);
    });
  } else {
    if (state.channels.length === 0) {
      list.innerHTML = '<p style="padding:1rem;color:var(--text-muted);font-size:0.9rem">هنوز کانالی ساخته نشده</p>';
      return;
    }
    state.channels.forEach(ch => {
      const item = createListItem(ch.id, ch.name, ch.lastMessage || 'کانال', ch.badge, 'channel');
      list.appendChild(item);
    });
  }
}

function createListItem(id, name, preview, badge, type) {
  const div = document.createElement('div');
  div.className = 'list-item' + (state.activeId === id ? ' active' : '');
  div.innerHTML = `
    <div class="avatar">${name.charAt(0)}</div>
    <div class="info">
      <div class="title">
        ${name}
        ${badge && badge !== 'none' ? `<span class="badge ${badge}"></span>` : ''}
      </div>
      <div class="preview">${preview}</div>
    </div>
  `;
  div.addEventListener('click', () => openConversation(id, type));
  return div;
}

// ---------- Conversations ----------
function openConversation(id, type) {
  state.activeId = id;
  state.activeType = type;
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('chat-view').style.display = 'flex';

  let title = '';
  let badge = null;

  if (type === 'chat') {
    const c = state.chats.find(x => x.id === id);
    title = c ? c.name : 'چت';
  } else {
    const ch = state.channels.find(x => x.id === id);
    title = ch ? ch.name : 'کانال';
    badge = ch ? ch.badge : null;
  }

  document.getElementById('chat-name').textContent = title;
  const badgeEl = document.getElementById('chat-badge');
  if (badge && badge !== 'none') {
    badgeEl.className = 'badge ' + badge;
    badgeEl.style.display = 'inline-flex';
  } else {
    badgeEl.style.display = 'none';
  }

  // Show verify button only for admin on channels
  const verifyBtn = document.getElementById('verify-btn');
  if (state.isAdmin && type === 'channel') {
    verifyBtn.style.display = 'inline-block';
  } else {
    verifyBtn.style.display = 'none';
  }

  renderMessages();
  renderLists();
}

function renderMessages() {
  const container = document.getElementById('messages');
  container.innerHTML = '';
  const key = state.activeId;
  const msgs = state.messages[key] || [];

  msgs.forEach(m => {
    const div = document.createElement('div');
    div.className = 'message ' + (m.from === state.currentUser.id ? 'mine' : 'theirs');
    div.innerHTML = `${m.text}<div class="meta">${formatTime(m.ts)}</div>`;
    container.appendChild(div);
  });
  container.scrollTop = container.scrollHeight;
}

document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('message-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
  const input = document.getElementById('message-input');
  const text = input.value.trim();
  if (!text || !state.activeId) return;

  if (!state.messages[state.activeId]) state.messages[state.activeId] = [];
  state.messages[state.activeId].push({
    id: uid(),
    from: state.currentUser.id,
    text,
    ts: Date.now()
  });

  // update last message
  if (state.activeType === 'chat') {
    const c = state.chats.find(x => x.id === state.activeId);
    if (c) c.lastMessage = text;
  } else {
    const ch = state.channels.find(x => x.id === state.activeId);
    if (ch) ch.lastMessage = text;
  }

  saveState();
  input.value = '';
  renderMessages();
  renderLists();
}

// ---------- New Chat / Channel ----------
document.getElementById('new-chat-btn').addEventListener('click', () => {
  const name = prompt('نام چت یا شخص مقابل:');
  if (!name) return;
  const id = uid();
  state.chats.push({ id, name, lastMessage: '' });
  state.messages[id] = [];
  saveState();
  renderLists();
  openConversation(id, 'chat');
});

document.getElementById('new-channel-btn').addEventListener('click', () => {
  const name = prompt('نام کانال:');
  if (!name) return;
  const id = uid();
  state.channels.push({
    id,
    name,
    lastMessage: '',
    badge: 'none',
    owner: state.currentUser.id
  });
  state.messages[id] = [];
  saveState();
  renderLists();
  openConversation(id, 'channel');
});

// ---------- Admin ----------
document.getElementById('admin-btn').addEventListener('click', () => {
  const select = document.getElementById('admin-channel-select');
  select.innerHTML = '';
  state.channels.forEach(ch => {
    const opt = document.createElement('option');
    opt.value = ch.id;
    opt.textContent = ch.name + (ch.badge !== 'none' ? ` [تیک ${ch.badge}]` : '');
    select.appendChild(opt);
  });
  document.getElementById('admin-modal').style.display = 'flex';
});

document.getElementById('close-admin-btn').addEventListener('click', () => {
  document.getElementById('admin-modal').style.display = 'none';
});

document.getElementById('apply-badge-btn').addEventListener('click', () => {
  const chId = document.getElementById('admin-channel-select').value;
  const badge = document.getElementById('badge-type').value;
  const ch = state.channels.find(x => x.id === chId);
  if (ch) {
    ch.badge = badge;
    saveState();
    renderLists();
    if (state.activeId === chId) openConversation(chId, 'channel');
    alert('تیک با موفقیت اعمال شد');
  }
});

document.getElementById('clear-users-btn').addEventListener('click', () => {
  if (!confirm('آیا مطمئنید همه داده‌های دمو (کاربران، چت‌ها و کانال‌ها) پاک شود؟')) return;
  state.chats = [];
  state.channels = [];
  state.messages = {};
  state.activeId = null;
  saveState();
  document.getElementById('chat-view').style.display = 'none';
  document.getElementById('empty-state').style.display = 'flex';
  renderLists();
  document.getElementById('admin-modal').style.display = 'none';
  alert('همه داده‌ها پاک شد');
});

// Quick verify from chat header
document.getElementById('verify-btn').addEventListener('click', () => {
  if (!state.isAdmin || state.activeType !== 'channel') return;
  const badge = prompt('نوع تیک (blue / gold / purple / green / none):', 'blue');
  if (!badge) return;
  const ch = state.channels.find(x => x.id === state.activeId);
  if (ch) {
    ch.badge = ['blue','gold','purple','green','none'].includes(badge) ? badge : 'blue';
    saveState();
    openConversation(state.activeId, 'channel');
    renderLists();
  }
});

// ---------- Init ----------
loadState();
if (state.currentUser) {
  state.isAdmin = isAdminPhone(state.currentUser.phone);
  showMain();
} else {
  document.getElementById('auth-screen').classList.add('active');
}
