-- Vinotake · Ahorramas · rosados (precios sin ofertas)

INSERT OR REPLACE INTO vinos (id, nombre, bodega, denominacion, tipo, uva, elaboracion, sabor, temperatura, apertura, va_con, color, precio_ref, ejemplo, estilo, dulce) VALUES
  ('val-de-condes-rosado', 'Val de Condes Rosado', 'Val de Condes', 'D.O. Cigales', 'Rosado', 'Tempranillo · Garnacha', 'Joven', 'Fresco y frutal, con fresa y frambuesa.', '8–10 °C', 'Bien frío', 'Aperitivos|Arroces|Pasta|Pizza', '#C8566E', 4.15, 0, 'suave', 0),
  ('cune-la-bailarina', 'Cune La Bailarina Rosado', 'Cune', 'D.O.Ca. Rioja', 'Rosado', 'Garnacha · Tempranillo', 'Joven', 'Fresco y frutal, con fruta roja y un fondo suave.', '8–10 °C', 'Bien frío', 'Aperitivos|Arroces|Pasta|Pizza', '#C8566E', 5.35, 0, 'suave', 0);

INSERT OR REPLACE INTO precios (vino_id, super_id, precio) VALUES
  ('val-de-condes-rosado', 'ahorramas', 4.15),
  ('cune-la-bailarina', 'ahorramas', 5.35),
  ('dulce-maria-rosado', 'ahorramas', 4.75),
  ('el-coto-rosado', 'ahorramas', 4.50),
  ('gran-feudo-rosado', 'ahorramas', 4.95),
  ('alma-valdeguerra-rosado', 'ahorramas', 4.50);

INSERT OR REPLACE INTO maridajes (plato_id, vino_id, orden, motivo, nota) VALUES
  ('aperitivo', 'val-de-condes-rosado', 40, 'Fresco y frutal para picar sin complicarse.', 'Rosado'),
  ('paella', 'val-de-condes-rosado', 41, 'Fresco y frutal: el rosado clásico para el arroz.', 'Rosado'),
  ('pasta', 'val-de-condes-rosado', 42, 'Fresco y frutal, ideal con salsas ligeras.', 'Rosado'),
  ('pizza', 'val-de-condes-rosado', 43, 'Fresco y frutal: limpia la grasa del queso.', 'Rosado'),
  ('aperitivo', 'cune-la-bailarina', 40, 'Fresco y frutal para picar sin complicarse.', 'Rosado'),
  ('paella', 'cune-la-bailarina', 41, 'Fresco y frutal: el rosado clásico para el arroz.', 'Rosado'),
  ('pasta', 'cune-la-bailarina', 42, 'Fresco y frutal, ideal con salsas ligeras.', 'Rosado'),
  ('pizza', 'cune-la-bailarina', 43, 'Fresco y frutal: limpia la grasa del queso.', 'Rosado');
