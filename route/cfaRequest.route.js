import express from 'express';
import {
  createCFARequest,
  getBusinessOwnerRequests,
  getCFARequests,
  updateRequestStatus,
  assignEmployee
} from '../controller/cfaRequestController.js';

const router = express.Router();

// Business owner routes
router.post('/owner/cfa-request', createCFARequest);
router.get('/owner/:bo_license/cfa-requests', getBusinessOwnerRequests);

// CFA routes
router.get('/cfa/:cfa_license/requests', getCFARequests);
router.put('/cfa/request/:id/status', updateRequestStatus);
router.put('/cfa/request/:id/employee', assignEmployee);

export default router;
