-- Vinotake · tablas y datos de ejemplo
-- Pegar entero en la consola de la base de datos D1 "vinotake".
-- Los vinos con ejemplo = 1 son inventados: se borrarán cuando entre el catálogo real.

CREATE TABLE IF NOT EXISTS supermercados (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  orden INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS vinos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  bodega TEXT,
  denominacion TEXT,
  tipo TEXT,
  uva TEXT,
  elaboracion TEXT,
  grados TEXT,
  sabor TEXT,
  temperatura TEXT,
  apertura TEXT,
  va_con TEXT,
  color TEXT,
  precio_ref REAL,
  ejemplo INTEGER DEFAULT 0,
  activo INTEGER DEFAULT 1,
  creado TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS precios (
  vino_id TEXT NOT NULL,
  super_id TEXT NOT NULL,
  precio REAL NOT NULL,
  actualizado TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (vino_id, super_id)
);

CREATE TABLE IF NOT EXISTS platos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  palabras TEXT,
  orden INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS maridajes (
  plato_id TEXT NOT NULL,
  vino_id TEXT NOT NULL,
  orden INTEGER DEFAULT 0,
  motivo TEXT,
  nota TEXT,
  PRIMARY KEY (plato_id, vino_id)
);

CREATE TABLE IF NOT EXISTS relacionados (
  vino_id TEXT NOT NULL,
  rel_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  nota TEXT,
  patrocinado INTEGER DEFAULT 0,
  orden INTEGER DEFAULT 0,
  PRIMARY KEY (vino_id, rel_id, tipo)
);

CREATE TABLE IF NOT EXISTS consultas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT DEFAULT CURRENT_TIMESTAMP,
  tipo TEXT,
  plato_texto TEXT,
  plato_id TEXT,
  presupuesto TEXT,
  super_id TEXT,
  recomendado TEXT,
  elegido TEXT
);

CREATE INDEX IF NOT EXISTS idx_precios_super ON precios (super_id);
CREATE INDEX IF NOT EXISTS idx_maridajes_plato ON maridajes (plato_id, orden);
CREATE INDEX IF NOT EXISTS idx_consultas_fecha ON consultas (fecha);

-- Supermercados
INSERT OR REPLACE INTO supermercados (id, nombre, orden) VALUES
  ('mercadona', 'Mercadona', 1),
  ('carrefour', 'Carrefour', 2),
  ('lidl', 'Lidl', 3),
  ('dia', 'Dia', 4),
  ('alcampo', 'Alcampo', 5);

-- Platos y palabras con las que se reconocen al escribirlos
INSERT OR REPLACE INTO platos (id, nombre, palabras, orden) VALUES
  ('lentejas', 'Lentejas', 'lentej,cocido,guiso,fabada,potaje,estofado,garbanz', 1),
  ('paella', 'Paella', 'paella,arroz,marisc,gamba,fideua', 2),
  ('pizza', 'Pizza', 'pizza,pasta,macarron,espagueti,lasana,hamburg', 3),
  ('pescado', 'Pescado', 'pesca,merluza,salmon,bacalao,dorada,lubina,atun,sushi', 4),
  ('carne-brasa', 'Carne a la brasa', 'carne,chulet,entrec,barbac,cordero,solomillo,brasa,costill', 5),
  ('quesos', 'Quesos', 'queso,jamon,embutido,iberic,tabla,picoteo', 6);

