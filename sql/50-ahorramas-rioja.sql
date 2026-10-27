-- Vinotake · Ahorramas · Rioja tinto (precios sin ofertas)

INSERT OR REPLACE INTO vinos (id, nombre, bodega, denominacion, tipo, uva, elaboracion, sabor, temperatura, apertura, va_con, color, precio_ref, ejemplo, estilo, dulce) VALUES
  ('antano-tempranillo', 'Antaño Tempranillo', 'Antaño', 'D.O.Ca. Rioja', 'Tinto', 'Tempranillo', 'Joven', 'Frutal y fácil de beber, con fruta roja madura.', '14–16 °C', 'Al momento', 'Pizza|Pasta|Pollo', '#4A2530', 3.75, 0, 'equilibrado', 0),
  ('cune-coleccion-familia-reserva', 'Cune Colección de la Familia Reserva', 'Cune', 'D.O.Ca. Rioja', 'Tinto', 'Tempranillo', 'Reserva', 'Elegante y redondo, con fruta madura, especias y madera fina.', '16–17 °C', '20 minutos antes', 'Carne a la brasa|Quesos|Embutido', '#2E1A1E', 12.95, 0, 'intenso', 0);

INSERT OR REPLACE INTO precios (vino_id, super_id, precio) VALUES
  ('antano-tempranillo', 'ahorramas', 3.75),
  ('cune-coleccion-familia-reserva', 'ahorramas', 12.95),
  ('cune-crianza', 'ahorramas', 7.25),
  ('antano-crianza', 'ahorramas', 5.00),
  ('el-coto-crianza', 'ahorramas', 6.55),
  ('faustino-vii', 'ahorramas', 4.35),
  ('ramon-bilbao-crianza', 'ahorramas', 10.30),
  ('tejar-viejo-crianza', 'ahorramas', 2.90),
  ('otonal-reserva', 'ahorramas', 6.49),
  ('campo-viejo-crianza', 'ahorramas', 5.85),
  ('campo-viejo-tempranillo', 'ahorramas', 4.35),
  ('glorioso-crianza', 'ahorramas', 7.95),
  ('marques-de-arienzo-crianza', 'ahorramas', 9.85),
  ('lopez-de-haro-crianza', 'ahorramas', 8.40),
  ('faustino-rivero-joven', 'ahorramas', 3.50),
  ('beronia-crianza', 'ahorramas', 8.99),
  ('berberana-crianza', 'ahorramas', 5.99),
  ('marques-caceres-crianza', 'ahorramas', 7.90),
  ('ederra-crianza', 'ahorramas', 7.95),
  ('sierra-cantabria-crianza', 'ahorramas', 12.95),
  ('lopez-de-haro-edicion-limitada', 'ahorramas', 10.95),
  ('riscal-reserva', 'ahorramas', 18.90),
  ('luis-canas-crianza', 'ahorramas', 12.55),
  ('pata-negra-rioja-crianza', 'ahorramas', 6.00),
  ('coto-imaz-reserva', 'ahorramas', 8.80),
  ('vina-pomal-crianza', 'ahorramas', 9.45),
  ('vivanco-crianza', 'ahorramas', 9.85),
  ('otonal-crianza', 'ahorramas', 6.25),
  ('tejar-viejo-joven', 'ahorramas', 2.75),
  ('muga-crianza', 'ahorramas', 19.25),
  ('vina-albina-reserva', 'ahorramas', 11.25);

INSERT OR REPLACE INTO maridajes (plato_id, vino_id, orden, motivo, nota) VALUES
  ('pizza', 'antano-tempranillo', 40, 'Frutal y fácil: acompaña bien al queso y al tomate.', 'Joven y frutal'),
  ('pasta', 'antano-tempranillo', 41, 'Fruta y frescura para salsas de tomate y boloñesa.', 'Joven y frutal'),
  ('pollo', 'antano-tempranillo', 42, 'Frutal y ligero para pollo o cerdo.', 'Joven y frutal'),
  ('carne-brasa', 'cune-coleccion-familia-reserva', 40, 'Con cuerpo y taninos que se llevan bien con la carne a la brasa.', 'Crianza o reserva'),
  ('quesos', 'cune-coleccion-familia-reserva', 41, 'Fruta y madera bien integradas: acompaña quesos curados.', 'Crianza o reserva'),
  ('embutido', 'cune-coleccion-familia-reserva', 42, 'Fruta y madera que casan con jamón y embutidos.', 'Crianza o reserva');
