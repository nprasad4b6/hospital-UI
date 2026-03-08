import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const Login = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const recaptchaVerifierRef = useRef(null);
  const recaptchaWidgetIdRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
      recaptchaWidgetIdRef.current = null;
    };
  }, []);

  const getFirebaseAuthErrorMessage = (firebaseError) => {
    const code = firebaseError?.code;

    if (code === "auth/operation-not-allowed") {
      return "Phone OTP login is not enabled in Firebase. Enable Phone provider in Firebase Console > Authentication > Sign-in method.";
    }

    if (code === "auth/invalid-phone-number") {
      return "Invalid phone number format. Please enter a valid 10-digit number.";
    }

    if (code === "auth/too-many-requests") {
      return "Too many OTP attempts. Please wait a few minutes and try again.";
    }

    if (code === "auth/billing-not-enabled") {
      return "Real SMS OTP requires Firebase billing. Upgrade project to Blaze plan and enable billing in Google Cloud, then retry.";
    }

    if (code === "auth/invalid-app-credential") {
      return "reCAPTCHA verification failed. Ensure localhost is in Authorized domains and try again.";
    }

    return firebaseError?.message || "Authentication failed. Please try again.";
  };

  const toE164IndiaNumber = (value) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 10) {
      return `+91${digits}`;
    }
    if (digits.length === 12 && digits.startsWith("91")) {
      return `+${digits}`;
    }
    if (digits.length === 13 && digits.startsWith("091")) {
      return `+${digits.slice(1)}`;
    }
    return null;
  };

  const checkStaffAuthorization = async (phoneNumberDocId) => {
    const staffRef = doc(db, "authorized_staff", phoneNumberDocId);
    const staffSnap = await getDoc(staffRef);

    if (!staffSnap.exists()) {
      return false;
    }

    const staffData = staffSnap.data();
    return staffData?.is_active === true;
  };

  const initializeRecaptcha = async () => {
    if (!recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "invisible",
        },
      );
      recaptchaWidgetIdRef.current =
        await recaptchaVerifierRef.current.render();
    }

    return recaptchaVerifierRef.current;
  };

  const resetRecaptchaWidget = () => {
    if (
      recaptchaWidgetIdRef.current !== null &&
      window.grecaptcha &&
      typeof window.grecaptcha.reset === "function"
    ) {
      window.grecaptcha.reset(recaptchaWidgetIdRef.current);
    }
  };

  const handleSendOtp = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    const e164Phone = toE164IndiaNumber(phone);
    if (!e164Phone) {
      setError("Please enter a valid phone number.");
      return;
    }

    setIsLoading(true);
    try {
      const isAuthorized = await checkStaffAuthorization(e164Phone);
      if (!isAuthorized) {
        setError("Unauthorized Access");
        setIsLoading(false);
        return;
      }

      const appVerifier = await initializeRecaptcha();
      const result = await signInWithPhoneNumber(auth, e164Phone, appVerifier);

      setConfirmationResult(result);
      setSuccessMessage("OTP sent successfully.");
    } catch (sendError) {
      setError(getFirebaseAuthErrorMessage(sendError));
      resetRecaptchaWidget();
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!confirmationResult) {
      setError("Please request OTP first.");
      return;
    }

    if (!otp || otp.length < 6) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }

    setIsLoading(true);
    try {
      await confirmationResult.confirm(otp);
      navigate("/assistant");
    } catch (verifyError) {
      setError(getFirebaseAuthErrorMessage(verifyError));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-50 via-white to-medical-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-medical-100">
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
                  d="M12 6v12m6-6H6m14 0a8 8 0 11-16 0 8 8 0 0116 0z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-center">Staff Login</h1>
            <p className="text-medical-100 text-center mt-2 text-sm">
              Secure OTP access for assistant panel
            </p>
          </div>

          <div className="p-8 space-y-5">
            <form onSubmit={handleSendOtp} className="space-y-4">
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
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    className="flex-1 px-4 py-3 focus:outline-none"
                    disabled={isLoading || Boolean(confirmationResult)}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full btn-primary"
                disabled={isLoading || Boolean(confirmationResult)}
              >
                {isLoading && !confirmationResult
                  ? "Sending OTP..."
                  : "Send OTP"}
              </button>
            </form>

            {confirmationResult && (
              <form
                onSubmit={handleVerifyOtp}
                className="space-y-4 border-t border-gray-100 pt-5"
              >
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Enter OTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="6-digit OTP"
                    className="input-field text-center tracking-[0.35em]"
                    disabled={isLoading}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? "Verifying..." : "Verify OTP & Continue"}
                </button>
              </form>
            )}

            {error && (
              <div className="rounded-lg border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="rounded-lg border-2 border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                {successMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      <div id="recaptcha-container" />
    </div>
  );
};

export default Login;
