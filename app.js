import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://dugkbpmmsderqjxbhmxq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1Z2ticG1tc2RlcnFqeGJobXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMjU5NjYsImV4cCI6MjA5NDcwMTk2Nn0.HRD2ZvKVm-cIbkokn2eYZnUF-zHGI5AfJ0BokZOec1A';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

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

const sendBtn =
  document.getElementById('sendBtn');

const messageInput =
  document.getElementById('messageInput');

const messages =
  document.getElementById('messages');

const status =
  document.getElementById('status');

let currentUser = null;

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

  console.log(result);

  if (result.error) {
    alert(result.error.message);
    return;
  }

  alert('Signup successful');
};

/* LOGIN */

loginBtn.onclick = async () => {

  const result =
    await supabase.auth.signInWithPassword({

      email: email.value,

      password: password.value
    });

  console.log(result);

  if (result.error) {
    alert(result.error.message);
    return;
  }

  currentUser = result.data.user;

  status.innerText =
    'Logged in as ' +
    currentUser.user_metadata.username;

  loadMessages();

  subscribe();
};

/* SEND MESSAGE */

sendBtn.onclick = async () => {

  if (!currentUser) {
    alert('Login first');
    return;
  }

  const text =
    messageInput.value.trim();

  if (!text) return;

  const result =
    await supabase
      .from('messages')
      .insert([{

        user_id: currentUser.id,

        username:
          currentUser.user_metadata.username,

        text
      }]);

  console.log(result);

  messageInput.value = '';
};

/* LOAD */

async function loadMessages() {

  const result =
    await supabase
      .from('messages')
      .select('*')
      .order('created_at');

  console.log(result);

  messages.innerHTML = '';

  result.data.forEach(addMessage);
}

/* REALTIME */

function subscribe() {

  supabase
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

/* UI */

function addMessage(msg) {

  const div =
    document.createElement('div');

  div.className = 'message';

  div.innerHTML =
    '<b>' +
    escapeHtml(msg.username) +
    '</b><br>' +
    escapeHtml(msg.text);

  messages.appendChild(div);

  messages.scrollTop =
    messages.scrollHeight;
}

/* SECURITY */

function escapeHtml(str) {

  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
