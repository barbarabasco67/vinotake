-- Vinotake · blancos de Rueda y Castilla y León de Alcampo (precios copiados de alcampo.es)

INSERT OR REPLACE INTO vinos (id, nombre, bodega, denominacion, tipo, uva, elaboracion, sabor, temperatura, apertura, va_con, color, precio_ref, ejemplo, estilo, dulce) VALUES
  ('pata-negra-rueda', 'Pata Negra Rueda Blanco', 'Pata Negra', 'D.O. Rueda', 'Blanco', 'Verdejo', 'Joven', 'Fresco y frutal, con fruta blanca y un toque herbáceo.', '8–10 °C', 'Bien frío', 'Pescado|Arroces|Ensaladas|Aperitivos', '#D4C27A', 5.00, 0, 'suave', 0),
  ('rivero-ulecia-godello', 'Faustino Rivero Ulecia Godello', 'Faustino Rivero Ulecia', 'D.O. Bierzo', 'Blanco', 'Godello', 'Joven', 'Fresco y con cuerpo, con fruta blanca y un fondo mineral.', '8–10 °C', 'Bien frío', 'Pescado|Arroces|Ensaladas|Aperitivos', '#D4C27A', 12.50, 0, 'equilibrado', 0),
  ('emina-verdejo', 'Emina Verdejo', 'Emina', 'D.O. Rueda', 'Blanco', 'Verdejo', 'Joven', 'Fresco y aromático, con fruta blanca y toques de hierba.', '8–10 °C', 'Bien frío', 'Pescado|Arroces|Ensaladas|Aperitivos', '#D4C27A', 7.42, 0, 'equilibrado', 0),
  ('cruz-de-hierro-bierzo-blanco', 'Cruz de Hierro Blanco', 'Cruz de Hierro', 'D.O. Bierzo', 'Blanco', 'Godello', 'Joven', 'Fresco y suave, con fruta blanca y flores.', '8–10 °C', 'Bien frío', 'Pescado|Arroces|Ensaladas|Aperitivos', '#D4C27A', 7.30, 0, 'suave', 0),
  ('azumbre-verdejo', 'Azumbre Verdejo', 'Azumbre', 'D.O. Rueda', 'Blanco', 'Verdejo', 'Joven', 'Fresco y frutal, con fruta tropical y un toque herbáceo. Vegano.', '8–10 °C', 'Bien frío', 'Pescado|Arroces|Ensaladas|Aperitivos', '#D4C27A', 5.75, 0, 'suave', 0),
  ('molongo-verdejo', 'Molongo Verdejo', 'Molongo', 'D.O. Rueda', 'Blanco', 'Verdejo', 'Joven', 'Fresco y fácil, con fruta blanca. Muy barato.', '8–10 °C', 'Bien frío', 'Pescado|Arroces|Ensaladas|Aperitivos', '#D4C27A', 4.84, 0, 'suave', 0);

INSERT OR REPLACE INTO precios (vino_id, super_id, precio) VALUES
  ('pata-negra-rueda', 'alcampo', 5.00),
  ('rivero-ulecia-godello', 'alcampo', 12.50),
  ('emina-verdejo', 'alcampo', 7.42),
  ('cruz-de-hierro-bierzo-blanco', 'alcampo', 7.30),
  ('azumbre-verdejo', 'alcampo', 5.75),
  ('molongo-verdejo', 'alcampo', 4.84);

INSERT OR REPLACE INTO maridajes (plato_id, vino_id, orden, motivo, nota) VALUES
  ('pescado', 'pata-negra-rueda', 40, 'Fresco y con buena acidez: no tapa el sabor del pescado.', 'Blanco fresco'),
  ('paella', 'pata-negra-rueda', 41, 'Fresco y con cuerpo, para paellas y arroces.', 'Blanco fresco'),
  ('ensalada', 'pata-negra-rueda', 42, 'Fresco y vivo, no pesa con las ensaladas.', 'Blanco fresco'),
  ('aperitivo', 'pata-negra-rueda', 43, 'Fresco y ligero: perfecto para picar algo.', 'Blanco fresco'),
  ('pescado', 'rivero-ulecia-godello', 40, 'Fresco y con buena acidez: no tapa el sabor del pescado.', 'Blanco fresco'),
  ('paella', 'rivero-ulecia-godello', 41, 'Fresco y con cuerpo, para paellas y arroces.', 'Blanco fresco'),
  ('ensalada', 'rivero-ulecia-godello', 42, 'Fresco y vivo, no pesa con las ensaladas.', 'Blanco fresco'),
  ('aperitivo', 'rivero-ulecia-godello', 43, 'Fresco y ligero: perfecto para picar algo.', 'Blanco fresco'),
  ('pescado', 'emina-verdejo', 40, 'Fresco y con buena acidez: no tapa el sabor del pescado.', 'Blanco fresco'),
  ('paella', 'emina-verdejo', 41, 'Fresco y con cuerpo, para paellas y arroces.', 'Blanco fresco'),
  ('ensalada', 'emina-verdejo', 42, 'Fresco y vivo, no pesa con las ensaladas.', 'Blanco fresco'),
  ('aperitivo', 'emina-verdejo', 43, 'Fresco y ligero: perfecto para picar algo.', 'Blanco fresco'),
  ('pescado', 'cruz-de-hierro-bierzo-blanco', 40, 'Fresco y con buena acidez: no tapa el sabor del pescado.', 'Blanco fresco'),
  ('paella', 'cruz-de-hierro-bierzo-blanco', 41, 'Fresco y con cuerpo, para paellas y arroces.', 'Blanco fresco'),
  ('ensalada', 'cruz-de-hierro-bierzo-blanco', 42, 'Fresco y vivo, no pesa con las ensaladas.', 'Blanco fresco'),
  ('aperitivo', 'cruz-de-hierro-bierzo-blanco', 43, 'Fresco y ligero: perfecto para picar algo.', 'Blanco fresco'),
  ('pescado', 'azumbre-verdejo', 40, 'Fresco y con buena acidez: no tapa el sabor del pescado.', 'Blanco fresco'),
  ('paella', 'azumbre-verdejo', 41, 'Fresco y con cuerpo, para paellas y arroces.', 'Blanco fresco'),
  ('ensalada', 'azumbre-verdejo', 42, 'Fresco y vivo, no pesa con las ensaladas.', 'Blanco fresco'),
  ('aperitivo', 'azumbre-verdejo', 43, 'Fresco y ligero: perfecto para picar algo.', 'Blanco fresco'),
  ('pescado', 'molongo-verdejo', 40, 'Fresco y con buena acidez: no tapa el sabor del pescado.', 'Blanco fresco'),
  ('paella', 'molongo-verdejo', 41, 'Fresco y con cuerpo, para paellas y arroces.', 'Blanco fresco'),
  ('ensalada', 'molongo-verdejo', 42, 'Fresco y vivo, no pesa con las ensaladas.', 'Blanco fresco'),
  ('aperitivo', 'molongo-verdejo', 43, 'Fresco y ligero: perfecto para picar algo.', 'Blanco fresco');
