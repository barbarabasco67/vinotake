UPDATE platos SET nombre = 'Legumbres', palabras = 'legumbre,lentej,garbanz,alubia,judion,fabada,cocido,potaje,guiso,estofado' WHERE id = 'lentejas';
UPDATE platos SET tipo = 'texto' WHERE id = 'pizza';
UPDATE platos SET palabras = 'queso,tabla', orden = 10 WHERE id = 'quesos';
UPDATE platos SET orden = 11 WHERE id = 'aperitivo';
INSERT OR REPLACE INTO platos (id, nombre, palabras, orden, tipo) VALUES
  ('embutido', 'Embutido', 'embutido,jamon,iberic,chorizo,salchichon,fuet,cecina,morcilla', 9, 'plato');

INSERT OR REPLACE INTO maridajes (plato_id, vino_id, orden, motivo, nota) VALUES
  ('embutido', 'protos-roble', 1, 'Fruta y un toque tostado: va de maravilla con chorizo y salchichón.', 'La mejor opción'),
  ('embutido', 'tio-pepe', 2, 'Con jamón ibérico, un fino seco es imbatible.', 'Con jamón ibérico'),
  ('embutido', 'marques-caceres-crianza', 3, 'Un crianza clásico para una tabla de embutidos.', 'Crianza clásico'),
  ('embutido', 'petalos-bierzo', 4, 'Fresco y con fruta: refresca entre loncha y loncha.', 'Mencía fresco'),
  ('embutido', 'juan-gil-4-meses', 5, 'Carnoso y potente, para embutidos con pimentón.', 'Potente y asequible'),
  ('embutido', 'la-gitana', 6, 'Manzanilla seca y salina, perfecta con ibéricos.', 'Manzanilla'),
  ('embutido', 'cordon-negro', 7, 'La burbuja limpia la grasa del ibérico.', 'Cava seco'),
  ('embutido', 'castano-monastrell', 8, 'Frutal y con cuerpo por poco dinero.', 'Barato y con cuerpo'),
  ('embutido', 'faustino-vii', 9, 'Ligero y barato para picar.', 'El más económico');

CREATE TABLE IF NOT EXISTS perfiles (
  dispositivo TEXT PRIMARY KEY,
  nombre TEXT,
  super_id TEXT,
  creado TEXT DEFAULT CURRENT_TIMESTAMP,
  actualizado TEXT DEFAULT CURRENT_TIMESTAMP
);
