import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcrypt";
import { getDBConnection } from "../db/connection.js";
import { logger } from "../utils/logger.js";

// Local Strategy 
passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const db = getDBConnection();

        const response = await db.query(
          "SELECT id, email, password_hash, first_name, last_name, company_name FROM users WHERE LOWER(email) = $1",
          [email.toLowerCase()],
        );

        if (response.rowCount === 0) {
          return done(null, false, { message: "Invalid credentials." });
        }

        const user = response.rows[0];

        const isValidPassword = await bcrypt.compare(
          password,
          user.password_hash,
        );

        if (!isValidPassword) {
          return done(null, false, { message: "Invalid credentials." });
        }

        const { password_hash: _, ...userWithoutPassword } = user;
        const normalizedUser = {
          id: userWithoutPassword.id,
          email: userWithoutPassword.email,
          firstName: userWithoutPassword.first_name || null,
          lastName: userWithoutPassword.last_name || null,
          companyName: userWithoutPassword.company_name || null,
        };

        return done(null, normalizedUser);
      } catch (err) {
        logger.error(
          "[Passport Login Config] Passport configuration error: ",
          err,
        );
        return done(err);
      }
    },
  ),
);

// GOOGLE STRATEGY
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        process.env.GOOGLE_REDIRECT_URL ||
        "http://localhost:5000/api/auth/google/dashboard",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async function (_accessToken, _refreshToken, profile, cb) {
      const db = getDBConnection();

      try {
        const email = profile?.emails?.[0]?.value;
        if (!email) {
          return cb(
            new Error("Google profile did not return an email address"),
          );
        }

        // Extract name from Google profile
        const firstName = profile?.name?.givenName || null;
        const lastName = profile?.name?.familyName || null;

        const existing = await db.query(
          "SELECT id, email, first_name, last_name, company_name FROM users WHERE email = $1",
          [email],
        );
        if (existing.rowCount > 0) {
          const user = existing.rows[0];
          return cb(null, {
            id: user.id,
            email: user.email,
            firstName: user.first_name || null,
            lastName: user.last_name || null,
            companyName: user.company_name || null,
          });
        }

        await db.query("BEGIN");

        const insert = await db.query(
          `INSERT INTO users (email, password_hash, first_name, last_name)
                     VALUES ($1, $2, $3, $4)
                     RETURNING id, email, first_name, last_name, company_name`,
          [email, "", firstName, lastName],
        );

        await db.query("COMMIT");

        const newUser = insert.rows[0];
        return cb(null, {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.first_name || null,
          lastName: newUser.last_name || null,
          companyName: newUser.company_name || null,
        });
      } catch (err) {
        await db.query("ROLLBACK");
        return cb(err);
      }
    },
  ),
);

// Serialize user to session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const db = getDBConnection();
    const result = await db.query(
      "SELECT id, email, company_name FROM users WHERE id = $1",
      [id],
    );

    if (result.rowCount === 0) {
      return done(null, false);
    }

    const user = result.rows[0];
    const normalizedUser = {
      id: user.id,
      email: user.email,
      companyName: user.company_name || null,
    };

    done(null, normalizedUser);
  } catch (err) {
    logger.error("[Passport Deserialize] Error deserializing user: ", err);
    done(err);
  }
});
