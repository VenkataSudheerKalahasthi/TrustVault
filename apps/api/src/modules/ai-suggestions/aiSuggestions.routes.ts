import { Router } from 'express';
import { AISuggestionsController } from './aiSuggestions.controller';
import { requireAuthentication } from '../../middleware/auth';
import { requireActiveUser } from '../../middleware/rbac';
import { requireDocumentPermission } from '../../middleware/documentAuth';
import { strictRateLimiter } from '../../middleware/rateLimiter';

const router = Router();

router.use(requireAuthentication, requireActiveUser);

// Generate AI suggestions for a document: requires document OWNER
router.post('/documents/:id/ai-suggestions', strictRateLimiter, requireDocumentPermission('OWNER'), AISuggestionsController.generate);

// List AI suggestions for a document: requires document OWNER
router.get('/documents/:id/ai-suggestions', requireDocumentPermission('OWNER'), AISuggestionsController.list);

// Human Owner review and decision (Approve or Reject with permission choice)
router.post('/ai-suggestions/:id/decision', strictRateLimiter, AISuggestionsController.processDecision);

export default router;
