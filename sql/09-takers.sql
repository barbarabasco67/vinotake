CREATE TABLE IF NOT EXISTS resenas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dispositivo TEXT NOT NULL,
  vino_id TEXT NOT NULL,
  puntuacion INTEGER NOT NULL,
  texto TEXT,
  oculto INTEGER DEFAULT 0,
  creado TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (dispositivo, vino_id)
);
CREATE INDEX IF NOT EXISTS idx_resenas_vino ON resenas (vino_id, oculto);
CREATE INDEX IF NOT EXISTS idx_resenas_creado ON resenas (creado);

CREATE TABLE IF NOT EXISTS brindis (
  resena_id INTEGER NOT NULL,
  dispositivo TEXT NOT NULL,
  creado TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (resena_id, dispositivo)
);

CREATE TABLE IF NOT EXISTS preguntas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dispositivo TEXT NOT NULL,
  texto TEXT NOT NULL,
  oculto INTEGER DEFAULT 0,
  creado TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_preguntas_creado ON preguntas (creado);

CREATE TABLE IF NOT EXISTS respuestas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pregunta_id INTEGER NOT NULL,
  dispositivo TEXT NOT NULL,
  vino_id TEXT NOT NULL,
  texto TEXT,
  oculto INTEGER DEFAULT 0,
  creado TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_respuestas_pregunta ON respuestas (pregunta_id);

CREATE TABLE IF NOT EXISTS utiles (
  respuesta_id INTEGER NOT NULL,
  dispositivo TEXT NOT NULL,
  creado TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (respuesta_id, dispositivo)
);

CREATE TABLE IF NOT EXISTS retos (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT,
  precio_max REAL,
  inicio TEXT NOT NULL,
  fin TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reto_propuestas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reto_id TEXT NOT NULL,
  dispositivo TEXT NOT NULL,
  vino_id TEXT NOT NULL,
  texto TEXT,
  oculto INTEGER DEFAULT 0,
  creado TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (reto_id, dispositivo)
);

CREATE TABLE IF NOT EXISTS reto_votos (
  reto_id TEXT NOT NULL,
  dispositivo TEXT NOT NULL,
  propuesta_id INTEGER NOT NULL,
  creado TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (reto_id, dispositivo)
);

CREATE TABLE IF NOT EXISTS denuncias (
  tipo TEXT NOT NULL,
  item_id INTEGER NOT NULL,
  dispositivo TEXT NOT NULL,
  creado TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tipo, item_id, dispositivo)
);

INSERT OR REPLACE INTO retos (id, titulo, descripcion, tipo, precio_max, inicio, fin) VALUES
  ('2026-10-19', 'El mejor tinto por menos de 5 €', 'Ese tinto barato que siempre triunfa. Propón el tuyo y vota el que más te convenza.', 'Tinto', 5, '2026-10-19', '2026-10-25'),
  ('2026-10-26', 'Un blanco para el pescado', 'Para una merluza, unas gambas o un pescado al horno. Máximo 10 €.', 'Blanco', 10, '2026-10-26', '2026-11-01'),
  ('2026-11-02', 'Tu vino de diario', 'El que abres un martes cualquiera sin pensarlo. Máximo 7 €.', NULL, 7, '2026-11-02', '2026-11-08'),
  ('2026-11-09', 'Para quedar bien con los suegros', 'Elegante, reconocible y sin arruinarte. Máximo 15 €.', NULL, 15, '2026-11-09', '2026-11-15'),
  ('2026-11-16', 'El mejor cava por menos de 8 €', 'Burbujas buenas sin gastar mucho.', 'Espumoso', 8, '2026-11-16', '2026-11-22'),
  ('2026-11-23', 'Un vino para el cocido', 'Cocido, lentejas, fabada… ¿qué abres tú?', NULL, NULL, '2026-11-23', '2026-11-29'),
  ('2026-11-30', 'El regalo perfecto por menos de 15 €', 'La botella que regalarías a alguien que sabe de vino.', NULL, 15, '2026-11-30', '2026-12-06'),
  ('2026-12-07', 'Para una tabla de quesos', 'Tinto, blanco o un fino: tú decides.', NULL, NULL, '2026-12-07', '2026-12-13'),
  ('2026-12-14', 'El vino de Nochebuena', 'El que pondrías en la mesa de Navidad.', NULL, NULL, '2026-12-14', '2026-12-20'),
  ('2026-12-21', 'El cava de Nochevieja', 'Para las uvas y el brindis de medianoche.', 'Espumoso', NULL, '2026-12-21', '2026-12-27'),
  ('2026-12-28', 'Tu descubrimiento del año', 'El vino que más te ha sorprendido este año.', NULL, NULL, '2026-12-28', '2027-01-03');
