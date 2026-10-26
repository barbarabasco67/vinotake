-- Perfil público de cada Taker: identificador público (no es el del móvil), bio y visibilidad
ALTER TABLE perfiles ADD COLUMN publico_id TEXT;
ALTER TABLE perfiles ADD COLUMN bio TEXT;
ALTER TABLE perfiles ADD COLUMN publico INTEGER DEFAULT 1;
UPDATE perfiles SET publico_id = lower(hex(randomblob(6))) WHERE publico_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_perfiles_publico ON perfiles (publico_id);
