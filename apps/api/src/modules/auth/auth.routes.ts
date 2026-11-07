import { Router } from 'express';
import { AuthController } from './auth.controller';
import { requireAuthentication } from '../../middleware/auth';
import { requireActiveUser } from '../../middleware/rbac';

const router = Router();

router.get('/me', requireAuthentication, requireActiveUser, AuthController.getMe);

export default router;

