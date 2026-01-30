let rateLimitStore = undefined;

if (process.env.REDIS_URL) {
  try {
    const { default: RedisStore } = await import("rate-limit-redis");
    const { createClient } = await import("redis");

    const redisClient = createClient({
      url: process.env.REDIS_URL,
    });

    redisClient.on("error", (err) => {
      console.error("Redis error", err);
    });

    await redisClient.connect();

    rateLimitStore = new RedisStore({
      prefix: "rlm_auth_",
      sendCommand: (...args) => redisClient.sendCommand(args),
    });

    console.info("Rate limiting using Redis store");
  } catch (err) {
    console.warn("Redis setup failed, using memory store for rate limiting", {
      error: err.message,
    });
  }
} else {
  console.info(
    "Rate limiting using memory store (set REDIS_URL for production)",
  );
}

export { rateLimitStore };