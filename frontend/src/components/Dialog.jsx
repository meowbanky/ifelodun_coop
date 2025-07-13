import { motion } from "framer-motion";

import PropTypes from "prop-types";

/**
 * @param {{ message: string, type: "success" | "error", onClose: () => void }} props
 */
const Dialog = ({ message, type, onClose }) => {
  const isSuccess = type === "success";
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-50"
    >
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <span
            className={`text-2xl ${
              isSuccess ? "text-green-600" : "text-red-600"
            }`}
          >
            {isSuccess ? "✅" : "❌"}
          </span>
          <h3 className="text-lg font-semibold text-gray-900">
            {isSuccess ? "Success" : "Error"}
          </h3>
        </div>
        <p className="text-sm text-gray-700 mb-6">{message}</p>
        <div className="flex justify-end">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-sm ${
              isSuccess
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
          >
            Close
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

Dialog.propTypes = {
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(["success", "error"]).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default Dialog;