-- Vinos de ejemplo (inventados)
INSERT OR REPLACE INTO vinos (id, nombre, bodega, denominacion, tipo, uva, elaboracion, grados, sabor, temperatura, apertura, va_con, color, precio_ref, ejemplo) VALUES
  ('ribera-alta-roble', 'Ribera Alta Roble 2023', 'Bodegas Ribera Alta', 'D.O. Ribera del Duero', 'Tinto', 'Tempranillo', 'Roble · 4 meses', '14 % vol.', 'Fruta roja madura y un toque tostado suave. Fácil de beber, ni ligero ni pesado.', '15–16 °C', 'Al momento', 'Guisos|Embutido|Carne a la plancha|Pizza', '#3A2226', 6.49, 1),
  ('valle-rojo-garnacha', 'Valle Rojo Garnacha 2024', 'Bodegas Valle Rojo', 'D.O. Campo de Borja', 'Tinto', 'Garnacha', 'Joven', '13,5 % vol.', 'Muy afrutado y suave, con poca acidez. Entra fácil y no necesita comida pesada.', '14–15 °C', 'Al momento', 'Pizza|Pasta|Tapas|Arroces de carne', '#4A2530', 4.95, 1),
  ('monte-sereno-crianza', 'Monte Sereno Crianza 2021', 'Bodegas Monte Sereno', 'D.O.Ca. Rioja', 'Tinto', 'Tempranillo', 'Crianza · 12 meses', '14 % vol.', 'Intenso, con vainilla y fruta negra. Pide comida con fuerza.', '16–17 °C', '10 minutos antes', 'Carne a la brasa|Cordero|Quesos curados|Guisos', '#2A1B1E', 8.90, 1),
  ('brisa-albarino', 'Brisa Atlántica Albariño 2024', 'Adega Brisa', 'D.O. Rías Baixas', 'Blanco', 'Albariño', 'Joven', '12,5 % vol.', 'Fresco, con limón y fruta blanca. Limpia la boca entre bocado y bocado.', '8–10 °C', 'Bien frío', 'Pescado|Marisco|Arroces de mar|Ensaladas', '#C9B66A', 7.95, 1),
  ('font-clara-brut', 'Font Clara Brut Nature', 'Caves Font Clara', 'D.O. Cava', 'Espumoso', 'Macabeo · Xarel·lo', 'Brut Nature', '11,5 % vol.', 'Burbuja fina, seco y fresco. Funciona con casi todo lo que sea para picar.', '6–8 °C', 'Muy frío', 'Quesos|Fritos|Pescado|Aperitivos', '#3E4A33', 6.30, 1),
  ('ribera-alta-crianza', 'Ribera Alta Crianza', 'Bodegas Ribera Alta', 'D.O. Ribera del Duero', 'Tinto', 'Tempranillo', 'Crianza', '14,5 % vol.', 'Más madera y más cuerpo que el roble.', '16–17 °C', '10 minutos antes', 'Carne roja|Asados|Quesos curados', '#2E1A1E', 9.95, 1),
  ('ribera-alta-verdejo', 'Ribera Alta Verdejo', 'Bodegas Ribera Alta', 'D.O. Rueda', 'Blanco', 'Verdejo', 'Joven', '13 % vol.', 'Aromático y fresco, con hierba y fruta blanca.', '8–10 °C', 'Bien frío', 'Pescado|Ensaladas|Aperitivos', '#D4C27A', 5.75, 1),
  ('ribera-alta-rosado', 'Ribera Alta Rosado', 'Bodegas Ribera Alta', 'D.O. Ribera del Duero', 'Rosado', 'Tempranillo', 'Joven', '13 % vol.', 'Afrutado y fácil, para el verano.', '8–10 °C', 'Bien frío', 'Pasta|Arroces|Barbacoa', '#C8566E', 5.20, 1),
  ('valle-rojo-tempranillo', 'Valle Rojo Tempranillo', 'Bodegas Valle Rojo', 'D.O. La Mancha', 'Tinto', 'Tempranillo', 'Joven', '13 % vol.', 'Sencillo y afrutado.', '14–15 °C', 'Al momento', 'Tapas|Pasta|Guisos', '#4A2530', 3.90, 1),
  ('cerro-viejo-roble', 'Cerro Viejo Roble', 'Bodegas Cerro Viejo', 'D.O. Toro', 'Tinto', 'Tinta de Toro', 'Roble', '14,5 % vol.', 'Potente y maduro para su precio.', '15–16 °C', 'Al momento', 'Carne|Guisos|Embutido', '#2F1C20', 4.85, 1),
  ('altos-bierzo-mencia', 'Altos del Bierzo Mencía', 'Bodegas Altos del Bierzo', 'D.O. Bierzo', 'Tinto', 'Mencía', 'Joven', '13,5 % vol.', 'Afrutado y fresco, muy fácil de beber.', '14–15 °C', 'Al momento', 'Embutido|Pasta|Pescado azul', '#4B2433', 7.40, 1),
  ('sierra-garnacha', 'Sierra Garnacha', 'Bodegas Sierra', 'D.O. Calatayud', 'Tinto', 'Garnacha', 'Joven', '14 % vol.', 'Suave y goloso.', '14–15 °C', 'Al momento', 'Pizza|Tapas|Arroces de carne', '#4A2530', 5.60, 1),
  ('valle-rojo-rosado', 'Valle Rojo Rosado', 'Bodegas Valle Rojo', 'D.O. Campo de Borja', 'Rosado', 'Garnacha', 'Joven', '13 % vol.', 'Fresco y frutal.', '8–10 °C', 'Bien frío', 'Pasta|Ensaladas|Arroces', '#C8566E', 4.60, 1),
  ('valle-rojo-crianza', 'Valle Rojo Crianza', 'Bodegas Valle Rojo', 'D.O. Campo de Borja', 'Tinto', 'Garnacha', 'Crianza', '14 % vol.', 'Más estructura y algo de madera.', '16–17 °C', '10 minutos antes', 'Carne|Guisos', '#2E1A1E', 7.20, 1),
  ('campos-sur-tinto', 'Campos del Sur Tinto', 'Bodegas Campos del Sur', 'Vino de la Tierra de Castilla', 'Tinto', 'Tempranillo', 'Joven', '12,5 % vol.', 'Ligero y de diario.', '14–15 °C', 'Al momento', 'Pasta|Tapas', '#4A2530', 3.40, 1),
  ('monte-sereno-reserva', 'Monte Sereno Reserva', 'Bodegas Monte Sereno', 'D.O.Ca. Rioja', 'Tinto', 'Tempranillo', 'Reserva', '14 % vol.', 'Elegante, con más años de madera y botella.', '16–17 °C', '20 minutos antes', 'Asados|Caza|Quesos curados', '#2A1B1E', 14.50, 1),
  ('monte-sereno-joven', 'Monte Sereno Joven', 'Bodegas Monte Sereno', 'D.O.Ca. Rioja', 'Tinto', 'Tempranillo', 'Joven', '13,5 % vol.', 'Ligero y afrutado.', '14–15 °C', 'Al momento', 'Tapas|Pasta|Pizza', '#4A2530', 5.10, 1),
  ('brisa-barrica', 'Brisa Atlántica Barrica', 'Adega Brisa', 'D.O. Rías Baixas', 'Blanco', 'Albariño', 'Barrica', '13 % vol.', 'Más cremoso que el joven.', '10–12 °C', 'Frío', 'Pescado al horno|Arroces de mar', '#C9B66A', 11.90, 1),
  ('campos-sur-verdejo', 'Campos del Sur Verdejo', 'Bodegas Campos del Sur', 'D.O. Rueda', 'Blanco', 'Verdejo', 'Joven', '12,5 % vol.', 'Fresco y aromático.', '8–10 °C', 'Bien frío', 'Pescado|Ensaladas', '#D4C27A', 4.20, 1),
  ('costa-blanca-macabeo', 'Costa Blanca Macabeo', 'Bodegas Costa Blanca', 'Vino de la Tierra', 'Blanco', 'Macabeo', 'Joven', '12 % vol.', 'Ligero y fácil.', '8–10 °C', 'Bien frío', 'Aperitivos|Ensaladas', '#D9CC8A', 3.10, 1),
  ('font-clara-rose', 'Font Clara Rosé', 'Caves Font Clara', 'D.O. Cava', 'Espumoso', 'Garnacha · Trepat', 'Brut', '12 % vol.', 'Burbuja con fruta roja.', '6–8 °C', 'Muy frío', 'Aperitivos|Postres', '#C8566E', 7.10, 1),
  ('burbuja-seca-brut', 'Burbuja Seca Brut', 'Caves Burbuja', 'D.O. Cava', 'Espumoso', 'Macabeo', 'Brut', '11,5 % vol.', 'Sencillo y fresco.', '6–8 °C', 'Muy frío', 'Aperitivos|Fritos', '#3E4A33', 3.95, 1);

