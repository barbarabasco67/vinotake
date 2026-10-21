ALTER TABLE vinos ADD COLUMN imagen TEXT;
CREATE INDEX IF NOT EXISTS idx_bodega_puntuacion ON bodega (vino_id, puntuacion);
