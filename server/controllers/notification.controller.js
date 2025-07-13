const pool = require("../config/database");
const ResponseHandler = require("../utils/response");
const NotificationService = require("../utils/notification");

class NotificationController {
  async createTemplate(req, res) {
    const connection = await pool.getConnection();
    try {
      const { name, type, subject, body, placeholders } = req.body;

      const [result] = await connection.execute(
        `INSERT INTO notification_templates (
                    name, type, subject, body, placeholders
                ) VALUES (?, ?, ?, ?, ?)`,
        [name, type, subject, body, JSON.stringify(placeholders)]
      );

      ResponseHandler.success(
        res,
        { templateId: result.insertId },
        "Template created successfully",
        201
      );
    } catch (error) {
      console.error("Create template error:", error);
      ResponseHandler.error(res, "Failed to create template");
    } finally {
      connection.release();
    }
  }

  async getTemplates(req, res) {
    const connection = await pool.getConnection();
    try {
      const [templates] = await connection.execute(
        "SELECT * FROM notification_templates"
      );

      ResponseHandler.success(res, templates);
    } catch (error) {
      console.error("Get templates error:", error);
      ResponseHandler.error(res, "Failed to fetch templates");
    } finally {
      connection.release();
    }
  }

  async updateTemplate(req, res) {
    const connection = await pool.getConnection();
    try {
      const { id } = req.params;
      const { name, type, subject, body, placeholders } = req.body;

      await connection.execute(
        `UPDATE notification_templates 
                SET name = ?, type = ?, subject = ?, body = ?, placeholders = ?
                WHERE id = ?`,
        [name, type, subject, body, JSON.stringify(placeholders), id]
      );

      ResponseHandler.success(res, null, "Template updated successfully");
    } catch (error) {
      console.error("Update template error:", error);
      ResponseHandler.error(res, "Failed to update template");
    } finally {
      connection.release();
    }
  }

  async sendNotification(req, res) {
    try {
      const { userId, templateName, data } = req.body;

      const result = await NotificationService.notify(
        userId,
        templateName,
        data
      );

      ResponseHandler.success(res, result, "Notification sent successfully");
    } catch (error) {
      console.error("Send notification error:", error);
      ResponseHandler.error(res, "Failed to send notification");
    }
  }

  // In notification.controller.js
  async getDashboard(req, res) {
    const connection = await pool.getConnection();
    try {
      // Get counts by type and status
      const [counts] = await connection.execute(
        `SELECT 
         type, status, COUNT(*) as count
       FROM notification_history
       GROUP BY type, status`
      );

      // Get recent notifications
      const [recent] = await connection.execute(
        `SELECT 
         nh.id, nh.type, nh.status, nh.created_at, nh.sent_at,
         u.username as recipient,
         nt.name as template_name
       FROM notification_history nh
       JOIN users u ON nh.recipient_id = u.id
       JOIN notification_templates nt ON nh.template_id = nt.id
       ORDER BY nh.created_at DESC
       LIMIT 20`
      );

      ResponseHandler.success(res, {
        counts: counts.reduce((acc, curr) => {
          if (!acc[curr.type]) acc[curr.type] = {};
          acc[curr.type][curr.status] = curr.count;
          return acc;
        }, {}),
        recent,
      });
    } catch (error) {
      console.error("Notification dashboard error:", error);
      ResponseHandler.error(res, "Failed to fetch notification dashboard");
    } finally {
      connection.release();
    }
  }

  async sendBulkNotification(req, res) {
    try {
      const { userIds, templateName, data } = req.body;

      const results = [];
      for (const userId of userIds) {
        try {
          const result = await NotificationService.notify(
            userId,
            templateName,
            data
          );
          results.push({
            userId,
            ...result,
          });
        } catch (error) {
          results.push({
            userId,
            success: false,
            error: error.message,
          });
        }
      }

      ResponseHandler.success(
        res,
        {
          total: userIds.length,
          successful: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
          results,
        },
        "Bulk notifications processed"
      );
    } catch (error) {
      console.error("Send bulk notification error:", error);
      ResponseHandler.error(res, "Failed to process bulk notifications");
    }
  }

  async getNotificationHistory(req, res) {
    const connection = await pool.getConnection();
    try {
      const [history] = await connection.execute(
        `SELECT 
                    nh.*,
                    nt.name as template_name,
                    u.username as recipient
                FROM notification_history nh
                JOIN notification_templates nt ON nh.template_id = nt.id
                JOIN users u ON nh.recipient_id = u.id
                ORDER BY nh.created_at DESC
                LIMIT 100`
      );

      ResponseHandler.success(res, history);
    } catch (error) {
      console.error("Get notification history error:", error);
      ResponseHandler.error(res, "Failed to fetch notification history");
    } finally {
      connection.release();
    }
  }

  async getUserNotifications(req, res) {
    const connection = await pool.getConnection();
    try {
      const { userId } = req.params;

      const [notifications] = await connection.execute(
        `SELECT 
                    nh.*,
                    nt.name as template_name
                FROM notification_history nh
                JOIN notification_templates nt ON nh.template_id = nt.id
                WHERE nh.recipient_id = ?
                ORDER BY nh.created_at DESC
                LIMIT 50`,
        [userId]
      );

      ResponseHandler.success(res, notifications);
    } catch (error) {
      console.error("Get user notifications error:", error);
      ResponseHandler.error(res, "Failed to fetch user notifications");
    } finally {
      connection.release();
    }
  }
}

module.exports = new NotificationController();
