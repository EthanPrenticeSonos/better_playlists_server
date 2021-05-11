const Firestore = require('@google-cloud/firestore');
const PROJECT_ID = 'betterplaylists-f5b1f';

// require and initialize the admin SDK
import admin = require('firebase-admin');

const util = require('../util/util');

if (util.isLocal) {
    var serviceAccount = require("../../../betterplaylists-f5b1f-firebase-adminsdk-b37df-fabea8905e.json");
    admin.initializeApp({
        'credential': admin.credential.cert(serviceAccount)
    });
    module.exports.firestore = admin.firestore();
}
else {
    admin.initializeApp();
    module.exports.firestore = new Firestore({
      'projectId': PROJECT_ID,
      'timestampsInSnapshots': true,
    });
}
