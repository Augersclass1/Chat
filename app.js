import { createClient }
from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// PUT YOUR INFO HERE
const SUPABASE_URL = 'https://dugkbpmmsderqjxbhmxq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1Z2ticG1tc2RlcnFqeGJobXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMjU5NjYsImV4cCI6MjA5NDcwMTk2Nn0.HRD2ZvKVm-cIbkokn2eYZnUF-zHGI5AfJ0BokZOec1A';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const usernameInput =
  document.getElementById('username');

const joinBtn =
  document.getElementById('joinBtn');

const messagesDiv =
  document.getElementById('messages');

const messageInput =
  document.getElementById('messageInput');

const sendBtn =
  document.getElementById('sendBtn');

const statusText =
  document.getElementById('statusText');

let username = '';
let joined = false;

/* JOIN CHAT */

joinBtn.addEventListener('click', () => {

  const value = usernameInput.value.trim();

  if (!value) {
    alert('Enter a username');
    return;
  }

  username = value;
  joined = true;

  statusText.textContent =
    `Connected as ${username}`;

  loadMessages();
  subscribeToMessages();
});

/* LOAD OLD MESSAGES */

async function loadMessages() {

  const { data, error } = await supabase
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

/* SEND MESSAGE */

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

  if (!joined) {
    alert('Join first');
    return;
  }

  const text =
    messageInput.value.trim();

  if (!text) return;

  const { error } = await supabase
    .from('messages')
    .insert([
      {
        username,
        text
      }
    ]);

  if (error) {
    console.error(error);
    return;
  }

  messageInput.value = '';
}

/* ADD MESSAGE */

function addMessageToUI(message) {

  const div =
    document.createElement('div');

  const isSelf =
    message.username === username;

  div.classList.add('message');

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

/* SECURITY */

function escapeHtml(str) {

  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
