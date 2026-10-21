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

  if (method === 'POST' && path === '/api/cocinar') return cocinar(env, await body(request));
  if (method === 'GET' && path === '/api/buscar') return buscar(env, url.searchParams.get('q'), url.searchParams.get('super'));
  if (method === 'GET' && path === '/api/gustos') return gustosVer(env, url.searchParams.get('d'), url.searchParams.get('super'));
  if (method === 'POST' && path === '/api/gustos') return gustosGuardar(env, await body(request));
  if (method === 'GET' && path === '/api/bodega') return bodegaListar(env, url.searchParams.get('d'), url.searchParams.get('super'));
  if (method === 'POST' && path === '/api/bodega') return bodegaGuardar(env, await body(request));

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
    `SELECT v.id, v.nombre, v.tipo, v.denominacion, v.uva, v.estilo, v.dulce, m.orden, m.motivo, m.nota,
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
  // Con gustos guardados, se reordena según la persona (siempre entre vinos que van con el plato).
  const g = await cargarGustos(env, dispositivoValido(b.dispositivo));
  const tieneGustos = g.prefs.tipos.length || g.prefs.evitar.length || g.prefs.estilo || g.prefs.dulce !== null || g.perfil && g.perfil.puntuados;
  const enPresupuesto = v => max === null || v.precio <= max;
  const primero = l => l.find(enPresupuesto) || l.slice().sort((a, b2) => a.precio - b2.precio)[0];
  const original = primero(lista);
  if (tieneGustos) {
    lista = lista.map((v, i) => ({ v, k: i - 1.5 * afinidad(v, g) })).sort((a, b2) => a.k - b2.k).map(x => x.v);
  }

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
    personalizado: !!tieneGustos && !!original && mejor.id !== original.id,
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

  const platos = (await env.DB.prepare(
    `SELECT pl.id, pl.nombre, m.motivo, m.orden FROM maridajes m JOIN platos pl ON pl.id = m.plato_id
      WHERE m.vino_id = ? ORDER BY m.orden, pl.orden LIMIT 6`
  ).bind(id).all()).results.map(r => ({ id: r.id, nombre: r.nombre, motivo: r.motivo, ideal: r.orden <= 2 }));

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
    platos,
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

// ---------- Voy a cocinar: qué abrir de lo que tengo en casa ----------
async function cocinar(env, b) {
  const d = dispositivoValido(b.dispositivo);
  const comprar = await recomendarCore(env, b, null, 'cocinar');
  if (comprar instanceof Response) return comprar;

  let enCasa = [];
  if (d) {
    const g = await cargarGustos(env, d);
    const { results } = await env.DB.prepare(
      `SELECT v.id, v.nombre, v.tipo, v.denominacion, v.uva, v.estilo, v.dulce, v.color, m.orden, m.motivo, b.cantidad
         FROM bodega b
         JOIN vinos v ON v.id = b.vino_id
         JOIN maridajes m ON m.vino_id = v.id AND m.plato_id = ?
        WHERE b.dispositivo = ? AND b.cantidad > 0
        ORDER BY m.orden`
    ).bind(comprar.plato.id, d).all();
    enCasa = results
      .map((v, i) => ({ v, k: i - 1.5 * afinidad(v, g) }))
      .sort((a, b2) => a.k - b2.k)
      .map(x => ({ id: x.v.id, nombre: x.v.nombre, color: x.v.color || '#3A2226', cantidad: x.v.cantidad, motivo: x.v.motivo,
                   tipo: x.v.tipo, denominacion: x.v.denominacion }));
  }
  const totalCasa = d ? (await env.DB.prepare('SELECT COUNT(*) AS n FROM bodega WHERE dispositivo = ? AND cantidad > 0').bind(d).first()).n : 0;
  return json({ plato: comprar.plato, en_casa: enCasa, botellas_en_casa: totalCasa, comprar });
}

// ---------- Buscar un vino del catálogo por nombre o bodega ----------
async function buscar(env, q, superPedido) {
  const t = normalizar(limpiar(q, 60));
  if (t.length < 2) return json({ vinos: [] });
  const superId = await superValido(env, superPedido);
  const { results } = await env.DB.prepare(
    `SELECT v.id, v.nombre, v.bodega, v.tipo, v.denominacion, v.color, COALESCE(p.precio, v.precio_ref) AS precio
       FROM vinos v LEFT JOIN precios p ON p.vino_id = v.id AND p.super_id = ?
      WHERE v.activo = 1`
  ).bind(superId).all();
  const palabras = t.split(/\s+/).filter(Boolean);
  const vinos = results
    .map(v => ({ v, txt: normalizar([v.nombre, v.bodega, v.denominacion].join(' ')) }))
    .filter(x => palabras.every(w => x.txt.includes(w)))
    .sort((a, b) => (normalizar(a.v.nombre).startsWith(t) ? 0 : 1) - (normalizar(b.v.nombre).startsWith(t) ? 0 : 1) || a.v.nombre.localeCompare(b.v.nombre))
    .slice(0, 10)
    .map(x => ({ id: x.v.id, nombre: x.v.nombre, bodega: x.v.bodega, tipo: x.v.tipo, denominacion: x.v.denominacion, color: x.v.color || '#3A2226', precio: x.v.precio }));
  return json({ vinos });
}

// ---------- Mi bodega (por dispositivo, anónimo) ----------
function dispositivoValido(d) {
  return typeof d === 'string' && /^[a-f0-9-]{20,40}$/i.test(d) ? d.toLowerCase() : null;
}

async function bodegaListar(env, dispositivo, superPedido) {
  const d = dispositivoValido(dispositivo);
  if (!d) return json({ error: 'Falta el identificador del dispositivo.' }, 400);
  const superId = await superValido(env, superPedido);
  const { results } = await env.DB.prepare(
    `SELECT b.vino_id AS id, b.cantidad, b.deseo, b.puntuacion, b.nota, b.actualizado,
            v.nombre, v.tipo, v.denominacion, v.color, v.va_con,
            COALESCE(p.precio, v.precio_ref) AS precio
       FROM bodega b
       JOIN vinos v ON v.id = b.vino_id
       LEFT JOIN precios p ON p.vino_id = v.id AND p.super_id = ?
      WHERE b.dispositivo = ?
      ORDER BY b.actualizado DESC`
  ).bind(superId, d).all();
  return json({
    vinos: results.map(r => ({
      id: r.id, nombre: r.nombre, tipo: r.tipo, denominacion: r.denominacion, color: r.color || '#3A2226',
      precio: r.precio, cantidad: r.cantidad || 0, deseo: !!r.deseo, puntuacion: r.puntuacion, nota: r.nota || '',
      va_con: r.va_con ? r.va_con.split('|').slice(0, 3) : []
    }))
  });
}

async function bodegaGuardar(env, b) {
  const d = dispositivoValido(b.dispositivo);
  const vinoId = limpiar(b.vino_id, 80);
  if (!d || !vinoId) return json({ error: 'Faltan datos.' }, 400);
  const existe = await env.DB.prepare('SELECT id FROM vinos WHERE id = ?').bind(vinoId).first();
  if (!existe) return json({ error: 'Ese vino no está en el catálogo.' }, 404);

  const actual = await env.DB.prepare('SELECT cantidad, deseo, puntuacion, nota FROM bodega WHERE dispositivo = ? AND vino_id = ?')
    .bind(d, vinoId).first() || { cantidad: 0, deseo: 0, puntuacion: null, nota: '' };

  const nuevo = {
    cantidad: 'cantidad' in b ? Math.max(0, Math.min(99, parseInt(b.cantidad, 10) || 0)) : actual.cantidad,
    deseo: 'deseo' in b ? (b.deseo ? 1 : 0) : actual.deseo,
    puntuacion: 'puntuacion' in b ? (b.puntuacion === null ? null : Math.max(1, Math.min(5, parseInt(b.puntuacion, 10) || 1))) : actual.puntuacion,
    nota: 'nota' in b ? limpiar(b.nota, 500) : (actual.nota || '')
  };

  if (!nuevo.cantidad && !nuevo.deseo && nuevo.puntuacion === null && !nuevo.nota) {
    await env.DB.prepare('DELETE FROM bodega WHERE dispositivo = ? AND vino_id = ?').bind(d, vinoId).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO bodega (dispositivo, vino_id, cantidad, deseo, puntuacion, nota)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (dispositivo, vino_id) DO UPDATE SET
         cantidad = excluded.cantidad, deseo = excluded.deseo, puntuacion = excluded.puntuacion,
         nota = excluded.nota, actualizado = CURRENT_TIMESTAMP`
    ).bind(d, vinoId, nuevo.cantidad, nuevo.deseo, nuevo.puntuacion, nuevo.nota || null).run();
  }
  return json({ ok: true, vino_id: vinoId, cantidad: nuevo.cantidad, deseo: !!nuevo.deseo, puntuacion: nuevo.puntuacion, nota: nuevo.nota || '' });
}

