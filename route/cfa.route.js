import express from 'express';
import {
  getAllCFAs,
  getCFAByLicense,
  createCFA,
  updateCFA,
  deleteCFA,
  addCFAEmployee,
  updateCFAEmployee,
  removeCFAEmployee
} from '../controller/cfaController.js';
import { validateToken } from '../middleware/authMiddleware.js';
import {
  validateCreateCFA,
  validateUpdateCFA,
  validateAddEmployee,
  validateUpdateEmployee,
  validateLicenseParam,
  validateEmployeeParam
} from '../middleware/cfaValidation.js';

const router = express.Router();

// Apply authentication middleware to all CFA routes
router.use(validateToken);

// CFA routes
router.get('/', getAllCFAs);
router.get('/:license', validateLicenseParam, getCFAByLicense);
router.post('/', validateCreateCFA, createCFA);
router.put('/:license', validateUpdateCFA, updateCFA);
router.delete('/:license', validateLicenseParam, deleteCFA);

// CFA Employee routes
router.post('/:license/employees', validateAddEmployee, addCFAEmployee);
router.put('/:license/employees/:employeeId', validateUpdateEmployee, updateCFAEmployee);
router.delete('/:license/employees/:employeeId', validateEmployeeParam, removeCFAEmployee);

export default router;
