import { db } from '../config/db.config.js';

export const updateRelationStatus = async (req, res) => {
  const { relationId } = req.params;
  const { status } = req.body;

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    const query = `
      UPDATE business_owner_cfa_relation
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(query, [status, relationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating relationship status:', error);
    res.status(500).json({ error: 'Failed to update relationship status' });
  }
};

export const getOwnerCFA = async (req, res) => {
    try {
        const { businessLicense } = req.params;

        console.log('Fetching CFA for business license:', businessLicense);

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
                c.employee_details
            FROM business_owner_cfa_relation r
            LEFT JOIN cfa c ON r.cfa_license = c.cfa_license
            WHERE r.bo_license = $1
            AND r.status IN ('APPROVED', 'PENDING','REJECTED')
            ORDER BY r.created_at DESC
        `;

        const result = await db.query(query, [businessLicense]);

        // Return all relationships, even if empty
        const relationships = result.rows.map(row => ({
            id: row.id,
            bo_license: row.bo_license,
            cfa_license: row.cfa_license,
            employee_id: row.employee_id,
            status: row.status,
            created_at: row.created_at,
            updated_at: row.updated_at,
            cfa_name: row.cfa_name,
            employee_details: row.employee_details
        }));

        res.json({
            success: true,
            data: relationships
        });

    } catch (error) {
        console.error('Error fetching owner CFA:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const createOwnerCFARelation = async (req, res) => {
    try {
        const { ownerId } = req.params;
        const { cfa_license } = req.body;

        // Check if already has a pending or approved relationship
        const checkQuery = `
            SELECT * FROM business_owner_cfa_relation
            WHERE bo_license = $1 AND status IN ('PENDING', 'APPROVED')
        `;
        const existing = await db.query(checkQuery, [ownerId]);

        if (existing.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Already has an active or pending CFA relationship'
            });
        }

        // Create new relationship
        const query = `
            INSERT INTO business_owner_cfa_relation
            (bo_license, cfa_license, status)
            VALUES ($1, $2, 'PENDING')
            RETURNING *
        `;

        const result = await db.query(query, [ownerId, cfa_license]);

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error creating CFA relationship:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
