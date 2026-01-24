import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
}

export const validateEmail = (email) => {
    if(typeof email !== "string" || !email || email.length > 254 ) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
};

export const validatePassword = (password) => {
    if(!password || password.length < 8 || password.length > 128) return false;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password.trim());
};

export const validateUsername = (name) => {
    if (
        typeof name !== "string" ||
        !name ||
        name.length < 3 ||
        name.length > 30
    ) {
        return false;
    }

    const usernameRegex = /^[A-Za-z0-9][A-Za-z0-9_-]*[A-Za-z0-9]$/;

    // Prevent reserved usernames
    const reserved = [
        "admin",
        "root",
        "system",
        "api",
        "auth",
        "login",
        "register",
    ];
    if (reserved.includes(name.toLowerCase())) {
        return false;
    }

    return usernameRegex.test(name);
};

// For names and usernames
export const sanitizeInput = (input) => {
    if (typeof input !== "string") return "";
    return input.trim().normalize("NFC");
};

// For emails
export const sanitizeEmail = (input) => {
    if (typeof input !== "string") return "";
    return input.trim().toLowerCase();
};


// Hash a password using bcrypt
const SALT_ROUNDS = 12;
export const hashPassword = async (password) => {
    return await bcrypt.hash(password, SALT_ROUNDS);
};

// compare a plain password with a hashed password
export const comparePassword = async (plainPassword, hashedPassword) => {
    return await bcrypt.compare(plainPassword, hashedPassword);
};

export function generateToken(user) {
    const payload = {
        id: user.id,
        email: user.email,
        companyName: user.companyName || null,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    return token;
}