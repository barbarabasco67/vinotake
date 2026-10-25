-- Vinotake · tintos de otras D.O. de Alcampo (precios copiados de alcampo.es)

INSERT OR REPLACE INTO vinos (id, nombre, bodega, denominacion, tipo, uva, elaboracion, sabor, temperatura, apertura, va_con, color, precio_ref, ejemplo, estilo, dulce) VALUES
  ('rectoral-de-amandi', 'Rectoral de Amandi', 'Rectoral de Amandi', 'D.O. Ribeira Sacra', 'Tinto', 'Mencía', 'Joven', 'Fresco y frutal, con fruta roja y un fondo mineral. Vegano.', '14–16 °C', 'Al momento', 'Legumbres|Pizza|Pasta|Pollo', '#4A2530', 5.90, 0, 'equilibrado', 0),
  ('habla-n34', 'Habla Nº 34', 'Habla', 'Vino de la Tierra de Extremadura', 'Tinto', 'Tempranillo · Cabernet Sauvignon', 'Joven', 'Intenso y con cuerpo, con fruta negra y especias.', '14–16 °C', 'Al momento', 'Legumbres|Pizza|Pasta|Pollo', '#4A2530', 29.34, 0, 'intenso', 0),
  ('paco-mulero-roble', 'Paco Mulero Roble', 'Paco Mulero', 'D.O.P. Jumilla', 'Tinto', 'Monastrell', 'Roble', 'Potente y frutal, con fruta negra y un toque de madera.', '14–16 °C', 'Al momento', 'Legumbres|Pizza|Pasta|Pollo', '#4A2530', 11.29, 0, 'intenso', 0),
  ('tagonius-madrid', 'Tagonius Tinto', 'Tagonius', 'D.O. Vinos de Madrid', 'Tinto', 'Tempranillo', 'Joven', 'Frutal y fácil, con fruta roja. Muy barato.', '14–16 °C', 'Al momento', 'Legumbres|Pizza|Pasta|Pollo', '#4A2530', 3.78, 0, 'suave', 0),
  ('cuarto-lote-tinto', 'Cuarto Lote Tinto', 'Cuarto Lote', 'D.O. Vinos de Madrid', 'Tinto', 'Garnacha · Tempranillo', 'Joven', 'Fresco y frutal, con fruta roja y un toque especiado.', '14–16 °C', 'Al momento', 'Legumbres|Pizza|Pasta|Pollo', '#4A2530', 6.25, 0, 'equilibrado', 0),
  ('cuarto-lote-crianza', 'Cuarto Lote Crianza', 'Cuarto Lote', 'D.O. Vinos de Madrid', 'Tinto', 'Garnacha · Tempranillo', 'Crianza', 'Redondo, con fruta madura y madera suave.', '16 °C', '10 minutos antes', 'Legumbres|Pollo|Embutido|Quesos', '#3A2226', 11.55, 0, 'equilibrado', 0),
  ('arrabal-del-conjuro', 'Arrabal del Conjuro Crianza', 'Arrabal del Conjuro', 'D.O. Vinos de Madrid', 'Tinto', 'Garnacha · Tempranillo', 'Crianza', 'Elegante y fresco, con fruta roja, especias y madera fina.', '16 °C', '10 minutos antes', 'Legumbres|Pollo|Embutido|Quesos', '#3A2226', 15.70, 0, 'equilibrado', 0);

INSERT OR REPLACE INTO precios (vino_id, super_id, precio) VALUES
  ('rectoral-de-amandi', 'alcampo', 5.90),
  ('habla-n34', 'alcampo', 29.34),
  ('paco-mulero-roble', 'alcampo', 11.29),
  ('tagonius-madrid', 'alcampo', 3.78),
  ('cuarto-lote-tinto', 'alcampo', 6.25),
  ('cuarto-lote-crianza', 'alcampo', 11.55),
  ('arrabal-del-conjuro', 'alcampo', 15.70);

