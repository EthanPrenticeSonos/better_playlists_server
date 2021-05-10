const express = require('express');

const auth = require('./auth.js');
const playlists = require('./playlists.js');
const users = require('./users.js');


var router = express.Router({'mergeParams': true});

router.use('/auth', auth.router);

router.use('/playlists', auth.authMiddleware);
router.use('/users', auth.authMiddleware);

router.use('/playlists', playlists.router);
router.use('/users', users.router);

router.get('/', (req, res) => {
    res.write('spotify');
});

module.exports.router = router;