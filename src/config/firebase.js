const admin = require('firebase-admin');
const path = require('path');

// Pastikan file serviceAccountKey.json ada di root folder backend Anda
// Download dari Firebase Console > Project Settings > Service Accounts
try {
    const serviceAccount = require(path.join(__dirname, '../../serviceAccountKey.json'));

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    console.log('Firebase Admin Initialized');
} catch (error) {
    console.error('Firebase Admin Init Failed (Check serviceAccountKey.json):', error.message);
}

module.exports = admin;