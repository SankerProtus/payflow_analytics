import api from "./axios";

export const authAPI = {
  signup: (email, password, companyName) => {
    return api.post("/auth/signup", {
      email,
      password,
      confirmPassword: password,
      companyName,
    });
  },

  login: (email, password) => {
    return api.post("/auth/login", {
      email,
      password,
    });
  },

  logout: () => {
    return api.post("/auth/logout");
  },

  verifyEmail: (token) => {
    return api.post("/auth/verify-email", { token });
  },

  resendVerification: (email) => {
    return api.post("/auth/resend-verification", { email });
  },

  forgotPassword: (email) => {
    return api.post("/auth/forgot-password", { email });
  },

  resetPassword: (token, newPassword) => {
    return api.post("/auth/reset-password", { token, newPassword });
  },
};
