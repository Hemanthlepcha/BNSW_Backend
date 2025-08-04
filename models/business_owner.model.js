import { db } from '../config/db.config.js';

class BusinessOwner {
  static async findByCredentials(username, license) {
    const query = `
      SELECT * FROM business_owner 
      WHERE username = $1 AND business_license = $2
    `;
    const result = await db.query(query, [username, license]);
    return result.rows[0];
  }

  static async findById(license) {
    const query = `
      SELECT * FROM business_owner 
      WHERE business_license = $1
    `;
    const result = await db.query(query, [license]);
    return result.rows[0];
  }
}

export default BusinessOwner;
