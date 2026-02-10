/**
 * Utility formatters for privacy, professionalism, and data display
 */

/**
 * Mask phone number for privacy
 * Shows first 2 and last 1 digits, hides middle 7
 * Example: "9876543210" becomes "98****3210"
 * @param {string} phone - Phone number without country code
 * @returns {string} Masked phone number
 */
export const maskPhone = (phone) => {
  if (!phone || phone.length < 4) {
    return phone;
  }

  const phoneStr = String(phone).trim();
  const firstTwo = phoneStr.substring(0, 2);
  const lastTwo = phoneStr.substring(phoneStr.length - 2);
  const maskCount = Math.max(0, phoneStr.length - 4);
  const mask = "X".repeat(maskCount);

  return `${firstTwo}${mask}${lastTwo}`;
};

/**
 * Convert string to Title Case
 * Ensures every word starts with a capital letter
 * Handles edge cases like hyphens and apostrophes
 * Example: "prasad nagireddi" becomes "Prasad Nagireddi"
 * @param {string} str - String to convert
 * @returns {string} Title cased string
 */
export const toTitleCase = (str) => {
  if (!str) {
    return "";
  }

  return String(str)
    .toLowerCase()
    .split(/\s+/) // Split by whitespace
    .map((word) => {
      // Handle hyphenated words: "mary-jane" becomes "Mary-Jane"
      const hyphenated = word.split("-").map((part) => {
        return part.charAt(0).toUpperCase() + part.slice(1);
      });
      return hyphenated.join("-");
    })
    .join(" ");
};

/**
 * Format phone number with country code for display
 * Example: "9876543210" becomes "+91 98****3210"
 * @param {string} phone - Phone number
 * @param {string} countryCode - Country code (default: "91" for India)
 * @returns {string} Formatted and masked phone
 */
export const formatPhoneDisplay = (phone, countryCode = "91") => {
  const masked = maskPhone(phone);
  return `+${countryCode} ${masked}`;
};

/**
 * Calculate average consultation time in minutes
 * Can be customized based on actual data
 * @param {number} totalPatients - Total patients served
 * @param {number} totalMinutesElapsed - Total minutes elapsed
 * @returns {number} Average time per patient
 */
export const calculateAverageWaitTime = (
  totalPatients = 0,
  totalMinutesElapsed = 0,
) => {
  if (totalPatients === 0) return 15; // Default wait time
  return Math.round(totalMinutesElapsed / totalPatients);
};

/**
 * Determine clinic status based on queue conditions
 * @param {number} queueLength - Current patients in queue
 * @param {boolean} isDoctorOnBreak - Doctor break status
 * @returns {object} Status object with label and color
 */
export const getClinicStatus = (queueLength = 0, isDoctorOnBreak = false) => {
  if (isDoctorOnBreak) {
    return {
      label: "On Break",
      color: "bg-orange-500",
      textColor: "text-orange-600",
      bgColor: "bg-orange-50",
    };
  }

  if (queueLength === 0) {
    return {
      label: "On Schedule",
      color: "bg-green-500",
      textColor: "text-green-600",
      bgColor: "bg-green-50",
    };
  }

  if (queueLength < 5) {
    return {
      label: "On Schedule",
      color: "bg-green-500",
      textColor: "text-green-600",
      bgColor: "bg-green-50",
    };
  }

  if (queueLength < 10) {
    return {
      label: "Busy",
      color: "bg-yellow-500",
      textColor: "text-yellow-600",
      bgColor: "bg-yellow-50",
    };
  }

  return {
    label: "Very Busy",
    color: "bg-red-500",
    textColor: "text-red-600",
    bgColor: "bg-red-50",
  };
};

const formatters = {
  maskPhone,
  toTitleCase,
  formatPhoneDisplay,
  calculateAverageWaitTime,
  getClinicStatus,
};

export default formatters;
