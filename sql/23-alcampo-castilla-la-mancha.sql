-- Vinotake · tintos de Castilla-La Mancha de Alcampo (precios copiados de alcampo.es)

INSERT OR REPLACE INTO vinos (id, nombre, bodega, denominacion, tipo, uva, elaboracion, sabor, temperatura, apertura, va_con, color, precio_ref, ejemplo, estilo, dulce) VALUES
  ('carta-de-plata-tinto', 'Carta de Plata Tinto', 'Carta de Plata', 'I.G.P. Vino de la Tierra de Castilla', 'Tinto', 'Tempranillo', 'Joven', 'Sencillo y frutal, fácil de beber.', '14–16 °C', 'Al momento', 'Legumbres|Pizza|Pasta|Pollo', '#4A2530', 3.64, 0, 'suave', 0),
  ('los-molinos-reserva', 'Los Molinos Reserva', 'Los Molinos', 'D.O. Valdepeñas', 'Tinto', 'Tempranillo', 'Reserva', 'Redondo y suave, con fruta madura y vainilla. Muy barato para un reserva.', '16–17 °C', '20 minutos antes', 'Carne a la brasa|Quesos', '#2E1A1E', 3.41, 0, 'equilibrado', 0),
  ('lomo-alto-tinto', 'Lomo Alto Tinto', 'Lomo Alto', 'I.G.P. Vino de la Tierra de Castilla', 'Tinto', 'Tempranillo', 'Joven', 'Frutal y jugoso, con fruta roja y negra.', '14–16 °C', 'Al momento', 'Legumbres|Pizza|Pasta|Pollo', '#4A2530', 7.30, 0, 'equilibrado', 0),
  ('992-rio-negro', '992 Río Negro', '992', 'D.O. Río Negro (Argentina)', 'Tinto', '', 'Joven', 'Tinto argentino, frutal y con cuerpo.', '14–16 °C', 'Al momento', 'Legumbres|Pizza|Pasta|Pollo', '#4A2530', 12.27, 0, 'equilibrado', 0),
  ('sospechoso-tinto', 'Sospechoso Tinto', 'Sospechoso', 'I.G.P. Vino de la Tierra de Castilla-La Mancha', 'Tinto', 'Tempranillo', 'Joven', 'Frutal y moderno, con fruta negra y un toque especiado.', '14–16 °C', 'Al momento', 'Legumbres|Pizza|Pasta|Pollo', '#4A2530', 10.45, 0, 'equilibrado', 0);

INSERT OR REPLACE INTO precios (vino_id, super_id, precio) VALUES
  ('carta-de-plata-tinto', 'alcampo', 3.64),
  ('los-molinos-reserva', 'alcampo', 3.41),
  ('lomo-alto-tinto', 'alcampo', 7.30),
  ('992-rio-negro', 'alcampo', 12.27),
  ('sospechoso-tinto', 'alcampo', 10.45),
  ('vina-albali-crianza', 'alcampo', 2.79);

INSERT OR REPLACE INTO maridajes (plato_id, vino_id, orden, motivo, nota) VALUES
  ('lentejas', 'carta-de-plata-tinto', 40, 'Jugoso y frutal, va muy bien con legumbres y guisos.', 'Joven y frutal'),
  ('pizza', 'carta-de-plata-tinto', 41, 'Frutal y fácil: acompaña bien al queso y al tomate.', 'Joven y frutal'),
  ('pasta', 'carta-de-plata-tinto', 42, 'Fruta y frescura para salsas de tomate y boloñesa.', 'Joven y frutal'),
  ('pollo', 'carta-de-plata-tinto', 43, 'Frutal y ligero para pollo o cerdo.', 'Joven y frutal'),
  ('carne-brasa', 'los-molinos-reserva', 40, 'Con cuerpo y taninos que se llevan bien con la carne a la brasa.', 'Crianza o reserva'),
  ('quesos', 'los-molinos-reserva', 41, 'Fruta y madera bien integradas: acompaña quesos curados.', 'Crianza o reserva'),
  ('regalar', 'los-molinos-reserva', 42, 'Reconocible y elegante: queda bien seguro.', 'Crianza o reserva'),
  ('lentejas', 'lomo-alto-tinto', 40, 'Jugoso y frutal, va muy bien con legumbres y guisos.', 'Joven y frutal'),
  ('pizza', 'lomo-alto-tinto', 41, 'Frutal y fácil: acompaña bien al queso y al tomate.', 'Joven y frutal'),
  ('pasta', 'lomo-alto-tinto', 42, 'Fruta y frescura para salsas de tomate y boloñesa.', 'Joven y frutal'),
  ('pollo', 'lomo-alto-tinto', 43, 'Frutal y ligero para pollo o cerdo.', 'Joven y frutal'),
  ('lentejas', '992-rio-negro', 40, 'Jugoso y frutal, va muy bien con legumbres y guisos.', 'Joven y frutal'),
  ('pizza', '992-rio-negro', 41, 'Frutal y fácil: acompaña bien al queso y al tomate.', 'Joven y frutal'),
  ('pasta', '992-rio-negro', 42, 'Fruta y frescura para salsas de tomate y boloñesa.', 'Joven y frutal'),
  ('pollo', '992-rio-negro', 43, 'Frutal y ligero para pollo o cerdo.', 'Joven y frutal'),
  ('lentejas', 'sospechoso-tinto', 40, 'Jugoso y frutal, va muy bien con legumbres y guisos.', 'Joven y frutal'),
  ('pizza', 'sospechoso-tinto', 41, 'Frutal y fácil: acompaña bien al queso y al tomate.', 'Joven y frutal'),
  ('pasta', 'sospechoso-tinto', 42, 'Fruta y frescura para salsas de tomate y boloñesa.', 'Joven y frutal'),
  ('pollo', 'sospechoso-tinto', 43, 'Frutal y ligero para pollo o cerdo.', 'Joven y frutal');
