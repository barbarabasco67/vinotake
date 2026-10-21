// Vinotake · API
// La web (carpeta public) la sirve Cloudflare directamente. Este Worker solo atiende /api/*.

const PRESUPUESTOS = {
  'hasta5': { nombre: 'Hasta 5 €', max: 5 },
  '5a10': { nombre: 'De 5 a 10 €', max: 10 },
  'mas10': { nombre: 'Más de 10 €', max: null }
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      return await api(request, env, url);
    } catch (err) {
      console.error(err);
      return json({ error: 'Algo ha fallado. Inténtalo de nuevo.' }, 500);
    }
  }
};

async function api(request, env, url) {
  const path = url.pathname.replace(/\/+$/, '');
  const method = request.method;

  if (method === 'GET' && path === '/api/inicio') return inicio(env);
  if (method === 'POST' && path === '/api/recomendar') return recomendar(env, await body(request));
  if (method === 'POST' && path === '/api/botella') return botella(env, await body(request));

  let m = path.match(/^\/api\/vino\/([a-z0-9-]+)$/);
  if (method === 'GET' && m) return ficha(env, m[1], url.searchParams.get('super'));

  m = path.match(/^\/api\/consulta\/(\d+)\/elegido$/);
  if (method === 'POST' && m) return elegido(env, Number(m[1]), await body(request));

  return json({ error: 'No encontrado' }, 404);
}

// ---------- Inicio: supermercados, platos y presupuestos ----------
async function inicio(env) {
  const [supers, platos] = await Promise.all([
    env.DB.prepare('SELECT id, nombre FROM supermercados ORDER BY orden, nombre').all(),
    env.DB.prepare('SELECT id, nombre FROM platos ORDER BY orden, nombre').all()
  ]);
  return json({
    supers: supers.results,
    platos: platos.results,
    presupuestos: Object.entries(PRESUPUESTOS).map(([id, p]) => ({ id, nombre: p.nombre }))
  }, 200, 300);
}

// ---------- ¿Qué vino para mi cena? ----------
async function recomendar(env, b) {
  const superId = await superValido(env, b.super_id);
  const presupuesto = PRESUPUESTOS[b.presupuesto] ? b.presupuesto : '5a10';
  const max = PRESUPUESTOS[presupuesto].max;
  const texto = limpiar(b.plato_texto, 120);

  let plato = null;
  if (texto) plato = await platoPorTexto(env, texto);
  if (!plato && b.plato_id) plato = await env.DB.prepare('SELECT id, nombre FROM platos WHERE id = ?').bind(String(b.plato_id)).first();
  if (!plato) plato = await env.DB.prepare('SELECT id, nombre FROM platos ORDER BY orden LIMIT 1').first();
  if (!plato) return json({ error: 'Todavía no hay platos en la base de datos.' }, 503);

  const { results } = await env.DB.prepare(
    `SELECT v.id, v.nombre, v.tipo, v.denominacion, m.orden, m.motivo, m.nota,
            COALESCE(p.precio, v.precio_ref) AS precio
       FROM maridajes m
       JOIN vinos v ON v.id = m.vino_id AND v.activo = 1
       LEFT JOIN precios p ON p.vino_id = v.id AND p.super_id = ?
      WHERE m.plato_id = ?
      ORDER BY m.orden`
  ).bind(superId, plato.id).all();

  if (!results.length) return json({ error: 'Aún no tenemos vinos para ese plato.' }, 404);

  // Dentro del presupuesto primero, respetando el orden de mejor a peor maridaje.
  // Fuera del presupuesto, los más cercanos al límite primero.
  const dentro = results.filter(v => max === null || v.precio <= max);
  const fuera = results.filter(v => !(max === null || v.precio <= max)).sort((a, b2) => a.precio - b2.precio);
  const orden = dentro.concat(fuera);
  const mejor = orden[0];
  const alternativas = orden.slice(1, 3);
  const fueraPresupuesto = dentro.length === 0;

  let ahorro = null;
  const masBarato = alternativas.filter(a => a.precio < mejor.precio).sort((a, b2) => a.precio - b2.precio)[0];
  if (masBarato) ahorro = { vino_id: masBarato.id, nombre: masBarato.nombre, euros: redondear(mejor.precio - masBarato.precio) };

  const consulta = await env.DB.prepare(
    `INSERT INTO consultas (tipo, plato_texto, plato_id, presupuesto, super_id, recomendado)
     VALUES ('cena', ?, ?, ?, ?, ?) RETURNING id`
  ).bind(texto || null, plato.id, presupuesto, superId, mejor.id).first();

  return json({
    consulta_id: consulta ? consulta.id : null,
    plato,
    presupuesto: { id: presupuesto, nombre: PRESUPUESTOS[presupuesto].nombre },
    super_id: superId,
    fuera_presupuesto: fueraPresupuesto,
    mejor: { id: mejor.id, nombre: mejor.nombre, tipo: mejor.tipo, denominacion: mejor.denominacion, precio: mejor.precio, motivo: mejor.motivo },
    alternativas: alternativas.map(a => ({ id: a.id, nombre: a.nombre, precio: a.precio, nota: a.nota })),
    ahorro
  });
}

