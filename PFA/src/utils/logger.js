import winston from "winston";
const { combine, timestamp, label, printf } = winston.format;

const  logFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
});

export const logger = winston.createLogger({
    level: "info",
    format: combine(
        label({ label: "auth-service" }),
        timestamp(),
        logFormat
    ),
    defaultMeta: { service: "authentication-service" },
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: "./logs/error.log", level: "error" }),
        new winston.transports.File({ filename: "./logs/combined.log" }),
    ],
});

if (process.env.NODE_ENV !== "production") {
    logger.add(
        new winston.transports.Console({
            format: winston.format.simple(),
        })
    );
}