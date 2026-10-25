-- Vinotake · vinos de Valencia de Alcampo (precios copiados de alcampo.es)

INSERT OR REPLACE INTO vinos (id, nombre, bodega, denominacion, tipo, uva, elaboracion, sabor, temperatura, apertura, va_con, color, precio_ref, ejemplo, estilo, dulce) VALUES
  ('palacio-del-conde-valencia', 'Palacio del Conde Tinto', 'Palacio del Conde', 'D.O. Valencia', 'Tinto', 'Tempranillo', 'Joven', 'Frutal y sencillo, con fruta roja. Muy barato.', '14–16 °C', 'Al momento', 'Legumbres|Pizza|Pasta|Pollo', '#4A2530', 2.80, 0, 'suave', 0),
  ('faustino-rivero-ulecia-roble', 'Faustino Rivero Ulecia Roble', 'Faustino Rivero Ulecia', 'D.O. Utiel-Requena', 'Tinto', 'Bobal · Tempranillo', 'Roble', 'Joven con un toque de barrica, frutal y jugoso.', '14–16 °C', 'Al momento', 'Legumbres|Pizza|Pasta|Pollo', '#4A2530', 4.45, 0, 'equilibrado', 0);

INSERT OR REPLACE INTO precios (vino_id, super_id, precio) VALUES
  ('palacio-del-conde-valencia', 'alcampo', 2.80),
  ('faustino-rivero-ulecia-roble', 'alcampo', 4.45),
  ('vicente-gandia-bobal', 'alcampo', 8.95),
  ('el-miracle-1', 'alcampo', 4.40);

INSERT OR REPLACE INTO maridajes (plato_id, vino_id, orden, motivo, nota) VALUES
  ('lentejas', 'palacio-del-conde-valencia', 40, 'Jugoso y frutal, va muy bien con legumbres y guisos.', 'Joven y frutal'),
  ('pizza', 'palacio-del-conde-valencia', 41, 'Frutal y fácil: acompaña bien al queso y al tomate.', 'Joven y frutal'),
  ('pasta', 'palacio-del-conde-valencia', 42, 'Fruta y frescura para salsas de tomate y boloñesa.', 'Joven y frutal'),
  ('pollo', 'palacio-del-conde-valencia', 43, 'Frutal y ligero para pollo o cerdo.', 'Joven y frutal'),
  ('lentejas', 'faustino-rivero-ulecia-roble', 40, 'Jugoso y frutal, va muy bien con legumbres y guisos.', 'Joven y frutal'),
  ('pizza', 'faustino-rivero-ulecia-roble', 41, 'Frutal y fácil: acompaña bien al queso y al tomate.', 'Joven y frutal'),
  ('pasta', 'faustino-rivero-ulecia-roble', 42, 'Fruta y frescura para salsas de tomate y boloñesa.', 'Joven y frutal'),
  ('pollo', 'faustino-rivero-ulecia-roble', 43, 'Frutal y ligero para pollo o cerdo.', 'Joven y frutal');

INSERT OR REPLACE INTO vinos (id, nombre, bodega, denominacion, tipo, uva, elaboracion, sabor, temperatura, apertura, va_con, color, precio_ref, ejemplo, estilo, dulce) VALUES
  ('el-novio-perfecto', 'El Novio Perfecto', 'El Novio Perfecto', 'D.O.P. Valencia', 'Blanco', 'Moscatel', 'Dulce', 'Dulce y aromático, con uva moscatel, flores y fruta blanca. Vegano.', '8–10 °C', 'Bien frío', 'Aperitivos|Quesos', '#D4C27A', 6.40, 0, 'suave', 1);

INSERT OR REPLACE INTO precios (vino_id, super_id, precio) VALUES
  ('el-novio-perfecto', 'alcampo', 6.40);

INSERT OR REPLACE INTO maridajes (plato_id, vino_id, orden, motivo, nota) VALUES
  ('aperitivo', 'el-novio-perfecto', 40, 'Dulce y aromático: se bebe solo o con algo salado.', 'Blanco fresco'),
  ('quesos', 'el-novio-perfecto', 41, 'El dulzor contrasta con quesos azules o curados.', 'Blanco fresco');
