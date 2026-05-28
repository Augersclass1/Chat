

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL =
  'YOUR_SUPABASE_URL';

const SUPABASE_ANON_KEY =
  'YOUR_SUPABASE_ANON_KEY';

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

const rooms =
  document.getElementById('rooms');

const roomInput =
  document.getElementById('roomInput');

const createRoomBtn =
  document.getElementById('createRoomBtn');

const chatHeader =
  document.getElementById('chatHeader');

/* STATE */

let currentUser = null;

let currentRoom = 'global';

let channel = null;

const renderedMessages =
  new Set();

/* AUTH */

supabase.auth.onAuthStateChange(
  async (event, session) => {

    if (session?.user) {

      currentUser = session.user;

      status.innerText =
        'Logged in as ' +
        (
          currentUser.user_metadata
            ?.username || 'unknown'
        );

      await loadRooms();

      await loadMessages();

      subscribeRooms();

      subscribeMessages();

    } else {

      currentUser = null;

      status.innerText =
        'Logged out';

      messages.innerHTML = '';

      rooms.innerHTML = '';

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
          username:
            username.value
        }
      }
    });

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

  if (result.error) {
    alert(result.error.message);
  }
};

/* LOGOUT */

logoutBtn.onclick = async () => {
  await supabase.auth.signOut();
};

/* ROOM CREATION */

createRoomBtn.onclick =
  async () => {

    if (!currentUser) {
      alert('Login first');
      return;
    }

    const name =
      roomInput.value
        .trim()
        .toLowerCase();

    if (!name) return;

    const result =
      await supabase
        .from('rooms')
        .insert([{ name }]);

    if (result.error) {
      alert(result.error.message);
      return;
    }

    roomInput.value = '';
  };

/* LOAD ROOMS */

async function loadRooms() {

  const result =
    await supabase
      .from('rooms')
      .select('*')
      .order('name');

  if (result.error) {
    console.error(result.error);
    return;
  }

  rooms.innerHTML = '';

  result.data.forEach((room) => {

    const btn =
      document.createElement('button');

    btn.className =
      'room-btn';

    if (
      room.name === currentRoom
    ) {
      btn.classList.add('active');
    }

    btn.innerText =
      '# ' + room.name;

    btn.onclick = async () => {

      currentRoom =
        room.name;

      chatHeader.innerText =
        '# ' + currentRoom;

      document
        .querySelectorAll('.room-btn')
        .forEach((b) => {
          b.classList.remove('active');
        });

      btn.classList.add('active');

      await loadMessages();

      subscribeMessages();
    };

    rooms.appendChild(btn);
  });
}

/* ROOM REALTIME */

function subscribeRooms() {

  supabase

    .channel('rooms')

    .on(
      'postgres_changes',

      {
        event: 'INSERT',
        schema: 'public',
        table: 'rooms'
      },

      () => {
        loadRooms();
      }
    )

    .subscribe();
}

/* SEND MESSAGE */

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
          currentUser.user_metadata
            ?.username || 'unknown',

        text,

        room:
          currentRoom
      }]);

  if (result.error) {
    console.error(result.error);
  }
}

/* LOAD MESSAGES */

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

/* MESSAGE REALTIME */

function subscribeMessages() {

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

/* ADD MESSAGE */

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
