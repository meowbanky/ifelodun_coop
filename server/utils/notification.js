const nodemailer = require("nodemailer");
const pool = require("../config/database");
require("dotenv").config();

class NotificationService {
  constructor() {
    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async getTemplate(templateName) {
    const connection = await pool.getConnection();
    try {
      const [templates] = await connection.execute(
        "SELECT * FROM notification_templates WHERE name = ?",
        [templateName]
      );

      if (templates.length === 0) {
        throw new Error(`Template ${templateName} not found`);
      }

      return templates[0];
    } finally {
      connection.release();
    }
  }

  async replacePlaceholders(content, data) {
    let result = content;
    for (const key in data) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, "g"), data[key]);
    }
    return result;
  }

  async sendEmail(to, subject, text, html) {
    return this.emailTransporter.sendMail({
      from: process.env.EMAIL_FROM || "cooperative@example.com",
      to,
      subject,
      text,
      html,
    });
  }

  async sendSMS(to, message) {
    // Implement SMS service integration here
    // This is a placeholder for demonstration
    console.log(`Sending SMS to ${to}: ${message}`);
    return true;
  }

  async notify(userId, templateName, data) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get user
      const [users] = await connection.execute(
        "SELECT * FROM users WHERE id = ?",
        [userId]
      );

      if (users.length === 0) {
        throw new Error("User not found");
      }

      const user = users[0];

      // Get template
      const template = await this.getTemplate(templateName);

      // Replace placeholders
      const subject = await this.replacePlaceholders(
        template.subject || "",
        data
      );
      const body = await this.replacePlaceholders(template.body, data);

      // Record in notification history
      const [result] = await connection.execute(
        `INSERT INTO notification_history (
                    template_id, recipient_id, type, data
                ) VALUES (?, ?, ?, ?)`,
        [template.id, userId, template.type, JSON.stringify(data)]
      );

      // Send notification based on type
      let success = false;
      let error = null;

      try {
        if (template.type === "email") {
          await this.sendEmail(user.email, subject, body, body);
          success = true;
        } else if (template.type === "sms") {
          success = await this.sendSMS(user.phone_number, body);
        }
      } catch (err) {
        error = err.message;
      }

      // Update notification status
      await connection.execute(
        `UPDATE notification_history 
                SET status = ?, sent_at = ?, error_message = ?
                WHERE id = ?`,
        [
          success ? "sent" : "failed",
          success ? new Date() : null,
          error,
          result.insertId,
        ]
      );

      await connection.commit();

      return {
        success,
        notificationId: result.insertId,
        error,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new NotificationService();
