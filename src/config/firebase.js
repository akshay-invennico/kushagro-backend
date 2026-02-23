const admin = require('firebase-admin');
const config = require('./config');

const privateKey = config.firebase.FIREBASE_PRIVATE_KEY;

if (!privateKey || typeof privateKey !== 'string') {
  throw new Error('Invalid FIREBASE_PRIVATE_KEY');
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.firebase.FIREBASE_PROJECT_ID,
      clientEmail: config.firebase.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey.includes('\\n') ? privateKey.replace(/\\n/g, '\n') : privateKey,
    }),
  });
}

module.exports = admin;
