import { db } from '../config/db.config.js';

export const getAgentCFA = async (req, res) => {
    try {
        // Fixed: Use correct parameter name that matches the route
        const { cfaLicense } = req.params;

        console.log('Fetching owner requests for CFA license:', cfaLicense);

        // Fixed: Added employee_details to SELECT clause
        const query = `
  SELECT 
      r.id,
      r.bo_license,
      r.cfa_license,
      r.employee_id,
      r.status,
      r.created_at,
      r.updated_at,
      c.cfa_name,
      c.employee_details,
      b.name AS business_owner_name
  FROM business_owner_cfa_relation r
  LEFT JOIN cfa c ON r.cfa_license = c.cfa_license
  LEFT JOIN business_owner b ON r.bo_license = b.business_license
  WHERE r.cfa_license = $1
  AND r.status IN ('APPROVED', 'PENDING','REJECTED')
  ORDER BY r.created_at DESC
`;


        const result = await db.query(query, [cfaLicense]);

        const relations = result.rows.map(row => ({
            id: row.id,
            bo_license: row.bo_license,
            bo_name: row.business_owner_name,  // alias used in SELECT
            cfa_license: row.cfa_license,
            employee_id: row.employee_id,
            status: row.status,
            created_at: row.created_at,
            updated_at: row.updated_at,
            cfa_name: row.cfa_name,
            employee_details: row.employee_details
        }));
        // Fixed: Return 'data' instead of 'relations' to match frontend expectation
        res.json({
            success: true,
            data: relations  // Changed from 'relations' to 'data'
        });
    } catch (error) {
        console.error('Error fetching agent relations:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message  // Added error details for debugging
        });
    }
};