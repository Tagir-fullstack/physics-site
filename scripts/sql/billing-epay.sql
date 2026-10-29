-- Additive migration. Existing accounts remain in Clerk; do not create a second users table.
CREATE SEQUENCE IF NOT EXISTS billing_invoice_seq MINVALUE 100000 MAXVALUE 999999 START 100000 NO CYCLE;
CREATE TABLE IF NOT EXISTS billing_subscriptions (
  user_id varchar(128) NOT NULL,
  environment varchar(16) NOT NULL CHECK (environment IN ('sandbox','production')),
  plan_id varchar(32),
  amount_minor integer CHECK (amount_minor > 0),
  months smallint CHECK (months IN (1,12)),
  paid_through timestamptz,
  auto_renew boolean NOT NULL DEFAULT false,
  card_cipher text,
  cancel_version integer NOT NULL DEFAULT 0,
  consent_version varchar(64),
  consent_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,environment)
);
CREATE TABLE IF NOT EXISTS billing_orders (
  id uuid PRIMARY KEY,
  user_id varchar(128) NOT NULL,
  environment varchar(16) NOT NULL CHECK (environment IN ('sandbox','production')),
  invoice varchar(6) NOT NULL UNIQUE DEFAULT nextval('billing_invoice_seq')::text CHECK (invoice ~ '^[0-9]{6}$'),
  terminal varchar(128) NOT NULL,
  plan_id varchar(32) NOT NULL,
  amount_minor integer NOT NULL CHECK (amount_minor > 0),
  months smallint NOT NULL CHECK (months IN (1,12)),
  recurring boolean NOT NULL,
  kind varchar(16) NOT NULL CHECK (kind IN ('checkout','renewal')),
  cycle_key varchar(128) NOT NULL,
  idempotency_key uuid NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'created' CHECK (status IN ('created','pending','dispatching','unknown','requires_action','paid','failed','cancelled','refunded')),
  callback_hash varchar(64) NOT NULL,
  cancel_version integer NOT NULL,
  legal_version varchar(64) NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  transaction_id varchar(128),
  grant_starts timestamptz,
  grant_ends timestamptz,
  checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,environment,idempotency_key),
  UNIQUE(user_id,environment,cycle_key),
  UNIQUE(environment,transaction_id),
  FOREIGN KEY(user_id,environment) REFERENCES billing_subscriptions(user_id,environment)
);
CREATE UNIQUE INDEX IF NOT EXISTS billing_one_pending ON billing_orders(user_id,environment)
  WHERE status IN ('created','pending','dispatching','unknown','requires_action');
CREATE INDEX IF NOT EXISTS billing_due ON billing_subscriptions(paid_through) WHERE auto_renew;
CREATE INDEX IF NOT EXISTS billing_entitlements ON billing_orders(user_id,environment,grant_ends) WHERE status='paid';
