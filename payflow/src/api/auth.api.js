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
    return api.post("/auth/verify", { token });
  },

  resendVerification: (email) => {
    return api.post("/auth/verify-email", { email });
  },

  forgotPassword: (email) => {
    return api.post("/auth/forgot-password", { email });
  },
};
