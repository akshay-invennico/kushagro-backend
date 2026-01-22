const admin = require('firebase-admin');
const config = require('./config');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.firebase.FIREBASE_PROJECT_ID,
      clientEmail: config.firebase.FIREBASE_CLIENT_EMAIL,
      privateKey: config.firebase.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

module.exports = admin;
