import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../api/auth.api";
import { storage } from "../utils/localStorage";

export const useAuth = () => {
  const navigate = useNavigate();
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  const { user, setUser, isAuthenticated } = context;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const signup = async (email, password, firstName, lastName, companyName) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authAPI.signup(
        email,
        password,
        firstName,
        lastName,
        companyName,
      );

      const { token, user } = response.data;
      storage.setToken(token);
      storage.setUser(user); // Persist user data
      setUser(user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authAPI.login(email, password);

      const { token, user } = response.data;
      storage.setToken(token);
      storage.setUser(user); // Persist user data
      setUser(user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      await authAPI.logout();
      storage.clearAll(); // Clear all localStorage data
      setUser(null);
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Logout failed");
      // Clear local storage even if API call fails
      storage.clearAll();
      setUser(null);
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (token) => {
    try {
      setLoading(true);
      setError(null);

      await authAPI.verifyEmail(token);
    } catch (err) {
      setError(err.response?.data?.message || "Email verification failed");
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    setUser,
    isAuthenticated,
    signup,
    login,
    logout,
    verifyEmail,
    loading,
    error,
  };
};
