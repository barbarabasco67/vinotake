-- Vinotake · tintos de Navarra de Alcampo (precios copiados de alcampo.es)

INSERT OR REPLACE INTO vinos (id, nombre, bodega, denominacion, tipo, uva, elaboracion, sabor, temperatura, apertura, va_con, color, precio_ref, ejemplo, estilo, dulce) VALUES
  ('alarnes-tinto', 'Alarnes Tinto', 'Alarnes', 'D.O. Navarra', 'Tinto', 'Tempranillo', 'Joven', 'Joven y frutal, muy barato.', '14–16 °C', 'Al momento', 'Legumbres|Pizza|Pasta|Pollo', '#4A2530', 1.98, 0, 'suave', 0),
  ('gran-feudo-reserva', 'Gran Feudo Reserva', 'Bodegas Chivite', 'D.O. Navarra', 'Tinto', 'Tempranillo · Cabernet Sauvignon', 'Reserva', 'Redondo y suave, con fruta madura, vainilla y especias.', '16–17 °C', '20 minutos antes', 'Carne a la brasa|Quesos', '#2E1A1E', 10.45, 0, 'equilibrado', 0),
  ('le-naturel-navarra', 'Le Naturel', 'Le Naturel', 'D.O. Navarra', 'Tinto', 'Tempranillo · Garnacha', 'Joven', 'Ecológico y vegano, frutal y fresco, con fruta roja.', '14–16 °C', 'Al momento', 'Legumbres|Pizza|Pasta|Pollo', '#4A2530', 9.65, 0, 'equilibrado', 0),
  ('alarnes-crianza', 'Alarnes Crianza', 'Alarnes', 'D.O. Navarra', 'Tinto', 'Tempranillo', 'Crianza', 'Fruta roja y madera suave. Buen crianza por poco.', '16 °C', '10 minutos antes', 'Legumbres|Pollo|Embutido|Quesos', '#3A2226', 3.49, 0, 'equilibrado', 0),
  ('martin-berasategui-navarra', 'Martín Berasategui Tinto', 'Martín Berasategui', 'D.O. Navarra', 'Tinto', 'Tempranillo · Garnacha', 'Joven', 'Frutal y redondo, con fruta roja y un toque de especias.', '14–16 °C', 'Al momento', 'Legumbres|Pizza|Pasta|Pollo', '#4A2530', 5.20, 0, 'equilibrado', 0),
  ('alarnes-reserva', 'Alarnes Reserva', 'Alarnes', 'D.O. Navarra', 'Tinto', 'Tempranillo', 'Reserva', 'Redondo y suave, con fruta madura y vainilla. Barato para un reserva.', '16–17 °C', '20 minutos antes', 'Carne a la brasa|Quesos', '#2E1A1E', 4.23, 0, 'equilibrado', 0);

INSERT OR REPLACE INTO precios (vino_id, super_id, precio) VALUES
  ('alarnes-tinto', 'alcampo', 1.98),
  ('gran-feudo-reserva', 'alcampo', 10.45),
  ('le-naturel-navarra', 'alcampo', 9.65),
  ('alarnes-crianza', 'alcampo', 3.49),
  ('martin-berasategui-navarra', 'alcampo', 5.20),
  ('alarnes-reserva', 'alcampo', 4.23),
  ('gran-feudo-crianza', 'alcampo', 6.59);

INSERT OR REPLACE INTO maridajes (plato_id, vino_id, orden, motivo, nota) VALUES
  ('lentejas', 'alarnes-tinto', 40, 'Jugoso y frutal, va muy bien con legumbres y guisos.', 'Joven y frutal'),
  ('pizza', 'alarnes-tinto', 41, 'Frutal y fácil: acompaña bien al queso y al tomate.', 'Joven y frutal'),
  ('pasta', 'alarnes-tinto', 42, 'Fruta y frescura para salsas de tomate y boloñesa.', 'Joven y frutal'),
  ('pollo', 'alarnes-tinto', 43, 'Frutal y ligero para pollo o cerdo.', 'Joven y frutal'),
  ('carne-brasa', 'gran-feudo-reserva', 40, 'Con cuerpo y taninos que se llevan bien con la carne a la brasa.', 'Crianza o reserva'),
  ('quesos', 'gran-feudo-reserva', 41, 'Fruta y madera bien integradas: acompaña quesos curados.', 'Crianza o reserva'),
  ('regalar', 'gran-feudo-reserva', 42, 'Reconocible y elegante: queda bien seguro.', 'Crianza o reserva'),
  ('lentejas', 'le-naturel-navarra', 40, 'Jugoso y frutal, va muy bien con legumbres y guisos.', 'Joven y frutal'),
  ('pizza', 'le-naturel-navarra', 41, 'Frutal y fácil: acompaña bien al queso y al tomate.', 'Joven y frutal'),
  ('pasta', 'le-naturel-navarra', 42, 'Fruta y frescura para salsas de tomate y boloñesa.', 'Joven y frutal'),
  ('pollo', 'le-naturel-navarra', 43, 'Frutal y ligero para pollo o cerdo.', 'Joven y frutal'),
  ('lentejas', 'alarnes-crianza', 40, 'Con cuerpo y taninos suaves: aguanta un guiso contundente.', 'Crianza o reserva'),
  ('pollo', 'alarnes-crianza', 41, 'Suave y redondo: acompaña un pollo asado sin taparlo.', 'Crianza o reserva'),
  ('embutido', 'alarnes-crianza', 42, 'Fruta y madera que casan con jamón y embutidos.', 'Crianza o reserva'),
  ('quesos', 'alarnes-crianza', 43, 'Fruta y madera bien integradas: acompaña quesos curados.', 'Crianza o reserva'),
  ('lentejas', 'martin-berasategui-navarra', 40, 'Jugoso y frutal, va muy bien con legumbres y guisos.', 'Joven y frutal'),
  ('pizza', 'martin-berasategui-navarra', 41, 'Frutal y fácil: acompaña bien al queso y al tomate.', 'Joven y frutal'),
  ('pasta', 'martin-berasategui-navarra', 42, 'Fruta y frescura para salsas de tomate y boloñesa.', 'Joven y frutal'),
  ('pollo', 'martin-berasategui-navarra', 43, 'Frutal y ligero para pollo o cerdo.', 'Joven y frutal'),
  ('carne-brasa', 'alarnes-reserva', 40, 'Con cuerpo y taninos que se llevan bien con la carne a la brasa.', 'Crianza o reserva'),
  ('quesos', 'alarnes-reserva', 41, 'Fruta y madera bien integradas: acompaña quesos curados.', 'Crianza o reserva'),
  ('regalar', 'alarnes-reserva', 42, 'Reconocible y elegante: queda bien seguro.', 'Crianza o reserva');
