-- Vinotake · tintos de Rioja de Alcampo (3 vinos nuevos y un precio más)
INSERT OR REPLACE INTO vinos (id, nombre, bodega, denominacion, tipo, uva, elaboracion, sabor, temperatura, apertura, va_con, color, precio_ref, ejemplo, estilo, dulce) VALUES
  ('castillo-san-lorenzo-reserva', 'Castillo San Lorenzo Reserva', 'Castillo San Lorenzo', 'D.O.Ca. Rioja', 'Tinto', 'Tempranillo', 'Reserva', 'Sencillo y redondo, con fruta madura y madera suave. Muy barato para un reserva.', '16–17 °C', '20 minutos antes', 'Carne a la brasa|Quesos', '#2E1A1E', 4.99, 0, 'equilibrado', 0),
  ('ordate-rioja', 'Ordate Tinto', 'Ordate', 'D.O.Ca. Rioja', 'Tinto', 'Tempranillo', 'Joven', 'Joven y frutal, sencillo. El más barato de Rioja.', '14–16 °C', 'Al momento', 'Legumbres|Pizza|Pasta|Pollo', '#4A2530', 1.89, 0, 'suave', 0),
  ('montecillo-500-a-bordo', 'Montecillo 500 a Bordo Crianza', 'Bodegas Montecillo', 'D.O.Ca. Rioja', 'Tinto', 'Tempranillo', 'Crianza', 'Fruta roja, vainilla y especias, redondo y suave.', '16 °C', '10 minutos antes', 'Legumbres|Pollo|Embutido|Quesos', '#3A2226', 8.98, 0, 'equilibrado', 0);

INSERT OR REPLACE INTO precios (vino_id, super_id, precio) VALUES
  ('castillo-san-lorenzo-reserva', 'alcampo', 4.99),
  ('ordate-rioja', 'alcampo', 1.89),
  ('montecillo-500-a-bordo', 'alcampo', 8.98),
  ('campo-viejo-crianza', 'alcampo', 5.69);

INSERT OR REPLACE INTO maridajes (plato_id, vino_id, orden, motivo, nota) VALUES
  ('carne-brasa', 'castillo-san-lorenzo-reserva', 40, 'Madera suave y fruta madura: aguanta la brasa sin gastar mucho.', 'Crianza o reserva'),
  ('quesos', 'castillo-san-lorenzo-reserva', 41, 'Fruta madura y madera suave, bien con queso curado.', 'Crianza o reserva'),
  ('lentejas', 'ordate-rioja', 40, 'Jugoso y frutal, va muy bien con legumbres y guisos.', 'Joven y frutal'),
  ('pizza', 'ordate-rioja', 41, 'Frutal y fácil: acompaña bien al queso y al tomate.', 'Joven y frutal'),
  ('pasta', 'ordate-rioja', 42, 'Fruta roja que combina con salsas de tomate.', 'Joven y frutal'),
  ('lentejas', 'montecillo-500-a-bordo', 40, 'Con cuerpo y taninos suaves: aguanta un guiso contundente.', 'Crianza o reserva'),
  ('pollo', 'montecillo-500-a-bordo', 41, 'Fruta y poca madera: respeta el pollo asado.', 'Crianza o reserva'),
  ('embutido', 'montecillo-500-a-bordo', 42, 'Fruta y vainilla: le sientan bien el chorizo y el jamón.', 'Crianza o reserva');
