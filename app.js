import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://dugkbpmmsderqjxbhmxq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1Z2ticG1tc2RlcnFqeGJobXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMjU5NjYsImV4cCI6MjA5NDcwMTk2Nn0.HRD2ZvKVm-cIbkokn2eYZnUF-zHGI5AfJ0BokZOec1A';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (currentUser) {
      subscribe(); // reattach realtime
      loadMessages(); // optional resync
    }
  }
});
/* ELEMENTS */

const email = document.getElementById('email');
const password = document.getElementById('password');
const username = document.getElementById('username');

const signupBtn = document.getElementById('signupBtn');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');

const sendBtn = document.getElementById('sendBtn');
const messageInput = document.getElementById('messageInput');

const messages = document.getElementById('messages');
const status = document.getElementById('status');

/* STATE */

let currentUser = null;
let channel = null;

/* AUTH STATE HANDLER */

supabase.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    currentUser = session.user;

    status.innerText =
      'Logged in as ' +
      currentUser.user_metadata?.username;

    loadMessages();
    subscribe();
  } else {
    currentUser = null;
    status.innerText = 'Logged out';

    messages.innerHTML = '';

    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
  }
});

/* SIGNUP */

signupBtn.onclick = async () => {
  const result = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
    options: {
      data: {
        username: username.value
      }
    }
  });

  if (result.error) {
    alert(result.error.message);
    return;
  }

  alert('Signup successful. Check email if confirmation is required.');
};

/* LOGIN */

loginBtn.onclick = async () => {
  const result = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  });

  if (result.error) {
    alert(result.error.message);
  }
};

/* LOGOUT */

logoutBtn.onclick = async () => {
  await supabase.auth.signOut();
};

/* SEND MESSAGE */

sendBtn.onclick = sendMessage;

messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
  if (!currentUser) {
    alert('Login first');
    return;
  }

  const text = messageInput.value.trim();
  if (!text) return;

  const result = await supabase.from('messages').insert([
    {
      user_id: currentUser.id,
      username: currentUser.user_metadata?.username || 'unknown',
      text
    }
  ]);

  if (result.error) {
    console.error(result.error);
  }

  messageInput.value = '';
}

/* LOAD MESSAGES */

async function loadMessages() {
  const result = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true });

  if (result.error) {
    console.error(result.error);
    return;
  }

  messages.innerHTML = '';
  result.data.forEach(addMessage);
}

/* REALTIME */

function subscribe() {
  if (channel) {
    supabase.removeChannel(channel);
  }

  channel = supabase
    .channel('room')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      },
      (payload) => {
        addMessage(payload.new);
      }
    )
    .subscribe();
}

/* MESSAGE UI */

function addMessage(msg) {
  const div = document.createElement('div');

  const isSelf =
    currentUser &&
    msg.user_id === currentUser.id;

  div.classList.add('message');
  div.classList.add(isSelf ? 'self' : 'other');

  div.innerHTML = `
    <div class="username">
      ${escapeHtml(msg.username)}
    </div>
    <div class="message-text">
      ${escapeHtml(msg.text)}
    </div>
  `;

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

/* SECURITY */

function escapeHtml(str = '') {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
