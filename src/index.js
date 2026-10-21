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
  if (method === 'POST' && path === '/api/estanteria') return estanteria(env, await body(request));

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
  const r = await recomendarCore(env, b, null, 'cena');
  return r instanceof Response ? r : json(r);
}

// ---------- Foto de la estantería: qué vinos del catálogo aparecen y cuál coger ----------
async function estanteria(env, b) {
  const imagen = validarImagen(b.imagen);
  if (!imagen || !env.ANTHROPIC_API_KEY) {
    const r = await recomendarCore(env, b, null, 'estanteria');
    if (r instanceof Response) return r;
    r.leido_por_ia = false;
    return json(r);
  }

  const catalogo = (await env.DB.prepare(
    'SELECT id, nombre, bodega, denominacion, tipo FROM vinos WHERE activo = 1 ORDER BY nombre'
  ).all()).results;

  const prompt =
`Eres el lector de etiquetas de Vinotake. En la foto hay una estantería de vinos de un supermercado español.

Este es nuestro catálogo (id | nombre | bodega | denominación | tipo):
${catalogo.map(v => [v.id, v.nombre, v.bodega, v.denominacion, v.tipo].join(' | ')).join('\n')}

Tarea:
1. Di qué vinos del catálogo se ven en la foto. Solo los que reconozcas con seguridad por su etiqueta o nombre; no adivines.
2. Apunta los nombres de otros vinos que se lean claramente pero no estén en el catálogo (máximo 15).

Responde SOLO con este JSON, sin texto alrededor:
{"visibles": ["id", ...], "otros": ["nombre leído", ...]}`;

  let leido = null;
  try { leido = await leerConIA(env, imagen, prompt, 1200); } catch (e) { console.error('IA estanteria', e); }

  const ids = new Set(catalogo.map(v => v.id));
  const visibles = leido && Array.isArray(leido.visibles) ? leido.visibles.filter(id => ids.has(id)) : [];
  const otros = leido && Array.isArray(leido.otros) ? leido.otros.map(o => limpiar(o, 120)).filter(Boolean).slice(0, 15) : [];
  const superId = await superValido(env, b.super_id);
  if (otros.length) {
    await env.DB.batch(otros.map(n => env.DB.prepare(
      `INSERT INTO vinos_leidos (origen, nombre, super_id) VALUES ('estanteria', ?, ?)`
    ).bind(n, superId))).catch(e => console.error('vinos_leidos', e));
  }

  const r = await recomendarCore(env, b, visibles.length ? new Set(visibles) : null, 'estanteria');
  if (r instanceof Response) return r;
  r.leido_por_ia = !!leido;
  r.reconocidos = visibles.length;
  return json(r);
}

async function recomendarCore(env, b, visibles, tipoConsulta) {
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

  // Si la foto ha reconocido vinos que van con este plato, se elige entre esos.
  let lista = results;
  let enFoto = false;
  if (visibles) {
    const enEstanteria = results.filter(v => visibles.has(v.id));
    if (enEstanteria.length) { lista = enEstanteria; enFoto = true; }
  }

  // Dentro del presupuesto primero, respetando el orden de mejor a peor maridaje.
  // Fuera del presupuesto, los más cercanos al límite primero.
  const dentro = lista.filter(v => max === null || v.precio <= max);
  const fuera = lista.filter(v => !(max === null || v.precio <= max)).sort((a, b2) => a.precio - b2.precio);
  const orden = dentro.concat(fuera);
  const mejor = orden[0];
  const alternativas = orden.slice(1, 3);

  let ahorro = null;
  const masBarato = alternativas.filter(a => a.precio < mejor.precio).sort((a, b2) => a.precio - b2.precio)[0];
  if (masBarato) ahorro = { vino_id: masBarato.id, nombre: masBarato.nombre, euros: redondear(mejor.precio - masBarato.precio) };

  const consulta = await env.DB.prepare(
    `INSERT INTO consultas (tipo, plato_texto, plato_id, presupuesto, super_id, recomendado)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING id`
  ).bind(tipoConsulta, texto || null, plato.id, presupuesto, superId, mejor.id).first();

  return {
    consulta_id: consulta ? consulta.id : null,
    plato,
    presupuesto: { id: presupuesto, nombre: PRESUPUESTOS[presupuesto].nombre },
    super_id: superId,
    fuera_presupuesto: dentro.length === 0,
    en_foto: enFoto,
    mejor: { id: mejor.id, nombre: mejor.nombre, tipo: mejor.tipo, denominacion: mejor.denominacion, precio: mejor.precio, motivo: mejor.motivo },
    alternativas: alternativas.map(a => ({ id: a.id, nombre: a.nombre, precio: a.precio, nota: a.nota })),
    ahorro
  };
}

