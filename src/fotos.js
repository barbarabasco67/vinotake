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
export function coincide(vino, p, sinFoto = false) {
  if (!p) return false;
  if (!sinFoto && (!p.image_front_url || !HOST_FOTOS.test(p.image_front_url))) return false;
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

export function mejorCoincidencia(vino, productos, sinFoto = false) {
  const buenos = (productos || []).filter(p => coincide(vino, p, sinFoto));
  return buenos.find(p => (p.countries_tags || []).includes('en:spain')) || buenos[0] || null;
}

const CAMPOS = 'code,product_name,brands,categories_tags,countries_tags';
// Búsqueda de Open Food Facts (el buscador nuevo; el antiguo suele dar error 503).
async function buscarNuevo(nombre) {
  const url = 'https://search.openfoodfacts.org/search?page_size=15&fields=' + CAMPOS + '&q=' + encodeURIComponent(nombre);
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  const txt = await r.text();
  let d = null; try { d = JSON.parse(txt); } catch (e) { /* no es JSON */ }
  return { http: r.status, d, txt };
}
async function buscarAntiguo(nombre) {
  const url = 'https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=12&fields=' + CAMPOS + ',image_front_url&search_terms=' + encodeURIComponent(nombre);
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  const txt = await r.text();
  let d = null; try { d = JSON.parse(txt); } catch (e) { /* no es JSON */ }
  return { http: r.status, d, txt };
}
async function buscarOFF(nombre) {
  let r = await buscarNuevo(nombre);
  let lista = r.d && (r.d.hits || r.d.products);
  if (!lista) { r = await buscarAntiguo(nombre); lista = r.d && r.d.products; }
  if (!lista) throw new Error('OFF ' + r.http);
  return lista;
}
// Dirección de la foto frontal de un producto concreto.
async function fotoDe(code) {
  const r = await fetch('https://world.openfoodfacts.org/api/v2/product/' + encodeURIComponent(code) + '.json?fields=image_front_url', { headers: { 'User-Agent': UA } });
  if (!r.ok) return null;
  const d = await r.json().catch(() => null);
  const u = d && d.product && d.product.image_front_url;
  return u && HOST_FOTOS.test(u) ? u : null;
}

export async function sondearOFF(nombre) {
  let r = await buscarNuevo(nombre).catch(e => ({ http: 0, d: null, txt: String(e.message) }));
  let via = 'nuevo';
  let prods = (r.d && (r.d.hits || r.d.products)) || [];
  if (!r.d || !prods.length) {
    const r2 = await buscarAntiguo(nombre).catch(e => ({ http: 0, d: null, txt: String(e.message) }));
    if (r2.d && r2.d.products && r2.d.products.length) { r = r2; via = 'antiguo'; prods = r2.d.products; }
  }
  const mejor = mejorCoincidencia({ nombre }, prods, true);
  return {
    via, http: r.http, es_json: !!r.d, productos: prods.length, inicio_respuesta: r.d ? undefined : String(r.txt).slice(0, 160),
    primeros: prods.slice(0, 6).map(p => ({ codigo: p.code, nombre: p.product_name, marca: Array.isArray(p.brands) ? p.brands.join(',') : p.brands })),
    coincide: mejor ? { codigo: mejor.code, nombre: mejor.product_name, foto: await fotoDe(mejor.code).catch(() => null) } : false
  };
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
      const p0 = mejorCoincidencia(v, lista, true);
      const foto = p0 ? (p0.image_front_url && HOST_FOTOS.test(p0.image_front_url) ? p0.image_front_url : await fotoDe(p0.code)) : null;
      const p = foto ? Object.assign({}, p0, { image_front_url: foto }) : null;
      await env.DB.prepare('INSERT INTO cuenta_intentos (clave) VALUES (?)').bind(p ? 'fotos:ok' : p0 ? 'fotos:sin-foto' : lista.length ? 'fotos:sin-coincidencia' : 'fotos:sin-resultados').run().catch(() => {});
      if (p) {
        await env.DB.prepare("UPDATE vinos SET imagen = ? WHERE id = ? AND (imagen IS NULL OR imagen = '')").bind(p.image_front_url, v.id).run();
        nuevas++;
      }
    } catch (e) {
      console.error('fotos', v.id, e.message);
      await env.DB.prepare('INSERT INTO cuenta_intentos (clave) VALUES (?)').bind('fotos:error:' + String(e.message).slice(0, 40)).run().catch(() => {});
    }
    await esperar(5000);
  }
  return { revisados: lote.length, nuevas, pendientes: results.length - nuevas };
}
