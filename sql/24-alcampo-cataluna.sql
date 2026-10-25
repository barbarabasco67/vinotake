-- Vinotake · tintos de Cataluña y Priorat de Alcampo (precios copiados de alcampo.es)

INSERT OR REPLACE INTO vinos (id, nombre, bodega, denominacion, tipo, uva, elaboracion, sabor, temperatura, apertura, va_con, color, precio_ref, ejemplo, estilo, dulce) VALUES
  ('raimat-abadia', 'Raimat Abadía', 'Raimat', 'D.O. Costers del Segre', 'Tinto', 'Tempranillo · Cabernet Sauvignon', 'Crianza', 'Ecológico, redondo, con fruta negra y madera suave.', '16 °C', '10 minutos antes', 'Legumbres|Pollo|Embutido|Quesos', '#3A2226', 7.95, 0, 'equilibrado', 0),
  ('freixenet-seleccion-tinto', 'Freixenet Selección Especial Tinto', 'Freixenet', 'D.O. Catalunya', 'Tinto', 'Tempranillo · Garnacha', 'Joven', 'Afrutado y suave, fácil de beber.', '14–16 °C', 'Al momento', 'Legumbres|Pizza|Pasta|Pollo', '#4A2530', 6.79, 0, 'suave', 0),
  ('vall-de-juy-tinto', 'Vall de Juy Tinto', 'Vall de Juy', 'D.O. Catalunya', 'Tinto', 'Tempranillo · Garnacha', 'Joven', 'Frutal y fácil, con fruta roja. Muy barato.', '14–16 °C', 'Al momento', 'Legumbres|Pizza|Pasta|Pollo', '#4A2530', 4.29, 0, 'suave', 0),
  ('scala-dei-el-tribut', 'Scala Dei El Tribut', 'Scala Dei', 'D.O.Ca. Priorat', 'Tinto', 'Garnacha · Cariñena', 'Joven', 'Mineral y frutal, con fruta negra y hierbas.', '14–16 °C', 'Al momento', 'Legumbres|Pizza|Pasta|Pollo', '#4A2530', 14.50, 0, 'intenso', 0),
  ('les-cousins-inconscient', 'Les Cousins L''Inconscient', 'Les Cousins', 'D.O.Ca. Priorat', 'Tinto', 'Garnacha · Cariñena', 'Joven', 'Intenso y mineral, con fruta negra y especias.', '14–16 °C', 'Al momento', 'Legumbres|Pizza|Pasta|Pollo', '#4A2530', 12.41, 0, 'intenso', 0),
  ('red-bat-priorat', 'Red Bat Priorat', 'Red Bat', 'D.O.Ca. Priorat', 'Tinto', 'Garnacha · Cariñena · Syrah', 'Joven', 'Potente y con carácter, con fruta negra y un fondo mineral.', '14–16 °C', 'Al momento', 'Legumbres|Pizza|Pasta|Pollo', '#4A2530', 16.76, 0, 'intenso', 0);

INSERT OR REPLACE INTO precios (vino_id, super_id, precio) VALUES
  ('raimat-abadia', 'alcampo', 7.95),
  ('freixenet-seleccion-tinto', 'alcampo', 6.79),
  ('vall-de-juy-tinto', 'alcampo', 4.29),
  ('scala-dei-el-tribut', 'alcampo', 14.50),
  ('les-cousins-inconscient', 'alcampo', 12.41),
  ('red-bat-priorat', 'alcampo', 16.76),
  ('sangre-de-toro', 'alcampo', 5.57);

INSERT OR REPLACE INTO maridajes (plato_id, vino_id, orden, motivo, nota) VALUES
  ('lentejas', 'raimat-abadia', 40, 'Con cuerpo y taninos suaves: aguanta un guiso contundente.', 'Crianza o reserva'),
  ('pollo', 'raimat-abadia', 41, 'Suave y redondo: acompaña un pollo asado sin taparlo.', 'Crianza o reserva'),
  ('embutido', 'raimat-abadia', 42, 'Fruta y madera que casan con jamón y embutidos.', 'Crianza o reserva'),
  ('quesos', 'raimat-abadia', 43, 'Fruta y madera bien integradas: acompaña quesos curados.', 'Crianza o reserva'),
  ('lentejas', 'freixenet-seleccion-tinto', 40, 'Jugoso y frutal, va muy bien con legumbres y guisos.', 'Joven y frutal'),
  ('pizza', 'freixenet-seleccion-tinto', 41, 'Frutal y fácil: acompaña bien al queso y al tomate.', 'Joven y frutal'),
  ('pasta', 'freixenet-seleccion-tinto', 42, 'Fruta y frescura para salsas de tomate y boloñesa.', 'Joven y frutal'),
  ('pollo', 'freixenet-seleccion-tinto', 43, 'Frutal y ligero para pollo o cerdo.', 'Joven y frutal'),
  ('lentejas', 'vall-de-juy-tinto', 40, 'Jugoso y frutal, va muy bien con legumbres y guisos.', 'Joven y frutal'),
  ('pizza', 'vall-de-juy-tinto', 41, 'Frutal y fácil: acompaña bien al queso y al tomate.', 'Joven y frutal'),
  ('pasta', 'vall-de-juy-tinto', 42, 'Fruta y frescura para salsas de tomate y boloñesa.', 'Joven y frutal'),
  ('pollo', 'vall-de-juy-tinto', 43, 'Frutal y ligero para pollo o cerdo.', 'Joven y frutal'),
  ('lentejas', 'scala-dei-el-tribut', 40, 'Jugoso y frutal, va muy bien con legumbres y guisos.', 'Joven y frutal'),
  ('pizza', 'scala-dei-el-tribut', 41, 'Frutal y fácil: acompaña bien al queso y al tomate.', 'Joven y frutal'),
  ('pasta', 'scala-dei-el-tribut', 42, 'Fruta y frescura para salsas de tomate y boloñesa.', 'Joven y frutal'),
  ('pollo', 'scala-dei-el-tribut', 43, 'Frutal y ligero para pollo o cerdo.', 'Joven y frutal'),
  ('lentejas', 'les-cousins-inconscient', 40, 'Jugoso y frutal, va muy bien con legumbres y guisos.', 'Joven y frutal'),
  ('pizza', 'les-cousins-inconscient', 41, 'Frutal y fácil: acompaña bien al queso y al tomate.', 'Joven y frutal'),
  ('pasta', 'les-cousins-inconscient', 42, 'Fruta y frescura para salsas de tomate y boloñesa.', 'Joven y frutal'),
  ('pollo', 'les-cousins-inconscient', 43, 'Frutal y ligero para pollo o cerdo.', 'Joven y frutal'),
  ('lentejas', 'red-bat-priorat', 40, 'Jugoso y frutal, va muy bien con legumbres y guisos.', 'Joven y frutal'),
  ('pizza', 'red-bat-priorat', 41, 'Frutal y fácil: acompaña bien al queso y al tomate.', 'Joven y frutal'),
  ('pasta', 'red-bat-priorat', 42, 'Fruta y frescura para salsas de tomate y boloñesa.', 'Joven y frutal'),
  ('pollo', 'red-bat-priorat', 43, 'Frutal y ligero para pollo o cerdo.', 'Joven y frutal');
