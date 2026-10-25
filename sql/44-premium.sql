-- Vinotake Premium: quién lo tiene, uso mensual, códigos de regalo y clics a tiendas.
CREATE TABLE IF NOT EXISTS premium (
  dispositivo TEXT PRIMARY KEY,
  hasta TEXT NOT NULL,
  origen TEXT,
  cliente TEXT,
  actualizado TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_premium_cliente ON premium (cliente);

CREATE TABLE IF NOT EXISTS usos (
  dispositivo TEXT NOT NULL,
  tipo TEXT NOT NULL,
  mes TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dispositivo, tipo, mes)
);

CREATE TABLE IF NOT EXISTS codigos_premium (
  codigo TEXT PRIMARY KEY,
  dias INTEGER NOT NULL,
  usado_por TEXT,
  usado_en TEXT,
  creado TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clics_tienda (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tienda TEXT NOT NULL,
  vino_id TEXT NOT NULL,
  dispositivo TEXT,
  creado TEXT DEFAULT CURRENT_TIMESTAMP
);
