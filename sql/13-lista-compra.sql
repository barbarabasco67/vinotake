CREATE TABLE IF NOT EXISTS lista (
  dispositivo TEXT NOT NULL,
  vino_id TEXT NOT NULL,
  cantidad INTEGER DEFAULT 1,
  comprado INTEGER DEFAULT 0,
  creado TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (dispositivo, vino_id)
);