// ---------- Foto de una botella: qué vino es ----------
async function botella(env, b) {
  const superId = await superValido(env, b.super_id);
  const imagen = validarImagen(b.imagen);

  if (!imagen || !env.ANTHROPIC_API_KEY) {
    // Sin IA configurada: vino al azar del catálogo, marcado como ejemplo.
    const vino = await env.DB.prepare('SELECT id FROM vinos WHERE activo = 1 ORDER BY RANDOM() LIMIT 1').first();
    if (!vino) return json({ error: 'Todavía no hay vinos en la base de datos.' }, 503);
    await env.DB.prepare(`INSERT INTO consultas (tipo, super_id, recomendado) VALUES ('botella', ?, ?)`).bind(superId, vino.id).run();
    return json({ vino_id: vino.id, leido_por_ia: false });
  }

  const catalogo = (await env.DB.prepare(
    'SELECT id, nombre, bodega, denominacion, tipo FROM vinos WHERE activo = 1 ORDER BY nombre'
  ).all()).results;

  const prompt =
`Eres el lector de etiquetas de Vinotake. En la foto hay una botella de vino (o una etiqueta).

Este es nuestro catálogo (id | nombre | bodega | denominación | tipo):
${catalogo.map(v => [v.id, v.nombre, v.bodega, v.denominacion, v.tipo].join(' | ')).join('\n')}

Si la botella es uno de los vinos del catálogo, devuelve su id. Fíjate en la bodega y en el tipo (crianza, roble, reserva, verdejo...). Si no estás seguro o no está en el catálogo, devuelve "id": null y apunta lo que leas en la etiqueta.
Si en la foto no hay ningún vino, devuelve "es_vino": false.

Responde SOLO con este JSON, sin texto alrededor:
{"es_vino": true, "id": "id-del-catalogo o null", "nombre": "", "bodega": "", "denominacion": "", "tipo": "Tinto|Blanco|Rosado|Espumoso|Generoso|Otro", "uva": "", "anada": ""}`;

  let leido = null;
  try { leido = await leerConIA(env, imagen, prompt, 500); } catch (e) { console.error('IA botella', e); }
  if (!leido) return json({ error: 'No hemos podido leer la etiqueta. Prueba con otra foto, más cerca y con buena luz.' }, 502);
  if (leido.es_vino === false) return json({ error: 'No vemos ninguna botella de vino en la foto. Prueba otra vez, más cerca de la etiqueta.' }, 422);

  const ids = new Set(catalogo.map(v => v.id));
  if (leido.id && ids.has(leido.id)) {
    await env.DB.prepare(`INSERT INTO consultas (tipo, super_id, recomendado) VALUES ('botella', ?, ?)`).bind(superId, leido.id).run();
    return json({ vino_id: leido.id, leido_por_ia: true });
  }

  const fuera = {
    nombre: limpiar(leido.nombre, 120),
    bodega: limpiar(leido.bodega, 120),
    denominacion: limpiar(leido.denominacion, 120),
    tipo: limpiar(leido.tipo, 40),
    uva: limpiar(leido.uva, 80),
    anada: limpiar(leido.anada, 10)
  };
  await env.DB.prepare(
    `INSERT INTO vinos_leidos (origen, nombre, bodega, denominacion, tipo, super_id) VALUES ('botella', ?, ?, ?, ?, ?)`
  ).bind(fuera.nombre || null, fuera.bodega || null, fuera.denominacion || null, fuera.tipo || null, superId).run().catch(e => console.error('vinos_leidos', e));
  await env.DB.prepare(`INSERT INTO consultas (tipo, super_id, plato_texto) VALUES ('botella', ?, ?)`).bind(superId, fuera.nombre || null).run();

  // Parecidos del catálogo para no dejar a la persona sin respuesta.
  let parecidos = [];
  if (fuera.tipo) {
    parecidos = (await env.DB.prepare(
      `SELECT v.id, v.nombre, v.denominacion, COALESCE(p.precio, v.precio_ref) AS precio
         FROM vinos v LEFT JOIN precios p ON p.vino_id = v.id AND p.super_id = ?
        WHERE v.activo = 1 AND v.tipo = ?
        ORDER BY CASE WHEN v.denominacion = ? THEN 0 WHEN v.uva = ? THEN 1 ELSE 2 END, precio
        LIMIT 3`
    ).bind(superId, fuera.tipo, fuera.denominacion, fuera.uva).all()).results.map(r => auto(r, r.denominacion));
  }
  return json({ vino_id: null, leido_por_ia: true, fuera_catalogo: fuera, parecidos });
}

