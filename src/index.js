import { rellenarFotos, sondearOFF } from './fotos.js';
import { aplicarMigraciones } from './migraciones.js';
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
    if (url.pathname === '/v' && request.method === 'GET') return vinoCompartido(request, env, url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      return await api(request, env, url);
    } catch (err) {
      console.error(err);
      return json({ error: 'Algo ha fallado. Inténtalo de nuevo.' }, 500);
    }
  },
  // Cada 15 minutos busca unas pocas fotos de vinos que aún no tienen (Open Food Facts).
  async scheduled(event, env, ctx) {
    ctx.waitUntil(aplicarMigraciones(env).then(r => r.length && console.log('migraciones', r.join(', '))).catch(e => console.error('migraciones', e)));
    ctx.waitUntil(rellenarFotos(env, 6).then(r => console.log('fotos', JSON.stringify(r))).catch(e => console.error('fotos', e)));
  }
};

// Enlace para compartir un vino: sirve la misma web, con título y descripción del vino para la vista previa (WhatsApp, redes).
async function vinoCompartido(request, env, url) {
  const res = await env.ASSETS.fetch(new Request(url.origin + '/', { headers: request.headers }));
  const id = (url.searchParams.get('i') || '').toLowerCase();
  if (!/^[a-z0-9-]+$/.test(id)) return res;
  const v = await env.DB.prepare('SELECT nombre, bodega, denominacion, tipo, sabor, imagen, precio_ref FROM vinos WHERE id = ? AND activo = 1').bind(id).first().catch(() => null);
  if (!v) return res;
  const titulo = v.nombre + ' · Vinotake';
  const desc = [[v.tipo, v.denominacion].filter(Boolean).join(' · '), v.precio_ref ? 'desde ' + String(v.precio_ref).replace('.', ',') + ' €' : '', v.sabor].filter(Boolean).join('. ').slice(0, 200);
  const poner = (c) => ({ element(e) { e.setAttribute('content', c); } });
  let rw = new HTMLRewriter()
    .on('title', { element(e) { e.setInnerContent(titulo); } })
    .on('meta[property="og:title"]', poner(titulo))
    .on('meta[property="og:description"]', poner(desc))
    .on('meta[name="description"]', poner(desc));
  if (v.imagen && /^https:\/\//.test(v.imagen)) {
    rw = rw.on('meta[property="og:type"]', { element(e) { e.after('<meta property="og:image" content="' + v.imagen.replace(/"/g, '&quot;') + '">', { html: true }); } });
  }
  const out = new Response(rw.transform(res).body, res);
  out.headers.set('cache-control', 'no-cache');
  return out;
}

async function api(request, env, url) {
  const path = url.pathname.replace(/\/+$/, '');
  const method = request.method;

  if (method === 'GET' && path === '/api/inicio') return inicio(env);
  if (method === 'POST' && path === '/api/recomendar') return recomendar(env, await body(request));
  if (method === 'POST' && (path === '/api/botella' || path === '/api/estanteria')) {
    const b = await body(request);
    const lim = await limiteIA(env, request, b);
    if (lim) return lim;
    return path === '/api/botella' ? botella(env, b) : estanteria(env, b);
  }

  let m = path.match(/^\/api\/vino\/([a-z0-9-]+)$/);
  if (method === 'GET' && m) return ficha(env, m[1], url.searchParams.get('super'));

  if (method === 'GET' && path === '/api/top') return mejorValorados(env, url.searchParams.get('super'));
  if (method === 'POST' && path === '/api/cocinar') return cocinar(env, await body(request));
  if (method === 'GET' && path === '/api/buscar') return buscar(env, url.searchParams.get('q'), url.searchParams.get('super'));
  if (method === 'GET' && path === '/api/perfil') return perfilVer(env, url.searchParams.get('d'));
  if (method === 'POST' && path === '/api/perfil') return perfilGuardar(env, await body(request));
  if (method === 'POST' && path === '/api/perfil/borrar') return perfilBorrar(env, await body(request));
  if (method === 'GET' && path === '/api/gustos') return gustosVer(env, url.searchParams.get('d'), url.searchParams.get('super'));
  if (method === 'POST' && path === '/api/gustos') return gustosGuardar(env, await body(request));
  if (method === 'GET' && path === '/api/bodega') return bodegaListar(env, url.searchParams.get('d'), url.searchParams.get('super'));
  if (method === 'POST' && path === '/api/bodega') return bodegaGuardar(env, await body(request));
  if (method === 'GET' && path === '/api/fotos/estado') {
    const r = await env.DB.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN imagen IS NOT NULL AND imagen != '' THEN 1 ELSE 0 END) AS con_foto FROM vinos WHERE activo = 1").first();
    const act = (await env.DB.prepare("SELECT clave, COUNT(*) AS n FROM cuenta_intentos WHERE clave LIKE 'fotos:%' AND creado > datetime('now', '-1 day') GROUP BY clave").all().catch(() => ({ results: [] }))).results;
    return json({ total: r.total, con_foto: r.con_foto || 0, ultimas_24h: Object.fromEntries(act.map(a => [a.clave, a.n])) });
  }
  if (method === 'GET' && path === '/api/fotos/probar') {
    if (await intentosAltos(env, { ['sonda:' + ipDe(request)]: 10 })) return demasiados();
    await anotarIntento(env, ['sonda:' + ipDe(request)]);
    const q = String(url.searchParams.get('q') || '').slice(0, 80);
    if (!q) return json({ error: 'Falta ?q=nombre del vino' }, 400);
    return json(await sondearOFF(q).catch(e => ({ error: String(e.message) })));
  }
  if (method === 'GET' && path === '/api/comparar') return comparar(env, url.searchParams.get('a'), url.searchParams.get('b'), url.searchParams.get('super'));
  if (method === 'GET' && path === '/api/lista') return listaVer(env, url.searchParams.get('d'), url.searchParams.get('super'));
  if (method === 'POST' && path === '/api/lista') return listaGuardar(env, await body(request));
  if (method === 'POST' && path === '/api/lista/vaciar') return listaVaciar(env, await body(request));
  if (method === 'POST' && path === '/api/lista/a-bodega') return listaABodega(env, await body(request));

  if (path.startsWith('/api/cuenta')) {
    if (method === 'GET' && path === '/api/cuenta') return cuentaYo(request, env);
    if (method === 'POST' && path === '/api/cuenta/registro') return cuentaRegistro(request, env, await body(request));
    if (method === 'POST' && path === '/api/cuenta/entrar') return cuentaEntrar(request, env, await body(request));
    if (method === 'POST' && path === '/api/cuenta/recuperar') return cuentaRecuperar(request, env, await body(request));
    if (method === 'POST' && path === '/api/cuenta/salir') return cuentaSalir(request, env);
    if (method === 'POST' && path === '/api/cuenta/clave') return cuentaClave(request, env, await body(request));
  }
  if (method === 'GET' && path === '/api/cata') return cataVer(env, url.searchParams.get('d'));
  if (method === 'POST' && path === '/api/cata/responder') return cataResponder(env, await body(request));
  if (method === 'GET' && path === '/api/takers') return takersInicio(env, url.searchParams.get('d'), url.searchParams.get('super'));
  if (method === 'POST' && path === '/api/takers/opinion') return opinionGuardar(env, await body(request));
  if (method === 'POST' && path === '/api/takers/brindis') return alternar(env, await body(request),
    { tabla: 'resenas', votos: 'brindis', col: 'resena_id', campo: 'resena_id', propio: 'No puedes brindar por tu propia opinión.' });
  if (method === 'POST' && path === '/api/takers/pregunta') return preguntaGuardar(env, await body(request));
  if (method === 'POST' && path === '/api/takers/respuesta') return respuestaGuardar(env, await body(request));
  if (method === 'POST' && path === '/api/takers/util') return alternar(env, await body(request),
    { tabla: 'respuestas', votos: 'utiles', col: 'respuesta_id', campo: 'respuesta_id', propio: 'No puedes marcar como útil tu propia respuesta.' });
  if (method === 'POST' && path === '/api/takers/propuesta') return propuestaGuardar(env, await body(request));
  if (method === 'POST' && path === '/api/takers/voto') return votoReto(env, await body(request));
  if (method === 'POST' && path === '/api/takers/denunciar') return denunciar(env, await body(request));
  if (method === 'POST' && path === '/api/takers/borrar') return borrarPropio(env, await body(request));
  m = path.match(/^\/api\/takers\/opiniones\/([a-z0-9-]+)$/);
  if (method === 'GET' && m) return opinionesVino(env, m[1], url.searchParams.get('d'));
  m = path.match(/^\/api\/takers\/pregunta\/(\d+)$/);
  if (method === 'GET' && m) return preguntaVer(env, Number(m[1]), url.searchParams.get('d'), url.searchParams.get('super'));

  m = path.match(/^\/api\/consulta\/(\d+)\/elegido$/);
  if (method === 'POST' && m) return elegido(env, Number(m[1]), await body(request));

  return json({ error: 'No encontrado' }, 404);
}

// ---------- Inicio: supermercados, platos y presupuestos ----------
async function inicio(env) {
  const [supers, platos] = await Promise.all([
    env.DB.prepare('SELECT id, nombre FROM supermercados ORDER BY orden, nombre').all(),
    env.DB.prepare("SELECT id, nombre, COALESCE(tipo, 'plato') AS tipo FROM platos ORDER BY orden, nombre").all()
      .catch(() => env.DB.prepare('SELECT id, nombre FROM platos ORDER BY orden, nombre').all())
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
  // Si no reconoce lo que ha escrito, mejor vinos para compartir que suponer un plato.
  if (!plato) plato = await env.DB.prepare("SELECT id, nombre FROM platos WHERE id = 'compartir'").first().catch(() => null);
  if (!plato) plato = await env.DB.prepare('SELECT id, nombre FROM platos ORDER BY orden LIMIT 1').first();
  if (!plato) return json({ error: 'Todavía no hay platos en la base de datos.' }, 503);
  const tipoPlato = await env.DB.prepare("SELECT COALESCE(tipo, 'plato') AS tipo FROM platos WHERE id = ?").bind(plato.id).first().catch(() => null);
  plato.tipo = tipoPlato ? tipoPlato.tipo : 'plato';

  const { results } = await env.DB.prepare(
    `SELECT v.id, v.nombre, v.tipo, v.denominacion, v.uva, v.estilo, v.dulce, v.color, m.orden, m.motivo, m.nota,
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
  // "Más de 10 €": primero los de 10 € o más (los baratos solo si no hay otros).
  const minimo = presupuesto === 'mas10' ? 10 : 0;
  if (minimo) lista = lista.filter(v => v.precio >= minimo).concat(lista.filter(v => v.precio < minimo).sort((a, b2) => b2.precio - a.precio));
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
    mejor: { id: mejor.id, nombre: mejor.nombre, tipo: mejor.tipo, denominacion: mejor.denominacion, color: mejor.color, precio: mejor.precio, motivo: mejor.motivo },
    alternativas: alternativas.map(a => ({ id: a.id, nombre: a.nombre, tipo: a.tipo, color: a.color, precio: a.precio, nota: a.nota })),
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
      `SELECT v.id, v.nombre, v.tipo, v.color, v.denominacion, COALESCE(p.precio, v.precio_ref) AS precio
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
    `SELECT r.tipo, r.nota, r.patrocinado, v.id, v.nombre, v.tipo AS vtipo, v.color,
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

  const grupo = tipo => rel.filter(r => r.tipo === tipo).map(r => ({ id: r.id, nombre: r.nombre, nota: r.nota, precio: r.precio, patrocinado: !!r.patrocinado, tipo: r.vtipo, color: r.color }));
  const sugerencias = { misma: grupo('misma'), parecidos: grupo('parecido'), descubrir: grupo('descubrir') };

  // Si no hay sugerencias puestas a mano, se calculan solas a partir del catálogo.
  const precioEste = aqui ? aqui.precio : v.precio_ref;
  const cols = `v.id, v.nombre, v.tipo, v.denominacion, v.elaboracion, v.uva, v.color, COALESCE(p.precio, v.precio_ref) AS precio`;
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

  const valo = await env.DB.prepare('SELECT AVG(puntuacion) AS media, COUNT(*) AS n FROM resenas WHERE vino_id = ? AND oculto = 0').bind(id).first().catch(() => null);
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
    imagen: v.imagen || null,
    tipo: v.tipo,
    elaboracion: v.elaboracion,
    estilo: v.estilo || null,
    dulce: !!v.dulce,
    media: valo && valo.media ? Math.round(valo.media * 10) / 10 : null,
    votos: valo ? valo.n : 0,
    ejemplo: !!v.ejemplo,
    precio: aqui ? { super: aqui.super, precio: aqui.precio } : (v.precio_ref ? { super: null, precio: v.precio_ref } : null),
    mas_barato: masBarato ? { super: masBarato.super, precio: masBarato.precio } : null,
    sugerencias
  }, 200, 60);
}

function auto(r, nota) {
  return { id: r.id, nombre: r.nombre, nota: nota || '', precio: r.precio, patrocinado: false, tipo: r.tipo || null, color: r.color || null };
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

// ---------- Lo mejor valorado por los Takers ----------
async function mejorValorados(env, superPedido) {
  const superId = await superValido(env, superPedido);
  const conImagen = async (sql, ...args) => {
    try { return (await env.DB.prepare(sql.replace('{IMG}', 'v.imagen')).bind(...args).all()).results; }
    catch { return (await env.DB.prepare(sql.replace('{IMG}', 'NULL')).bind(...args).all()).results; }
  };
  const cols = `v.id, v.nombre, v.tipo, v.denominacion, v.elaboracion, v.color, {IMG} AS imagen, COALESCE(p.precio, v.precio_ref) AS precio`;

  // Media "suavizada": con pocos votos se acerca a 3,5 para que un solo 5 no gane siempre.
  const votados = await conImagen(
    `SELECT ${cols}, AVG(b.puntuacion) AS media, COUNT(*) AS votos,
            (SUM(b.puntuacion) + 2 * 3.5) / (COUNT(*) + 2) AS score
       FROM bodega b JOIN vinos v ON v.id = b.vino_id AND v.activo = 1
       LEFT JOIN precios p ON p.vino_id = v.id AND p.super_id = ?
      WHERE b.puntuacion IS NOT NULL
      GROUP BY v.id
      ORDER BY score DESC, votos DESC
      LIMIT 10`, superId);

  const MIN_VINOS = 4;
  if (votados.length >= MIN_VINOS) {
    return json({ comunidad: true, vinos: votados.map(v => ({
      id: v.id, nombre: v.nombre, tipo: v.tipo, denominacion: v.denominacion, elaboracion: v.elaboracion, color: v.color,
      imagen: v.imagen, precio: v.precio, media: Math.round(v.media * 10) / 10, votos: v.votos
    })) }, 200, 60);
  }

  // Pocas valoraciones todavía: selección Vinotake (los que más veces son la mejor opción para un plato).
  const seleccion = await conImagen(
    `SELECT ${cols}, SUM(CASE WHEN m.orden <= 2 THEN 1 ELSE 0 END) AS destacados
       FROM vinos v JOIN maridajes m ON m.vino_id = v.id
       LEFT JOIN precios p ON p.vino_id = v.id AND p.super_id = ?
      WHERE v.activo = 1
      GROUP BY v.id
      ORDER BY destacados DESC, precio
      LIMIT 8`, superId);
  return json({ comunidad: false, vinos: seleccion.map(v => ({
    id: v.id, nombre: v.nombre, tipo: v.tipo, denominacion: v.denominacion, elaboracion: v.elaboracion, color: v.color,
    imagen: v.imagen, precio: v.precio, media: null, votos: 0
  })) }, 200, 60);
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

// ---------- Vino VS: comparar dos vinos ----------
const RANGO_ESTILO = { suave: 1, equilibrado: 2, intenso: 3 };
function euros(n) { return Number(n).toFixed(2).replace('.', ',') + ' €'; }

async function comparar(env, a, b, superPedido) {
  const ids = [limpiar(a, 80), limpiar(b, 80)];
  if (!ids[0] || !ids[1]) return json({ error: 'Elige dos vinos para compararlos.' }, 400);
  if (ids[0] === ids[1]) return json({ error: 'Elige dos vinos distintos.' }, 400);
  const superId = await superValido(env, superPedido);
  const vinos = [];
  for (const id of ids) {
    const v = await env.DB.prepare(
      `SELECT v.id, v.nombre, v.bodega, v.denominacion, v.tipo, v.uva, v.elaboracion, v.grados, v.estilo, v.dulce,
              v.temperatura, v.apertura, v.va_con, v.color, COALESCE(p.precio, v.precio_ref) AS precio
         FROM vinos v LEFT JOIN precios p ON p.vino_id = v.id AND p.super_id = ?
        WHERE v.id = ? AND v.activo = 1`
    ).bind(superId, id).first();
    if (!v) return json({ error: 'No encontramos uno de los vinos.' }, 404);
    const r = await env.DB.prepare('SELECT AVG(puntuacion) AS media, COUNT(*) AS n FROM resenas WHERE vino_id = ? AND oculto = 0').bind(id).first().catch(() => null);
    const np = await env.DB.prepare('SELECT COUNT(*) AS n FROM maridajes WHERE vino_id = ?').bind(id).first().catch(() => null);
    vinos.push({
      n_platos: np ? np.n : 0,
      id: v.id, nombre: v.nombre, bodega: v.bodega, denominacion: v.denominacion, tipo: v.tipo, uva: v.uva,
      elaboracion: v.elaboracion, grados: v.grados, estilo: v.estilo, dulce: !!v.dulce, temperatura: v.temperatura,
      va_con: v.va_con ? v.va_con.split('|').map(x => x.trim()).filter(Boolean).slice(0, 4) : [],
      color: v.color || '#3A2226', precio: v.precio,
      media: r && r.media ? Math.round(r.media * 10) / 10 : null, votos: r ? r.n : 0
    });
  }
  const [x, y] = vinos;
  const frases = [];
  if (x.precio != null && y.precio != null) {
    const dif = Math.abs(x.precio - y.precio);
    if (dif < 0.5) frases.push('Cuestan prácticamente lo mismo.');
    else {
      const barato = x.precio < y.precio ? x : y, caro = barato === x ? y : x;
      frases.push(barato.nombre + ' es ' + euros(dif) + ' más barato (un ' + Math.round(dif / caro.precio * 100) + ' % menos).');
    }
  }
  if (x.tipo && y.tipo && x.tipo !== y.tipo) {
    frases.push('Uno es ' + x.tipo.toLowerCase() + ' y el otro ' + y.tipo.toLowerCase() + ': se piden con comidas distintas.');
  } else if (RANGO_ESTILO[x.estilo] && RANGO_ESTILO[y.estilo] && x.estilo !== y.estilo) {
    const suave = RANGO_ESTILO[x.estilo] < RANGO_ESTILO[y.estilo] ? x : y, fuerte = suave === x ? y : x;
    frases.push(suave.nombre + ' es más suave y fácil de beber; ' + fuerte.nombre + ' tiene más cuerpo e intensidad.');
  } else if (x.estilo && x.estilo === y.estilo) {
    frases.push('Los dos son de estilo ' + x.estilo + '.');
  }
  if (x.dulce !== y.dulce) frases.push((x.dulce ? x : y).nombre + ' es dulce; ' + (x.dulce ? y : x).nombre + ' es seco.');
  if (x.media != null && y.media != null && x.media !== y.media) {
    const top = x.media > y.media ? x : y;
    frases.push('Los Takers puntúan mejor a ' + top.nombre + ' (' + String(top.media).replace('.', ',') + ' de 5).');
  }
  // Para quién es cada uno
  const elige = [];
  const motivo = (v, o) => {
    if (v.precio != null && o.precio != null && v.precio + 0.5 <= o.precio) return 'buscas ahorrar';
    if (RANGO_ESTILO[v.estilo] > (RANGO_ESTILO[o.estilo] || 0) && v.tipo === o.tipo) return 'quieres más cuerpo';
    if (RANGO_ESTILO[v.estilo] < (RANGO_ESTILO[o.estilo] || 9) && v.tipo === o.tipo) return 'prefieres algo suave';
    if (v.media != null && (o.media == null || v.media > o.media)) return 'te fías de los Takers';
    if (v.precio != null && o.precio != null && v.precio >= o.precio + 0.5) return 'te apetece darte un capricho';
    return null;
  };
  const mx = motivo(x, y), my = motivo(y, x);
  if (mx) elige.push({ id: x.id, texto: 'Elige ' + x.nombre + ' si ' + mx + '.' });
  if (my && my !== mx) elige.push({ id: y.id, texto: 'Elige ' + y.nombre + ' si ' + my + '.' });
  // El combate: cuatro asaltos y un ganador.
  const asaltos = [];
  let pa = 0, pb = 0;
  const asalto = (nombre, ganador, detalle) => {
    asaltos.push({ nombre, ganador: ganador ? ganador.id : null, detalle });
    if (ganador === x) pa++; else if (ganador === y) pb++;
  };
  if (x.precio != null && y.precio != null) {
    const g = Math.abs(x.precio - y.precio) < 0.5 ? null : (x.precio < y.precio ? x : y);
    asalto('Precio', g, euros(x.precio) + ' contra ' + euros(y.precio));
  }
  if (x.media != null && y.media != null) {
    asalto('Los Takers', x.media === y.media ? null : (x.media > y.media ? x : y), String(x.media).replace('.', ',') + ' contra ' + String(y.media).replace('.', ',') + ' estrellas');
  }
  asalto('Versatilidad', Math.abs(x.n_platos - y.n_platos) < 1 ? null : (x.n_platos > y.n_platos ? x : y), x.n_platos + ' contra ' + y.n_platos + ' platos con los que va bien');
  if (RANGO_ESTILO[x.estilo] && RANGO_ESTILO[y.estilo]) {
    asalto('Carácter', x.estilo === y.estilo ? null : (RANGO_ESTILO[x.estilo] > RANGO_ESTILO[y.estilo] ? x : y), 'estilo ' + x.estilo + ' contra ' + y.estilo);
  }
  if (pa === pb && x.precio != null && y.precio != null && Math.abs(x.precio - y.precio) >= 0.5) {
    asalto('Desempate · La cartera', x.precio < y.precio ? x : y, 'a igualdad de puntos, gana el que menos cuesta');
  }
  const ganadorC = pa === pb ? null : (pa > pb ? x : y);
  const dif = Math.abs(pa - pb), total = pa + pb;
  let frase;
  if (!ganadorC) frase = 'Tablas: los dos salen de pie y con la copa llena.';
  else if (dif === total) frase = 'Victoria por KO: ' + ganadorC.nombre + ' no ha dejado ni una gota.';
  else if (dif >= 2) frase = 'Victoria clara por puntos para ' + ganadorC.nombre + '.';
  else frase = 'Victoria ajustadísima de ' + ganadorC.nombre + ': se ha decidido en la última copa.';
  return json({ vinos, veredicto: frases, elige, super: superId,
    combate: { asaltos, ganador: ganadorC ? ganadorC.id : null, puntos: [pa, pb], frase } });
}

// ---------- Lista de la compra (por dispositivo) ----------
async function listaVer(env, dispositivo, superPedido) {
  const d = dispositivoValido(dispositivo);
  if (!d) return json({ error: 'Falta el identificador del dispositivo.' }, 400);
  const superId = await superValido(env, superPedido);
  const { results } = await env.DB.prepare(
    `SELECT l.vino_id AS id, l.cantidad, l.comprado, v.nombre, v.tipo, v.denominacion, v.color,
            COALESCE(p.precio, v.precio_ref) AS precio
       FROM lista l
       JOIN vinos v ON v.id = l.vino_id AND v.activo = 1
       LEFT JOIN precios p ON p.vino_id = v.id AND p.super_id = ?
      WHERE l.dispositivo = ?
      ORDER BY l.comprado, l.creado DESC`
  ).bind(superId, d).all();
  return json({ vinos: results.map(r => ({
    id: r.id, nombre: r.nombre, tipo: r.tipo, denominacion: r.denominacion, color: r.color || '#3A2226',
    precio: r.precio, cantidad: r.cantidad || 1, comprado: !!r.comprado
  })) });
}

async function listaGuardar(env, b) {
  const d = dispositivoValido(b.dispositivo);
  const vinoId = limpiar(b.vino_id, 80);
  if (!d || !vinoId) return json({ error: 'Faltan datos.' }, 400);
  if (b.quitar) {
    await env.DB.prepare('DELETE FROM lista WHERE dispositivo = ? AND vino_id = ?').bind(d, vinoId).run();
    return json({ ok: true, vino_id: vinoId, en_lista: false });
  }
  const existe = await env.DB.prepare('SELECT id FROM vinos WHERE id = ? AND activo = 1').bind(vinoId).first();
  if (!existe) return json({ error: 'Ese vino no está en el catálogo.' }, 404);
  const actual = await env.DB.prepare('SELECT cantidad, comprado FROM lista WHERE dispositivo = ? AND vino_id = ?').bind(d, vinoId).first();
  if (!actual && (await env.DB.prepare('SELECT COUNT(*) AS n FROM lista WHERE dispositivo = ?').bind(d).first()).n >= 60)
    return json({ error: 'Tu lista ya tiene 60 vinos. Quita alguno para añadir más.' }, 400);
  const cantidad = 'cantidad' in b ? Math.max(1, Math.min(24, parseInt(b.cantidad, 10) || 1)) : (actual ? actual.cantidad : 1);
  const comprado = 'comprado' in b ? (b.comprado ? 1 : 0) : (actual ? actual.comprado : 0);
  await env.DB.prepare(
    `INSERT INTO lista (dispositivo, vino_id, cantidad, comprado) VALUES (?, ?, ?, ?)
     ON CONFLICT (dispositivo, vino_id) DO UPDATE SET cantidad = excluded.cantidad, comprado = excluded.comprado`
  ).bind(d, vinoId, cantidad, comprado).run();
  return json({ ok: true, vino_id: vinoId, en_lista: true, cantidad, comprado: !!comprado });
}

// solo: 'comprados' (por defecto) o 'todo'
async function listaVaciar(env, b) {
  const d = dispositivoValido(b.dispositivo);
  if (!d) return json({ error: 'Falta el identificador del dispositivo.' }, 400);
  if (b.solo === 'todo') await env.DB.prepare('DELETE FROM lista WHERE dispositivo = ?').bind(d).run();
  else await env.DB.prepare('DELETE FROM lista WHERE dispositivo = ? AND comprado = 1').bind(d).run();
  return json({ ok: true });
}

// Pasa lo comprado a "Mi bodega" (suma las botellas) y lo quita de la lista.
async function listaABodega(env, b) {
  const d = dispositivoValido(b.dispositivo);
  if (!d) return json({ error: 'Falta el identificador del dispositivo.' }, 400);
  const { results } = await env.DB.prepare('SELECT vino_id, cantidad FROM lista WHERE dispositivo = ? AND comprado = 1').bind(d).all();
  if (!results.length) return json({ ok: true, movidos: 0 });
  await env.DB.batch(results.flatMap(r => [
    env.DB.prepare(
      `INSERT INTO bodega (dispositivo, vino_id, cantidad) VALUES (?, ?, ?)
       ON CONFLICT (dispositivo, vino_id) DO UPDATE SET cantidad = MIN(99, cantidad + excluded.cantidad),
         deseo = 0, actualizado = CURRENT_TIMESTAMP`
    ).bind(d, r.vino_id, r.cantidad),
    env.DB.prepare('DELETE FROM lista WHERE dispositivo = ? AND vino_id = ?').bind(d, r.vino_id)
  ]));
  return json({ ok: true, movidos: results.length });
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
      .map(x => ({ id: x.v.id, nombre: x.v.nombre, tipo: x.v.tipo, precio: x.v.precio, color: x.v.color || '#3A2226', motivo: porQue(x.v, g) }));
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

// ---------- Perfil ----------
async function perfilVer(env, dispositivo) {
  const d = dispositivoValido(dispositivo);
  if (!d) return json({ error: 'Falta el identificador del dispositivo.' }, 400);
  const p = await env.DB.prepare('SELECT nombre, super_id FROM perfiles WHERE dispositivo = ?').bind(d).first().catch(() => null);
  const s = await env.DB.prepare(
    `SELECT COALESCE(SUM(cantidad), 0) AS botellas,
            COALESCE(SUM(CASE WHEN cantidad > 0 THEN 1 ELSE 0 END), 0) AS vinos_casa,
            COALESCE(SUM(CASE WHEN deseo = 1 THEN 1 ELSE 0 END), 0) AS deseo,
            COALESCE(SUM(CASE WHEN puntuacion IS NOT NULL THEN 1 ELSE 0 END), 0) AS probados,
            AVG(puntuacion) AS media
       FROM bodega WHERE dispositivo = ?`
  ).bind(d).first().catch(() => null) || {};
  return json({
    nombre: p ? p.nombre || '' : '',
    super_id: p ? p.super_id || null : null,
    stats: {
      botellas: s.botellas || 0, vinos_casa: s.vinos_casa || 0, deseo: s.deseo || 0, probados: s.probados || 0,
      media: s.media ? Math.round(s.media * 10) / 10 : null
    }
  });
}

async function perfilGuardar(env, b) {
  const d = dispositivoValido(b.dispositivo);
  if (!d) return json({ error: 'Falta el identificador del dispositivo.' }, 400);
  const actual = await env.DB.prepare('SELECT nombre, super_id FROM perfiles WHERE dispositivo = ?').bind(d).first() || {};
  const nombre = 'nombre' in b ? limpiar(b.nombre, 40) : (actual.nombre || '');
  let superId = actual.super_id || null;
  if ('super_id' in b) {
    const s = b.super_id ? await env.DB.prepare('SELECT id FROM supermercados WHERE id = ?').bind(String(b.super_id)).first() : null;
    superId = s ? s.id : null;
  }
  if (nombre) {
    const prob = textoProblema(nombre);
    if (prob) return json({ error: prob }, 400);
    const otro = await env.DB.prepare('SELECT 1 AS x FROM perfiles WHERE lower(nombre) = lower(?) AND dispositivo != ?').bind(nombre, d).first();
    if (otro) return json({ error: 'Ese nombre ya lo usa otro Taker. Prueba con otro.' }, 409);
  }
  await env.DB.prepare(
    `INSERT INTO perfiles (dispositivo, nombre, super_id) VALUES (?, ?, ?)
     ON CONFLICT (dispositivo) DO UPDATE SET nombre = excluded.nombre, super_id = excluded.super_id, actualizado = CURRENT_TIMESTAMP`
  ).bind(d, nombre || null, superId).run();
  return json({ ok: true, nombre, super_id: superId });
}

// Borra todo lo guardado de este dispositivo (bodega, gustos y perfil).
async function perfilBorrar(env, b) {
  const d = dispositivoValido(b.dispositivo);
  if (!d) return json({ error: 'Falta el identificador del dispositivo.' }, 400);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM bodega WHERE dispositivo = ?').bind(d),
    env.DB.prepare('DELETE FROM lista WHERE dispositivo = ?').bind(d),
    env.DB.prepare('DELETE FROM gustos WHERE dispositivo = ?').bind(d),
    env.DB.prepare('DELETE FROM perfiles WHERE dispositivo = ?').bind(d)
  ]);
  // Lo publicado en Takers también se borra (si las tablas ya existen).
  await env.DB.batch([
    'DELETE FROM brindis WHERE dispositivo = ?1 OR resena_id IN (SELECT id FROM resenas WHERE dispositivo = ?1)',
    'DELETE FROM utiles WHERE dispositivo = ?1 OR respuesta_id IN (SELECT id FROM respuestas WHERE dispositivo = ?1)',
    'DELETE FROM reto_votos WHERE dispositivo = ?1 OR propuesta_id IN (SELECT id FROM reto_propuestas WHERE dispositivo = ?1)',
    'DELETE FROM respuestas WHERE dispositivo = ?1 OR pregunta_id IN (SELECT id FROM preguntas WHERE dispositivo = ?1)',
    'DELETE FROM resenas WHERE dispositivo = ?1',
    'DELETE FROM preguntas WHERE dispositivo = ?1',
    'DELETE FROM reto_propuestas WHERE dispositivo = ?1',
    'DELETE FROM denuncias WHERE dispositivo = ?1'
  ].map(sql => env.DB.prepare(sql).bind(d))).catch(e => console.error('borrar takers', e));
  await env.DB.prepare('DELETE FROM cata_respuestas WHERE dispositivo = ?').bind(d).run().catch(() => {});
  // Si el móvil tenía cuenta, también se borra.
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sesiones WHERE cuenta_id IN (SELECT id FROM cuentas WHERE dispositivo = ?)').bind(d),
    env.DB.prepare('DELETE FROM cuentas WHERE dispositivo = ?').bind(d)
  ]).catch(() => {});
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

// ---------- Takers: la comunidad ----------
// Sin cuentas todavía: cada Taker es un dispositivo con nombre (tabla perfiles).
const PUNTOS = { opinion: 10, respuesta: 5, propuesta: 5, brindis: 2, util: 3, voto: 3 };
const NIVELES = [
  { min: 0, nombre: 'Aprendiz' },
  { min: 50, nombre: 'Catador' },
  { min: 150, nombre: 'Sumiller' },
  { min: 400, nombre: 'Gran Taker' }
];
const TABLAS_TAKERS = { opinion: 'resenas', pregunta: 'preguntas', respuesta: 'respuestas', propuesta: 'reto_propuestas' };
const PROHIBIDAS = ['gilipollas', 'imbecil', 'subnormal', 'hijo de puta', 'hijoputa', 'puta', 'maricon', 'zorra', 'mongolo', 'retrasado', 'cabron', 'nazi'];
const LIMITE_DIA = 30;

function nivelDe(p) {
  let i = 0;
  while (i + 1 < NIVELES.length && p >= NIVELES[i + 1].min) i++;
  const sig = NIVELES[i + 1] || null;
  return {
    nivel: NIVELES[i].nombre, puntos: p,
    siguiente: sig ? { nombre: sig.nombre, faltan: sig.min - p, desde: NIVELES[i].min, hasta: sig.min } : null
  };
}

function textoProblema(t) {
  if (/(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|es|net|org|io|ly|me)\b)/i.test(t)) return 'Por ahora no se pueden poner enlaces.';
  if (/[a-z0-9._-]+@[a-z0-9-]+\.[a-z]/i.test(t)) return 'No pongas emails ni datos personales.';
  if (/(\d[\s.-]?){9,}/.test(t)) return 'No pongas teléfonos ni datos personales.';
  const n = normalizar(t);
  if (PROHIBIDAS.some(w => new RegExp('(^|[^a-z])' + w + '([^a-z]|$)').test(n))) return 'Vamos a mantener esto agradable: revisa el texto.';
  return null;
}

function iniciales(nombre) {
  const ws = String(nombre || '').trim().split(/\s+/).filter(Boolean);
  return ((ws[0] || '?')[0] + (ws[1] ? ws[1][0] : '')).toUpperCase();
}

// Quién publica: necesita nombre y no pasarse del límite diario.
async function autorTaker(env, b) {
  const d = dispositivoValido(b.dispositivo);
  if (!d) return { error: json({ error: 'Falta el identificador del dispositivo.' }, 400) };
  const p = await env.DB.prepare('SELECT nombre FROM perfiles WHERE dispositivo = ?').bind(d).first();
  if (!p || !p.nombre) return { error: json({ error: 'Ponte un nombre de Taker para participar.', necesita_nombre: true }, 400) };
  return { d, nombre: p.nombre };
}
async function limiteDiario(env, d) {
  const r = await env.DB.prepare(
    `SELECT (SELECT COUNT(*) FROM resenas WHERE dispositivo = ?1 AND creado > datetime('now', '-1 day'))
          + (SELECT COUNT(*) FROM preguntas WHERE dispositivo = ?1 AND creado > datetime('now', '-1 day'))
          + (SELECT COUNT(*) FROM respuestas WHERE dispositivo = ?1 AND creado > datetime('now', '-1 day'))
          + (SELECT COUNT(*) FROM reto_propuestas WHERE dispositivo = ?1 AND creado > datetime('now', '-1 day')) AS n`
  ).bind(d).first();
  return r && r.n >= LIMITE_DIA ? json({ error: 'Has publicado mucho hoy. Vuelve mañana.' }, 429) : null;
}

// D1 admite pocas partes en un UNION, así que van en dos consultas que se suman.
const SQL_PUNTOS = [`
  SELECT dispositivo, SUM(p) AS puntos FROM (
    SELECT dispositivo, ${PUNTOS.opinion} AS p FROM resenas WHERE oculto = 0 AND creado >= ?1
    UNION ALL SELECT dispositivo, ${PUNTOS.respuesta} FROM respuestas WHERE oculto = 0 AND creado >= ?1
    UNION ALL SELECT dispositivo, ${PUNTOS.propuesta} FROM reto_propuestas WHERE oculto = 0 AND creado >= ?1
  ) GROUP BY dispositivo`, `
  SELECT dispositivo, SUM(p) AS puntos FROM (
    SELECT r.dispositivo, ${PUNTOS.brindis} AS p FROM brindis b JOIN resenas r ON r.id = b.resena_id
     WHERE r.oculto = 0 AND b.dispositivo != r.dispositivo AND b.creado >= ?1
    UNION ALL SELECT r.dispositivo, ${PUNTOS.util} FROM utiles u JOIN respuestas r ON r.id = u.respuesta_id
     WHERE r.oculto = 0 AND u.dispositivo != r.dispositivo AND u.creado >= ?1
    UNION ALL SELECT p.dispositivo, ${PUNTOS.voto} FROM reto_votos v JOIN reto_propuestas p ON p.id = v.propuesta_id
     WHERE p.oculto = 0 AND v.dispositivo != p.dispositivo AND v.creado >= ?1
  ) GROUP BY dispositivo`];

async function mapaPuntos(env, desde) {
  const res = await env.DB.batch(SQL_PUNTOS.map(sql => env.DB.prepare(sql).bind(desde || '1970-01-01')));
  const m = new Map();
  res.forEach(r => r.results.forEach(x => m.set(x.dispositivo, (m.get(x.dispositivo) || 0) + x.puntos)));
  return m;
}

function autorPublico(nombre, disp, puntos) {
  const p = puntos.get(disp) || 0;
  return { nombre: nombre || 'Taker', iniciales: iniciales(nombre || 'Taker'), nivel: nivelDe(p).nivel };
}

async function retoActual(env) {
  return await env.DB.prepare(`SELECT * FROM retos WHERE date('now') BETWEEN inicio AND fin ORDER BY inicio DESC LIMIT 1`).first()
    || await env.DB.prepare(`SELECT * FROM retos WHERE inicio <= date('now') ORDER BY inicio DESC LIMIT 1`).first()
    || await env.DB.prepare(`SELECT * FROM retos ORDER BY inicio LIMIT 1`).first();
}

async function propuestasDe(env, retoId, superId, d, puntos) {
  const { results } = await env.DB.prepare(
    `SELECT p.id, p.dispositivo, p.texto, p.creado, v.id AS vino_id, v.nombre, v.tipo, v.color, v.denominacion,
            COALESCE(pr.precio, v.precio_ref) AS precio, pf.nombre AS autor,
            (SELECT COUNT(*) FROM reto_votos rv WHERE rv.propuesta_id = p.id) AS votos
       FROM reto_propuestas p
       JOIN vinos v ON v.id = p.vino_id
       LEFT JOIN precios pr ON pr.vino_id = v.id AND pr.super_id = ?
       LEFT JOIN perfiles pf ON pf.dispositivo = p.dispositivo
      WHERE p.reto_id = ? AND p.oculto = 0
      ORDER BY votos DESC, p.creado
      LIMIT 30`
  ).bind(superId, retoId).all();
  return results.map(r => ({
    id: r.id, texto: r.texto || '', creado: r.creado, votos: r.votos, mia: r.dispositivo === d,
    autor: autorPublico(r.autor, r.dispositivo, puntos),
    vino: { id: r.vino_id, nombre: r.nombre, tipo: r.tipo, color: r.color, denominacion: r.denominacion, precio: r.precio }
  }));
}

async function takersInicio(env, dispositivo, superPedido) {
  const d = dispositivoValido(dispositivo);
  const superId = await superValido(env, superPedido);
  const mesDesde = (await env.DB.prepare(`SELECT date('now', 'start of month') AS f`).first()).f;
  const [puntos, puntosMes, perfil] = await Promise.all([
    mapaPuntos(env), mapaPuntos(env, mesDesde),
    d ? env.DB.prepare('SELECT nombre FROM perfiles WHERE dispositivo = ?').bind(d).first() : null
  ]);

  // Tú
  let yo = null;
  if (d) {
    const s = await env.DB.prepare(
      `SELECT (SELECT COUNT(*) FROM resenas WHERE dispositivo = ?1 AND oculto = 0) AS opiniones,
              (SELECT COUNT(*) FROM respuestas WHERE dispositivo = ?1 AND oculto = 0) AS respuestas,
              (SELECT COUNT(*) FROM reto_propuestas WHERE dispositivo = ?1 AND oculto = 0) AS propuestas,
              (SELECT COUNT(*) FROM brindis b JOIN resenas r ON r.id = b.resena_id WHERE r.dispositivo = ?1 AND b.dispositivo != ?1) AS brindis`
    ).bind(d).first();
    const p = puntos.get(d) || 0;
    yo = Object.assign({ nombre: perfil && perfil.nombre || '', iniciales: iniciales(perfil && perfil.nombre || '?'), puntos_mes: puntosMes.get(d) || 0, stats: s }, nivelDe(p));
  }

  // Reto de la semana y ganador del anterior
  const reto = await retoActual(env);
  let retoOut = null;
  if (reto) {
    const propuestas = await propuestasDe(env, reto.id, superId, d, puntos);
    const voto = d ? await env.DB.prepare('SELECT propuesta_id FROM reto_votos WHERE reto_id = ? AND dispositivo = ?').bind(reto.id, d).first() : null;
    const dias = await env.DB.prepare(`SELECT CAST(julianday(?) - julianday(date('now')) AS INTEGER) AS n`).bind(reto.fin).first();
    retoOut = {
      id: reto.id, titulo: reto.titulo, descripcion: reto.descripcion, tipo: reto.tipo, precio_max: reto.precio_max,
      abierto: !!dias && dias.n >= 0, dias_restantes: dias ? Math.max(0, dias.n) : 0,
      propuestas, mi_voto: voto ? voto.propuesta_id : null,
      participantes: propuestas.length + propuestas.reduce((a, p) => a + p.votos, 0)
    };
  }
  const anterior = await env.DB.prepare(`SELECT * FROM retos WHERE fin < date('now') ORDER BY fin DESC LIMIT 1`).first();
  let ganador = null;
  if (anterior) {
    const g = (await propuestasDe(env, anterior.id, superId, d, puntos))[0];
    if (g && g.votos > 0) ganador = { reto: anterior.titulo, vino: g.vino, autor: g.autor, votos: g.votos };
  }

  // Opiniones recientes
  const ops = (await env.DB.prepare(
    `SELECT r.id, r.dispositivo, r.puntuacion, r.texto, r.creado, v.id AS vino_id, v.nombre, v.tipo, v.color, v.denominacion,
            pf.nombre AS autor,
            (SELECT COUNT(*) FROM brindis b WHERE b.resena_id = r.id) AS brindis,
            EXISTS (SELECT 1 FROM brindis b WHERE b.resena_id = r.id AND b.dispositivo = ?) AS brindado
       FROM resenas r JOIN vinos v ON v.id = r.vino_id
       LEFT JOIN perfiles pf ON pf.dispositivo = r.dispositivo
      WHERE r.oculto = 0
      ORDER BY r.creado DESC LIMIT 30`
  ).bind(d || '').all()).results.map(r => opinionPublica(r, d, puntos));

  // Preguntas recientes (con las botellas que les han recomendado)
  const preg = (await env.DB.prepare(
    `SELECT q.id, q.dispositivo, q.texto, q.creado, pf.nombre AS autor,
            (SELECT COUNT(*) FROM respuestas a WHERE a.pregunta_id = q.id AND a.oculto = 0) AS respuestas
       FROM preguntas q LEFT JOIN perfiles pf ON pf.dispositivo = q.dispositivo
      WHERE q.oculto = 0
      ORDER BY q.creado DESC LIMIT 30`
  ).all()).results;
  let vinosPreg = [];
  if (preg.length) {
    vinosPreg = (await env.DB.prepare(
      `SELECT a.pregunta_id, v.id, v.nombre, v.tipo, v.color FROM respuestas a JOIN vinos v ON v.id = a.vino_id
        WHERE a.oculto = 0 AND a.pregunta_id IN (${preg.map(() => '?').join(',')}) ORDER BY a.creado`
    ).bind(...preg.map(q => q.id)).all()).results;
  }
  const preguntas = preg.map(q => ({
    id: q.id, texto: q.texto, creado: q.creado, respuestas: q.respuestas, mia: q.dispositivo === d,
    autor: autorPublico(q.autor, q.dispositivo, puntos),
    vinos: vinosPreg.filter(v => v.pregunta_id === q.id).slice(0, 3).map(v => ({ id: v.id, nombre: v.nombre, tipo: v.tipo, color: v.color }))
  }));

  // Ranking del mes
  const nombres = new Map();
  const ids = [...puntosMes.keys()];
  if (ids.length) {
    for (let i = 0; i < ids.length; i += 90) {
      const trozo = ids.slice(i, i + 90);
      (await env.DB.prepare(`SELECT dispositivo, nombre FROM perfiles WHERE nombre IS NOT NULL AND dispositivo IN (${trozo.map(() => '?').join(',')})`)
        .bind(...trozo).all()).results.forEach(r => nombres.set(r.dispositivo, r.nombre));
    }
  }
  const orden = ids.filter(k => nombres.has(k)).sort((a, b2) => puntosMes.get(b2) - puntosMes.get(a));
  const ranking = orden.slice(0, 10).map((k, i) => ({
    posicion: i + 1, nombre: nombres.get(k), iniciales: iniciales(nombres.get(k)), puntos: puntosMes.get(k),
    nivel: nivelDe(puntos.get(k) || 0).nivel, yo: k === d
  }));
  if (yo) yo.posicion_mes = orden.indexOf(d) > -1 ? orden.indexOf(d) + 1 : null;

  return json({ yo, reto: retoOut, ganador_anterior: ganador, opiniones: ops, preguntas, ranking, puntos: PUNTOS, niveles: NIVELES });
}

function opinionPublica(r, d, puntos) {
  return {
    id: r.id, puntuacion: r.puntuacion, texto: r.texto || '', creado: r.creado, brindis: r.brindis || 0, brindado: !!r.brindado,
    mia: r.dispositivo === d, autor: autorPublico(r.autor, r.dispositivo, puntos),
    vino: { id: r.vino_id, nombre: r.nombre, tipo: r.tipo, color: r.color, denominacion: r.denominacion }
  };
}

async function opinionesVino(env, vinoId, dispositivo) {
  const d = dispositivoValido(dispositivo);
  const puntos = await mapaPuntos(env);
  const res = (await env.DB.prepare(
    `SELECT r.id, r.dispositivo, r.puntuacion, r.texto, r.creado, v.id AS vino_id, v.nombre, v.tipo, v.color, v.denominacion,
            pf.nombre AS autor,
            (SELECT COUNT(*) FROM brindis b WHERE b.resena_id = r.id) AS brindis,
            EXISTS (SELECT 1 FROM brindis b WHERE b.resena_id = r.id AND b.dispositivo = ?) AS brindado
       FROM resenas r JOIN vinos v ON v.id = r.vino_id
       LEFT JOIN perfiles pf ON pf.dispositivo = r.dispositivo
      WHERE r.vino_id = ? AND r.oculto = 0
      ORDER BY brindis DESC, r.creado DESC LIMIT 20`
  ).bind(d || '', vinoId).all()).results.map(r => opinionPublica(r, d, puntos));
  const m = await env.DB.prepare('SELECT AVG(puntuacion) AS media, COUNT(*) AS n FROM resenas WHERE vino_id = ? AND oculto = 0').bind(vinoId).first();
  const mia = d ? await env.DB.prepare('SELECT puntuacion, texto FROM resenas WHERE vino_id = ? AND dispositivo = ?').bind(vinoId, d).first() : null;
  return json({ media: m && m.media ? Math.round(m.media * 10) / 10 : null, total: m ? m.n : 0, opiniones: res, mia: mia || null });
}

async function opinionGuardar(env, b) {
  const a = await autorTaker(env, b); if (a.error) return a.error;
  const vinoId = limpiar(b.vino_id, 80);
  const punt = parseInt(b.puntuacion, 10);
  const texto = limpiar(b.texto, 280);
  if (!(punt >= 1 && punt <= 5)) return json({ error: 'Elige de 1 a 5 estrellas.' }, 400);
  const v = await env.DB.prepare('SELECT id FROM vinos WHERE id = ? AND activo = 1').bind(vinoId).first();
  if (!v) return json({ error: 'Ese vino no está en el catálogo.' }, 404);
  const prob = texto && textoProblema(texto); if (prob) return json({ error: prob }, 400);
  const lim = await limiteDiario(env, a.d); if (lim) return lim;
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO resenas (dispositivo, vino_id, puntuacion, texto) VALUES (?, ?, ?, ?)
       ON CONFLICT (dispositivo, vino_id) DO UPDATE SET puntuacion = excluded.puntuacion, texto = excluded.texto`
    ).bind(a.d, vinoId, punt, texto || null),
    // También cuenta como probado en Mi bodega (y para el ranking de vinos).
    env.DB.prepare(
      `INSERT INTO bodega (dispositivo, vino_id, puntuacion, nota) VALUES (?, ?, ?, ?)
       ON CONFLICT (dispositivo, vino_id) DO UPDATE SET puntuacion = excluded.puntuacion,
         nota = COALESCE(NULLIF(bodega.nota, ''), excluded.nota), actualizado = CURRENT_TIMESTAMP`
    ).bind(a.d, vinoId, punt, texto || null)
  ]);
  return json({ ok: true, puntos: PUNTOS.opinion });
}

async function alternar(env, b, cfg) {
  const d = dispositivoValido(b.dispositivo);
  const id = parseInt(b[cfg.campo], 10);
  if (!d || !id) return json({ error: 'Faltan datos.' }, 400);
  const item = await env.DB.prepare(`SELECT dispositivo FROM ${cfg.tabla} WHERE id = ? AND oculto = 0`).bind(id).first();
  if (!item) return json({ error: 'Ya no está disponible.' }, 404);
  if (item.dispositivo === d) return json({ error: cfg.propio }, 400);
  const ya = await env.DB.prepare(`SELECT 1 AS x FROM ${cfg.votos} WHERE ${cfg.col} = ? AND dispositivo = ?`).bind(id, d).first();
  if (ya) await env.DB.prepare(`DELETE FROM ${cfg.votos} WHERE ${cfg.col} = ? AND dispositivo = ?`).bind(id, d).run();
  else await env.DB.prepare(`INSERT INTO ${cfg.votos} (${cfg.col}, dispositivo) VALUES (?, ?)`).bind(id, d).run();
  const n = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${cfg.votos} WHERE ${cfg.col} = ?`).bind(id).first();
  return json({ ok: true, activo: !ya, total: n.n });
}

async function preguntaGuardar(env, b) {
  const a = await autorTaker(env, b); if (a.error) return a.error;
  const texto = limpiar(b.texto, 200);
  if (texto.length < 10) return json({ error: 'Cuéntalo un poco más (mínimo 10 letras).' }, 400);
  const prob = textoProblema(texto); if (prob) return json({ error: prob }, 400);
  const lim = await limiteDiario(env, a.d); if (lim) return lim;
  const r = await env.DB.prepare('INSERT INTO preguntas (dispositivo, texto) VALUES (?, ?) RETURNING id').bind(a.d, texto).first();
  return json({ ok: true, id: r.id });
}

async function preguntaVer(env, id, dispositivo, superPedido) {
  const d = dispositivoValido(dispositivo);
  const superId = await superValido(env, superPedido);
  const puntos = await mapaPuntos(env);
  const q = await env.DB.prepare(
    `SELECT q.id, q.dispositivo, q.texto, q.creado, pf.nombre AS autor FROM preguntas q
       LEFT JOIN perfiles pf ON pf.dispositivo = q.dispositivo WHERE q.id = ? AND q.oculto = 0`
  ).bind(id).first();
  if (!q) return json({ error: 'Esta pregunta ya no está disponible.' }, 404);
  const resp = (await env.DB.prepare(
    `SELECT a.id, a.dispositivo, a.texto, a.creado, v.id AS vino_id, v.nombre, v.tipo, v.color, v.denominacion,
            COALESCE(pr.precio, v.precio_ref) AS precio, pf.nombre AS autor,
            (SELECT COUNT(*) FROM utiles u WHERE u.respuesta_id = a.id) AS utiles,
            EXISTS (SELECT 1 FROM utiles u WHERE u.respuesta_id = a.id AND u.dispositivo = ?) AS util_mio
       FROM respuestas a JOIN vinos v ON v.id = a.vino_id
       LEFT JOIN precios pr ON pr.vino_id = v.id AND pr.super_id = ?
       LEFT JOIN perfiles pf ON pf.dispositivo = a.dispositivo
      WHERE a.pregunta_id = ? AND a.oculto = 0
      ORDER BY utiles DESC, a.creado`
  ).bind(d || '', superId, id).all()).results.map(r => ({
    id: r.id, texto: r.texto || '', creado: r.creado, utiles: r.utiles, util_mio: !!r.util_mio, mia: r.dispositivo === d,
    autor: autorPublico(r.autor, r.dispositivo, puntos),
    vino: { id: r.vino_id, nombre: r.nombre, tipo: r.tipo, color: r.color, denominacion: r.denominacion, precio: r.precio }
  }));
  return json({
    id: q.id, texto: q.texto, creado: q.creado, mia: q.dispositivo === d,
    autor: autorPublico(q.autor, q.dispositivo, puntos), respuestas: resp
  });
}

async function respuestaGuardar(env, b) {
  const a = await autorTaker(env, b); if (a.error) return a.error;
  const pid = parseInt(b.pregunta_id, 10);
  const vinoId = limpiar(b.vino_id, 80);
  const texto = limpiar(b.texto, 200);
  const q = await env.DB.prepare('SELECT dispositivo FROM preguntas WHERE id = ? AND oculto = 0').bind(pid).first();
  if (!q) return json({ error: 'Esta pregunta ya no está disponible.' }, 404);
  const v = await env.DB.prepare('SELECT id FROM vinos WHERE id = ? AND activo = 1').bind(vinoId).first();
  if (!v) return json({ error: 'Elige un vino del catálogo.' }, 400);
  const rep = await env.DB.prepare('SELECT 1 AS x FROM respuestas WHERE pregunta_id = ? AND dispositivo = ? AND vino_id = ?').bind(pid, a.d, vinoId).first();
  if (rep) return json({ error: 'Ya has recomendado este vino aquí.' }, 400);
  const prob = texto && textoProblema(texto); if (prob) return json({ error: prob }, 400);
  const lim = await limiteDiario(env, a.d); if (lim) return lim;
  await env.DB.prepare('INSERT INTO respuestas (pregunta_id, dispositivo, vino_id, texto) VALUES (?, ?, ?, ?)').bind(pid, a.d, vinoId, texto || null).run();
  return json({ ok: true, puntos: PUNTOS.respuesta });
}

async function propuestaGuardar(env, b) {
  const a = await autorTaker(env, b); if (a.error) return a.error;
  const reto = await retoActual(env);
  if (!reto || reto.id !== String(b.reto_id)) return json({ error: 'Este reto ya ha terminado.' }, 400);
  const abierto = await env.DB.prepare(`SELECT date('now') <= ? AS ok`).bind(reto.fin).first();
  if (!abierto || !abierto.ok) return json({ error: 'Este reto ya ha terminado.' }, 400);
  const vinoId = limpiar(b.vino_id, 80);
  const texto = limpiar(b.texto, 160);
  const v = await env.DB.prepare(
    `SELECT v.id, v.tipo, MIN(COALESCE(p.precio, v.precio_ref)) AS precio FROM vinos v
       LEFT JOIN precios p ON p.vino_id = v.id WHERE v.id = ? AND v.activo = 1 GROUP BY v.id`
  ).bind(vinoId).first();
  if (!v) return json({ error: 'Elige un vino del catálogo.' }, 400);
  if (reto.tipo && v.tipo !== reto.tipo) return json({ error: 'Este reto es solo de ' + plural(reto.tipo) + '.' }, 400);
  if (reto.precio_max && v.precio > reto.precio_max) return json({ error: 'Este reto es para vinos de hasta ' + String(reto.precio_max).replace('.', ',') + ' €.' }, 400);
  const otro = await env.DB.prepare(
    `SELECT p.id, pf.nombre FROM reto_propuestas p LEFT JOIN perfiles pf ON pf.dispositivo = p.dispositivo
      WHERE p.reto_id = ? AND p.vino_id = ? AND p.dispositivo != ? AND p.oculto = 0`
  ).bind(reto.id, vinoId, a.d).first();
  if (otro) return json({ error: 'Ese vino ya lo ha propuesto ' + (otro.nombre || 'otro Taker') + ': ¡vótalo!', propuesta_id: otro.id }, 409);
  const prob = texto && textoProblema(texto); if (prob) return json({ error: prob }, 400);
  const lim = await limiteDiario(env, a.d); if (lim) return lim;
  const antes = await env.DB.prepare('SELECT id, vino_id FROM reto_propuestas WHERE reto_id = ? AND dispositivo = ?').bind(reto.id, a.d).first();
  if (antes && antes.vino_id !== vinoId) await env.DB.prepare('DELETE FROM reto_votos WHERE propuesta_id = ?').bind(antes.id).run();
  await env.DB.prepare(
    `INSERT INTO reto_propuestas (reto_id, dispositivo, vino_id, texto) VALUES (?, ?, ?, ?)
     ON CONFLICT (reto_id, dispositivo) DO UPDATE SET vino_id = excluded.vino_id, texto = excluded.texto`
  ).bind(reto.id, a.d, vinoId, texto || null).run();
  return json({ ok: true, puntos: PUNTOS.propuesta });
}

async function votoReto(env, b) {
  const d = dispositivoValido(b.dispositivo);
  const pid = parseInt(b.propuesta_id, 10);
  if (!d || !pid) return json({ error: 'Faltan datos.' }, 400);
  const p = await env.DB.prepare('SELECT reto_id, dispositivo FROM reto_propuestas WHERE id = ? AND oculto = 0').bind(pid).first();
  if (!p) return json({ error: 'Ya no está disponible.' }, 404);
  const reto = await retoActual(env);
  const abierto = reto && reto.id === p.reto_id && (await env.DB.prepare(`SELECT date('now') <= ? AS ok`).bind(reto.fin).first()).ok;
  if (!abierto) return json({ error: 'Este reto ya ha terminado.' }, 400);
  if (p.dispositivo === d) return json({ error: 'No puedes votar tu propia propuesta.' }, 400);
  const ya = await env.DB.prepare('SELECT propuesta_id FROM reto_votos WHERE reto_id = ? AND dispositivo = ?').bind(p.reto_id, d).first();
  if (ya && ya.propuesta_id === pid) {
    await env.DB.prepare('DELETE FROM reto_votos WHERE reto_id = ? AND dispositivo = ?').bind(p.reto_id, d).run();
    return json({ ok: true, mi_voto: null });
  }
  await env.DB.prepare(
    `INSERT INTO reto_votos (reto_id, dispositivo, propuesta_id) VALUES (?, ?, ?)
     ON CONFLICT (reto_id, dispositivo) DO UPDATE SET propuesta_id = excluded.propuesta_id, creado = CURRENT_TIMESTAMP`
  ).bind(p.reto_id, d, pid).run();
  return json({ ok: true, mi_voto: pid });
}

async function denunciar(env, b) {
  const d = dispositivoValido(b.dispositivo);
  const tabla = TABLAS_TAKERS[b.tipo];
  const id = parseInt(b.id, 10);
  if (!d || !tabla || !id) return json({ error: 'Faltan datos.' }, 400);
  await env.DB.prepare('INSERT OR IGNORE INTO denuncias (tipo, item_id, dispositivo) VALUES (?, ?, ?)').bind(b.tipo, id, d).run();
  const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM denuncias WHERE tipo = ? AND item_id = ?').bind(b.tipo, id).first();
  if (n.n >= 3) await env.DB.prepare(`UPDATE ${tabla} SET oculto = 1 WHERE id = ?`).bind(id).run();
  return json({ ok: true });
}

async function borrarPropio(env, b) {
  const d = dispositivoValido(b.dispositivo);
  const tabla = TABLAS_TAKERS[b.tipo];
  const id = parseInt(b.id, 10);
  if (!d || !tabla || !id) return json({ error: 'Faltan datos.' }, 400);
  const r = await env.DB.prepare(`DELETE FROM ${tabla} WHERE id = ? AND dispositivo = ? RETURNING id`).bind(id, d).first();
  if (!r) return json({ error: 'No se ha podido borrar.' }, 404);
  const extra = {
    opinion: ['DELETE FROM brindis WHERE resena_id = ?'],
    respuesta: ['DELETE FROM utiles WHERE respuesta_id = ?'],
    propuesta: ['DELETE FROM reto_votos WHERE propuesta_id = ?'],
    pregunta: ['DELETE FROM utiles WHERE respuesta_id IN (SELECT id FROM respuestas WHERE pregunta_id = ?)', 'DELETE FROM respuestas WHERE pregunta_id = ?']
  }[b.tipo];
  await env.DB.batch(extra.map(sql => env.DB.prepare(sql).bind(id)));
  return json({ ok: true });
}

// ---------- La cata del día: 3 preguntas diarias y ranking semanal ----------
const CATA_PUNTOS = 10;      // por acierto
const CATA_PLENO = 5;        // extra por acertar las 3
const CATA_N = 3;

function fechaMadrid(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
function sumarDias(fecha, n) {
  const t = Date.UTC(+fecha.slice(0, 4), +fecha.slice(5, 7) - 1, +fecha.slice(8, 10)) + n * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}
function lunesDe(fecha) {
  const dia = new Date(fecha + 'T00:00:00Z').getUTCDay(); // 0 = domingo
  return sumarDias(fecha, -((dia + 6) % 7));
}

async function preguntasDelDia(env, fecha) {
  const ids = (await env.DB.prepare('SELECT id FROM cata_preguntas ORDER BY id').all()).results.map(r => r.id);
  if (!ids.length) return [];
  const dia = Math.floor(Date.parse(fecha + 'T00:00:00Z') / 86400000);
  const elegidos = [];
  for (let k = 0; k < CATA_N; k++) elegidos.push(ids[(dia * CATA_N + k) % ids.length]);
  const { results } = await env.DB.prepare(
    `SELECT id, texto, opciones, correcta, explicacion FROM cata_preguntas WHERE id IN (${elegidos.map(() => '?').join(',')})`
  ).bind(...elegidos).all();
  return elegidos.map(id => results.find(r => r.id === id)).filter(Boolean);
}

async function rankingCata(env, desde, hasta) {
  const { results } = await env.DB.prepare(
    `SELECT x.dispositivo, SUM(x.p) AS puntos, MIN(x.ultimo) AS primero, pf.nombre
       FROM (SELECT dispositivo, fecha, MAX(creado) AS ultimo,
                    SUM(acierto) * ${CATA_PUNTOS} + CASE WHEN SUM(acierto) = ${CATA_N} THEN ${CATA_PLENO} ELSE 0 END AS p
               FROM cata_respuestas WHERE fecha BETWEEN ? AND ? GROUP BY dispositivo, fecha) x
       LEFT JOIN perfiles pf ON pf.dispositivo = x.dispositivo
      GROUP BY x.dispositivo
      ORDER BY puntos DESC, primero ASC`
  ).bind(desde, hasta).all();
  return results;
}

async function cataVer(env, dispositivo) {
  const d = dispositivoValido(dispositivo);
  const hoy = fechaMadrid();
  const lunes = lunesDe(hoy);
  const preguntas = await preguntasDelDia(env, hoy);
  const mias = d ? (await env.DB.prepare('SELECT idx, opcion, acierto FROM cata_respuestas WHERE fecha = ? AND dispositivo = ? ORDER BY idx').bind(hoy, d).all()).results : [];

  const semana = await rankingCata(env, lunes, sumarDias(lunes, 6));
  const conNombre = semana.filter(r => r.nombre);
  const yoIdx = conNombre.findIndex(r => r.dispositivo === d);
  const yoFila = semana.find(r => r.dispositivo === d);
  const anterior = await rankingCata(env, sumarDias(lunes, -7), sumarDias(lunes, -1));
  const g = anterior.find(r => r.nombre);

  const aciertos = mias.reduce((a, r) => a + r.acierto, 0);
  return json({
    fecha: hoy,
    preguntas: preguntas.map((p, i) => {
      const r = mias.find(m => m.idx === i);
      return Object.assign({ idx: i, texto: p.texto, opciones: JSON.parse(p.opciones) },
        r ? { respondida: true, opcion: r.opcion, acierto: !!r.acierto, correcta: p.correcta, explicacion: p.explicacion } : { respondida: false });
    }),
    terminado: mias.length >= preguntas.length && preguntas.length > 0,
    hoy: { aciertos, puntos: aciertos * CATA_PUNTOS + (aciertos === CATA_N ? CATA_PLENO : 0) },
    semana: { puntos: yoFila ? yoFila.puntos : 0, posicion: yoIdx > -1 ? yoIdx + 1 : null, jugadores: conNombre.length },
    top: conNombre.slice(0, 5).map((r, i) => ({ posicion: i + 1, nombre: r.nombre, iniciales: iniciales(r.nombre), puntos: r.puntos, yo: r.dispositivo === d })),
    ganador_anterior: g ? { nombre: g.nombre, iniciales: iniciales(g.nombre), puntos: g.puntos } : null,
    reglas: { acierto: CATA_PUNTOS, pleno: CATA_PLENO }
  });
}

async function cataResponder(env, b) {
  const d = dispositivoValido(b.dispositivo);
  if (!d) return json({ error: 'Falta el identificador del dispositivo.' }, 400);
  const hoy = fechaMadrid();
  const preguntas = await preguntasDelDia(env, hoy);
  const idx = parseInt(b.idx, 10);
  const opcion = parseInt(b.opcion, 10);
  const p = preguntas[idx];
  if (!p) return json({ error: 'Esa pregunta no es de hoy. Recarga la página.' }, 400);
  const n = JSON.parse(p.opciones).length;
  if (!(opcion >= 0 && opcion < n)) return json({ error: 'Elige una respuesta.' }, 400);
  const hechas = (await env.DB.prepare('SELECT idx FROM cata_respuestas WHERE fecha = ? AND dispositivo = ?').bind(hoy, d).all()).results.map(r => r.idx);
  if (hechas.includes(idx)) return json({ error: 'Ya has respondido esta pregunta.' }, 409);
  if (idx !== hechas.length) return json({ error: 'Responde las preguntas en orden.' }, 400);
  const acierto = opcion === p.correcta ? 1 : 0;
  await env.DB.prepare('INSERT INTO cata_respuestas (fecha, dispositivo, idx, pregunta_id, opcion, acierto) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(hoy, d, idx, p.id, opcion, acierto).run();
  const total = (await env.DB.prepare('SELECT SUM(acierto) AS a, COUNT(*) AS n FROM cata_respuestas WHERE fecha = ? AND dispositivo = ?').bind(hoy, d).first());
  const terminado = total.n >= preguntas.length;
  return json({
    acierto: !!acierto, correcta: p.correcta, explicacion: p.explicacion, terminado,
    aciertos: total.a, puntos: total.a * CATA_PUNTOS + (terminado && total.a === CATA_N ? CATA_PLENO : 0)
  });
}

// ---------- Cuentas: email y contraseña ----------
// Los datos siguen colgando del código de dispositivo (tabla por tabla). La cuenta lo "ata" a un email:
// al entrar en otro móvil se recupera ese mismo código y, con él, la bodega, los puntos y las opiniones.
const SESION_DIAS = 90;
const PBKDF2_ITER = 100000; // máximo que admite Workers
const TABLAS_DISPOSITIVO = ['bodega', 'gustos', 'perfiles', 'resenas', 'brindis', 'preguntas', 'respuestas', 'utiles',
  'reto_propuestas', 'reto_votos', 'denuncias', 'cata_respuestas', 'lista'];
const enc = new TextEncoder();

function aB64(buf) { let s = ''; new Uint8Array(buf).forEach(b => { s += String.fromCharCode(b); }); return btoa(s); }
function deB64(s) { return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }
function aHex(buf) { return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join(''); }
async function sha256(txt) { return aHex(await crypto.subtle.digest('SHA-256', enc.encode(txt))); }
function aleatorio(n) { return crypto.getRandomValues(new Uint8Array(n)); }
async function hashClave(clave, salB64) {
  const k = await crypto.subtle.importKey('raw', enc.encode(clave), 'PBKDF2', false, ['deriveBits']);
  return aB64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: deB64(salB64), iterations: PBKDF2_ITER }, k, 256));
}
function iguales(a, b) {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
// 16 caracteres sin letras que se confundan (sin I, O, 0, 1): 80 bits.
function nuevoCodigoRecuperacion() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = ''; aleatorio(16).forEach((x, i) => { s += A[x % 32]; if (i % 4 === 3 && i < 15) s += '-'; });
  return s;
}
function normalizarCodigo(c) { return String(c || '').toUpperCase().replace(/[^A-Z2-9]/g, ''); }
function emailLimpio(e) {
  const t = String(e || '').trim().toLowerCase();
  return t.length <= 120 && /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(t) ? t : null;
}
function claveValida(c) { return typeof c === 'string' && c.length >= 8 && c.length <= 100; }
function ipDe(request) { return request.headers.get('cf-connecting-ip') || 'sin-ip'; }

// Tope de fotos leídas con IA para controlar el gasto: por dispositivo, por red y en total, cada día.
const TOPE_IA = { dispositivo: 8, ip: 20, total: 300 };
async function limiteIA(env, request, b) {
  if (!env.ANTHROPIC_API_KEY || !validarImagen(b && b.imagen)) return null;
  const disp = String((b && b.dispositivo) || '').slice(0, 64);
  const claves = ['ia:ip:' + ipDe(request)].concat(disp ? ['ia:d:' + disp] : []);
  const { results } = await env.DB.prepare(
    `SELECT clave, COUNT(*) AS n FROM cuenta_intentos
      WHERE (clave IN (${claves.map(() => '?').join(',')}) OR clave = 'ia:total') AND creado > datetime('now', '-1 day') GROUP BY clave`
  ).bind(...claves).all();
  const n = Object.fromEntries(results.map(r => [r.clave, r.n]));
  if ((n['ia:total'] || 0) >= TOPE_IA.total || (n[claves[0]] || 0) >= TOPE_IA.ip || (disp && (n['ia:d:' + disp] || 0) >= TOPE_IA.dispositivo)) {
    return json({ error: 'Has llegado al límite de fotos de hoy. Vuelve mañana o busca el vino a mano.' }, 429);
  }
  await anotarIntento(env, claves.concat(['ia:total']));
  return null;
}

async function intentosAltos(env, limites) {
  const claves = Object.keys(limites);
  const { results } = await env.DB.prepare(
    `SELECT clave, COUNT(*) AS n FROM cuenta_intentos
      WHERE clave IN (${claves.map(() => '?').join(',')}) AND creado > datetime('now', '-15 minutes') GROUP BY clave`
  ).bind(...claves).all();
  return results.some(r => r.n >= limites[r.clave]);
}
async function anotarIntento(env, claves) {
  await env.DB.batch(claves.map(c => env.DB.prepare('INSERT INTO cuenta_intentos (clave) VALUES (?)').bind(c)));
  if (Math.random() < 0.05) await env.DB.prepare(`DELETE FROM cuenta_intentos WHERE creado < datetime('now', '-1 day')`).run();
}
const demasiados = () => json({ error: 'Demasiados intentos. Espera unos minutos y vuelve a probar.' }, 429);

async function crearSesion(env, cuentaId) {
  const token = aHex(aleatorio(32));
  await env.DB.prepare(`INSERT INTO sesiones (token, cuenta_id, expira) VALUES (?, ?, datetime('now', ?))`)
    .bind(await sha256(token), cuentaId, `+${SESION_DIAS} days`).run();
  return token;
}
async function cuentaDeSesion(request, env) {
  const m = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('authorization') || '');
  if (!m) return null;
  const h = await sha256(m[1]);
  const c = await env.DB.prepare(
    `SELECT c.id, c.email, c.dispositivo, c.hash, c.sal, c.creado FROM sesiones s JOIN cuentas c ON c.id = s.cuenta_id
      WHERE s.token = ? AND s.expira > datetime('now')`
  ).bind(h).first();
  return c ? Object.assign(c, { _token: h }) : null;
}

// Pasa lo que había en un móvil anónimo a la cuenta (no pisa lo que la cuenta ya tiene).
async function fusionarDispositivo(env, desdeCrudo, hacia) {
  const desde = dispositivoValido(desdeCrudo);
  if (!desde || desde === hacia) return;
  const enCuenta = await env.DB.prepare('SELECT 1 AS x FROM cuentas WHERE dispositivo = ?').bind(desde).first();
  if (enCuenta) return; // ese móvil ya es de otra cuenta
  for (const t of TABLAS_DISPOSITIVO) {
    try {
      await env.DB.prepare(`UPDATE OR IGNORE ${t} SET dispositivo = ? WHERE dispositivo = ?`).bind(hacia, desde).run();
      await env.DB.prepare(`DELETE FROM ${t} WHERE dispositivo = ?`).bind(desde).run();
    } catch (e) { console.error('fusionar', t, e); }
  }
}

async function cuentaRegistro(request, env, b) {
  const email = emailLimpio(b.email);
  const d = dispositivoValido(b.dispositivo);
  if (!email) return json({ error: 'Escribe un email válido.' }, 400);
  if (!claveValida(b.clave)) return json({ error: 'La contraseña debe tener entre 8 y 100 caracteres.' }, 400);
  if (!d) return json({ error: 'Falta el identificador del dispositivo.' }, 400);
  const ip = 'r:' + ipDe(request);
  if (await intentosAltos(env, { [ip]: 10 })) return demasiados();
  await anotarIntento(env, [ip]);
  if (await env.DB.prepare('SELECT 1 AS x FROM cuentas WHERE email = ?').bind(email).first())
    return json({ error: 'Ya hay una cuenta con ese email. Prueba a iniciar sesión.', existe: true }, 409);
  if (await env.DB.prepare('SELECT 1 AS x FROM cuentas WHERE dispositivo = ?').bind(d).first())
    return json({ error: 'Este móvil ya tiene una cuenta. Inicia sesión con ella.' }, 409);
  const sal = aB64(aleatorio(16)), recSal = aB64(aleatorio(16));
  const codigo = nuevoCodigoRecuperacion();
  const r = await env.DB.prepare('INSERT INTO cuentas (email, dispositivo, hash, sal, rec_hash, rec_sal) VALUES (?, ?, ?, ?, ?, ?) RETURNING id')
    .bind(email, d, await hashClave(b.clave, sal), sal, await sha256(recSal + normalizarCodigo(codigo)), recSal).first();
  return json({ ok: true, token: await crearSesion(env, r.id), email, dispositivo: d, codigo_recuperacion: codigo });
}

async function cuentaEntrar(request, env, b) {
  const email = emailLimpio(b.email);
  const claves = { ['e:' + (email || 'x')]: 8, ['i:' + ipDe(request)]: 30 };
  if (await intentosAltos(env, claves)) return demasiados();
  const c = email ? await env.DB.prepare('SELECT id, dispositivo, hash, sal FROM cuentas WHERE email = ?').bind(email).first() : null;
  // Se calcula siempre el hash para que no se note si el email existe.
  const calculado = await hashClave(String(b.clave || '').slice(0, 100), c ? c.sal : 'AAAAAAAAAAAAAAAAAAAAAA==');
  if (!c || !iguales(calculado, c.hash)) {
    await anotarIntento(env, Object.keys(claves));
    return json({ error: 'Email o contraseña incorrectos.' }, 401);
  }
  await env.DB.prepare('DELETE FROM cuenta_intentos WHERE clave = ?').bind('e:' + email).run();
  await fusionarDispositivo(env, b.dispositivo_actual, c.dispositivo);
  return json({ ok: true, token: await crearSesion(env, c.id), email, dispositivo: c.dispositivo });
}

async function cuentaRecuperar(request, env, b) {
  const email = emailLimpio(b.email);
  const claves = { ['e:' + (email || 'x')]: 8, ['i:' + ipDe(request)]: 30 };
  if (await intentosAltos(env, claves)) return demasiados();
  if (!claveValida(b.clave)) return json({ error: 'La nueva contraseña debe tener entre 8 y 100 caracteres.' }, 400);
  const c = email ? await env.DB.prepare('SELECT id, dispositivo, rec_hash, rec_sal FROM cuentas WHERE email = ?').bind(email).first() : null;
  const calculado = await sha256((c ? c.rec_sal : 'x') + normalizarCodigo(b.codigo));
  if (!c || !iguales(calculado, c.rec_hash)) {
    await anotarIntento(env, Object.keys(claves));
    return json({ error: 'El email o el código de recuperación no son correctos.' }, 401);
  }
  const sal = aB64(aleatorio(16)), recSal = aB64(aleatorio(16));
  const codigo = nuevoCodigoRecuperacion();
  await env.DB.batch([
    env.DB.prepare('UPDATE cuentas SET hash = ?, sal = ?, rec_hash = ?, rec_sal = ? WHERE id = ?')
      .bind(await hashClave(b.clave, sal), sal, await sha256(recSal + normalizarCodigo(codigo)), recSal, c.id),
    env.DB.prepare('DELETE FROM sesiones WHERE cuenta_id = ?').bind(c.id),
    env.DB.prepare('DELETE FROM cuenta_intentos WHERE clave = ?').bind('e:' + email)
  ]);
  await fusionarDispositivo(env, b.dispositivo_actual, c.dispositivo);
  return json({ ok: true, token: await crearSesion(env, c.id), email, dispositivo: c.dispositivo, codigo_recuperacion: codigo });
}

async function cuentaYo(request, env) {
  const c = await cuentaDeSesion(request, env);
  if (!c) return json({ error: 'Sesión caducada.' }, 401);
  return json({ email: c.email, dispositivo: c.dispositivo, creado: c.creado });
}

async function cuentaSalir(request, env) {
  const c = await cuentaDeSesion(request, env);
  if (c) await env.DB.prepare('DELETE FROM sesiones WHERE token = ?').bind(c._token).run();
  return json({ ok: true });
}

async function cuentaClave(request, env, b) {
  const c = await cuentaDeSesion(request, env);
  if (!c) return json({ error: 'Sesión caducada.' }, 401);
  if (!claveValida(b.nueva)) return json({ error: 'La nueva contraseña debe tener entre 8 y 100 caracteres.' }, 400);
  const clave = 'p:' + c.id;
  if (await intentosAltos(env, { [clave]: 8 })) return demasiados();
  if (!iguales(await hashClave(String(b.actual || '').slice(0, 100), c.sal), c.hash)) {
    await anotarIntento(env, [clave]);
    return json({ error: 'La contraseña actual no es correcta.' }, 401);
  }
  const sal = aB64(aleatorio(16));
  await env.DB.batch([
    env.DB.prepare('UPDATE cuentas SET hash = ?, sal = ? WHERE id = ?').bind(await hashClave(b.nueva, sal), sal, c.id),
    env.DB.prepare('DELETE FROM sesiones WHERE cuenta_id = ? AND token != ?').bind(c.id, c._token)
  ]);
  return json({ ok: true });
}
