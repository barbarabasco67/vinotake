// Aplica solas las actualizaciones de datos (archivos .sql de la carpeta sql que se añaden aquí).
// Cada una se ejecuta una sola vez y se anota en la tabla «migraciones»: así no hay que pegar nada a mano.
import sql15 from '../sql/15-alcampo-tintos.sql';
import sql16 from '../sql/16-catalogo-ampliado-2.sql';
import sql17 from '../sql/17-alcampo-precios-2.sql';
import sql18 from '../sql/18-alcampo-tintos-3.sql';
import sql19 from '../sql/19-alcampo-rioja.sql';
import sql20 from '../sql/20-alcampo-ribera.sql';
import sql21 from '../sql/21-alcampo-toro-bierzo.sql';
import sql22 from '../sql/22-alcampo-aragon.sql';
import sql23 from '../sql/23-alcampo-castilla-la-mancha.sql';
import sql24 from '../sql/24-alcampo-cataluna.sql';
import sql25 from '../sql/25-alcampo-navarra.sql';
import sql26 from '../sql/26-alcampo-valencia.sql';
import sql27 from '../sql/27-alcampo-otras-do.sql';
import sql28 from '../sql/28-alcampo-eco-internacional.sql';
import sql29 from '../sql/29-alcampo-blancos-rueda.sql';
import sql30 from '../sql/30-alcampo-blancos-galicia-aragon-rioja.sql';
import sql31 from '../sql/31-alcampo-blancos-resto.sql';
import sql32 from '../sql/32-alcampo-rosados-jereces-mesa.sql';
import sql33 from '../sql/33-carrefour-blancos-rueda.sql';
import sql34 from '../sql/34-carrefour-blancos-resto.sql';
import sql35 from '../sql/35-carrefour-tintos-rioja.sql';
import sql36 from '../sql/36-carrefour-tintos-ribera.sql';
import sql37 from '../sql/37-carrefour-tintos-do-varias.sql';
import sql38 from '../sql/38-carrefour-generosos-internacionales-sin-alcohol.sql';
import sql39 from '../sql/39-carrefour-generosos-completo.sql';
import sql40 from '../sql/40-carrefour-rosados.sql';
import sql41 from '../sql/41-dia-tintos.sql';
import sql42 from '../sql/42-dia-blancos.sql';
import sql43 from '../sql/43-dia-rosados.sql';
import sql44 from '../sql/44-premium.sql';
import sql45 from '../sql/45-ahorramas-ribera.sql';
import sql46 from '../sql/46-ahorramas-tintos.sql';
import sql47 from '../sql/47-bodega-fechas.sql';

const LISTA = [
  ['15-alcampo-tintos', sql15],
  ['16-catalogo-ampliado-2', sql16],
  ['17-alcampo-precios-2', sql17],
  ['18-alcampo-tintos-3', sql18],
  ['19-alcampo-rioja', sql19],
  ['20-alcampo-ribera', sql20],
  ['21-alcampo-toro-bierzo', sql21],
  ['22-alcampo-aragon', sql22],
  ['23-alcampo-castilla-la-mancha', sql23],
  ['24-alcampo-cataluna', sql24],
  ['25-alcampo-navarra', sql25],
  ['26-alcampo-valencia', sql26],
  ['27-alcampo-otras-do', sql27],
  ['28-alcampo-eco-internacional', sql28],
  ['29-alcampo-blancos-rueda', sql29],
  ['30-alcampo-blancos-galicia-aragon-rioja', sql30],
  ['31-alcampo-blancos-resto', sql31],
  ['32-alcampo-rosados-jereces-mesa', sql32],
  ['33-carrefour-blancos-rueda', sql33],
  ['34-carrefour-blancos-resto', sql34],
  ['35-carrefour-tintos-rioja', sql35],
  ['36-carrefour-tintos-ribera', sql36],
  ['37-carrefour-tintos-do-varias', sql37],
  ['38-carrefour-generosos-internacionales-sin-alcohol', sql38],
  ['39-carrefour-generosos-completo', sql39],
  ['40-carrefour-rosados', sql40],
  ['41-dia-tintos', sql41],
  ['42-dia-blancos', sql42],
  ['43-dia-rosados', sql43],
  ['44-premium', sql44],
  ['45-ahorramas-ribera', sql45],
  ['46-ahorramas-tintos', sql46],
  ['47-bodega-fechas', sql47]
];

// Separa un archivo SQL en sentencias (respeta comillas y comentarios de línea).
export function sentencias(texto) {
  const res = [];
  let act = '', q = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (!q && c === '-' && texto[i + 1] === '-') { while (i < texto.length && texto[i] !== '\n') i++; continue; }
    if (c === "'") {
      if (q && texto[i + 1] === "'") { act += "''"; i++; continue; }
      q = !q;
    }
    if (c === ';' && !q) { if (act.trim()) res.push(act.trim()); act = ''; continue; }
    act += c;
  }
  if (act.trim()) res.push(act.trim());
  return res;
}

export async function aplicarMigraciones(env) {
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS migraciones (nombre TEXT PRIMARY KEY, aplicada TEXT DEFAULT CURRENT_TIMESTAMP)').run();
  const hechas = new Set((await env.DB.prepare('SELECT nombre FROM migraciones').all()).results.map(r => r.nombre));
  const out = [];
  for (const [nombre, texto] of LISTA) {
    if (hechas.has(nombre)) continue;
    const todas = sentencias(texto);
    for (let i = 0; i < todas.length; i += 40) {
      await env.DB.batch(todas.slice(i, i + 40).map(s => env.DB.prepare(s)));
    }
    await env.DB.prepare('INSERT OR REPLACE INTO migraciones (nombre) VALUES (?)').bind(nombre).run();
    out.push(nombre + ' (' + todas.length + ')');
  }
  return out;
}
