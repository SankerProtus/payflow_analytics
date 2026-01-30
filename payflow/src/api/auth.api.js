import api from "./axios";

export const authAPI = {
  signup: (email, password, firstName, lastName, companyName) => {
    return api.post("/auth/signup", {
      email,
      password,
      confirmPassword: password,
      firstName,
      lastName,
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

  getProfile: () => {
    return api.get("/auth/profile");
  },

  updateProfile: (profileData) => {
    return api.put("/auth/profile", profileData);
  },

  updatePassword: (passwordData) => {
    return api.put("/auth/password", passwordData);
  },
};

// Export individual functions for cleaner imports
export const getProfile = async () => {
  const response = await authAPI.getProfile();
  return response.data;
};

export const updateProfile = async (profileData) => {
  const response = await authAPI.updateProfile(profileData);
  return response.data;
};

export const updatePassword = async (passwordData) => {
  const response = await authAPI.updatePassword(passwordData);
  return response.data;
};
