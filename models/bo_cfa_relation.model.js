import { db } from '../config/db.config.js';

class BusinessOwnerCFARelation {
  static async create(bo_license, cfa_license, employee_id) {
    const query = `
      INSERT INTO business_owner_cfa_relation 
      (bo_license, cfa_license, employee_id, status)
      VALUES ($1, $2, $3, 'PENDING')
      RETURNING *
    `;
    const result = await db.query(query, [bo_license, cfa_license, employee_id]);
    return result.rows[0];
  }

  static async findByBusinessOwner(bo_license) {
    const query = `
      SELECT r.*, c.cfa_name, e.name as employee_name
      FROM business_owner_cfa_relation r
      JOIN cfa c ON r.cfa_license = c.cfa_license
      JOIN cfa_employees e ON r.employee_id = e.employee_id
      WHERE r.bo_license = $1
      ORDER BY r.created_at DESC
      LIMIT 1
    `;
    const result = await db.query(query, [bo_license]);
    return result.rows[0];
  }

  static async findByEmployeeId(employee_id) {
    const query = `
      SELECT r.*, b.name as business_name, b.business_license, c.cfa_name
      FROM business_owner_cfa_relation r
      JOIN business_owner b ON r.bo_license = b.business_license
      JOIN cfa c ON r.cfa_license = c.cfa_license
      WHERE r.employee_id = $1
      ORDER BY r.created_at DESC
    `;
    const result = await db.query(query, [employee_id]);
    return result.rows;
  }

  static async updateStatus(id, status, employee_id) {
    const query = `
      UPDATE business_owner_cfa_relation
      SET status = $1
      WHERE id = $2 AND employee_id = $3
      RETURNING *
    `;
    const result = await db.query(query, [status, id, employee_id]);
    return result.rows[0];
  }
}

export default BusinessOwnerCFARelation;
