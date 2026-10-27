-- Vinotake · Ahorramas · Valdepeñas y La Mancha (precios sin ofertas)

INSERT OR REPLACE INTO vinos (id, nombre, bodega, denominacion, tipo, uva, elaboracion, sabor, temperatura, apertura, va_con, color, precio_ref, ejemplo, estilo, dulce) VALUES
  ('alta-pavina-pinot-noir', 'Alta Pavina Pinot Noir', 'Alta Pavina', 'Vino de la Tierra de Castilla y León', 'Tinto', 'Pinot Noir', 'Joven', 'Ligero y elegante, con fruta roja fresca y buena acidez.', '14–16 °C', 'Al momento', 'Pollo|Quesos|Pasta', '#4A2530', 9.90, 0, 'suave', 0);

INSERT OR REPLACE INTO precios (vino_id, super_id, precio) VALUES
  ('alta-pavina-pinot-noir', 'ahorramas', 9.90),
  ('carta-de-plata-tinto', 'ahorramas', 3.75);

INSERT OR REPLACE INTO maridajes (plato_id, vino_id, orden, motivo, nota) VALUES
  ('pollo', 'alta-pavina-pinot-noir', 40, 'Frutal y ligero para pollo o cerdo.', 'Joven y frutal'),
  ('quesos', 'alta-pavina-pinot-noir', 41, 'Frutal y fácil con quesos semicurados.', 'Joven y frutal'),
  ('pasta', 'alta-pavina-pinot-noir', 42, 'Fruta y frescura para salsas de tomate y boloñesa.', 'Joven y frutal');
