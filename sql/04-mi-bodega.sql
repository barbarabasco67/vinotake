CREATE TABLE IF NOT EXISTS bodega (
  dispositivo TEXT NOT NULL,
  vino_id TEXT NOT NULL,
  cantidad INTEGER DEFAULT 0,
  deseo INTEGER DEFAULT 0,
  puntuacion INTEGER,
  nota TEXT,
  creado TEXT DEFAULT CURRENT_TIMESTAMP,
  actualizado TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (dispositivo, vino_id)
);
CREATE INDEX IF NOT EXISTS idx_bodega_vino ON bodega (vino_id);