// ---------- Escanear botella (de momento devuelve un vino de ejemplo; aquí entrará la IA) ----------
async function botella(env, b) {
  const superId = await superValido(env, b.super_id);
  const vino = await env.DB.prepare('SELECT id FROM vinos WHERE activo = 1 ORDER BY ejemplo DESC, nombre LIMIT 1').first();
  if (!vino) return json({ error: 'Todavía no hay vinos en la base de datos.' }, 503);
  await env.DB.prepare(`INSERT INTO consultas (tipo, super_id, recomendado) VALUES ('botella', ?, ?)`).bind(superId, vino.id).run();
  return json({ vino_id: vino.id, leido_por_ia: false });
}

// ---------- Ficha del vino ----------
async function ficha(env, id, superPedido) {
  const superId = await superValido(env, superPedido);
  const v = await env.DB.prepare('SELECT * FROM vinos WHERE id = ? AND activo = 1').bind(id).first();
  if (!v) return json({ error: 'No encontramos ese vino.' }, 404);

  const precios = (await env.DB.prepare(
    `SELECT p.super_id, s.nombre AS super, p.precio
       FROM precios p JOIN supermercados s ON s.id = p.super_id
      WHERE p.vino_id = ? ORDER BY p.precio`
  ).bind(id).all()).results;

  const aqui = precios.find(p => p.super_id === superId) || null;
  const masBarato = precios.find(p => p.super_id !== superId && (!aqui || p.precio < aqui.precio)) || null;

  const rel = (await env.DB.prepare(
    `SELECT r.tipo, r.nota, r.patrocinado, v.id, v.nombre,
            COALESCE(p.precio, v.precio_ref) AS precio
       FROM relacionados r
       JOIN vinos v ON v.id = r.rel_id AND v.activo = 1
       LEFT JOIN precios p ON p.vino_id = v.id AND p.super_id = ?
      WHERE r.vino_id = ?
      ORDER BY r.orden`
  ).bind(superId, id).all()).results;

  const grupo = tipo => rel.filter(r => r.tipo === tipo).map(r => ({ id: r.id, nombre: r.nombre, nota: r.nota, precio: r.precio, patrocinado: !!r.patrocinado }));

  return json({
    id: v.id,
    nombre: v.nombre,
    bodega: v.bodega,
    denominacion: v.denominacion,
    etiquetas: [v.tipo, v.uva, v.elaboracion, v.grados].filter(Boolean),
    sabor: v.sabor,
    temperatura: v.temperatura,
    apertura: v.apertura,
    va_con: v.va_con ? v.va_con.split('|').map(s => s.trim()).filter(Boolean) : [],
    color: v.color || '#3A2226',
    ejemplo: !!v.ejemplo,
    precio: aqui ? { super: aqui.super, precio: aqui.precio } : (v.precio_ref ? { super: null, precio: v.precio_ref } : null),
    mas_barato: masBarato ? { super: masBarato.super, precio: masBarato.precio } : null,
    sugerencias: { misma: grupo('misma'), parecidos: grupo('parecido'), descubrir: grupo('descubrir') }
  }, 200, 60);
}

// ---------- Qué vino abrió la persona tras la recomendación ----------
async function elegido(env, consultaId, b) {
  const vinoId = limpiar(b.vino_id, 80);
  if (!vinoId) return json({ ok: false }, 400);
  await env.DB.prepare('UPDATE consultas SET elegido = ? WHERE id = ? AND elegido IS NULL').bind(vinoId, consultaId).run();
  return json({ ok: true });
}

// ---------- Utilidades ----------
async function platoPorTexto(env, texto) {
  const t = normalizar(texto);
  const { results } = await env.DB.prepare('SELECT id, nombre, palabras FROM platos ORDER BY orden').all();
  for (const p of results) {
    const palabras = (p.palabras || '').split(',').map(normalizar).filter(Boolean);
    if (palabras.some(w => t.includes(w))) return { id: p.id, nombre: p.nombre };
  }
  return null;
}

async function superValido(env, id) {
  if (id) {
    const s = await env.DB.prepare('SELECT id FROM supermercados WHERE id = ?').bind(String(id)).first();
    if (s) return s.id;
  }
  const primero = await env.DB.prepare('SELECT id FROM supermercados ORDER BY orden LIMIT 1').first();
  return primero ? primero.id : null;
}

function normalizar(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}
function limpiar(s, max) {
  if (s === undefined || s === null) return '';
  return String(s).trim().slice(0, max);
}
function redondear(n) { return Math.round(n * 100) / 100; }

async function body(request) {
  try { return await request.json(); } catch { return {}; }
}

function json(data, status = 200, cacheSeconds = 0) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheSeconds ? `public, max-age=${cacheSeconds}` : 'no-store'
    }
  });
}
