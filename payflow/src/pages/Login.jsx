import { useState } from "react";
import { authAPI } from "../api/auth.api";
import { storage } from "../utils/localStorage";
import { useAuth } from "../hooks/useAuth";
import Logo from "../assets/logo.jpeg";
import { useNavigate, Link } from "react-router-dom";
import { validateEmail } from "../utils/validation";
import { Loader, Mail, Lock } from "lucide-react";
import Input from "../components/common/Input";

const Login = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors({});
  };

  const handleLogIn = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setErrors({});

    if (!formData.email || !formData.password) {
      setErrors({ general: "All fields are required." });
      setIsLoading(false);
      return;
    }

    if (!validateEmail(formData.email)) {
      setErrors({ email: "Please enter a valid email address." });
      setIsLoading(false);
      return;
    }

    try {
      const response = await authAPI.login(formData.email, formData.password);

      if (response.status === 200) {
        // Save token and user data
        storage.setToken(response.data.token);
        storage.setUser(response.data.user);

        // Update auth context
        setUser(response.data.user);

        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);
      setErrors({
        general:
          err.response?.data?.message ||
          "Login failed. Please try again later.",
      });
    } finally {
      setIsLoading(false);
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

        <div className="bg-white shadow-xl rounded-2xl p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-sm text-gray-600 mt-1">
              Sign in to your account to continue
            </p>
          </div>

          {errors.general && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errors.general}
            </div>
          )}

          <form
            action="/login"
            method="post"
            onSubmit={handleLogIn}
            className="space-y-6"
          >
            <Input
              label="Email address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@gmail.com"
              icon={Mail}
              error={errors.email}
              required
              className="mb-0"
            />

            <Input
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              icon={Lock}
              error={errors.password}
              required
              className="mb-0"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center justify-start">
                <Link
                  to="/verify-account"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  Verify Email
                </Link>
              </div>
              <div className="flex items-center justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <Loader className="animate-spin mr-2 h-5 w-5" />
                  Logging in...
                </span>
              ) : (
                "Log in"
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
                  New to PayFlow?
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/signup")}
            className="w-full mt-6 bg-white border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all"
          >
            Create an account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
