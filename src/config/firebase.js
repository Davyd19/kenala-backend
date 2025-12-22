const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ FATAL ERROR: serviceAccountKey.json tidak ditemukan!');
    console.error('   Mohon letakkan file tersebut di root folder project.');

} else {
    try {
        const serviceAccount = require(serviceAccountPath);

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('✅ Firebase Admin Initialized Successfully');
        }
    } catch (error) {
        console.error('❌ Firebase Init Error:', error.message);
    }
}

module.exports = admin;