-- Precios de ejemplo en cada súper (calculados a partir del precio de referencia)
INSERT OR REPLACE INTO precios (vino_id, super_id, precio)
SELECT v.id, f.s, ROUND(v.precio_ref * f.k, 2)
FROM vinos v
JOIN (
  SELECT 'mercadona' AS s, 1.00 AS k UNION ALL
  SELECT 'carrefour', 0.95 UNION ALL
  SELECT 'lidl', 0.93 UNION ALL
  SELECT 'dia', 0.97 UNION ALL
  SELECT 'alcampo', 0.98
) f
WHERE v.ejemplo = 1;

-- Qué vino va con cada plato (orden 1 = el mejor)
INSERT OR REPLACE INTO maridajes (plato_id, vino_id, orden, motivo, nota) VALUES
  ('lentejas', 'ribera-alta-roble', 1, 'Afrutado y con poca madera: aguanta el chorizo sin taparlo y no pesa con un guiso.', 'La mejor opción'),
  ('lentejas', 'valle-rojo-garnacha', 2, 'Afrutado y suave: acompaña el guiso sin competir con él.', 'Tinto joven · también va bien'),
  ('lentejas', 'monte-sereno-crianza', 3, 'Con cuerpo: aguanta bien el chorizo y la morcilla.', 'Más cuerpo · si te gusta intenso'),
  ('paella', 'brisa-albarino', 1, 'Fresco y con acidez: acompaña el marisco y el arroz sin competir con el sabor.', 'La mejor opción'),
  ('paella', 'font-clara-brut', 3, 'La burbuja limpia la boca entre cucharada y cucharada.', 'Burbuja fresca · muy buena opción'),
  ('paella', 'valle-rojo-garnacha', 4, 'Suave y frutal: la mejor opción si la paella es de carne.', 'Si es paella de carne'),
  ('pizza', 'valle-rojo-garnacha', 1, 'Suave y muy frutal: va con el tomate y el queso sin endurecerse.', 'La mejor opción'),
  ('pizza', 'ribera-alta-roble', 2, 'Un punto más de cuerpo para pizzas con embutido.', 'Un poco más de cuerpo'),
  ('pizza', 'font-clara-brut', 3, 'La burbuja equilibra el queso fundido.', 'Si quieres algo distinto'),
  ('pescado', 'brisa-albarino', 1, 'Ligero y con limón: realza el pescado sin taparlo.', 'La mejor opción'),
  ('pescado', 'font-clara-brut', 3, 'Ideal si el pescado es frito o rebozado.', 'Si el pescado es frito'),
  ('pescado', 'valle-rojo-garnacha', 5, 'Solo para pescado azul a la brasa: suave y sin taninos duros.', 'Si es pescado azul a la brasa'),
  ('carne-brasa', 'monte-sereno-crianza', 1, 'Con cuerpo y madera: la grasa y el humo de la brasa le sientan de maravilla.', 'La mejor opción'),
  ('carne-brasa', 'ribera-alta-roble', 2, 'Más ligero y más barato, y sigue aguantando la carne.', 'Más ligero y más barato'),
  ('carne-brasa', 'valle-rojo-garnacha', 4, 'Para carnes blancas o si buscas algo suave.', 'Si buscas algo suave'),
  ('quesos', 'monte-sereno-crianza', 1, 'Intenso: aguanta los quesos curados sin quedarse corto.', 'La mejor opción'),
  ('quesos', 'font-clara-brut', 2, 'La burbuja va muy bien con quesos tiernos o cremosos.', 'Para quesos tiernos'),
  ('quesos', 'brisa-albarino', 4, 'Muy bueno con queso de cabra.', 'Para quesos de cabra'),
  ('pescado', 'campos-sur-verdejo', 2, 'Blanco fresco y aromático: acompaña el pescado sin taparlo y cuesta poco.', 'Blanco fresco y barato'),
  ('pescado', 'burbuja-seca-brut', 4, 'Cava sencillo: muy bueno con pescado frito o rebozado.', 'Cava barato para fritos'),
  ('paella', 'campos-sur-verdejo', 2, 'Blanco fresco: va bien con arroces de marisco.', 'Blanco fresco y barato'),
  ('carne-brasa', 'cerro-viejo-roble', 3, 'Potente y maduro: aguanta la brasa por poco dinero.', 'Con cuerpo y barato'),
  ('quesos', 'cerro-viejo-roble', 3, 'Con cuerpo: aguanta quesos curados y embutido.', 'Con cuerpo y barato');

