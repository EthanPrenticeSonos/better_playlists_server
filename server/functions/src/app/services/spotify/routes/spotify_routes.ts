import * as express from 'express';

const auth = require('./auth');
const playlists = require('./playlists');
const users = require('./users');


var router = express.Router({'mergeParams': true});

router.use('/auth', auth.router);

router.use('/playlists', auth.authMiddleware);
router.use('/users', auth.authMiddleware);

router.use('/playlists', playlists.router);
router.use('/users', users.router);

module.exports.router = router;