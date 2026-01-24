import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../assets/logo.jpeg";
import {
  sanitizeInput,
  validateEmail,
  checkPasswordStrength,
} from "../utils/validation";
import { Loader } from "lucide-react";
import { authAPI } from "../api/auth.api";

const Signup = () => {
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState("");

  const handlePasswordChange = (e) => {
    const strength = checkPasswordStrength(e.target.value);
    setPasswordStrength(strength);
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setErrors({});

    const formData = {
      companyName: sanitizeInput(event.target.companyName.value),
      email: event.target.email.value,
      password: event.target.password.value,
      confirmPassword: event.target.confirmPassword.value,
    };

    // Validation
    if (
      !formData.companyName ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setErrors({ general: "All fields are required." });
      setIsLoading(false);
      return;
    }

    if (!validateEmail(formData.email)) {
      setErrors({ email: "Please enter a valid email address." });
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setErrors({ password: "Password must be at least 6 characters long." });
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match." });
      setIsLoading(false);
      return;
    }

    try {
      const response = await authAPI.signup(
        formData.email,
        formData.password,
        formData.companyName,
      );

      if (response.data) {
        navigate("/verify-account");
      }
    } catch (err) {
      console.error("Signup error:", err);
      setErrors({
        general:
          err.response?.data?.message ||
          "An unexpected error occurred. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthColor = () => {
    switch (passwordStrength) {
      case "weak":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "strong":
        return "bg-green-500";
      default:
        return "bg-gray-300";
    }
  };

  const getStrengthWidth = () => {
    switch (passwordStrength) {
      case "weak":
        return "w-1/3";
      case "medium":
        return "w-2/3";
      case "strong":
        return "w-full";
      default:
        return "w-0";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img
              src={Logo}
              alt="PayFlow Analytics"
              className="h-16 w-16 rounded-xl shadow-md object-cover"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            PayFlow Analytics
          </h1>
          <p className="text-gray-600 text-md">
            Subscription Analytics Made Easy
          </p>
        </div>

        {/* Signup Card */}
        <div className="bg-white shadow-xl rounded-2xl p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Create your account
            </h2>
            <p className="text-md text-gray-600 mt-1">
              Start your journey with PayFlow today
            </p>
          </div>

          {errors.general && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errors.general}
            </div>
          )}

          <form
            action="/signup"
            method="post"
            onSubmit={handleSignup}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="companyName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Company Name
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                placeholder="Your Company Inc."
                autoComplete="organization"
                required
                className="input-field w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
              {errors.companyName && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.companyName}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="input-field w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
              {errors.email && (
                <p className="mt-2 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="new-password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <input
                id="new-password"
                name="password"
                type="password"
                placeholder="Create a strong password"
                autoComplete="new-password"
                onChange={handlePasswordChange}
                required
                className="input-field w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
              {passwordStrength && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">
                      Password strength:
                    </span>
                    <span className="text-xs font-medium capitalize text-gray-700">
                      {passwordStrength}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${getStrengthColor()} ${getStrengthWidth()}`}
                    ></div>
                  </div>
                </div>
              )}
              {errors.password && (
                <p className="mt-2 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                autoComplete="new-password"
                required
                className="input-field w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
              {errors.confirmPassword && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <div className="flex items-start">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
              />
              <label
                htmlFor="terms"
                className="ml-2 block text-sm text-gray-700"
              >
                I agree to the{" "}
                <a
                  href="#"
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="#"
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  Privacy Policy
                </a>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <Loader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />{" "}
                  Creating account...
                </span>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Already have an account?
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full mt-6 bg-white border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all"
          >
            Sign in instead
          </button>
        </div>
      </div>
    </div>
  );
};

export default Signup;
