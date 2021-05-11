import * as express from 'express';

import { router as authRouter, authMiddleware } from './auth';
import { router as playlistRouter} from './playlists';
import { router as userRouter } from './users';


export const router = express.Router({'mergeParams': true});

router.use('/auth', authRouter);

router.use('/playlists', authMiddleware);
router.use('/users', authMiddleware);

router.use('/playlists', playlistRouter);
router.use('/users', userRouter);