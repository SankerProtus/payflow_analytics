// Input validation utilities
export const validateRequired = (value, fieldName = "This field") => {
  if (!value || (typeof value === "string" && value.trim().length === 0)) {
    return `${fieldName} is required`;
  }
  return null;
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export const validatePassword = (password) => {
  return (
    password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password)
  );
};

export const validateUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username.trim());
};

export const sanitizeInput = (input) => {
  if (typeof input !== "string") return "";
  const trimmed = input.trim().normalize("NFC");
  const match = trimmed.match(/[A-Za-z0-9 _-]{1,30}/);
  return match ? match[0] : "";
};

export const validateForm = (formData, fields) => {
  const errors = {};

  if (fields.includes("username") && formData.username) {
    if (!validateUsername(formData.username)) {
      errors.username =
        "Username must be 3-20 characters long and contain only letters, numbers, and underscores";
    }
  }

  if (fields.includes("email") && formData.email) {
    if (!validateEmail(formData.email)) {
      errors.email = "Please enter a valid email address";
    }
  }

  if (fields.includes("password") && formData.password) {
    if (!validatePassword(formData.password)) {
      errors.password =
        "Password must be at least 8 characters long and contain at least one letter and one number";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const checkPasswordStrength = (password) => {
  if (password.length === 0) return "";
  if (password.length < 6) return "weak";
  if (password.length < 10 && /[A-Z]/.test(password) && /[0-9]/.test(password))
    return "medium";
  if (
    password.length >= 10 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*]/.test(password)
  )
    return "strong";
  return "medium";
};
