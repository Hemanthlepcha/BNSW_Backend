import { db } from '../config/db.config.js';

class CFA {
  static async findAll() {
    const query = `
      SELECT 
        id,
        cfa_license,
        cfa_name,
        employee_details as employees,
        created_at,
        updated_at
      FROM cfa
      ORDER BY created_at DESC
    `;
    const result = await db.query(query);
    return result.rows;
  }

  static async findByLicense(license) {
    const query = `
      SELECT 
        id,
        cfa_license,
        cfa_name,
        employee_details as employees,
        created_at,
        updated_at
      FROM cfa
      WHERE cfa_license = $1

    `;
    const result = await db.query(query, [license]);
    return result.rows[0];
  }

  static async findByEmployeeDetails(name, cid) {
    // Using JSONB containment operator @> to check for employee with matching name and cid
    const query = `
      SELECT 
        id,
        cfa_license,
        cfa_name,
        employee_details as employees,
        created_at,
        updated_at
      FROM cfa
      WHERE EXISTS (
        SELECT 1
        FROM jsonb_array_elements(employee_details) AS employee
        WHERE employee->>'name' = $1 AND employee->>'cid' = $2
      )
    `;
    
    try {
      const result = await db.query(query, [name, cid]);
      console.log('FindByEmployeeDetails result:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in findByEmployeeDetails:', error);
      throw error;
    }
  }

  static async create(cfaData) {
    const { cfa_license, cfa_name, employees = [] } = cfaData;
    const query = `
      INSERT INTO cfa (cfa_license, cfa_name, employee_details)
      VALUES ($1, $2, $3)
      RETURNING 
        id,
        cfa_license,
        cfa_name,
        employee_details as employees,
        created_at,
        updated_at
    `;
    const result = await db.query(query, [cfa_license, cfa_name, JSON.stringify(employees)]);
    return result.rows[0];
  }

  static async update(license, cfaData) {
    const { cfa_name, employees } = cfaData;
    const updates = [];
    const values = [license];
    let valueCount = 1;

    if (cfa_name !== undefined) {
      updates.push(`cfa_name = $${++valueCount}`);
      values.push(cfa_name);
    }
    
    if (employees !== undefined) {
      updates.push(`employee_details = $${++valueCount}`);
      values.push(JSON.stringify(employees));
    }

    if (updates.length === 0) return null;

    const query = `
      UPDATE cfa
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE cfa_license = $1
      RETURNING 
        id,
        cfa_license,
        cfa_name,
        employee_details as employees,
        created_at,
        updated_at
    `;
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async addEmployee(license, employee) {
    const query = `
      UPDATE cfa
      SET employee_details = COALESCE(employee_details, '[]'::jsonb) || $2::jsonb,
          updated_at = CURRENT_TIMESTAMP
      WHERE cfa_license = $1
      RETURNING 
        id,
        cfa_license,
        cfa_name,
        employee_details as employees,
        created_at,
        updated_at
    `;
    const result = await db.query(query, [license, JSON.stringify(employee)]);
    return result.rows[0];
  }

  static async removeEmployee(license, employeeId) {
    const query = `
      UPDATE cfa
      SET employee_details = (
        SELECT jsonb_agg(emp)
        FROM jsonb_array_elements(employee_details) emp
        WHERE (emp->>'employee_id')::text != $2::text
      ),
      updated_at = CURRENT_TIMESTAMP
      WHERE cfa_license = $1
      RETURNING 
        id,
        cfa_license,
        cfa_name,
        employee_details as employees,
        created_at,
        updated_at
    `;
    const result = await db.query(query, [license, employeeId]);
    return result.rows[0];
  }

  static async updateEmployee(license, employeeId, updates) {
    const query = `
      UPDATE cfa
      SET employee_details = (
        SELECT jsonb_agg(
          CASE
            WHEN (emp->>'employee_id')::text = $2::text
            THEN emp || $3::jsonb
            ELSE emp
          END
        )
        FROM jsonb_array_elements(employee_details) emp
      ),
      updated_at = CURRENT_TIMESTAMP
      WHERE cfa_license = $1
      RETURNING 
        id,
        cfa_license,
        cfa_name,
        employee_details as employees,
        created_at,
        updated_at
    `;
    const result = await db.query(query, [license, employeeId, JSON.stringify(updates)]);
    return result.rows[0];
  }

  static async delete(license) {
    const query = `
      DELETE FROM cfa
      WHERE cfa_license = $1
      RETURNING *
    `;
    const result = await db.query(query, [license]);
    return result.rows[0];
  }
}

export default CFA;
