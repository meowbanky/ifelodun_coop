const pool = require("../config/database");

class SettingsService {
  constructor() {
    this.cache = {};
    this.cacheTime = 0;
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
  }

  async refreshCache() {
    const connection = await pool.getConnection();
    try {
      const [settings] = await connection.execute(
        "SELECT * FROM system_settings"
      );

      // Organize settings by category and name
      this.cache = settings.reduce((acc, setting) => {
        if (!acc[setting.category]) {
          acc[setting.category] = {};
        }

        // Convert values based on data_type
        let value = setting.value;
        switch (setting.data_type) {
          case "number":
            value = parseFloat(value);
            break;
          case "boolean":
            value = value === "true";
            break;
          case "json":
            try {
              value = JSON.parse(value);
            } catch (error) {
              console.error("Invalid JSON in setting:", setting.name);
              value = null;
            }
            break;
        }

        acc[setting.category][setting.name] = value;
        return acc;
      }, {});

      this.cacheTime = Date.now();
      return this.cache;
    } finally {
      connection.release();
    }
  }

  async getAll() {
    if (Date.now() - this.cacheTime > this.cacheDuration) {
      await this.refreshCache();
    }
    return this.cache;
  }

  async getCategory(category) {
    const settings = await this.getAll();
    return settings[category] || {};
  }

  async get(category, name, defaultValue = null) {
    const settings = await this.getAll();
    if (settings[category] && settings[category][name] !== undefined) {
      return settings[category][name];
    }
    return defaultValue;
  }

  async set(category, name, value, dataType, isPublic = false) {
    const connection = await pool.getConnection();
    try {
      // Validate data type
      let storedValue = value;
      if (dataType === "json" && typeof value !== "string") {
        storedValue = JSON.stringify(value);
      }

      await connection.execute(
        `INSERT INTO system_settings (
                    category, name, value, data_type, is_public
                ) VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    value = VALUES(value),
                    data_type = VALUES(data_type),
                    is_public = VALUES(is_public)`,
        [category, name, storedValue, dataType, isPublic]
      );

      // Refresh cache
      await this.refreshCache();
      return true;
    } finally {
      connection.release();
    }
  }

  async delete(category, name) {
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        "DELETE FROM system_settings WHERE category = ? AND name = ?",
        [category, name]
      );

      // Refresh cache
      await this.refreshCache();
      return true;
    } finally {
      connection.release();
    }
  }

  async getPublicSettings() {
    const connection = await pool.getConnection();
    try {
      const [settings] = await connection.execute(
        "SELECT category, name, value, data_type FROM system_settings WHERE is_public = true"
      );

      return settings.reduce((acc, setting) => {
        if (!acc[setting.category]) {
          acc[setting.category] = {};
        }

        // Convert values based on data_type
        let value = setting.value;
        switch (setting.data_type) {
          case "number":
            value = parseFloat(value);
            break;
          case "boolean":
            value = value === "true";
            break;
          case "json":
            try {
              value = JSON.parse(value);
            } catch (error) {
              value = null;
            }
            break;
        }

        acc[setting.category][setting.name] = value;
        return acc;
      }, {});
    } finally {
      connection.release();
    }
  }
}

module.exports = new SettingsService();