// ---------- Mis gustos ----------
const TIPOS = ['Tinto', 'Blanco', 'Rosado', 'Espumoso', 'Generoso'];
const ESTILOS = ['suave', 'equilibrado', 'intenso'];

function lista(csv) {
  return String(csv || '').split(',').map(s => s.trim()).filter(s => TIPOS.includes(s));
}

// Preferencias declaradas + lo aprendido de las estrellas de Mi bodega.
async function cargarGustos(env, d) {
  const vacio = { prefs: { tipos: [], evitar: [], estilo: null, presupuesto: null, dulce: null }, puntuados: {}, perfil: null };
  if (!d) return vacio;
  const [g, rated] = await Promise.all([
    env.DB.prepare('SELECT tipos, evitar, estilo, presupuesto, dulce FROM gustos WHERE dispositivo = ?').bind(d).first().catch(() => null),
    env.DB.prepare(
      `SELECT b.vino_id, b.puntuacion, v.tipo, v.denominacion, v.uva, v.estilo, v.precio_ref
         FROM bodega b JOIN vinos v ON v.id = b.vino_id
        WHERE b.dispositivo = ? AND b.puntuacion IS NOT NULL`
    ).bind(d).all().then(r => r.results).catch(() => [])
  ]);
  const prefs = g ? {
    tipos: lista(g.tipos), evitar: lista(g.evitar),
    estilo: ESTILOS.includes(g.estilo) ? g.estilo : null,
    presupuesto: PRESUPUESTOS[g.presupuesto] ? g.presupuesto : null,
    dulce: g.dulce === null || g.dulce === undefined ? null : (g.dulce ? 1 : 0)
  } : vacio.prefs;

  const puntuados = {};
  rated.forEach(r => { puntuados[r.vino_id] = r.puntuacion; });

  const gustan = rated.filter(r => r.puntuacion >= 4);
  const top = (campo) => {
    const n = {};
    gustan.forEach(r => { if (r[campo]) n[r[campo]] = (n[r[campo]] || 0) + 1; });
    const orden = Object.entries(n).sort((a, b) => b[1] - a[1]);
    return orden.length ? orden[0][0] : null;
  };
  const perfil = {
    puntuados: rated.length,
    media: rated.length ? Math.round(rated.reduce((s, r) => s + r.puntuacion, 0) / rated.length * 10) / 10 : null,
    tipo: top('tipo'), denominacion: top('denominacion'), uva: top('uva'), estilo: top('estilo'),
    precio_medio: gustan.length ? redondear(gustan.reduce((s, r) => s + (r.precio_ref || 0), 0) / gustan.length) : null
  };
  return { prefs, puntuados, perfil };
}

