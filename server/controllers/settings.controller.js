const ResponseHandler = require("../utils/response");
const SettingsService = require("../utils/settings");
const { hasRole } = require("../middleware/permission");

class SettingsController {
  async getAllSettings(req, res) {
    try {
      // Only admin can see all settings
      if (req.user.role !== "admin") {
        return ResponseHandler.error(res, "Permission denied", 403);
      }

      const settings = await SettingsService.getAll();
      ResponseHandler.success(res, settings);
    } catch (error) {
      console.error("Get all settings error:", error);
      ResponseHandler.error(res, "Failed to fetch settings");
    }
  }

  async getPublicSettings(req, res) {
    try {
      const publicSettings = await SettingsService.getPublicSettings();
      ResponseHandler.success(res, publicSettings);
    } catch (error) {
      console.error("Get public settings error:", error);
      ResponseHandler.error(res, "Failed to fetch public settings");
    }
  }

  async getCategory(req, res) {
    try {
      const { category } = req.params;
      const settings = await SettingsService.getCategory(category);
      ResponseHandler.success(res, settings);
    } catch (error) {
      console.error("Get category settings error:", error);
      ResponseHandler.error(res, "Failed to fetch category settings");
    }
  }

  async updateSetting(req, res) {
    try {
      const { category, name } = req.params;
      const { value, dataType = "string", isPublic = false } = req.body;

      await SettingsService.set(category, name, value, dataType, isPublic);
      ResponseHandler.success(res, null, "Setting updated successfully");
    } catch (error) {
      console.error("Update setting error:", error);
      ResponseHandler.error(res, "Failed to update setting");
    }
  }

  async deleteSetting(req, res) {
    try {
      const { category, name } = req.params;
      await SettingsService.delete(category, name);
      ResponseHandler.success(res, null, "Setting deleted successfully");
    } catch (error) {
      console.error("Delete setting error:", error);
      ResponseHandler.error(res, "Failed to delete setting");
    }
  }

  async initializeDefaultSettings(req, res) {
    try {
      // Application settings
      await SettingsService.set(
        "app",
        "name",
        "Cooperative Management System",
        "string",
        true
      );
      await SettingsService.set(
        "app",
        "organization",
        "Your Cooperative",
        "string",
        true
      );
      await SettingsService.set("app", "version", "1.0.0", "string", true);

      // Contribution settings
      await SettingsService.set(
        "contribution",
        "shares_ratio",
        60,
        "number",
        true
      );
      await SettingsService.set(
        "contribution",
        "savings_ratio",
        40,
        "number",
        true
      );
      await SettingsService.set(
        "contribution",
        "minimum_amount",
        1000,
        "number",
        true
      );

      // Loan settings
      await SettingsService.set(
        "loan",
        "default_interest_rate",
        12,
        "number",
        true
      );
      await SettingsService.set(
        "loan",
        "max_loan_amount",
        100000,
        "number",
        true
      );
      await SettingsService.set("loan", "max_term_months", 24, "number", true);
      await SettingsService.set(
        "loan",
        "min_shares_percentage",
        25,
        "number",
        true
      );

      // Notification settings
      await SettingsService.set(
        "notification",
        "email_enabled",
        true,
        "boolean",
        false
      );
      await SettingsService.set(
        "notification",
        "sms_enabled",
        false,
        "boolean",
        false
      );

      ResponseHandler.success(
        res,
        null,
        "Default settings initialized successfully"
      );
    } catch (error) {
      console.error("Initialize settings error:", error);
      ResponseHandler.error(res, "Failed to initialize settings");
    }
  }
}

module.exports = new SettingsController();
