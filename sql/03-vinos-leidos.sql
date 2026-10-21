CREATE TABLE IF NOT EXISTS vinos_leidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT DEFAULT CURRENT_TIMESTAMP,
  origen TEXT,
  nombre TEXT,
  bodega TEXT,
  denominacion TEXT,
  tipo TEXT,
  super_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_vinos_leidos_nombre ON vinos_leidos (nombre);