// Cuánto encaja un vino con la persona (positivo = le pega, negativo = mejor evitar).
function afinidad(v, g) {
  if (!g) return 0;
  const p = g.prefs, pf = g.perfil || {};
  let s = 0;
  if (p.tipos.length && p.tipos.includes(v.tipo)) s += 1;
  if (p.evitar.includes(v.tipo)) s -= 3;
  if (p.estilo && v.estilo === p.estilo) s += 1;
  if (p.dulce === 0 && v.dulce) s -= 2;
  if (p.dulce === 1 && v.dulce) s += 1;
  const nota = g.puntuados[v.id];
  if (nota >= 4) s += 1.5;
  if (nota && nota <= 2) s -= 3;
  if (pf.tipo && v.tipo === pf.tipo) s += 0.5;
  if (pf.denominacion && v.denominacion === pf.denominacion) s += 0.5;
  if (pf.uva && v.uva === pf.uva) s += 0.5;
  if (pf.estilo && v.estilo === pf.estilo) s += 0.5;
  return s;
}

function porQue(v, g) {
  const p = g.prefs, pf = g.perfil || {};
  if (pf.denominacion && v.denominacion === pf.denominacion) return 'De ' + v.denominacion + ', tu zona favorita';
  if (p.estilo && v.estilo === p.estilo && (!p.tipos.length || p.tipos.includes(v.tipo)))
    return v.tipo + ' ' + ({ suave: 'suave', equilibrado: 'equilibrado', intenso: 'intenso' })[p.estilo] + ', como te gusta';
  if (pf.uva && v.uva === pf.uva) return 'De ' + v.uva + ', la uva que más te gusta';
  if (p.tipos.includes(v.tipo)) return 'Te gustan los ' + plural(v.tipo);
  return [v.tipo, v.denominacion].filter(Boolean).join(' · ');
}

