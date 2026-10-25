-- Vinotake · tintos de Alcampo (precios de la categoría «Vino tinto» de compraonline.alcampo.es) y 7 vinos nuevos
-- Pegar entero en la consola de D1. Se puede pegar más de una vez sin problema.

INSERT OR REPLACE INTO vinos (id, nombre, bodega, denominacion, tipo, uva, elaboracion, sabor, temperatura, apertura, va_con, color, precio_ref, ejemplo, estilo, dulce) VALUES
  ('ederra-crianza', 'Ederra Crianza', 'Bodegas Ederra', 'D.O.Ca. Rioja', 'Tinto', 'Tempranillo', 'Crianza', 'Fruta roja y vainilla, suave y fácil de beber.', '16 °C', '10 minutos antes', 'Legumbres|Pollo|Embutido|Quesos', '#3A2226', 7.98, 0, 'equilibrado', 0),
  ('oinoz-crianza', 'Oinoz Crianza', 'Bodegas Oinoz', 'D.O.Ca. Rioja', 'Tinto', 'Tempranillo', 'Crianza', 'Fruta madura y madera suave, redondo.', '16 °C', '10 minutos antes', 'Legumbres|Pollo|Embutido|Quesos', '#3A2226', 7.98, 0, 'equilibrado', 0),
  ('castillo-san-lorenzo-crianza', 'Castillo San Lorenzo Crianza', 'Castillo San Lorenzo', 'D.O.Ca. Rioja', 'Tinto', 'Tempranillo', 'Crianza', 'Sencillo y frutal, con un toque de vainilla. Muy barato.', '16 °C', '10 minutos antes', 'Legumbres|Pasta|Embutido|Pollo', '#3A2226', 2.19, 0, 'equilibrado', 0),
  ('ederra-reserva', 'Ederra Reserva Edición Especial', 'Bodegas Ederra', 'D.O.Ca. Rioja', 'Tinto', 'Tempranillo', 'Reserva', 'Fruta madura, especias y madera fina. Largo y suave.', '16–17 °C', '20 minutos antes', 'Carne a la brasa|Quesos|Embutido', '#2E1A1E', 9.98, 0, 'equilibrado', 0),
  ('valderivero-reserva', 'Valderivero Reserva', 'Valderivero', 'D.O. Ribera del Duero', 'Tinto', 'Tempranillo', 'Reserva', 'Potente, con fruta negra, cuero y especias.', '16–17 °C', '20 minutos antes', 'Carne a la brasa|Quesos', '#2E1A1E', 13.98, 0, 'intenso', 0),
  ('faustino-rivero-ulecia-gran-reserva', 'Faustino Rivero Ulecia Gran Reserva', 'Faustino Rivero Ulecia', 'D.O.Ca. Rioja', 'Tinto', 'Tempranillo', 'Gran Reserva', 'Clásico y sedoso, con fruta en licor, tabaco y vainilla.', '16–17 °C', '30 minutos antes', 'Carne a la brasa|Quesos', '#2E1A1E', 9.98, 0, 'equilibrado', 0),
  ('vina-amate-crianza', 'Viña Amate Crianza', 'Viña Amate', 'D.O.Ca. Rioja', 'Tinto', 'Tempranillo', 'Crianza', 'Fruta roja y madera suave. Buen crianza por poco.', '16 °C', '10 minutos antes', 'Legumbres|Pollo|Embutido|Pasta', '#3A2226', 4.99, 0, 'equilibrado', 0);

INSERT OR REPLACE INTO precios (vino_id, super_id, precio) VALUES
  ('ederra-crianza', 'alcampo', 7.98),
  ('oinoz-crianza', 'alcampo', 7.98),
  ('castillo-san-lorenzo-crianza', 'alcampo', 2.19),
  ('ederra-reserva', 'alcampo', 9.98),
  ('valderivero-reserva', 'alcampo', 13.98),
  ('faustino-rivero-ulecia-gran-reserva', 'alcampo', 9.98),
  ('vina-amate-crianza', 'alcampo', 4.99),
  ('ramon-bilbao-crianza', 'alcampo', 9.70),
  ('protos-roble', 'alcampo', 8.95);

INSERT OR REPLACE INTO maridajes (plato_id, vino_id, orden, motivo, nota) VALUES
  ('lentejas', 'ederra-crianza', 12, 'Redondo y suave: acompaña el guiso sin taparlo.', 'Suave'),
  ('lentejas', 'oinoz-crianza', 13, 'Fruta madura y madera suave, buen compañero de legumbres.', 'Suave'),
  ('lentejas', 'castillo-san-lorenzo-crianza', 14, 'Sencillo y barato: cumple con el guiso de siempre.', 'El más barato'),
  ('lentejas', 'vina-amate-crianza', 12, 'Un crianza correcto por menos de 5 €.', 'Buen precio'),
  ('embutido', 'ederra-crianza', 12, 'Fruta y vainilla: le sientan bien el chorizo y el jamón.', 'Suave'),
  ('embutido', 'castillo-san-lorenzo-crianza', 13, 'Para picar sin gastar mucho.', 'El más barato'),
  ('embutido', 'vina-amate-crianza', 12, 'Un tinto fácil para una tabla de embutidos.', 'Buen precio'),
  ('pollo', 'oinoz-crianza', 12, 'Suave y frutal: respeta el pollo asado.', 'Suave'),
  ('pollo', 'ederra-crianza', 13, 'Fruta roja y poca madera: va bien con pollo al horno.', 'Suave'),
  ('pasta', 'castillo-san-lorenzo-crianza', 12, 'Sencillo, para una pasta con tomate o carne.', 'El más barato'),
  ('pasta', 'vina-amate-crianza', 12, 'Fruta roja que combina con salsas de tomate.', 'Buen precio'),
  ('carne-brasa', 'ederra-reserva', 12, 'Madera fina y fruta madura: aguanta la brasa.', 'Con cuerpo'),
  ('carne-brasa', 'valderivero-reserva', 10, 'Potente: la grasa y el humo le sientan de maravilla.', 'La más potente'),
  ('carne-brasa', 'faustino-rivero-ulecia-gran-reserva', 12, 'Un gran reserva clásico a buen precio para la carne.', 'Gran reserva'),
  ('quesos', 'ederra-reserva', 12, 'Largo y suave: bien con queso curado.', 'Curados'),
  ('quesos', 'faustino-rivero-ulecia-gran-reserva', 12, 'Fruta en licor y tabaco para quesos curados.', 'Curados'),
  ('regalar', 'valderivero-reserva', 12, 'Ribera con presencia para quedar bien.', 'Ribera'),
  ('regalar', 'faustino-rivero-ulecia-gran-reserva', 13, 'Un gran reserva por menos de 10 €: queda muy bien.', 'Gran reserva');