// ---------- IA: leer una imagen con Claude ----------
const MODELO_IA = 'claude-haiku-5-5';

async function leerConIA(env, imagen, prompt, maxTokens) {
  const res = await fetch(env.IA_URL || 'https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: MODELO_IA,
      max_tokens: maxTokens,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: imagen.tipo, data: imagen.datos } },
          { type: 'text', text: prompt }
        ]
      }]
    })
  });
  if (!res.ok) throw new Error('IA ' + res.status + ': ' + (await res.text()).slice(0, 300));
  const data = await res.json();
  const texto = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
  const ini = texto.indexOf('{');
  const fin = texto.lastIndexOf('}');
  if (ini === -1 || fin <= ini) throw new Error('IA sin JSON: ' + texto.slice(0, 200));
  return JSON.parse(texto.slice(ini, fin + 1));
}

function validarImagen(dataUrl) {
  if (typeof dataUrl !== 'string') return null;
  const m = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return null;
  if (m[2].length > 5_000_000) return null; // ~3,7 MB de imagen como máximo
  return { tipo: m[1], datos: m[2] };
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
  const sugerencias = { misma: grupo('misma'), parecidos: grupo('parecido'), descubrir: grupo('descubrir') };

  // Si no hay sugerencias puestas a mano, se calculan solas a partir del catálogo.
  const precioEste = aqui ? aqui.precio : v.precio_ref;
  const cols = `v.id, v.nombre, v.tipo, v.denominacion, v.elaboracion, v.uva, COALESCE(p.precio, v.precio_ref) AS precio`;
  const joinPrecio = `LEFT JOIN precios p ON p.vino_id = v.id AND p.super_id = ?`;
  if (!sugerencias.misma.length && v.bodega) {
    sugerencias.misma = (await env.DB.prepare(
      `SELECT ${cols} FROM vinos v ${joinPrecio} WHERE v.bodega = ? AND v.id != ? AND v.activo = 1 ORDER BY precio LIMIT 4`
    ).bind(superId, v.bodega, id).all()).results.map(r => auto(r, [r.tipo, r.elaboracion].filter(Boolean).join(' · ') || r.denominacion));
  }
  if (!sugerencias.parecidos.length && precioEste) {
    sugerencias.parecidos = (await env.DB.prepare(
      `SELECT ${cols} FROM vinos v ${joinPrecio}
        WHERE v.id != ? AND v.activo = 1 AND v.tipo = ? AND COALESCE(v.bodega, '') != COALESCE(?, '')
          AND (v.uva = ? OR v.denominacion = ?) AND COALESCE(p.precio, v.precio_ref) < ?
        ORDER BY precio DESC LIMIT 3`
    ).bind(superId, id, v.tipo, v.bodega, v.uva, v.denominacion, precioEste).all()).results.map(r => auto(r, r.denominacion));
  }
  if (!sugerencias.descubrir.length && precioEste) {
    const ya = new Set([id, ...sugerencias.misma.map(s => s.id), ...sugerencias.parecidos.map(s => s.id)]);
    const cand = (await env.DB.prepare(
      `SELECT ${cols} FROM vinos v ${joinPrecio}
        WHERE v.id != ? AND v.activo = 1 AND v.tipo = ? AND v.denominacion != ?
          AND COALESCE(p.precio, v.precio_ref) BETWEEN ? AND ?
        ORDER BY ABS(COALESCE(p.precio, v.precio_ref) - ?) LIMIT 8`
    ).bind(superId, id, v.tipo, v.denominacion || '', precioEste * 0.6, precioEste * 1.5, precioEste).all()).results;
    sugerencias.descubrir = cand.filter(r => !ya.has(r.id)).slice(0, 3).map(r => auto(r, [r.uva, r.denominacion].filter(Boolean).join(' · ')));
  }

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
    sugerencias
  }, 200, 60);
}

function auto(r, nota) {
  return { id: r.id, nombre: r.nombre, nota: nota || '', precio: r.precio, patrocinado: false };
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