function plural(tipo) {
  return ({ Tinto: 'tintos', Blanco: 'blancos', Rosado: 'rosados', Espumoso: 'espumosos', Generoso: 'generosos' })[tipo] || String(tipo || '').toLowerCase();
}

async function gustosVer(env, dispositivo, superPedido) {
  const d = dispositivoValido(dispositivo);
  if (!d) return json({ error: 'Falta el identificador del dispositivo.' }, 400);
  const superId = await superValido(env, superPedido);
  const g = await cargarGustos(env, d);

  const frases = [];
  const pf = g.perfil;
  if (pf.puntuados >= 2) {
    if (pf.tipo) frases.push('Te gustan sobre todo los ' + plural(pf.tipo) + (pf.estilo ? ' ' + ({ suave: 'suaves', equilibrado: 'equilibrados', intenso: 'intensos' })[pf.estilo] : '') + '.');
    if (pf.denominacion) frases.push('Tu zona favorita: ' + pf.denominacion + '.');
    if (pf.uva) frases.push('Tu uva: ' + pf.uva + '.');
    if (pf.precio_medio) frases.push('Los que más te gustan cuestan de media unos ' + String(pf.precio_medio).replace('.', ',') + ' €.');
  }

  const hayAlgo = g.prefs.tipos.length || g.prefs.estilo || g.prefs.evitar.length || g.prefs.dulce !== null || pf.puntuados > 0;
  let paraTi = [];
  if (hayAlgo) {
    const enBodega = new Set((await env.DB.prepare('SELECT vino_id FROM bodega WHERE dispositivo = ?').bind(d).all()).results.map(r => r.vino_id));
    const max = g.prefs.presupuesto ? PRESUPUESTOS[g.prefs.presupuesto].max : null;
    const todos = (await env.DB.prepare(
      `SELECT v.id, v.nombre, v.tipo, v.denominacion, v.uva, v.estilo, v.dulce, v.color, COALESCE(p.precio, v.precio_ref) AS precio
         FROM vinos v LEFT JOIN precios p ON p.vino_id = v.id AND p.super_id = ?
        WHERE v.activo = 1`
    ).bind(superId).all()).results;
    paraTi = todos
      .filter(v => !enBodega.has(v.id))
      .map(v => ({ v, s: afinidad(v, g) - (max !== null && v.precio > max ? 1 : 0) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s || a.v.precio - b.v.precio)
      .slice(0, 6)
      .map(x => ({ id: x.v.id, nombre: x.v.nombre, precio: x.v.precio, color: x.v.color || '#3A2226', motivo: porQue(x.v, g) }));
  }

  return json({ preferencias: g.prefs, perfil: Object.assign({}, pf, { frases }), para_ti: paraTi });
}

async function gustosGuardar(env, b) {
  const d = dispositivoValido(b.dispositivo);
  if (!d) return json({ error: 'Falta el identificador del dispositivo.' }, 400);
  const tipos = Array.isArray(b.tipos) ? b.tipos.filter(t => TIPOS.includes(t)) : [];
  const evitar = Array.isArray(b.evitar) ? b.evitar.filter(t => TIPOS.includes(t) && !tipos.includes(t)) : [];
  const estilo = ESTILOS.includes(b.estilo) ? b.estilo : null;
  const presupuesto = PRESUPUESTOS[b.presupuesto] ? b.presupuesto : null;
  const dulce = b.dulce === null || b.dulce === undefined ? null : (b.dulce ? 1 : 0);
  await env.DB.prepare(
    `INSERT INTO gustos (dispositivo, tipos, evitar, estilo, presupuesto, dulce) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (dispositivo) DO UPDATE SET tipos = excluded.tipos, evitar = excluded.evitar, estilo = excluded.estilo,
       presupuesto = excluded.presupuesto, dulce = excluded.dulce, actualizado = CURRENT_TIMESTAMP`
  ).bind(d, tipos.join(','), evitar.join(','), estilo, presupuesto, dulce).run();
  return json({ ok: true, preferencias: { tipos, evitar, estilo, presupuesto, dulce } });
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
