import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL =
  'https://dugkbpmmsderqjxbhmxq.supabase.co';

const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1Z2ticG1tc2RlcnFqeGJobXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMjU5NjYsImV4cCI6MjA5NDcwMTk2Nn0.HRD2ZvKVm-cIbkokn2eYZnUF-zHGI5AfJ0BokZOec1A';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/* ELEMENTS */

const emailInput =
  document.getElementById('email');

const passwordInput =
  document.getElementById('password');

const usernameInput =
  document.getElementById('username');

const signupBtn =
  document.getElementById('signupBtn');

const loginBtn =
  document.getElementById('loginBtn');

const logoutBtn =
  document.getElementById('logoutBtn');

const statusText =
  document.getElementById('statusText');

const messageInput =
  document.getElementById('messageInput');

const sendBtn =
  document.getElementById('sendBtn');

const messagesDiv =
  document.getElementById('messages');

/* USER STATE */

let currentUser = null;

/* SIGN UP */

signupBtn.addEventListener(
  'click',
  async () => {

    const email =
      emailInput.value.trim();

    const password =
      passwordInput.value.trim();

    const username =
      usernameInput.value.trim();

    if (!email ||
        !password ||
        !username) {

      alert('Fill all fields');
      return;
    }

    const { data, error } =
      await supabase.auth.signUp({

        email,
        password,

        options: {
          data: {
            username
          }
        }
      });

    if (error) {
      alert(error.message);
      return;
    }

    alert('Account created');
  }
);

/* LOGIN */

loginBtn.addEventListener(
  'click',
  async () => {

    const email =
      emailInput.value.trim();

    const password =
      passwordInput.value.trim();

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      alert(error.message);
      return;
    }

    currentUser = data.user;

    statusText.textContent =
      `Logged in as ${
        currentUser.user_metadata.username
      }`;

    loadMessages();
    subscribeToMessages();
  }
);

/* LOGOUT */

logoutBtn.addEventListener(
  'click',
  async () => {

    await supabase.auth.signOut();

    currentUser = null;

    statusText.textContent =
      'Logged out';
  }
);

/* LOAD MESSAGES */

async function loadMessages() {

  const { data, error } =
    await supabase
      .from('messages')
      .select('*')
      .order('created_at', {
        ascending: true
      });

  if (error) {
    console.error(error);
    return;
  }

  messagesDiv.innerHTML = '';

  data.forEach(addMessageToUI);
}

/* SEND */

sendBtn.addEventListener(
  'click',
  sendMessage
);

messageInput.addEventListener(
  'keydown',
  (e) => {

    if (e.key === 'Enter') {
      sendMessage();
    }
  }
);

async function sendMessage() {

  if (!currentUser) {
    alert('Login first');
    return;
  }

  const text =
    messageInput.value.trim();

  if (!text) return;

  const username =
    currentUser.user_metadata.username;

  const { error } =
    await supabase
      .from('messages')
      .insert([{

        user_id: currentUser.id,

        username,

        text
      }]);

  if (error) {
    console.error(error);
    return;
  }

  messageInput.value = '';
}

/* UI */

function addMessageToUI(message) {

  const div =
    document.createElement('div');

  const isSelf =
    currentUser &&
    message.user_id === currentUser.id;

  div.classList.add(
    'message'
  );

  div.classList.add(
    isSelf ? 'self' : 'other'
  );

  div.innerHTML = `
    <div class="username">
      ${escapeHtml(message.username)}
    </div>

    <div class="message-text">
      ${escapeHtml(message.text)}
    </div>
  `;

  messagesDiv.appendChild(div);

  messagesDiv.scrollTop =
    messagesDiv.scrollHeight;
}

/* REALTIME */

function subscribeToMessages() {

  supabase
    .channel('chat-room')

    .on(
      'postgres_changes',

      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      },

      (payload) => {
        addMessageToUI(payload.new);
      }
    )

    .subscribe();
}

/* SESSION */

async function restoreSession() {

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) return;

  currentUser = session.user;

  statusText.textContent =
    `Logged in as ${
      currentUser.user_metadata.username
    }`;

  loadMessages();
  subscribeToMessages();
}

restoreSession();

/* SECURITY */

function escapeHtml(str) {

  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
