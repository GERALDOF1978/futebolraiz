// Importa os scripts do Firebase em segundo plano
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAfUCj3xrFMuiNcnRxOWzY1RKGPtVyI75Y",
  authDomain: "futebolraiz-fg.firebaseapp.com",
  projectId: "futebolraiz-fg",
  storageBucket: "futebolraiz-fg.firebasestorage.app",
  messagingSenderId: "566002250035",
  appId: "1:566002250035:web:f4beaf33d22a2d0c1d0e46",
  measurementId: "G-3DHJYTDTKN"
};

// Inicializa o Firebase no fundo
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Escuta a mensagem e joga na tela com a sua logo!
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'https://i.ibb.co/jZ5x1t1g/loginho.png',
    badge: 'https://i.ibb.co/jZ5x1t1g/loginho.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});