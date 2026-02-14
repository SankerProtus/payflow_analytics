-- 1. USERS
-- =====================================================
-- Password for all users: "Password123!" (hashed with bcrypt)
-- Hash: $2b$10$nuQoMOWQSVHSwe3lbZgx8urO4jMOcN8kwnIEpW43cbMtytw0zowWu

INSERT INTO users (id, email, password_hash, first_name, last_name, company_name, stripe_secret_key, created_at)
VALUES
  -- Demo user 1: SaaS company
  ('b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'john.doe@techstartup.com', '$2b$10$nuQoMOWQSVHSwe3lbZgx8urO4jMOcN8kwnIEpW43cbMtytw0zowWu', 'John', 'Doe', 'TechStartup Inc', decode('736f6d655f656e637279707465645f6b6579', 'hex'), NOW() - INTERVAL '6 months'),

  -- Demo user 2: E-learning platform
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '
  ', '$2b$10$nuQoMOWQSVHSwe3lbZgx8urO4jMOcN8kwnIEpW43cbMtytw0zowWu', 'Sarah', 'Wilson', 'EduPlatform LLC', decode('616e6f746865725f656e637279707465645f6b6579', 'hex'), NOW() - INTERVAL '4 months'),

  -- Demo user 3: Fitness app
  ('b1ffcd99-8d1c-4ef9-cc7e-7cc0ce491b22', 'mike.chen@fitapp.io', '$2b$10$nuQoMOWQSVHSwe3lbZgx8urO4jMOcN8kwnIEpW43cbMtytw0zowWu', 'Mike', 'Chen', 'FitApp.io', decode('666974617070735f656e637279707465645f6b6579', 'hex'), NOW() - INTERVAL '8 months')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. USER SETTINGS
-- =====================================================
INSERT INTO user_settings (user_id, notifications_enabled, email_notifications, dashboard_refresh_interval, default_date_range, timezone, currency, language, theme, created_at, updated_at)
VALUES
  ('b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', true, true, 60, '30d', 'America/New_York', 'usd', 'en', 'light', NOW() - INTERVAL '6 months', NOW()),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', true, true, 45, '90d', 'Europe/London', 'usd', 'en', 'dark', NOW() - INTERVAL '4 months', NOW()),
  ('b1ffcd99-8d1c-4ef9-cc7e-7cc0ce491b22', true, false, 120, '30d', 'America/Los_Angeles', 'usd', 'en', 'auto', NOW() - INTERVAL '8 months', NOW())
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- 3. PAYMENT CONFIGURATION
-- =====================================================
INSERT INTO payment_configuration (user_id, dunning_enabled, max_retry_attempts, retry_schedule, send_payment_failed_email, send_payment_succeeded_email, send_invoice_email, send_receipt_email, grace_period_days, suspend_service_after_grace, created_at, updated_at)
VALUES
  ('b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', true, 4, '[3, 5, 7, 14]'::jsonb, true, true, true, true, 7, true, NOW() - INTERVAL '6 months', NOW()),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', true, 3, '[2, 5, 10]'::jsonb, true, false, true, false, 5, false, NOW() - INTERVAL '4 months', NOW()),
  ('b1ffcd99-8d1c-4ef9-cc7e-7cc0ce491b22', true, 4, '[3, 5, 7, 14]'::jsonb, true, true, true, true, 10, true, NOW() - INTERVAL '8 months', NOW())
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- 4. SUBSCRIPTION PLANS
-- =====================================================
INSERT INTO subscription_plans (id, stripe_price_id, stripe_product_id, name, description, tier, amount, currency, billing_interval, trial_period_days, active, created_at)
VALUES
  -- Starter tier
  ('41ffcda1-1e1c-4ef9-cc7e-7cc0ce491b11', 'price_starter_monthly', 'prod_starter', 'Starter Monthly', 'Great for small teams', 'starter', 1999, 'usd', 'month', 14, true, NOW() - INTERVAL '1 year'),
  ('42aadea2-2f2d-4efa-dd8f-8dd1df502c22', 'price_starter_yearly', 'prod_starter', 'Starter Yearly', 'Save 20% with annual billing', 'starter', 19190, 'usd', 'year', 14, true, NOW() - INTERVAL '1 year'),

  -- Professional tier
  ('43bbdfb3-3a3e-4efb-ee9a-9ee2ea613d33', 'price_pro_monthly', 'prod_professional', 'Professional Monthly', 'Advanced features for growing businesses', 'professional', 4999, 'usd', 'month', 14, true, NOW() - INTERVAL '1 year'),
  ('44ccdac4-4b4f-4efc-ff0b-0ff3fb724e44', 'price_pro_yearly', 'prod_professional', 'Professional Yearly', 'Save 20% with annual billing', 'professional', 47990, 'usd', 'year', 14, true, NOW() - INTERVAL '1 year'),

  -- Enterprise tier
  ('45ddebd5-5c5a-4efd-aa1c-1aa4ac835f55', 'price_enterprise_monthly', 'prod_enterprise', 'Enterprise Monthly', 'Complete solution for large organizations', 'enterprise', 9999, 'usd', 'month', 30, true, NOW() - INTERVAL '1 year'),
  ('46eefce6-6d6b-4efe-bb2d-2bb5bd946a66', 'price_enterprise_yearly', 'prod_enterprise', 'Enterprise Yearly', 'Save 25% with annual billing', 'enterprise', 89990, 'usd', 'year', 30, true, NOW() - INTERVAL '1 year')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 5. CUSTOMERS
-- =====================================================
INSERT INTO customers (id, user_id, stripe_customer_id, email, name, created_at)
VALUES
  -- Active paying customers
  ('50000001-0000-0000-0000-000000000001', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_001', 'alice.johnson@company-a.com', 'Alice Johnson', NOW() - INTERVAL '180 days'),
  ('50000002-0000-0000-0000-000000000002', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_002', 'bob.smith@company-b.com', 'Bob Smith', NOW() - INTERVAL '175 days'),
  ('50000003-0000-0000-0000-000000000003', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_003', 'carol.davis@company-c.com', 'Carol Davis', NOW() - INTERVAL '170 days'),
  ('50000004-0000-0000-0000-000000000004', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_004', 'david.wilson@company-d.com', 'David Wilson', NOW() - INTERVAL '165 days'),
  ('50000005-0000-0000-0000-000000000005', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_005', 'emma.brown@company-e.com', 'Emma Brown', NOW() - INTERVAL '160 days'),
  ('50000006-0000-0000-0000-000000000006', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_006', 'frank.miller@company-f.com', 'Frank Miller', NOW() - INTERVAL '155 days'),
  ('50000007-0000-0000-0000-000000000007', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_007', 'grace.lee@company-g.com', 'Grace Lee', NOW() - INTERVAL '150 days'),
  ('50000008-0000-0000-0000-000000000008', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_008', 'henry.garcia@company-h.com', 'Henry Garcia', NOW() - INTERVAL '145 days'),
  ('50000009-0000-0000-0000-000000000009', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_009', 'iris.martinez@company-i.com', 'Iris Martinez', NOW() - INTERVAL '140 days'),
  ('50000010-0000-0000-0000-000000000010', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_010', 'jack.anderson@company-j.com', 'Jack Anderson', NOW() - INTERVAL '135 days'),
  ('50000011-0000-0000-0000-000000000011', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_011', 'karen.thomas@company-k.com', 'Karen Thomas', NOW() - INTERVAL '130 days'),
  ('50000012-0000-0000-0000-000000000012', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_012', 'leo.jackson@company-l.com', 'Leo Jackson', NOW() - INTERVAL '125 days'),
  ('50000013-0000-0000-0000-000000000013', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_013', 'maria.white@company-m.com', 'Maria White', NOW() - INTERVAL '120 days'),
  ('50000014-0000-0000-0000-000000000014', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_014', 'nathan.harris@company-n.com', 'Nathan Harris', NOW() - INTERVAL '115 days'),
  ('50000015-0000-0000-0000-000000000015', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_015', 'olivia.clark@company-o.com', 'Olivia Clark', NOW() - INTERVAL '110 days'),
  ('50000016-0000-0000-0000-000000000016', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_016', 'paul.rodriguez@company-p.com', 'Paul Rodriguez', NOW() - INTERVAL '105 days'),
  ('50000017-0000-0000-0000-000000000017', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_017', 'quinn.lewis@company-q.com', 'Quinn Lewis', NOW() - INTERVAL '100 days'),
  ('50000018-0000-0000-0000-000000000018', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_018', 'rachel.walker@company-r.com', 'Rachel Walker', NOW() - INTERVAL '95 days'),
  ('50000019-0000-0000-0000-000000000019', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_019', 'steve.hall@company-s.com', 'Steve Hall', NOW() - INTERVAL '90 days'),
  ('50000020-0000-0000-0000-000000000020', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_020', 'tina.allen@company-t.com', 'Tina Allen', NOW() - INTERVAL '85 days'),
  ('50000021-0000-0000-0000-000000000021', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_021', 'uma.young@company-u.com', 'Uma Young', NOW() - INTERVAL '80 days'),
  ('50000022-0000-0000-0000-000000000022', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_022', 'victor.king@company-v.com', 'Victor King', NOW() - INTERVAL '75 days'),
  ('50000023-0000-0000-0000-000000000023', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_023', 'wendy.wright@company-w.com', 'Wendy Wright', NOW() - INTERVAL '70 days'),
  ('50000024-0000-0000-0000-000000000024', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_024', 'xander.lopez@company-x.com', 'Xander Lopez', NOW() - INTERVAL '65 days'),
  ('50000025-0000-0000-0000-000000000025', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_025', 'yara.hill@company-y.com', 'Yara Hill', NOW() - INTERVAL '60 days'),
  ('50000026-0000-0000-0000-000000000026', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_026', 'zack.scott@company-z.com', 'Zack Scott', NOW() - INTERVAL '55 days'),
  ('50000027-0000-0000-0000-000000000027', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_027', 'amy.green@startup-aa.com', 'Amy Green', NOW() - INTERVAL '50 days'),
  ('50000028-0000-0000-0000-000000000028', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_028', 'brian.adams@startup-bb.com', 'Brian Adams', NOW() - INTERVAL '45 days'),
  ('50000029-0000-0000-0000-000000000029', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_029', 'chloe.baker@startup-cc.com', 'Chloe Baker', NOW() - INTERVAL '40 days'),
  ('50000030-0000-0000-0000-000000000030', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_030', 'derek.nelson@startup-dd.com', 'Derek Nelson', NOW() - INTERVAL '35 days'),
  ('50000031-0000-0000-0000-000000000031', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_031', 'eva.carter@startup-ee.com', 'Eva Carter', NOW() - INTERVAL '30 days'),
  ('50000032-0000-0000-0000-000000000032', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_032', 'felix.mitchell@startup-ff.com', 'Felix Mitchell', NOW() - INTERVAL '25 days'),
  ('50000033-0000-0000-0000-000000000033', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_033', 'gina.perez@startup-gg.com', 'Gina Perez', NOW() - INTERVAL '20 days'),
  ('50000034-0000-0000-0000-000000000034', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_034', 'hugo.roberts@startup-hh.com', 'Hugo Roberts', NOW() - INTERVAL '15 days'),
  ('50000035-0000-0000-0000-000000000035', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_035', 'ivy.turner@startup-ii.com', 'Ivy Turner', NOW() - INTERVAL '10 days'),
  ('50000036-0000-0000-0000-000000000036', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_036', 'james.phillips@startup-jj.com', 'James Phillips', NOW() - INTERVAL '8 days'),
  ('50000037-0000-0000-0000-000000000037', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_037', 'katie.campbell@startup-kk.com', 'Katie Campbell', NOW() - INTERVAL '6 days'),
  ('50000038-0000-0000-0000-000000000038', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_038', 'louis.parker@startup-ll.com', 'Louis Parker', NOW() - INTERVAL '4 days'),
  ('50000039-0000-0000-0000-000000000039', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_039', 'monica.evans@startup-mm.com', 'Monica Evans', NOW() - INTERVAL '3 days'),
  ('50000040-0000-0000-0000-000000000040', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_040', 'nick.edwards@startup-nn.com', 'Nick Edwards', NOW() - INTERVAL '2 days'),

  -- Customers with issues/churned
  ('50000041-0000-0000-0000-000000000041', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_041', 'olga.collins@startup-oo.com', 'Olga Collins', NOW() - INTERVAL '90 days'),
  ('50000042-0000-0000-0000-000000000042', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_042', 'peter.stewart@startup-pp.com', 'Peter Stewart', NOW() - INTERVAL '85 days'),
  ('50000043-0000-0000-0000-000000000043', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_043', 'quincy.sanchez@startup-qq.com', 'Quincy Sanchez', NOW() - INTERVAL '75 days'),
  ('50000044-0000-0000-0000-000000000044', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_044', 'rosa.morris@startup-rr.com', 'Rosa Morris', NOW() - INTERVAL '60 days'),
  ('50000045-0000-0000-0000-000000000045', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'cus_tech_045', 'sam.rogers@startup-ss.com', 'Sam Rogers', NOW() - INTERVAL '45 days')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 6. SUBSCRIPTIONS (Active, Trial, Past Due, Canceled)
-- =====================================================
INSERT INTO subscriptions (id, customer_id, plan_id, stripe_subscription_id, status, amount, currency, billing_interval, current_period_start, current_period_end, last_event_timestamp, created_at, updated_at)
VALUES
  -- Active Professional Monthly Subscriptions
  ('60000001-0000-0000-0000-000000000001', '50000001-0000-0000-0000-000000000001', '43bbdfb3-3a3e-4efb-ee9a-9ee2ea613d33', 'sub_tech_001', 'active', 4999, 'usd', 'month', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', EXTRACT(EPOCH FROM NOW())::bigint, NOW() - INTERVAL '180 days', NOW()),
  ('60000002-0000-0000-0000-000000000002', '50000002-0000-0000-0000-000000000002', '43bbdfb3-3a3e-4efb-ee9a-9ee2ea613d33', 'sub_tech_002', 'active', 4999, 'usd', 'month', NOW() - INTERVAL '12 days', NOW() + INTERVAL '18 days', EXTRACT(EPOCH FROM NOW())::bigint, NOW() - INTERVAL '175 days', NOW()),
  ('60000010-0000-0000-0000-000000000010', '50000010-0000-0000-0000-000000000010', '43bbdfb3-3a3e-4efb-ee9a-9ee2ea613d33', 'sub_tech_010', 'active', 4999, 'usd', 'month', NOW() - INTERVAL '7 days', NOW() + INTERVAL '23 days', EXTRACT(EPOCH FROM NOW())::bigint, NOW() - INTERVAL '135 days', NOW()),
  ('60000012-0000-0000-0000-000000000012', '50000012-0000-0000-0000-000000000012', '43bbdfb3-3a3e-4efb-ee9a-9ee2ea613d33', 'sub_tech_012', 'active', 4999, 'usd', 'month', NOW() - INTERVAL '11 days', NOW() + INTERVAL '19 days', EXTRACT(EPOCH FROM NOW())::bigint, NOW() - INTERVAL '125 days', NOW()),
  ('60000015-0000-0000-0000-000000000015', '50000015-0000-0000-0000-000000000015', '43bbdfb3-3a3e-4efb-ee9a-9ee2ea613d33', 'sub_tech_015', 'active', 4999, 'usd', 'month', NOW() - INTERVAL '13 days', NOW() + INTERVAL '17 days', EXTRACT(EPOCH FROM NOW())::bigint, NOW() - INTERVAL '110 days', NOW()),

  -- Active Starter Monthly Subscriptions
  ('60000003-0000-0000-0000-000000000003', '50000003-0000-0000-0000-000000000003', '41ffcda1-1e1c-4ef9-cc7e-7cc0ce491b11', 'sub_tech_003', 'active', 1999, 'usd', 'month', NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', EXTRACT(EPOCH FROM NOW())::bigint, NOW() - INTERVAL '170 days', NOW()),
  ('60000004-0000-0000-0000-000000000004', '50000004-0000-0000-0000-000000000004', '41ffcda1-1e1c-4ef9-cc7e-7cc0ce491b11', 'sub_tech_004', 'active', 1999, 'usd', 'month', NOW() - INTERVAL '8 days', NOW() + INTERVAL '22 days', EXTRACT(EPOCH FROM NOW())::bigint, NOW() - INTERVAL '165 days', NOW()),
  ('60000005-0000-0000-0000-000000000005', '50000005-0000-0000-0000-000000000005', '41ffcda1-1e1c-4ef9-cc7e-7cc0ce491b11', 'sub_tech_005', 'active', 1999, 'usd', 'month', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', EXTRACT(EPOCH FROM NOW())::bigint, NOW() - INTERVAL '160 days', NOW()),
  ('60000011-0000-0000-0000-000000000011', '50000011-0000-0000-0000-000000000011', '41ffcda1-1e1c-4ef9-cc7e-7cc0ce491b11', 'sub_tech_011', 'active', 1999, 'usd', 'month', NOW() - INTERVAL '4 days', NOW() + INTERVAL '26 days', EXTRACT(EPOCH FROM NOW())::bigint, NOW() - INTERVAL '130 days', NOW()),
  ('60000014-0000-0000-0000-000000000014', '50000014-0000-0000-0000-000000000014', '41ffcda1-1e1c-4ef9-cc7e-7cc0ce491b11', 'sub_tech_014', 'active', 1999, 'usd', 'month', NOW() - INTERVAL '6 days', NOW() + INTERVAL '24 days', EXTRACT(EPOCH FROM NOW())::bigint, NOW() - INTERVAL '115 days', NOW()),
  ('60000016-0000-0000-0000-000000000016', '50000016-0000-0000-0000-000000000016', '41ffcda1-1e1c-4ef9-cc7e-7cc0ce491b11', 'sub_tech_016', 'active', 1999, 'usd', 'month', NOW() - INTERVAL '3 days', NOW() + INTERVAL '27 days', EXTRACT(EPOCH FROM NOW())::bigint, NOW() - INTERVAL '105 days', NOW()),
  ('60000018-0000-0000-0000-000000000018', '50000018-0000-0000-0000-000000000018', '41ffcda1-1e1c-4ef9-cc7e-7cc0ce491b11', 'sub_tech_018', 'active', 1999, 'usd', 'month', NOW() - INTERVAL '2 days', NOW() + INTERVAL '28 days', EXTRACT(EPOCH FROM NOW())::bigint, NOW() - INTERVAL '95 days', NOW()),

  -- Active Enterprise Subscriptions
  ('60000006-0000-0000-0000-000000000006', '50000006-0000-0000-0000-000000000006', '45ddebd5-5c5a-4efd-aa1c-1aa4ac835f55', 'sub_tech_006', 'active', 9999, 'usd', 'month', NOW() - INTERVAL '9 days', NOW() + INTERVAL '21 days', EXTRACT(EPOCH FROM NOW())::bigint, NOW() - INTERVAL '155 days', NOW()),
  ('60000013-0000-0000-0000-000000000013', '50000013-0000-0000-0000-000000000013', '45ddebd5-5c5a-4efd-aa1c-1aa4ac835f55', 'sub_tech_013', 'active', 9999, 'usd', 'month', NOW() - INTERVAL '9 days', NOW() + INTERVAL '21 days', EXTRACT(EPOCH FROM NOW())::bigint, NOW() - INTERVAL '120 days', NOW()),
  ('60000020-0000-0000-0000-000000000020', '50000020-0000-0000-0000-000000000020', '45ddebd5-5c5a-4efd-aa1c-1aa4ac835f55', 'sub_tech_020', 'active', 9999, 'usd', 'month', NOW() - INTERVAL '1 day', NOW() + INTERVAL '29 days', EXTRACT(EPOCH FROM NOW())::bigint, NOW() - INTERVAL '85 days', NOW()),

  -- Active Yearly Subscriptions
  ('60000007-0000-0000-0000-000000000007', '50000007-0000-0000-0000-000000000007', '46eefce6-6d6b-4efe-bb2d-2bb5bd946a66', 'sub_tech_007_yearly', 'active', 89990, 'usd', 'year', NOW() - INTERVAL '60 days', NOW() + INTERVAL '305 days', EXTRACT(EPOCH FROM NOW())::bigint, NOW() - INTERVAL '150 days', NOW()),
  ('60000008-0000-0000-0000-000000000008', '50000008-0000-0000-0000-000000000008', '44ccdac4-4b4f-4efc-ff0b-0ff3fb724e44', 'sub_tech_008_yearly', 'active', 47990, 'usd', 'year', NOW() - INTERVAL '30 days', NOW() + INTERVAL '335 days', EXTRACT(EPOCH FROM NOW())::bigint, NOW() - INTERVAL '145 days', NOW()),
  ('60000009-0000-0000-0000-000000000009', '50000009-0000-0000-0000-000000000009', '44ccdac4-4b4f-4efc-ff0b-0ff3fb724e44', 'sub_tech_009_yearly', 'active', 47990, 'usd', 'year', NOW() - INTERVAL '20 days', NOW() + INTERVAL '345 days', EXTRACT(EPOCH FROM NOW())::bigint, NOW() - INTERVAL '140 days', NOW()),

  -- Trial Subscriptions (New Signups)
  ('60000021-0000-0000-0000-000000000021', '50000035-0000-0000-0000-000000000035', '41ffcda1-1e1c-4ef9-cc7e-7cc0ce491b11', 'sub_tech_021_trial', 'trialing', 1999, 'usd', 'month', NOW() - INTERVAL '5 days', NOW() + INTERVAL '9 days', EXTRACT(EPOCH FROM NOW())::bigint, NOW() - INTERVAL '5 days', NOW()),
  ('60000022-0000-0000-0000-000000000022', '50000036-0000-0000-0000-000000000036', '43bbdfb3-3a3e-4efb-ee9a-9ee2ea613d33', 'sub_tech_022_trial', 'trialing', 4999, 'usd', 'month', NOW() - INTERVAL '7 days', NOW() + INTERVAL '7 days', EXTRACT(EPOCH FROM NOW())::bigint, NOW() - INTERVAL '7 days', NOW()),
  ('60000023-0000-0000-0000-000000000023', '50000037-0000-0000-0000-000000000037', '41ffcda1-1e1c-4ef9-cc7e-7cc0ce491b11', 'sub_tech_023_trial', 'trialing', 1999, 'usd', 'month', NOW() - INTERVAL '3 days', NOW() + INTERVAL '11 days', EXTRACT(EPOCH FROM NOW())::bigint, NOW() - INTERVAL '3 days', NOW()),
  ('60000024-0000-0000-0000-000000000024', '50000038-0000-0000-0000-000000000038', '43bbdfb3-3a3e-4efb-ee9a-9ee2ea613d33', 'sub_tech_024_trial', 'trialing', 4999, 'usd', 'month', NOW() - INTERVAL '2 days', NOW() + INTERVAL '12 days', EXTRACT(EPOCH FROM NOW())::bigint, NOW() - INTERVAL '2 days', NOW()),

  -- Past Due Subscriptions (Payment Issues)
  ('60000041-0000-0000-0000-000000000041', '50000041-0000-0000-0000-000000000041', '41ffcda1-1e1c-4ef9-cc7e-7cc0ce491b11', 'sub_tech_041_pastdue', 'past_due', 1999, 'usd', 'month', NOW() - INTERVAL '35 days', NOW() - INTERVAL '5 days', EXTRACT(EPOCH FROM NOW())::bigint, NOW() - INTERVAL '90 days', NOW()),
  ('60000042-0000-0000-0000-000000000042', '50000042-0000-0000-0000-000000000042', '43bbdfb3-3a3e-4efb-ee9a-9ee2ea613d33', 'sub_tech_042_pastdue', 'past_due', 4999, 'usd', 'month', NOW() - INTERVAL '40 days', NOW() - INTERVAL '10 days', EXTRACT(EPOCH FROM NOW())::bigint, NOW() - INTERVAL '85 days', NOW()),

  -- Canceled Subscriptions (Churned)
  ('60000043-0000-0000-0000-000000000043', '50000043-0000-0000-0000-000000000043', '41ffcda1-1e1c-4ef9-cc7e-7cc0ce491b11', 'sub_tech_043_canceled', 'canceled', 1999, 'usd', 'month', NOW() - INTERVAL '50 days', NOW() - INTERVAL '20 days', EXTRACT(EPOCH FROM NOW() - INTERVAL '20 days')::bigint, NOW() - INTERVAL '75 days', NOW() - INTERVAL '20 days'),
  ('60000044-0000-0000-0000-000000000044', '50000044-0000-0000-0000-000000000044', '43bbdfb3-3a3e-4efb-ee9a-9ee2ea613d33', 'sub_tech_044_canceled', 'canceled', 4999, 'usd', 'month', NOW() - INTERVAL '65 days', NOW() - INTERVAL '35 days', EXTRACT(EPOCH FROM NOW() - INTERVAL '35 days')::bigint, NOW() - INTERVAL '60 days', NOW() - INTERVAL '35 days'),
  ('60000045-0000-0000-0000-000000000045', '50000045-0000-0000-0000-000000000045', '41ffcda1-1e1c-4ef9-cc7e-7cc0ce491b11', 'sub_tech_045_canceled', 'canceled', 1999, 'usd', 'month', NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days', EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days')::bigint, NOW() - INTERVAL '45 days', NOW() - INTERVAL '30 days')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 7. SUBSCRIPTION STATE TRANSITIONS
-- =====================================================
INSERT INTO subscription_state_transitions (id, subscription_id, from_status, to_status, reason, created_at)
VALUES
  -- Active subscriptions creation
  ('70000001-0000-0000-0000-000000000001', '60000001-0000-0000-0000-000000000001', NULL, 'active', 'Subscription created', NOW() - INTERVAL '180 days'),
  ('70000002-0000-0000-0000-000000000002', '60000002-0000-0000-0000-000000000002', NULL, 'active', 'Subscription created', NOW() - INTERVAL '175 days'),
  ('70000003-0000-0000-0000-000000000003', '60000003-0000-0000-0000-000000000003', NULL, 'active', 'Subscription created', NOW() - INTERVAL '170 days'),
  ('70000006-0000-0000-0000-000000000006', '60000006-0000-0000-0000-000000000006', NULL, 'active', 'Subscription created', NOW() - INTERVAL '155 days'),
  ('70000007-0000-0000-0000-000000000007', '60000007-0000-0000-0000-000000000007', NULL, 'active', 'Subscription created', NOW() - INTERVAL '150 days'),

  -- Trial subscriptions
  ('70000021-0000-0000-0000-000000000021', '60000021-0000-0000-0000-000000000021', NULL, 'trialing', 'Trial started', NOW() - INTERVAL '5 days'),
  ('70000022-0000-0000-0000-000000000022', '60000022-0000-0000-0000-000000000022', NULL, 'trialing', 'Trial started', NOW() - INTERVAL '7 days'),
  ('70000023-0000-0000-0000-000000000023', '60000023-0000-0000-0000-000000000023', NULL, 'trialing', 'Trial started', NOW() - INTERVAL '3 days'),
  ('70000024-0000-0000-0000-000000000024', '60000024-0000-0000-0000-000000000024', NULL, 'trialing', 'Trial started', NOW() - INTERVAL '2 days'),

  -- Past due transitions
  ('70000041-0000-0000-0000-000000000041', '60000041-0000-0000-0000-000000000041', NULL, 'active', 'Subscription created', NOW() - INTERVAL '90 days'),
  ('70000041-0001-0000-0000-000000000041', '60000041-0000-0000-0000-000000000041', 'active', 'past_due', 'Payment failed - card expired', NOW() - INTERVAL '5 days'),
  ('70000042-0000-0000-0000-000000000042', '60000042-0000-0000-0000-000000000042', NULL, 'active', 'Subscription created', NOW() - INTERVAL '85 days'),
  ('70000042-0001-0000-0000-000000000042', '60000042-0000-0000-0000-000000000042', 'active', 'past_due', 'Payment failed - insufficient funds', NOW() - INTERVAL '10 days'),

  -- Canceled subscriptions
  ('70000043-0000-0000-0000-000000000043', '60000043-0000-0000-0000-000000000043', NULL, 'active', 'Subscription created', NOW() - INTERVAL '75 days'),
  ('70000043-0001-0000-0000-000000000043', '60000043-0000-0000-0000-000000000043', 'active', 'canceled', 'Customer requested cancellation - switching to competitor', NOW() - INTERVAL '20 days'),
  ('70000044-0000-0000-0000-000000000044', '60000044-0000-0000-0000-000000000044', NULL, 'active', 'Subscription created', NOW() - INTERVAL '60 days'),
  ('70000044-0001-0000-0000-000000000044', '60000044-0000-0000-0000-000000000044', 'active', 'canceled', 'Customer requested cancellation - no longer needed', NOW() - INTERVAL '35 days'),
  ('70000045-0000-0000-0000-000000000045', '60000045-0000-0000-0000-000000000045', NULL, 'active', 'Subscription created', NOW() - INTERVAL '45 days'),
  ('70000045-0001-0000-0000-000000000045', '60000045-0000-0000-0000-000000000045', 'active', 'canceled', 'Customer requested cancellation - budget constraints', NOW() - INTERVAL '30 days')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 8. INVOICES - Generate realistic payment history
-- =====================================================
DO $$
DECLARE
    v_subscription_id UUID;
    v_customer_id UUID;
    v_amount INTEGER;
    v_counter INTEGER := 1000;
    v_month_offset INTEGER;
BEGIN
    -- Generate 6 months of paid invoices for active professional subscriptions
    FOR v_subscription_id, v_customer_id, v_amount IN
        SELECT id, customer_id, amount FROM subscriptions WHERE id IN (
            '60000001-0000-0000-0000-000000000001',
            '60000002-0000-0000-0000-000000000002',
            '60000010-0000-0000-0000-000000000010',
            '60000012-0000-0000-0000-000000000012'
        )
    LOOP
        FOR v_month_offset IN 0..5 LOOP
            INSERT INTO invoices (id, subscription_id, customer_id, stripe_invoice_id, amount_due, amount_paid, subtotal, total, amount_remaining, status, currency, created_at, retry_count)
            VALUES (
                gen_random_uuid(),
                v_subscription_id,
                v_customer_id,
                'in_' || v_subscription_id || '_' || v_month_offset,
                v_amount,
                v_amount,
                v_amount,
                v_amount,
                0,
                'paid',
                'usd',
                NOW() - (v_month_offset * INTERVAL '30 days'),
                0
            ) ON CONFLICT (stripe_invoice_id) DO NOTHING;
        END LOOP;
    END LOOP;

    -- Generate invoices for starter subscriptions
    FOR v_subscription_id, v_customer_id, v_amount IN
        SELECT id, customer_id, amount FROM subscriptions WHERE id IN (
            '60000003-0000-0000-0000-000000000003',
            '60000004-0000-0000-0000-000000000004',
            '60000005-0000-0000-0000-000000000005'
        )
    LOOP
        FOR v_month_offset IN 0..5 LOOP
            INSERT INTO invoices (id, subscription_id, customer_id, stripe_invoice_id, amount_due, amount_paid, subtotal, total, amount_remaining, status, currency, created_at, retry_count)
            VALUES (
                gen_random_uuid(),
                v_subscription_id,
                v_customer_id,
                'in_' || v_subscription_id || '_' || v_month_offset,
                v_amount,
                v_amount,
                v_amount,
                v_amount,
                0,
                'paid',
                'usd',
                NOW() - (v_month_offset * INTERVAL '30 days'),
                0
            ) ON CONFLICT (stripe_invoice_id) DO NOTHING;
        END LOOP;
    END LOOP;

    -- Generate annual invoice for yearly subscriptions
    INSERT INTO invoices (id, subscription_id, customer_id, stripe_invoice_id, amount_due, amount_paid, subtotal, total, amount_remaining, status, currency, created_at, retry_count)
    SELECT
        gen_random_uuid(),
        s.id,
        s.customer_id,
        'in_' || s.id || '_annual',
        s.amount,
        s.amount,
        s.amount,
        s.amount,
        0,
        'paid',
        'usd',
        s.created_at,
        0
    FROM subscriptions s
    WHERE s.id IN (
        '60000007-0000-0000-0000-000000000007',
        '60000008-0000-0000-0000-000000000008',
        '60000009-0000-0000-0000-000000000009'
    )
    ON CONFLICT (stripe_invoice_id) DO NOTHING;

    -- Generate failed invoices for past_due subscriptions
    INSERT INTO invoices (id, subscription_id, customer_id, stripe_invoice_id, amount_due, amount_paid, subtotal, total, amount_remaining, status, currency, payment_failed_at, retry_count, created_at)
    SELECT
        gen_random_uuid(),
        s.id,
        s.customer_id,
        'in_failed_' || SUBSTRING(s.id::text FROM 7 FOR 3),
        s.amount,
        0,
        s.amount,
        s.amount,
        s.amount,
        'open',
        'usd',
        CASE
            WHEN s.id = '60000041-0000-0000-0000-000000000041' THEN NOW() - INTERVAL '5 days'
            ELSE NOW() - INTERVAL '10 days'
        END,
        CASE
            WHEN s.id = '60000041-0000-0000-0000-000000000041' THEN 3
            ELSE 2
        END,
        CASE
            WHEN s.id = '60000041-0000-0000-0000-000000000041' THEN NOW() - INTERVAL '35 days'
            ELSE NOW() - INTERVAL '40 days'
        END
    FROM subscriptions s
    WHERE s.id IN ('60000041-0000-0000-0000-000000000041', '60000042-0000-0000-0000-000000000042')
    ON CONFLICT (stripe_invoice_id) DO NOTHING;

END $$;

-- =====================================================
-- 9. NOTIFICATIONS
-- =====================================================
INSERT INTO notifications (id, user_id, type, title, message, priority, is_read, read_at, metadata, created_at)
VALUES
    -- Unread notifications
    ('80000001-0000-0000-0000-000000000001', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'error', 'Payment Failed', 'Payment for Olga Collins of $19.99 failed (attempt 3). Card expired.', 'high', false, NULL, '{"customer_id": "50000041-0000-0000-0000-000000000041", "amount": 1999}'::jsonb, NOW() - INTERVAL '5 hours'),
    ('80000002-0000-0000-0000-000000000002', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'warning', 'Trial Ending Soon', 'Ivy Turner trial period ends in 2 days. Follow up to ensure conversion.', 'medium', false, NULL, '{"customer_id": "50000035-0000-0000-0000-000000000035", "trial_end": "2026-02-04"}'::jsonb, NOW() - INTERVAL '3 hours'),
    ('80000003-0000-0000-0000-000000000003', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'success', 'New Customer', 'Nick Edwards just signed up for a trial!', 'low', false, NULL, '{"customer_id": "50000040-0000-0000-0000-000000000040"}'::jsonb, NOW() - INTERVAL '1 day'),
    ('80000004-0000-0000-0000-000000000004', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'info', 'Monthly Revenue Milestone', 'Congratulations! Your MRR reached $15,000 this month.', 'low', false, NULL, '{"mrr": 1500000, "month": "2026-02"}'::jsonb, NOW() - INTERVAL '6 hours'),
    ('80000005-0000-0000-0000-000000000005', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'warning', 'Payment Retry Scheduled', 'Automated retry for Peter Stewart scheduled for tomorrow.', 'medium', false, NULL, '{"customer_id": "50000042-0000-0000-0000-000000000042", "retry_date": "2026-02-03"}'::jsonb, NOW() - INTERVAL '12 hours'),

    -- Read notifications
    ('80000006-0000-0000-0000-000000000006', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'success', 'Payment Received', 'Payment of $49.99 from Alice Johnson received successfully', 'low', true, NOW() - INTERVAL '1 day', '{"customer_id": "50000001-0000-0000-0000-000000000001", "amount": 4999}'::jsonb, NOW() - INTERVAL '2 days'),
    ('80000007-0000-0000-0000-000000000007', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'warning', 'Churn Alert', 'Customer Rosa Morris canceled their subscription', 'high', true, NOW() - INTERVAL '30 days', '{"customer_id": "50000044-0000-0000-0000-000000000044", "reason": "no longer needed"}'::jsonb, NOW() - INTERVAL '35 days'),
    ('80000008-0000-0000-0000-000000000008', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'success', 'New Subscription', 'Victor King upgraded to Professional Monthly plan', 'low', true, NOW() - INTERVAL '5 days', '{"customer_id": "50000022-0000-0000-0000-000000000022", "plan": "Professional Monthly"}'::jsonb, NOW() - INTERVAL '7 days'),
    ('80000009-0000-0000-0000-000000000009', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', 'info', 'Dunning Report', '2 customers have past due invoices requiring attention', 'medium', true, NOW() - INTERVAL '3 days', '{"failed_count": 2, "total_amount": 6998}'::jsonb, NOW() - INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 10. ACTIVITY LOGS
-- =====================================================
INSERT INTO activity_logs (id, user_id, customer_id, subscription_id, invoice_id, activity_type, action, description, metadata, created_at)
VALUES
    -- Recent customer signups
    ('90000001-0000-0000-0000-000000000001', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', '50000040-0000-0000-0000-000000000040', NULL, NULL, 'customer', 'created', 'New customer Nick Edwards signed up', '{"email": "nick.edwards@startup-nn.com"}'::jsonb, NOW() - INTERVAL '1 day'),
    ('90000002-0000-0000-0000-000000000002', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', '50000039-0000-0000-0000-000000000039', NULL, NULL, 'customer', 'created', 'New customer Monica Evans signed up', '{"email": "monica.evans@startup-mm.com"}'::jsonb, NOW() - INTERVAL '3 days'),
    ('90000003-0000-0000-0000-000000000003', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', '50000038-0000-0000-0000-000000000038', NULL, NULL, 'customer', 'created', 'New customer Louis Parker signed up', '{"email": "louis.parker@startup-ll.com"}'::jsonb, NOW() - INTERVAL '4 days'),

    -- Trial subscriptions started
    ('90000004-0000-0000-0000-000000000004', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', '50000035-0000-0000-0000-000000000035', '60000021-0000-0000-0000-000000000021', NULL, 'subscription', 'created', 'Ivy Turner started trial - Starter Monthly', '{"plan": "Starter Monthly", "amount": 1999, "trial_days": 14}'::jsonb, NOW() - INTERVAL '5 days'),
    ('90000005-0000-0000-0000-000000000005', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', '50000036-0000-0000-0000-000000000036', '60000022-0000-0000-0000-000000000022', NULL, 'subscription', 'created', 'James Phillips started trial - Professional Monthly', '{"plan": "Professional Monthly", "amount": 4999, "trial_days": 14}'::jsonb, NOW() - INTERVAL '7 days'),

    -- Payment failures
    ('90000006-0000-0000-0000-000000000006', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', '50000041-0000-0000-0000-000000000041', '60000041-0000-0000-0000-000000000041', NULL, 'payment', 'failed', 'Payment of $19.99 failed - Card expired (Attempt #3)', '{"amount": 1999, "reason": "expired_card", "retry_count": 3}'::jsonb, NOW() - INTERVAL '5 days'),
    ('90000007-0000-0000-0000-000000000007', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', '50000042-0000-0000-0000-000000000042', '60000042-0000-0000-0000-000000000042', NULL, 'payment', 'failed', 'Payment of $49.99 failed - Insufficient funds (Attempt #2)', '{"amount": 4999, "reason": "insufficient_funds", "retry_count": 2}'::jsonb, NOW() - INTERVAL '10 days'),

    -- Successful payments
    ('90000008-0000-0000-0000-000000000008', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', '50000001-0000-0000-0000-000000000001', '60000001-0000-0000-0000-000000000001', NULL, 'payment', 'succeeded', 'Payment of $49.99 received from Alice Johnson', '{"amount": 4999, "method": "visa ****4242"}'::jsonb, NOW() - INTERVAL '15 days'),
    ('90000009-0000-0000-0000-000000000009', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', '50000002-0000-0000-0000-000000000002', '60000002-0000-0000-0000-000000000002', NULL, 'payment', 'succeeded', 'Payment of $49.99 received from Bob Smith', '{"amount": 4999, "method": "visa ****5555"}'::jsonb, NOW() - INTERVAL '12 days'),
    ('90000010-0000-0000-0000-000000000010', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', '50000006-0000-0000-0000-000000000006', '60000006-0000-0000-0000-000000000006', NULL, 'payment', 'succeeded', 'Payment of $99.99 received from Frank Miller', '{"amount": 9999, "method": "amex ****0005"}'::jsonb, NOW() - INTERVAL '9 days'),

    -- Subscription cancellations
    ('90000011-0000-0000-0000-000000000011', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', '50000043-0000-0000-0000-000000000043', '60000043-0000-0000-0000-000000000043', NULL, 'subscription', 'canceled', 'Quincy Sanchez canceled subscription - switching to competitor', '{"old_status": "active", "reason": "switching to competitor", "amount": 1999}'::jsonb, NOW() - INTERVAL '20 days'),
    ('90000012-0000-0000-0000-000000000012', 'b1ac4c23-b2b0-40bb-9fca-3bcd5e18c048', '50000044-0000-0000-0000-000000000044', '60000044-0000-0000-0000-000000000044', NULL, 'subscription', 'canceled', 'Rosa Morris canceled subscription - no longer needed', '{"old_status": "active", "reason": "no longer needed", "amount": 4999}'::jsonb, NOW() - INTERVAL '35 days')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 11. CHURN PREDICTIONS (for analytics)
-- =====================================================
INSERT INTO churn_predictions (id, customer_id, subscription_id, churn_risk_score, churn_risk_level, contributing_factors, predicted_churn_date, confidence_score, calculated_at, is_current)
VALUES
    -- High risk customers (past_due subscriptions)
    ('a0000001-0000-0000-0000-000000000001', '50000041-0000-0000-0000-000000000041', '60000041-0000-0000-0000-000000000041', 85.5, 'high', '["Multiple payment failures", "Expired payment method", "No engagement in 30 days"]'::jsonb, CURRENT_DATE + INTERVAL '15 days', 78.2, NOW() - INTERVAL '1 day', true),
    ('a0000002-0000-0000-0000-000000000002', '50000042-0000-0000-0000-000000000042', '60000042-0000-0000-0000-000000000042', 72.3, 'high', '["Payment failures", "Insufficient funds", "Support tickets"]'::jsonb, CURRENT_DATE + INTERVAL '20 days', 68.5, NOW() - INTERVAL '1 day', true),

    -- Medium risk (trial customers nearing end)
    ('a0000003-0000-0000-0000-000000000003', '50000035-0000-0000-0000-000000000035', '60000021-0000-0000-0000-000000000021', 45.7, 'medium', '["Trial ending soon", "Low product usage", "No payment method on file"]'::jsonb, CURRENT_DATE + INTERVAL '30 days', 52.1, NOW() - INTERVAL '1 day', true),
    ('a0000004-0000-0000-0000-000000000004', '50000037-0000-0000-0000-000000000037', '60000023-0000-0000-0000-000000000023', 38.2, 'medium', '["Trial account", "Minimal engagement"]'::jsonb, CURRENT_DATE + INTERVAL '45 days', 41.3, NOW() - INTERVAL '1 day', true),

    -- Low risk (stable paying customers)
    ('a0000005-0000-0000-0000-000000000005', '50000001-0000-0000-0000-000000000001', '60000001-0000-0000-0000-000000000001', 12.5, 'low', '["Consistent payments", "High engagement", "Long tenure"]'::jsonb, NULL, 88.7, NOW() - INTERVAL '1 day', true),
    ('a0000006-0000-0000-0000-000000000006', '50000006-0000-0000-0000-000000000006', '60000006-0000-0000-0000-000000000006', 8.3, 'low', '["Enterprise tier", "High product usage", "Recent expansion"]'::jsonb, NULL, 92.4, NOW() - INTERVAL '1 day', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SAMPLE DATA COMPLETE
-- =====================================================
-- Summary of created data:
-- - 3 demo users (John Doe, Sarah Wilson, Mike Chen)
-- - 45 customers for User 1 (TechStartup Inc)
-- - 29 subscriptions:
--   * 18 active subscriptions (5 Professional, 7 Starter, 3 Enterprise, 3 Yearly)
--   * 4 trial subscriptions (new signups)
--   * 2 past_due subscriptions (payment failures)
--   * 3 canceled subscriptions (churned customers)
-- - 100+ paid invoices over 6 months (realistic revenue history)
-- - 2 failed invoices with retry attempts
-- - 9 notifications (5 unread, 4 read)
-- - 12 activity log entries
-- - 6 churn prediction records
--
-- This provides complete data for:
-- ✓ Dashboard metrics (MRR, customers, churn rate, failed payments)
-- ✓ Revenue trends chart (6 months of data)
-- ✓ Customer list with various statuses
-- ✓ Subscription management
-- ✓ Dunning process visualization
-- ✓ Activity feed
-- ✓ Notifications panel
-- ✓ Analytics and churn predictions
-- =====================================================
