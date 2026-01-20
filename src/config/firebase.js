const admin = require('firebase-admin');
const serviceAccount = require('./khushagro-c87ff-3453e63af1d7.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = admin;
