// Fotos reales de los vinos desde Open Food Facts (base abierta, fotos con licencia CC BY-SA).
// Solo se guarda la dirección de la foto (no se copia el archivo) y solo si el producto coincide
// de verdad con nuestro vino: es mejor la botella dibujada que una foto equivocada.

const UA = 'Vinotake/1.0 (https://vino.picfy.es)';
const HOST_FOTOS = /^https:\/\/(images|static)\.openfoodfacts\.org\//;
const SIN_VALOR = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'e', 'a', 'en', 'd', 'do', 'doca']);
const VARIANTES = ['crianza', 'reserva', 'roble', 'rosado', 'rose', 'brut', 'fino', 'manzanilla', 'amontillado', 'semiseco', 'dulce', 'blanco', 'tinto', 'joven'];

export function normalizarTexto(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' y ').replace(/[^a-z0-9]+/g, ' ').trim();
}
function palabras(s) { return normalizarTexto(s).split(' ').filter(Boolean); }

// ¿Este producto de Open Food Facts es exactamente nuestro vino?
export function coincide(vino, p) {
  if (!p || !p.image_front_url || !HOST_FOTOS.test(p.image_front_url)) return false;
  const cats = (p.categories_tags || []).join(' ');
  if (!/wine|vino|cava|champagne|sherry|jerez|sparkling|alcoholic/.test(cats)) return false;
  const textoP = ' ' + normalizarTexto([p.brands, p.product_name].join(' ')) + ' ';
  const nuestras = palabras(vino.nombre).filter(w => !SIN_VALOR.has(w));
  if (!nuestras.length) return false;
  if (!nuestras.every(w => textoP.includes(' ' + w + ' '))) return false;
  const nuestroTxt = ' ' + normalizarTexto(vino.nombre + ' ' + (vino.elaboracion || '')) + ' ';
  for (const v of VARIANTES) {
    const enNuestro = nuestroTxt.includes(' ' + v + ' '), enP = textoP.includes(' ' + v + ' ');
    // el Crianza no es el Reserva, el Roble no es el Crianza...
    if (['crianza', 'reserva', 'roble', 'rosado', 'fino'].includes(v) && enNuestro !== enP) return false;
    if (v === 'brut' && enNuestro && !enP) return false;
  }
  return true;
}

export function mejorCoincidencia(vino, productos) {
  const buenos = (productos || []).filter(p => coincide(vino, p));
  return buenos.find(p => (p.countries_tags || []).includes('en:spain')) || buenos[0] || null;
}

export async function sondearOFF(nombre) {
  const url = 'https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=12'
    + '&fields=code,product_name,brands,categories_tags,countries_tags,image_front_url&search_terms=' + encodeURIComponent(nombre);
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  const txt = await r.text();
  let d = null; try { d = JSON.parse(txt); } catch (e) { /* no es JSON */ }
  const prods = (d && d.products) || [];
  return {
    http: r.status, es_json: !!d, productos: prods.length, inicio_respuesta: d ? undefined : txt.slice(0, 160),
    primeros: prods.slice(0, 6).map(p => ({ nombre: p.product_name, marca: p.brands, foto: !!p.image_front_url, vino: /wine|vino|cava|champagne|sherry|jerez|sparkling|alcoholic/.test((p.categories_tags || []).join(' ')) })),
    coincide: !!mejorCoincidencia({ nombre }, prods)
  };
}

async function buscarOFF(nombre) {
  const url = 'https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=12'
    + '&fields=code,product_name,brands,categories_tags,countries_tags,image_front_url&search_terms=' + encodeURIComponent(nombre);
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('OFF ' + r.status);
  const d = await r.json();
  return d.products || [];
}

const esperar = ms => new Promise(r => setTimeout(r, ms));

// Cada pasada mira unos pocos vinos sin foto (Open Food Facts limita las búsquedas a unas 10 por minuto).
export async function rellenarFotos(env, max = 6) {
  const { results } = await env.DB.prepare(
    "SELECT id, nombre, elaboracion FROM vinos WHERE activo = 1 AND (imagen IS NULL OR imagen = '') ORDER BY id"
  ).all();
  if (!results.length) return { revisados: 0, nuevas: 0, pendientes: 0 };
  const inicio = (Math.floor(Date.now() / 900000) * max) % results.length; // rota para no repetir siempre los mismos
  const lote = [];
  for (let i = 0; i < Math.min(max, results.length); i++) lote.push(results[(inicio + i) % results.length]);
  let nuevas = 0;
  for (const v of lote) {
    try {
      const lista = await buscarOFF(v.nombre);
      const p = mejorCoincidencia(v, lista);
      await env.DB.prepare('INSERT INTO cuenta_intentos (clave) VALUES (?)').bind(p ? 'fotos:ok' : lista.length ? 'fotos:sin-coincidencia' : 'fotos:sin-resultados').run().catch(() => {});
      if (p) {
        await env.DB.prepare("UPDATE vinos SET imagen = ? WHERE id = ? AND (imagen IS NULL OR imagen = '')").bind(p.image_front_url, v.id).run();
        nuevas++;
      }
    } catch (e) {
      console.error('fotos', v.id, e.message);
      await env.DB.prepare('INSERT INTO cuenta_intentos (clave) VALUES (?)').bind('fotos:error:' + String(e.message).slice(0, 40)).run().catch(() => {});
    }
    await esperar(7000);
  }
  return { revisados: lote.length, nuevas, pendientes: results.length - nuevas };
}