-- Sugerencias de cada vino: misma bodega, parecidos más baratos y para descubrir
INSERT OR REPLACE INTO relacionados (vino_id, rel_id, tipo, nota, patrocinado, orden) VALUES
  ('ribera-alta-roble', 'ribera-alta-crianza', 'misma', 'Más madera, más cuerpo', 0, 1),
  ('ribera-alta-roble', 'ribera-alta-verdejo', 'misma', 'Su blanco, fresco', 0, 2),
  ('ribera-alta-roble', 'ribera-alta-rosado', 'misma', 'Para el verano', 0, 3),
  ('ribera-alta-roble', 'valle-rojo-tempranillo', 'parecido', 'D.O. La Mancha', 0, 4),
  ('ribera-alta-roble', 'cerro-viejo-roble', 'parecido', 'D.O. Toro', 0, 5),
  ('ribera-alta-roble', 'altos-bierzo-mencia', 'descubrir', 'Igual de afrutado, más fresco', 1, 6),
  ('ribera-alta-roble', 'sierra-garnacha', 'descubrir', 'Más suave, D.O. Calatayud', 0, 7),
  ('valle-rojo-garnacha', 'valle-rojo-rosado', 'misma', 'Fresco y frutal', 0, 1),
  ('valle-rojo-garnacha', 'valle-rojo-crianza', 'misma', 'Más estructura', 0, 2),
  ('valle-rojo-garnacha', 'campos-sur-tinto', 'parecido', 'Vino de la Tierra', 0, 3),
  ('valle-rojo-garnacha', 'valle-rojo-tempranillo', 'parecido', 'D.O. La Mancha', 0, 4),
  ('valle-rojo-garnacha', 'altos-bierzo-mencia', 'descubrir', 'Fresco y afrutado', 1, 5),
  ('valle-rojo-garnacha', 'ribera-alta-roble', 'descubrir', 'Un punto más de cuerpo', 0, 6),
  ('monte-sereno-crianza', 'monte-sereno-reserva', 'misma', 'Más elegante', 0, 1),
  ('monte-sereno-crianza', 'monte-sereno-joven', 'misma', 'Más ligero', 0, 2),
  ('monte-sereno-crianza', 'cerro-viejo-roble', 'parecido', 'D.O. Toro', 0, 3),
  ('monte-sereno-crianza', 'ribera-alta-roble', 'parecido', 'D.O. Ribera del Duero', 0, 4),
  ('monte-sereno-crianza', 'altos-bierzo-mencia', 'descubrir', 'Más fresco', 1, 5),
  ('monte-sereno-crianza', 'sierra-garnacha', 'descubrir', 'Más suave', 0, 6),
  ('brisa-albarino', 'brisa-barrica', 'misma', 'Más cremoso', 0, 1),
  ('brisa-albarino', 'campos-sur-verdejo', 'parecido', 'D.O. Rueda', 0, 2),
  ('brisa-albarino', 'costa-blanca-macabeo', 'parecido', 'Vino de la Tierra', 0, 3),
  ('brisa-albarino', 'ribera-alta-verdejo', 'descubrir', 'Más aromático', 1, 4),
  ('brisa-albarino', 'font-clara-brut', 'descubrir', 'Cava, para picar', 0, 5),
  ('font-clara-brut', 'font-clara-rose', 'misma', 'Más afrutado', 0, 1),
  ('font-clara-brut', 'burbuja-seca-brut', 'parecido', 'D.O. Cava', 0, 2),
  ('font-clara-brut', 'brisa-albarino', 'descubrir', 'Blanco fresco', 1, 3);
