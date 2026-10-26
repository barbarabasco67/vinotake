-- Seguir a otros Takers y recomendaciones con foto
CREATE TABLE IF NOT EXISTS seguidores (
  seguidor TEXT NOT NULL,
  seguido TEXT NOT NULL,
  creado TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (seguidor, seguido)
);
CREATE INDEX IF NOT EXISTS idx_seguidores_seguido ON seguidores (seguido);

CREATE TABLE IF NOT EXISTS fotos_recomendacion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  datos TEXT NOT NULL,
  creado TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recomendaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dispositivo TEXT NOT NULL,
  vino_id TEXT NOT NULL,
  texto TEXT,
  foto_id INTEGER,
  oculto INTEGER DEFAULT 0,
  creado TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_recomendaciones_autor ON recomendaciones (dispositivo, oculto, creado);
CREATE INDEX IF NOT EXISTS idx_recomendaciones_creado ON recomendaciones (oculto, creado);
