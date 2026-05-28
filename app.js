
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

const email =
  document.getElementById('email');

const password =
  document.getElementById('password');

const username =
  document.getElementById('username');

const signupBtn =
  document.getElementById('signupBtn');

const loginBtn =
  document.getElementById('loginBtn');

const logoutBtn =
  document.getElementById('logoutBtn');

const sendBtn =
  document.getElementById('sendBtn');

const messageInput =
  document.getElementById('messageInput');

const messages =
  document.getElementById('messages');

const status =
  document.getElementById('status');

const roomButtons =
  document.querySelectorAll('.room-btn');

/* STATE */

let currentUser = null;
let channel = null;

let currentRoom = 'global';

const renderedMessages =
  new Set();

/* ROOM SWITCHING */

roomButtons.forEach((btn) => {

  btn.onclick = () => {

    currentRoom =
      btn.dataset.room;

    roomButtons.forEach((b) => {
      b.classList.remove('active');
    });

    btn.classList.add('active');

    loadMessages();
    subscribe();
  };
});

/* AUTH */

supabase.auth.onAuthStateChange(
  (event, session) => {

    if (session?.user) {

      currentUser = session.user;

      status.innerText =
        'Logged in as ' +
        currentUser.user_metadata?.username;

      loadMessages();
      subscribe();

    } else {

      currentUser = null;

      status.innerText =
        'Logged out';

      messages.innerHTML = '';

      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    }
  }
);

/* SIGNUP */

signupBtn.onclick = async () => {

  const result =
    await supabase.auth.signUp({

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

  alert(
    'Signup successful'
  );
};

/* LOGIN */

loginBtn.onclick = async () => {

  const result =
    await supabase.auth.signInWithPassword({

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

/* SEND */

sendBtn.onclick =
  sendMessage;

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

  messageInput.value = '';

  const result =
    await supabase
      .from('messages')
      .insert([{

        user_id:
          currentUser.id,

        username:
          currentUser.user_metadata?.username
          || 'unknown',

        text,

        room:
          currentRoom
      }]);

  if (result.error) {
    console.error(result.error);
  }
}

/* LOAD */

async function loadMessages() {

  const result =
    await supabase
      .from('messages')
      .select('*')

      .eq(
        'room',
        currentRoom
      )

      .order(
        'created_at',
        { ascending: true }
      );

  if (result.error) {
    console.error(result.error);
    return;
  }

  messages.innerHTML = '';

  renderedMessages.clear();

  result.data.forEach(addMessage);
}

/* REALTIME */

function subscribe() {

  if (channel) {
    supabase.removeChannel(channel);
  }

  channel = supabase

    .channel(
      'room:' + currentRoom
    )

    .on(
      'postgres_changes',

      {
        event: 'INSERT',

        schema: 'public',

        table: 'messages',

        filter:
          `room=eq.${currentRoom}`
      },

      (payload) => {
        addMessage(payload.new);
      }
    )

    .subscribe((status) => {

      console.log(
        'Realtime:',
        currentRoom,
        status
      );
    });
}

/* MESSAGE UI */

function addMessage(msg) {

  if (
    renderedMessages.has(msg.id)
  ) {
    return;
  }

  renderedMessages.add(msg.id);

  const div =
    document.createElement('div');

  const isSelf =
    currentUser &&
    msg.user_id === currentUser.id;

  div.classList.add('message');

  div.classList.add(
    isSelf ? 'self' : 'other'
  );

  div.innerHTML = `
    <div class="username">
      ${escapeHtml(msg.username)}
    </div>

    <div class="message-text">
      ${escapeHtml(msg.text)}
    </div>
  `;

  messages.appendChild(div);

  messages.scrollTop =
    messages.scrollHeight;
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
