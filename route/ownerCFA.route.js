import express from 'express';
import { 
  getOwnerCFA, 
  createOwnerCFARelation,
  updateRelationStatus
} from '../controller/ownerCFAController.js';
import { validateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware
// router.use(validateToken);

// Get owner's current CFA relationship
router.get('/:businessLicense/cfa', getOwnerCFA);

// Create a new CFA relationship request
router.post('/:businessLicense/cfa', createOwnerCFARelation);

// Update CFA relationship status
router.put('/:relationId', updateRelationStatus);

export default router;
