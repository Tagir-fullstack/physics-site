CREATE TABLE IF NOT EXISTS electrostatics_instrument_quotas (
  identity_hash varchar(64) PRIMARY KEY,
  tokens double precision NOT NULL CHECK (tokens >= 0 AND tokens <= 12),
  updated_at timestamptz NOT NULL,
  day date NOT NULL,
  measurements integer NOT NULL CHECK (measurements BETWEEN 0 AND 5000)
);
