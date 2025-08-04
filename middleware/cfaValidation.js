import { body, param, validationResult } from 'express-validator';

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// CFA validation rules
export const validateCreateCFA = [
  body('cfa_license')
    .trim()
    .notEmpty().withMessage('CFA license is required')
    .matches(/^[A-Z0-9-]+$/).withMessage('CFA license must contain only uppercase letters, numbers, and hyphens'),
  body('cfa_name')
    .trim()
    .notEmpty().withMessage('CFA name is required')
    .isLength({ min: 2, max: 100 }).withMessage('CFA name must be between 2 and 100 characters'),
  body('employees')
    .optional()
    .isArray().withMessage('Employees must be an array')
    .custom((employees) => {
      if (employees && employees.length > 0) {
        const validEmployees = employees.every(emp => 
          emp.employee_id && 
          emp.name && 
          emp.cid &&
          typeof emp.employee_id === 'string' &&
          typeof emp.name === 'string' &&
          typeof emp.cid === 'string'
        );
        if (!validEmployees) {
          throw new Error('Each employee must have employee_id, name, and cid as strings');
        }
      }
      return true;
    }),
  validateRequest
];

export const validateUpdateCFA = [
  param('license')
    .trim()
    .notEmpty().withMessage('CFA license is required')
    .matches(/^[A-Z0-9-]+$/).withMessage('CFA license must contain only uppercase letters, numbers, and hyphens'),
  body('cfa_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('CFA name must be between 2 and 100 characters'),
  body('employees')
    .optional()
    .isArray().withMessage('Employees must be an array')
    .custom((employees) => {
      if (employees && employees.length > 0) {
        const validEmployees = employees.every(emp => 
          emp.employee_id && 
          emp.name && 
          emp.cid &&
          typeof emp.employee_id === 'string' &&
          typeof emp.name === 'string' &&
          typeof emp.cid === 'string'
        );
        if (!validEmployees) {
          throw new Error('Each employee must have employee_id, name, and cid as strings');
        }
      }
      return true;
    }),
  validateRequest
];

export const validateAddEmployee = [
  param('license')
    .trim()
    .notEmpty().withMessage('CFA license is required')
    .matches(/^[A-Z0-9-]+$/).withMessage('CFA license must contain only uppercase letters, numbers, and hyphens'),
  body('employee_id')
    .trim()
    .notEmpty().withMessage('Employee ID is required')
    .matches(/^[A-Z0-9-]+$/).withMessage('Employee ID must contain only uppercase letters, numbers, and hyphens'),
  body('name')
    .trim()
    .notEmpty().withMessage('Employee name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Employee name must be between 2 and 100 characters'),
  body('cid')
    .trim()
    .notEmpty().withMessage('CID is required')
    .matches(/^\d{11}$/).withMessage('CID must be exactly 11 digits'),
  validateRequest
];

export const validateUpdateEmployee = [
  param('license')
    .trim()
    .notEmpty().withMessage('CFA license is required')
    .matches(/^[A-Z0-9-]+$/).withMessage('CFA license must contain only uppercase letters, numbers, and hyphens'),
  param('employeeId')
    .trim()
    .notEmpty().withMessage('Employee ID is required')
    .matches(/^[A-Z0-9-]+$/).withMessage('Employee ID must contain only uppercase letters, numbers, and hyphens'),
  body()
    .custom((body) => {
      if (Object.keys(body).length === 0) {
        throw new Error('At least one field to update is required');
      }
      const allowedFields = ['name', 'cid'];
      const invalidFields = Object.keys(body).filter(field => !allowedFields.includes(field));
      if (invalidFields.length > 0) {
        throw new Error(`Invalid fields: ${invalidFields.join(', ')}`);
      }
      if (body.name !== undefined) {
        if (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 100) {
          throw new Error('Name must be between 2 and 100 characters');
        }
      }
      if (body.cid !== undefined) {
        if (!body.cid.match(/^\d{11}$/)) {
          throw new Error('CID must be exactly 11 digits');
        }
      }
      return true;
    }),
  validateRequest
];

export const validateLicenseParam = [
  param('license')
    .trim()
    .notEmpty().withMessage('CFA license is required')
    .matches(/^[A-Z0-9-]+$/).withMessage('CFA license must contain only uppercase letters, numbers, and hyphens'),
  validateRequest
];

export const validateEmployeeParam = [
  param('license')
    .trim()
    .notEmpty().withMessage('CFA license is required')
    .matches(/^[A-Z0-9-]+$/).withMessage('CFA license must contain only uppercase letters, numbers, and hyphens'),
  param('employeeId')
    .trim()
    .notEmpty().withMessage('Employee ID is required')
    .matches(/^[A-Z0-9-]+$/).withMessage('Employee ID must contain only uppercase letters, numbers, and hyphens'),
  validateRequest
];
