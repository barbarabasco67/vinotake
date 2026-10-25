// Vinotake Premium: límites, canje de códigos, cobro (Stripe) y enlaces a tiendas con afiliación.
// Todo lo que cuesta dinero (fotos con IA) tiene un tope mensual; Premium lo amplía.

export const LIMITES = {
  gratis:  { escaneos: 5,  bodega: 25 },
  premium: { escaneos: 60, bodega: 1000 }
};

export function crear(h) {
  const { json, dispositivoValido, limpiar, ipDe, intentosAltos, anotarIntento, demasiados } = h;

  const mesActual = () => new Date().toISOString().slice(0, 7);
  const euros = (s, def) => String(s || def);

  async function filaPremium(env, d) {
    return env.DB.prepare(`SELECT hasta, origen FROM premium WHERE dispositivo = ? AND hasta > datetime('now')`).bind(d).first().catch(() => null);
  }
  async function esPremium(env, d) { return !!(await filaPremium(env, d)); }

  async function usoMes(env, d, tipo) {
    const r = await env.DB.prepare('SELECT n FROM usos WHERE dispositivo = ? AND tipo = ? AND mes = ?').bind(d, tipo, mesActual()).first().catch(() => null);
    return r ? r.n : 0;
  }

  // Comprueba el tope mensual de escaneos y, si hay hueco, lo anota. Devuelve una respuesta si no puede.
  async function contarEscaneo(env, d) {
    const prem = await esPremium(env, d);
    const tope = prem ? LIMITES.premium.escaneos : LIMITES.gratis.escaneos;
    const n = await usoMes(env, d, 'escaneo');
    if (n >= tope) {
      return json({
        error: prem ? 'Has usado tus ' + tope + ' fotos de este mes. Se renuevan el día 1.'
                    : 'Has usado tus ' + tope + ' fotos gratis de este mes. Con Premium tienes ' + LIMITES.premium.escaneos + ' al mes.',
        premium: !prem, codigo: 'limite_escaneos'
      }, 402);
    }
    await env.DB.prepare(
      `INSERT INTO usos (dispositivo, tipo, mes, n) VALUES (?, 'escaneo', ?, 1)
       ON CONFLICT (dispositivo, tipo, mes) DO UPDATE SET n = n + 1`
    ).bind(d, mesActual()).run();
    return null;
  }

  async function limiteBodega(env, d) {
    const prem = await esPremium(env, d);
    const tope = prem ? LIMITES.premium.bodega : LIMITES.gratis.bodega;
    const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM bodega WHERE dispositivo = ?').bind(d).first();
    if ((r && r.n) >= tope) {
      return json({
        error: prem ? 'Tu bodega está llena.' : 'Tu bodega gratis tiene hueco para ' + tope + ' vinos. Con Premium es ilimitada.',
        premium: !prem, codigo: 'limite_bodega'
      }, 402);
    }
    return null;
  }

  function enlacesPago(env) {
    return { mes: !!env.STRIPE_LINK_MES, anio: !!env.STRIPE_LINK_ANIO };
  }

  async function estado(env, dispositivo) {
    const d = dispositivoValido(dispositivo);
    if (!d) return json({ error: 'Falta el identificador del dispositivo.' }, 400);
    const f = await filaPremium(env, d);
    const prem = !!f;
    const lim = prem ? LIMITES.premium : LIMITES.gratis;
    const usados = await usoMes(env, d, 'escaneo');
    const bod = await env.DB.prepare('SELECT COUNT(*) AS n FROM bodega WHERE dispositivo = ?').bind(d).first().catch(() => ({ n: 0 }));
    return json({
      premium: prem, hasta: f ? f.hasta : null,
      escaneos: { usados, tope: lim.escaneos }, bodega: { usados: bod.n || 0, tope: lim.bodega },
      limites: LIMITES,
      precios: { mes: euros(env.PRECIO_MES, '2,49'), anio: euros(env.PRECIO_ANIO, '19,99') },
      pago: enlacesPago(env)
    });
  }

  async function darDias(env, d, dias, origen, cliente) {
    const f = await env.DB.prepare(`SELECT hasta FROM premium WHERE dispositivo = ?`).bind(d).first();
    await env.DB.prepare(
      `INSERT INTO premium (dispositivo, hasta, origen, cliente)
       VALUES (?1, datetime(max(COALESCE(?2, datetime('now')), datetime('now')), ?3), ?4, ?5)
       ON CONFLICT (dispositivo) DO UPDATE SET
         hasta = datetime(max(hasta, datetime('now')), ?3), origen = ?4, cliente = COALESCE(?5, cliente), actualizado = CURRENT_TIMESTAMP`
    ).bind(d, f ? f.hasta : null, '+' + dias + ' days', origen, cliente || null).run();
  }

  async function canjear(request, env, b) {
    const d = dispositivoValido(b.dispositivo);
    const codigo = limpiar(b.codigo, 40).toUpperCase().replace(/\s+/g, '');
    if (!d || !codigo) return json({ error: 'Escribe el código.' }, 400);
    const clave = 'canje:' + ipDe(request);
    if (await intentosAltos(env, { [clave]: 8 })) return demasiados();
    await anotarIntento(env, [clave]);
    const c = await env.DB.prepare('SELECT dias, usado_por FROM codigos_premium WHERE codigo = ?').bind(codigo).first();
    if (!c || c.usado_por) return json({ error: 'Ese código no es válido o ya se ha usado.' }, 400);
    const r = await env.DB.prepare(`UPDATE codigos_premium SET usado_por = ?, usado_en = CURRENT_TIMESTAMP WHERE codigo = ? AND usado_por IS NULL`).bind(d, codigo).run();
    if (!r.meta || !r.meta.changes) return json({ error: 'Ese código no es válido o ya se ha usado.' }, 400);
    await darDias(env, d, c.dias, 'codigo', null);
    return estado(env, d);
  }

  // Crea códigos de regalo (solo con ADMIN_TOKEN): POST /api/premium/codigos  { n, dias }
  async function crearCodigos(request, env, b) {
    const tok = (request.headers.get('authorization') || '').replace(/^Bearer /, '');
    if (!env.ADMIN_TOKEN || tok.length !== env.ADMIN_TOKEN.length || tok !== env.ADMIN_TOKEN) return json({ error: 'No autorizado.' }, 401);
    const n = Math.max(1, Math.min(50, parseInt(b.n, 10) || 1)), dias = Math.max(1, Math.min(3650, parseInt(b.dias, 10) || 30));
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', out = [];
    for (let i = 0; i < n; i++) {
      const a = crypto.getRandomValues(new Uint8Array(10));
      out.push('VINO-' + Array.from(a.slice(0, 5), x => letras[x % letras.length]).join('') + '-' + Array.from(a.slice(5), x => letras[x % letras.length]).join(''));
    }
    await env.DB.batch(out.map(c => env.DB.prepare('INSERT INTO codigos_premium (codigo, dias) VALUES (?, ?)').bind(c, dias)));
    return json({ dias, codigos: out });
  }

  // Redirige al pago de Stripe (Payment Link) marcando el móvil como referencia.
  async function pagar(env, dispositivo, plan) {
    const d = dispositivoValido(dispositivo);
    const base = plan === 'anio' ? env.STRIPE_LINK_ANIO : env.STRIPE_LINK_MES;
    if (!d) return json({ error: 'Falta el identificador del dispositivo.' }, 400);
    if (!base || !/^https:\/\//.test(base)) return json({ error: 'El pago todavía no está disponible.' }, 503);
    const u = new URL(base); u.searchParams.set('client_reference_id', d);
    return Response.redirect(u.toString(), 302);
  }

  async function firmaValida(env, cabecera, crudo) {
    if (!env.STRIPE_WEBHOOK_SECRET) return false;
    const partes = Object.fromEntries(String(cabecera || '').split(',').map(p => p.split('=')));
    const t = partes.t, v1 = partes.v1;
    if (!t || !v1 || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(t + '.' + crudo)));
    const esp = Array.from(mac, x => x.toString(16).padStart(2, '0')).join('');
    if (esp.length !== v1.length) return false;
    let dif = 0; for (let i = 0; i < esp.length; i++) dif |= esp.charCodeAt(i) ^ v1.charCodeAt(i);
    return dif === 0;
  }

  async function stripe(request, env) {
    const crudo = await request.text();
    if (!(await firmaValida(env, request.headers.get('stripe-signature'), crudo))) return json({ error: 'Firma no válida.' }, 400);
    let ev; try { ev = JSON.parse(crudo); } catch { return json({ error: 'Datos no válidos.' }, 400); }
    const o = ev && ev.data && ev.data.object || {};
    if (ev.type === 'checkout.session.completed' && o.payment_status !== 'unpaid') {
      const d = dispositivoValido(o.client_reference_id);
      if (d) {
        const anual = (o.amount_total || 0) >= 1200;
        await darDias(env, d, anual ? 370 : 33, 'stripe', o.customer || null);
      }
    } else if (ev.type === 'invoice.paid' && o.customer) {
      const fin = o.lines && o.lines.data && o.lines.data[0] && o.lines.data[0].period && o.lines.data[0].period.end;
      const fila = await env.DB.prepare('SELECT dispositivo FROM premium WHERE cliente = ?').bind(o.customer).first();
      if (fila && fin) {
        await env.DB.prepare(`UPDATE premium SET hasta = max(hasta, datetime(?, 'unixepoch', '+2 days')), actualizado = CURRENT_TIMESTAMP WHERE dispositivo = ?`).bind(fin, fila.dispositivo).run();
      }
    }
    return json({ ok: true });
  }

  // Mejor súper para toda la lista. Gratis: solo cuánto se podría ahorrar. Premium: el detalle.
  async function mejorSuper(env, dispositivo, superPedido) {
    const d = dispositivoValido(dispositivo);
    if (!d) return json({ error: 'Falta el identificador del dispositivo.' }, 400);
    const prem = await esPremium(env, d);
    const { results: items } = await env.DB.prepare(
      `SELECT l.vino_id, l.cantidad, v.nombre FROM lista l JOIN vinos v ON v.id = l.vino_id AND v.activo = 1
        WHERE l.dispositivo = ? AND l.comprado = 0`).bind(d).all();
    if (items.length < 2) return json({ premium: prem, hay: false });
    const ids = items.map(i => i.vino_id);
    const { results: pr } = await env.DB.prepare(
      `SELECT p.vino_id, p.super_id, p.precio, s.nombre AS super FROM precios p JOIN supermercados s ON s.id = p.super_id
        WHERE p.vino_id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all();
    const porVino = {}; pr.forEach(p => { (porVino[p.vino_id] = porVino[p.vino_id] || []).push(p); });
    const conPrecio = items.filter(i => porVino[i.vino_id]);
    if (conPrecio.length < 2) return json({ premium: prem, hay: false });
    const supers = {};
    pr.forEach(p => { supers[p.super_id] = supers[p.super_id] || { id: p.super_id, nombre: p.super, total: 0, vinos: 0 }; });
    Object.values(supers).forEach(s => {
      conPrecio.forEach(i => { const p = porVino[i.vino_id].find(x => x.super_id === s.id); if (p) { s.total += p.precio * i.cantidad; s.vinos++; } });
    });
    const completos = Object.values(supers).filter(s => s.vinos === conPrecio.length).sort((a, b) => a.total - b.total);
    // Reparto: cada vino donde es más barato.
    const reparto = {}; let mezcla = 0;
    conPrecio.forEach(i => {
      const mejor = porVino[i.vino_id].slice().sort((a, b) => a.precio - b.precio)[0];
      mezcla += mejor.precio * i.cantidad;
      const r = reparto[mejor.super_id] = reparto[mejor.super_id] || { id: mejor.super_id, nombre: mejor.super, total: 0, vinos: [] };
      r.total += mejor.precio * i.cantidad; r.vinos.push(i.nombre);
    });
    const superId = await h.superValido(env, superPedido);
    const base = completos.find(s => s.id === superId) || (completos.length ? completos[completos.length - 1] : null);
    const mejorUno = completos[0] || null;
    const referencia = base ? base.total : null;
    const ahorro = referencia != null ? Math.max(0, Math.round((referencia - mezcla) * 100) / 100) : 0;
    const ahorroUno = referencia != null && mejorUno ? Math.max(0, Math.round((referencia - mejorUno.total) * 100) / 100) : 0;
    if (!prem) return json({ premium: false, hay: ahorro >= 0.5, ahorro });
    return json({
      premium: true, hay: true, n: conPrecio.length, sin_precio: items.length - conPrecio.length,
      tu_super: base ? { id: base.id, nombre: base.nombre, total: Math.round(base.total * 100) / 100 } : null,
      mejor_uno: mejorUno ? { id: mejorUno.id, nombre: mejorUno.nombre, total: Math.round(mejorUno.total * 100) / 100, ahorro: ahorroUno } : null,
      repartido: { total: Math.round(mezcla * 100) / 100, ahorro, tiendas: Object.values(reparto).map(r => ({ id: r.id, nombre: r.nombre, total: Math.round(r.total * 100) / 100, vinos: r.vinos })) }
    });
  }

  // Tiendas online con afiliación (se configuran con la variable AFILIADOS; sin ella no se muestra nada).
  function tiendas(env) {
    try {
      const a = JSON.parse(env.AFILIADOS || '[]');
      return a.filter(t => t && t.id && t.nombre && /^https:\/\/[^ ]*\{q\}/.test(t.url || ''));
    } catch { return []; }
  }
  function tiendasPublicas(env) { return tiendas(env).map(t => ({ id: t.id, nombre: t.nombre })); }

  async function ir(env, tiendaId, vinoId, dispositivo) {
    const t = tiendas(env).find(x => x.id === tiendaId);
    const v = await env.DB.prepare('SELECT nombre, bodega FROM vinos WHERE id = ?').bind(vinoId).first();
    if (!t || !v) return json({ error: 'No encontrado' }, 404);
    const q = encodeURIComponent([v.bodega, v.nombre].filter((x, i, arr) => x && arr.indexOf(x) === i).join(' ').slice(0, 100));
    let destino = t.url.replace('{q}', q);
    if (t.awin && t.awin.mid && env.AWIN_PUBLISHER_ID) {
      destino = 'https://www.awin1.com/cread.php?awinmid=' + encodeURIComponent(t.awin.mid) + '&awinaffid=' + encodeURIComponent(env.AWIN_PUBLISHER_ID) + '&ued=' + encodeURIComponent(destino);
    }
    const d = dispositivoValido(dispositivo);
    await env.DB.prepare('INSERT INTO clics_tienda (tienda, vino_id, dispositivo) VALUES (?, ?, ?)').bind(t.id, vinoId, d || null).run().catch(() => {});
    return Response.redirect(destino, 302);
  }

  return { esPremium, contarEscaneo, limiteBodega, estado, canjear, crearCodigos, pagar, stripe, mejorSuper, tiendasPublicas, ir };
}
