import { db } from '../config/db.config.js';

class CFARequest {
  static async create(requestData) {
    const { bo_license, cfa_license, employee_id } = requestData;
    const query = `
      INSERT INTO business_owner_cfa_relation 
        (bo_license, cfa_license, employee_id, status) 
      VALUES 
        ($1, $2, $3, 'PENDING')
      RETURNING 
        id,
        bo_license,
        cfa_license,
        employee_id,
        status,
        created_at,
        updated_at
    `;
    const result = await db.query(query, [bo_license, cfa_license, employee_id]);
    return result.rows[0];
  }
  static async findById(id) {
    const query = `
      SELECT 
        id,
        bo_license,
        cfa_license,
        employee_id,
        status,
        created_at,
        updated_at
      FROM business_owner_cfa_relation
      WHERE id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findByBusinessOwner(bo_license) {
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
        c.employee_details as cfa_employees
      FROM business_owner_cfa_relation r
      JOIN cfa c ON c.cfa_license = r.cfa_license
      WHERE r.bo_license = $1
      ORDER BY r.created_at DESC
    `;
    const result = await db.query(query, [bo_license]);
    return result.rows;
  }

  static async findByCFA(cfa_license) {
    const query = `
      SELECT 
        r.id,
        r.bo_license,
        r.cfa_license,
        r.employee_id,
        r.status,
        r.created_at,
        r.updated_at,
        b.name as business_name
      FROM business_owner_cfa_relation r
      JOIN business_owner b ON b.business_license = r.bo_license
      WHERE r.cfa_license = $1
      ORDER BY r.created_at DESC
    `;
    const result = await db.query(query, [cfa_license]);
    return result.rows;
  }

  static async updateStatus(id, status) {
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }

    const query = `
      UPDATE business_owner_cfa_relation
      SET status = $1
      WHERE id = $2
      RETURNING 
        id,
        bo_license,
        cfa_license,
        employee_id,
        status,
        created_at,
        updated_at
    `;
    const result = await db.query(query, [status, id]);
    return result.rows[0];
  }

  static async assignEmployee(id, employee_id) {
    const query = `
      UPDATE business_owner_cfa_relation
      SET employee_id = $1
      WHERE id = $2
      RETURNING 
        id,
        bo_license,
        cfa_license,
        employee_id,
        status,
        created_at,
        updated_at
    `;
    const result = await db.query(query, [employee_id, id]);
    return result.rows[0];
  }
}

export default CFARequest;
