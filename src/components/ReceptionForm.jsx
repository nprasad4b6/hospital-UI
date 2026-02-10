import React, { useState } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const ReceptionForm = ({ onPatientAdded }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      phone: "",
      type: "WALK_IN",
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [isAppointment, setIsAppointment] = useState(false);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const patientData = {
        ...data,
        type: isAppointment ? "BOOKED" : "WALK_IN",
      };

      const response = await axios.post(
        `${API_BASE}/api/patients`,
        patientData,
      );

      setSuccessData({
        tokenNumber: response.data.tokenNumber,
        name: response.data.name,
        phone: response.data.phone,
        trackingLink: response.data.trackingLink,
        whatsappSent: response.data.whatsappSent,
      });

      reset();
      setIsAppointment(false);

      if (onPatientAdded) {
        onPatientAdded(response.data);
      }

      // Auto-hide success message after 10 seconds
      setTimeout(() => {
        setSuccessData(null);
      }, 10000);
    } catch (error) {
      console.error("Error adding patient:", error);
      alert("Failed to register patient. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-medical-50 via-white to-medical-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Success Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 animate-fade-in">
            {/* Checkmark Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            {/* Success Message */}
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
              Patient Registered!
            </h2>
            <p className="text-center text-gray-600 mb-6">
              {successData.name}, your registration is confirmed.
            </p>

            {/* Token Number Display */}
            <div className="bg-gradient-to-r from-medical-50 to-blue-50 border-2 border-medical-200 rounded-xl p-6 mb-6 text-center">
              <p className="text-gray-600 text-sm font-semibold mb-2 uppercase tracking-wide">
                Your Token Number
              </p>
              <p className="text-5xl font-bold text-medical-600">
                {successData.tokenNumber}
              </p>
              <p className="text-gray-500 text-xs mt-2">
                Please save this for reference
              </p>
            </div>

            {/* WhatsApp Status */}
            <div
              className={`rounded-lg p-4 mb-6 flex items-start gap-3 ${
                successData.whatsappSent
                  ? "bg-green-50 border-2 border-green-200"
                  : "bg-blue-50 border-2 border-blue-200"
              }`}
            >
              <svg
                className="w-5 h-5 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-9.746 9.798c0 2.734.75 5.404 2.177 7.657L2.677 21.99l8.262-2.724a9.865 9.865 0 004.648 1.182h.005c5.487 0 9.963-4.473 9.963-9.99 0-2.665-.975-5.166-2.724-7.141A9.842 9.842 0 0011.51 2.98" />
              </svg>
              <div>
                <p
                  className={`font-semibold text-sm ${
                    successData.whatsappSent
                      ? "text-green-800"
                      : "text-blue-800"
                  }`}
                >
                  {successData.whatsappSent
                    ? "✓ WhatsApp message sent"
                    : "ℹ WhatsApp notification queued"}
                </p>
                <p
                  className={`text-xs mt-1 ${
                    successData.whatsappSent
                      ? "text-green-700"
                      : "text-blue-700"
                  }`}
                >
                  Token details & tracking link sent to +91{successData.phone}
                </p>
              </div>
            </div>

            {/* Tracking Link Section */}
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                📍 Track Your Status
              </p>
              <a
                href={successData.trackingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block w-full text-center bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Open Tracking Link
              </a>
              <p className="text-xs text-gray-600 mt-2">
                Check real-time queue status and estimated wait time
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setSuccessData(null)}
              className="w-full bg-medical-100 hover:bg-medical-200 text-medical-700 font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              Register Another Patient
            </button>
          </div>

          {/* Footer Note */}
          <p className="text-center text-gray-500 text-sm mt-6">
            Message will auto-close in 10 seconds
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-50 via-white to-medical-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="medical-gradient p-8 text-white">
            <div className="flex items-center justify-center mb-4">
              <svg
                className="w-10 h-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-center">
              Patient Registration
            </h1>
            <p className="text-medical-100 text-center mt-2 text-sm">
              Welcome to Our Hospital Queue System
            </p>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Enter patient name"
                className="input-field"
                {...register("name", {
                  required: "Name is required",
                  minLength: {
                    value: 2,
                    message: "Name must be at least 2 characters",
                  },
                })}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <span>⚠</span> {errors.name.message}
                </p>
              )}
            </div>

            {/* Phone Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="flex items-center border-2 border-gray-200 rounded-lg overflow-hidden focus-within:border-medical-500 transition-colors">
                <span className="px-4 py-3 bg-gray-100 text-gray-600 font-semibold">
                  +91
                </span>
                <input
                  type="tel"
                  placeholder="9876543210"
                  className="flex-1 px-4 py-3 focus:outline-none"
                  {...register("phone", {
                    required: "Phone number is required",
                    pattern: {
                      value: /^[0-9]{10}$/,
                      message: "Phone number must be 10 digits",
                    },
                  })}
                />
              </div>
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <span>⚠</span> {errors.phone.message}
                </p>
              )}
            </div>

            {/* Appointment Toggle */}
            <div className="bg-medical-50 rounded-lg p-5 border-2 border-medical-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-800 font-semibold">
                    Appointment Status
                  </p>
                  <p className="text-gray-600 text-sm mt-1">
                    {isAppointment
                      ? "📅 Booked Appointment"
                      : "🚶 Walk-in Patient"}
                  </p>
                </div>

                {/* Toggle Switch */}
                <button
                  type="button"
                  onClick={() => setIsAppointment(!isAppointment)}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    isAppointment ? "bg-medical-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      isAppointment ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`btn-primary w-full flex items-center justify-center gap-2 ${
                isSubmitting ? "opacity-70" : ""
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="w-5 h-5 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v4m6.364 1.636l-2.828-2.828m2.828 9.172l2.828 2.828M12 20v-4m-6.364-1.636l2.828 2.828m-2.828-9.172l-2.828-2.828"
                    />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Register Patient
                </>
              )}
            </button>

            {/* Disclaimer */}
            <p className="text-center text-gray-500 text-xs">
              By registering, you agree to our terms and conditions
            </p>
          </form>
        </div>

        {/* Info Footer */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="bg-white rounded-lg p-4 shadow">
            <p className="text-2xl mb-1">⏱️</p>
            <p className="text-xs text-gray-600">Avg Wait</p>
            <p className="text-sm font-bold text-medical-600">15 mins</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <p className="text-2xl mb-1">📞</p>
            <p className="text-xs text-gray-600">Support</p>
            <p className="text-sm font-bold text-medical-600">24/7</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <p className="text-2xl mb-1">✅</p>
            <p className="text-xs text-gray-600">Confirmed</p>
            <p className="text-sm font-bold text-medical-600">Queue</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceptionForm;
