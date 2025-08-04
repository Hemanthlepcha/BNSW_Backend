import db from "../config/db.config.js";
import { User } from "../models/user.model.js";

export class UserService {
  static async findByID(id) {
    try {
      const result = await db.query(
        "SELECT * FROM users WHERE id_number = $1",
        [id],
      );
      const user = result.rows[0];
      return user ? new User(user) : null;
    } catch (error) {
      console.error("Error in UserService.findByID:", error);
      throw error;
    }
  }

  static async create(userData) {
    try {
      const result = await db.query(
        "INSERT INTO users (name, id_number, created_at) VALUES ($1, $2, NOW()) RETURNING *",
        [userData.Name, userData.ID],
      );
      return new User(result.rows[0]);
    } catch (error) {
      console.error("Error in UserService.create:", error);
      throw error;
    }
  }
}
