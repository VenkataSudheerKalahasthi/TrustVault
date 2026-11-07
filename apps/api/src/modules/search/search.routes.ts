import { Router } from 'express';
import { SearchController } from './search.controller';
import { requireAuthentication } from '../../middleware/auth';
import { requireActiveUser } from '../../middleware/rbac';

const router = Router();

router.use(requireAuthentication, requireActiveUser);

router.get('/', SearchController.search);

export default router;
