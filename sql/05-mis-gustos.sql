ALTER TABLE vinos ADD COLUMN estilo TEXT;
ALTER TABLE vinos ADD COLUMN dulce INTEGER DEFAULT 0;

UPDATE vinos SET estilo = 'suave' WHERE id IN ('faustino-vii','borsao-seleccion','castillo-monseran','sangre-de-toro','vina-sol','diamante','riscal-verdejo','paco-lola','gran-feudo-rosado','carta-nevada','codorniu-clasico');
UPDATE vinos SET estilo = 'equilibrado' WHERE id IN ('el-coto-crianza','campo-viejo-crianza','marques-caceres-crianza','vina-pomal-crianza','beronia-crianza','cune-crianza','protos-roble','castano-monastrell','petalos-bierzo','vina-esmeralda','monopole','jose-pariente-verdejo','protos-verdejo','martin-codax','cordon-negro','anna-codorniu','segura-viudas-reserva');
UPDATE vinos SET estilo = 'intenso' WHERE id IN ('ramon-bilbao-crianza','vina-real-crianza','coto-imaz-reserva','riscal-reserva','protos-crianza','legaris-crianza','pruno','celeste-crianza','matsu-picaro','las-rocas-garnacha','juan-gil-4-meses','tio-pepe','la-gitana');
UPDATE vinos SET dulce = 1 WHERE id IN ('diamante','carta-nevada');

CREATE TABLE IF NOT EXISTS gustos (
  dispositivo TEXT PRIMARY KEY,
  tipos TEXT,
  evitar TEXT,
  estilo TEXT,
  presupuesto TEXT,
  dulce INTEGER,
  actualizado TEXT DEFAULT CURRENT_TIMESTAMP
);