INSERT OR REPLACE INTO maridajes (plato_id, vino_id, orden, motivo, nota) VALUES
  ('lentejas', 'rectoral-de-amandi', 40, 'Jugoso y frutal, va muy bien con legumbres y guisos.', 'Joven y frutal'),
  ('pizza', 'rectoral-de-amandi', 41, 'Frutal y fácil: acompaña bien al queso y al tomate.', 'Joven y frutal'),
  ('pasta', 'rectoral-de-amandi', 42, 'Fruta y frescura para salsas de tomate y boloñesa.', 'Joven y frutal'),
  ('pollo', 'rectoral-de-amandi', 43, 'Frutal y ligero para pollo o cerdo.', 'Joven y frutal'),
  ('lentejas', 'habla-n34', 40, 'Jugoso y frutal, va muy bien con legumbres y guisos.', 'Joven y frutal'),
  ('pizza', 'habla-n34', 41, 'Frutal y fácil: acompaña bien al queso y al tomate.', 'Joven y frutal'),
  ('pasta', 'habla-n34', 42, 'Fruta y frescura para salsas de tomate y boloñesa.', 'Joven y frutal'),
  ('pollo', 'habla-n34', 43, 'Frutal y ligero para pollo o cerdo.', 'Joven y frutal'),
  ('lentejas', 'paco-mulero-roble', 40, 'Jugoso y frutal, va muy bien con legumbres y guisos.', 'Joven y frutal'),
  ('pizza', 'paco-mulero-roble', 41, 'Frutal y fácil: acompaña bien al queso y al tomate.', 'Joven y frutal'),
  ('pasta', 'paco-mulero-roble', 42, 'Fruta y frescura para salsas de tomate y boloñesa.', 'Joven y frutal'),
  ('pollo', 'paco-mulero-roble', 43, 'Frutal y ligero para pollo o cerdo.', 'Joven y frutal'),
  ('lentejas', 'tagonius-madrid', 40, 'Jugoso y frutal, va muy bien con legumbres y guisos.', 'Joven y frutal'),
  ('pizza', 'tagonius-madrid', 41, 'Frutal y fácil: acompaña bien al queso y al tomate.', 'Joven y frutal'),
  ('pasta', 'tagonius-madrid', 42, 'Fruta y frescura para salsas de tomate y boloñesa.', 'Joven y frutal'),
  ('pollo', 'tagonius-madrid', 43, 'Frutal y ligero para pollo o cerdo.', 'Joven y frutal'),
  ('lentejas', 'cuarto-lote-tinto', 40, 'Jugoso y frutal, va muy bien con legumbres y guisos.', 'Joven y frutal'),
  ('pizza', 'cuarto-lote-tinto', 41, 'Frutal y fácil: acompaña bien al queso y al tomate.', 'Joven y frutal'),
  ('pasta', 'cuarto-lote-tinto', 42, 'Fruta y frescura para salsas de tomate y boloñesa.', 'Joven y frutal'),
  ('pollo', 'cuarto-lote-tinto', 43, 'Frutal y ligero para pollo o cerdo.', 'Joven y frutal'),
  ('lentejas', 'cuarto-lote-crianza', 40, 'Con cuerpo y taninos suaves: aguanta un guiso contundente.', 'Crianza o reserva'),
  ('pollo', 'cuarto-lote-crianza', 41, 'Suave y redondo: acompaña un pollo asado sin taparlo.', 'Crianza o reserva'),
  ('embutido', 'cuarto-lote-crianza', 42, 'Fruta y madera que casan con jamón y embutidos.', 'Crianza o reserva'),
  ('quesos', 'cuarto-lote-crianza', 43, 'Fruta y madera bien integradas: acompaña quesos curados.', 'Crianza o reserva'),
  ('lentejas', 'arrabal-del-conjuro', 40, 'Con cuerpo y taninos suaves: aguanta un guiso contundente.', 'Crianza o reserva'),
  ('pollo', 'arrabal-del-conjuro', 41, 'Suave y redondo: acompaña un pollo asado sin taparlo.', 'Crianza o reserva'),
  ('embutido', 'arrabal-del-conjuro', 42, 'Fruta y madera que casan con jamón y embutidos.', 'Crianza o reserva'),
  ('quesos', 'arrabal-del-conjuro', 43, 'Fruta y madera bien integradas: acompaña quesos curados.', 'Crianza o reserva');
