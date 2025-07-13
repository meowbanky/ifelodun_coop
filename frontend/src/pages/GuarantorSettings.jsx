import { useState, useEffect } from "react";
import api from "../services/api"; // Assuming this is your axios instance

const GuarantorSettings = () => {
  const [settings, setSettings] = useState({
    minimumSharesBalance: "",
    maximumGuaranteesAllowed: "",
    guaranteePercentageLimit: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get("/guarantors/settings", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = response.data.data || {};
      setSettings({
        minimumSharesBalance: data.minimum_shares_balance || "",
        maximumGuaranteesAllowed: data.maximum_guarantees_allowed || "",
        guaranteePercentageLimit: data.guarantee_percentage_limit || "",
      });
    } catch (err) {
      console.error("Fetch settings error:", err.response || err);
      if (err.response?.status === 404) {
        setSettings({
          minimumSharesBalance: "",
          maximumGuaranteesAllowed: "",
          guaranteePercentageLimit: "",
        });
        setError(
          "No guarantor settings found. Please save settings to initialize."
        );
      } else {
        setError(
          err.response?.data?.message || "Failed to load guarantor settings."
        );
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        minimum_shares_balance: parseFloat(settings.minimumSharesBalance),
        maximum_guarantees_allowed: parseInt(settings.maximumGuaranteesAllowed),
        guarantee_percentage_limit: parseFloat(
          settings.guaranteePercentageLimit
        ),
      };

      await api.put("/guarantors/settings", payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setSuccess("Settings updated successfully.");
      fetchSettings(); // Refresh settings
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 animate-in fade-in slide-in-from-top-2">
          Guarantor Settings
        </h1>

        {(error || success) && (
          <div
            className={`p-4 rounded-lg mb-6 animate-in fade-in slide-in-from-top-2 ${
              error ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
            }`}
          >
            {error || success}
          </div>
        )}

        {/* Settings Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Configure Guarantor Requirements
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Shares Balance (₦)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    ₦
                  </span>
                  <input
                    type="number"
                    name="minimumSharesBalance"
                    value={settings.minimumSharesBalance}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full pl-8 py-2 bg-white/5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Minimum shares balance required to be a guarantor (in Naira)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Active Guarantees
                </label>
                <input
                  type="number"
                  name="maximumGuaranteesAllowed"
                  value={settings.maximumGuaranteesAllowed}
                  onChange={handleChange}
                  required
                  min="1"
                  step="1"
                  className="w-full px-4 py-2 bg-white/5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Maximum number of loans a member can guarantee at once
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Guarantee Percentage Limit (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="guaranteePercentageLimit"
                    value={settings.guaranteePercentageLimit}
                    onChange={handleChange}
                    required
                    min="0"
                    max="500"
                    step="0.01"
                    className="w-full pr-8 py-2 bg-white/5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    %
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Maximum percentage of shares that can be used as a guarantee
                  (e.g., 200% = 2x shares)
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all transform hover:scale-[1.02]"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-5 w-5 mr-2 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  "Save Settings"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Preview Section */}
        <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Guarantor Capability Preview
          </h2>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              For a member with ₦10,000 in shares:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="font-medium text-gray-700">
                  Maximum Guarantee Amount
                </p>
                <p className="text-2xl font-bold text-indigo-600">
                  ₦
                  {(
                    (10000 * settings.guaranteePercentageLimit) /
                    100
                  ).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-sm text-gray-500">
                  Based on {settings.guaranteePercentageLimit}% limit
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="font-medium text-gray-700">
                  Maximum Active Guarantees
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {settings.maximumGuaranteesAllowed || 0}
                </p>
                <p className="text-sm text-gray-500">
                  Concurrent guarantees allowed
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuarantorSettings;
