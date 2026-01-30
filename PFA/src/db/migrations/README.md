# Database Migrations

This directory contains SQL migration files for the PayFlow Analytics database.

## Migration Files

### 001_add_notifications_and_activity_tables.sql

**Purpose**: Add tables and features to support new dashboard functionality

**Tables Added**:

1. **notifications** - Store user notifications with read/unread status
2. **activity_logs** - Enhanced activity tracking and audit trail
3. **user_settings** - User preferences and dashboard configuration
4. **custom_reports** - User-defined custom report definitions
5. **churn_predictions** - Machine learning churn risk predictions

**Functions Added**:

- `create_notification()` - Helper to create notifications
- `log_activity()` - Helper to log activities
- `cleanup_old_notifications()` - Remove old read notifications
- `cleanup_expired_notifications()` - Remove expired notifications
- `update_user_settings_timestamp()` - Auto-update timestamp on settings change

**Triggers Added**:

- `trigger_notify_payment_failure` - Auto-create notifications for payment failures
- `trigger_log_subscription_change` - Auto-log subscription status changes
- `trigger_update_user_settings_timestamp` - Update timestamp on settings changes

**Indexes Added**: 15+ optimized indexes for performance

## Running Migrations

### Option 1: Using psql

```bash
cd PFA/src/db/migrations
psql -U your_username -d payflow_db -f 001_add_notifications_and_activity_tables.sql
```

### Option 2: Using Node.js script

Create a migration runner script:

```javascript
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration(filename) {
  const sql = fs.readFileSync(
    path.join(__dirname, "migrations", filename),
    "utf8",
  );

  try {
    await pool.query("BEGIN");
    await pool.query(sql);
    await pool.query("COMMIT");
    console.log(`✓ Migration ${filename} completed successfully`);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error(`✗ Migration ${filename} failed:`, error);
    throw error;
  }
}

// Run migrations
runMigration("001_add_notifications_and_activity_tables.sql")
  .then(() => {
    console.log("All migrations completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
```

### Option 3: Manual execution via your database client

Copy the SQL from the migration file and execute it in your PostgreSQL database client (pgAdmin, DBeaver, etc.).

## Verification

After running the migration, verify the tables were created:

```sql
-- Check if all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'notifications',
    'activity_logs',
    'user_settings',
    'custom_reports',
    'churn_predictions'
  )
ORDER BY table_name;

-- Check if functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
  AND routine_name IN (
    'create_notification',
    'log_activity',
    'cleanup_old_notifications',
    'cleanup_expired_notifications'
  )
ORDER BY routine_name;

-- Check if triggers exist
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'trigger_notify_payment_failure',
    'trigger_log_subscription_change',
    'trigger_update_user_settings_timestamp'
  )
ORDER BY trigger_name;
```

## Rollback

To rollback this migration (WARNING: This will delete all data in these tables):

```sql
-- Drop triggers
DROP TRIGGER IF EXISTS trigger_notify_payment_failure ON invoices;
DROP TRIGGER IF EXISTS trigger_log_subscription_change ON subscriptions;
DROP TRIGGER IF EXISTS trigger_update_user_settings_timestamp ON user_settings;

-- Drop functions
DROP FUNCTION IF EXISTS notify_payment_failure();
DROP FUNCTION IF EXISTS log_subscription_change();
DROP FUNCTION IF EXISTS update_user_settings_timestamp();
DROP FUNCTION IF EXISTS create_notification(UUID, TEXT, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS log_activity(UUID, TEXT, TEXT, TEXT, UUID, UUID, UUID, JSONB);
DROP FUNCTION IF EXISTS cleanup_old_notifications(INTEGER);
DROP FUNCTION IF EXISTS cleanup_expired_notifications();

-- Drop tables
DROP TABLE IF EXISTS churn_predictions;
DROP TABLE IF EXISTS custom_reports;
DROP TABLE IF EXISTS user_settings;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS notifications;
```

## Notes

- **Safe to run multiple times**: The migration uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`, so it's safe to run multiple times.
- **Default data**: Automatically creates default settings for existing users.
- **Performance**: All tables are properly indexed for optimal query performance.
- **Triggers**: Automatic notifications and activity logging are enabled via database triggers.
- **Cleanup**: Built-in functions to clean up old notifications periodically.

## Next Steps

After running the migration:

1. **Test the new features**:
   - Navigate to `/notifications` to see the Notifications Center
   - Navigate to `/activity` to see the Activity Log
   - Check that payment failures automatically create notifications

2. **Set up cleanup cron job** (optional):

   ```sql
   -- Run monthly to clean up old notifications
   SELECT cleanup_old_notifications(90); -- Keep 90 days
   SELECT cleanup_expired_notifications();
   ```

3. **Update environment variables** (if needed):
   - No new environment variables required for this migration

4. **Monitor performance**:
   - Check query performance on the new tables
   - Adjust indexes if needed based on actual usage patterns
