ALTER TABLE platos ADD COLUMN tipo TEXT DEFAULT 'plato';

INSERT OR REPLACE INTO platos (id, nombre, palabras, orden, tipo) VALUES
  ('regalar', 'Para regalar', 'regal,cumple,anfitri,invitad,detalle,quedar bien', 11, 'ocasion'),
  ('brindar', 'Para brindar', 'celebr,brind,fiesta,nochevieja,boda,aniversario,cava', 12, 'ocasion'),
  ('compartir', 'Para compartir', 'amig,compartir,tomar algo,charla,copa,terraza,solo,sin comida,cena,picar,reunion', 13, 'ocasion');

INSERT OR REPLACE INTO maridajes (plato_id, vino_id, orden, motivo, nota) VALUES
  ('regalar', 'riscal-reserva', 1, 'Un clásico de Rioja que siempre queda bien: elegante y reconocible.', 'La mejor opción'),
  ('regalar', 'petalos-bierzo', 2, 'Elegante y diferente: para quien ya conoce los clásicos.', 'Para sorprender'),
  ('regalar', 'protos-crianza', 3, 'Ribera con prestigio y mucho cuerpo.', 'Ribera de prestigio'),
  ('regalar', 'coto-imaz-reserva', 4, 'Un reserva clásico a muy buen precio.', 'Reserva asequible'),
  ('regalar', 'martin-codax', 5, 'Si a quien se lo regalas le gusta el blanco.', 'Si prefiere blanco'),
  ('regalar', 'anna-codorniu', 6, 'Un cava elegante siempre es buen detalle.', 'Cava elegante'),
  ('regalar', 'juan-gil-4-meses', 7, 'Moderno y con mucho sabor: gusta a casi todos.', 'Moderno y asequible'),
  ('regalar', 'borsao-seleccion', 8, 'Sorprende mucho para lo que cuesta.', 'Detalle económico'),
  ('brindar', 'anna-codorniu', 1, 'Cremoso y elegante: el cava para una ocasión especial.', 'La mejor opción'),
  ('brindar', 'segura-viudas-reserva', 2, 'Seco, con burbuja fina y algo más de crianza.', 'Cava reserva'),
  ('brindar', 'cordon-negro', 3, 'Seco y fresco, un clásico para brindar.', 'Clásico seco'),
  ('brindar', 'codorniu-clasico', 4, 'Fresco y sencillo, para brindar sin gastar mucho.', 'El más económico'),
  ('brindar', 'carta-nevada', 5, 'Un punto dulce: perfecto con el postre o si no os gusta muy seco.', 'Si os gusta dulce'),
  ('brindar', 'paco-lola', 6, 'Si preferís un blanco fresco en lugar de burbujas.', 'Sin burbujas'),
  ('compartir', 'borsao-seleccion', 1, 'Afrutado y fácil de beber, con o sin comida. Gusta a casi todo el mundo.', 'La mejor opción'),
  ('compartir', 'riscal-verdejo', 2, 'Blanco fresco y fácil, para quien no quiera tinto.', 'Blanco fácil'),
  ('compartir', 'gran-feudo-rosado', 3, 'Rosado frutal que encaja con todo lo que se ponga en la mesa.', 'Rosado para todos'),
  ('compartir', 'cune-crianza', 4, 'Un crianza suave que no cansa.', 'Tinto suave'),
  ('compartir', 'vina-sol', 5, 'Ligero y barato para tomar algo.', 'Ligero y económico'),
  ('compartir', 'protos-roble', 6, 'Un Ribera joven con más sabor, para picar algo.', 'Con más sabor'),
  ('compartir', 'petalos-bierzo', 7, 'Para quedar bien con quien sabe de vino.', 'Para quedar bien');
