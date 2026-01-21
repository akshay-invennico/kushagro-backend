const admin = require('firebase-admin');
const config = require('./config');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(config.firebase.firebasejson),
  });
}

module.exports = admin;
