// ============================================================
//  js/admin.js — Panel de Administración Manjares del Campo
// ============================================================

// ── SERVICE ROLE KEY (solo admin — nunca exponer en el front de la tienda) ──
// En producción: obtener desde variable de entorno o sessionStorage tras login
let ADMIN_SERVICE_KEY = '';

// Estado del admin
const AdminState = {
  panel:    'dashboard',
  pedidos:  [],
  productos:[],
  config:   {}
};

// ── LOGIN ─────────────────────────────────────────────────────
async function adminLogin() {
  const pass  = document.getElementById('adminPass').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';

  try {
    // Verificar contraseña contra Supabase configuracion
    const rows = await sb.select('configuracion', 'clave=eq.admin_password&select=valor');
    const correct = rows?.[0]?.valor;

    if (pass !== correct) {
      errEl.textContent = 'Contraseña incorrecta';
      document.getElementById('adminPass').value = '';
      return;
    }

    // Guardar service key si se proporcionó (opcional)
    const sk = document.getElementById('adminServiceKey')?.value?.trim();
    if (sk) ADMIN_SERVICE_KEY = sk;

    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('adminLayout').classList.remove('hidden');

    // Cargar datos iniciales
    await loadDashboard();

  } catch (err) {
    errEl.textContent = 'Error de conexión. Verifica tu configuración de Supabase.';
    console.error(err);
  }
}

document.getElementById('adminPass')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') adminLogin();
});

function adminLogout() {
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('adminLayout').classList.add('hidden');
  document.getElementById('adminPass').value = '';
  ADMIN_SERVICE_KEY = '';
}

// ── NAVEGACIÓN ────────────────────────────────────────────────
function showPanel(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar__item').forEach(i => i.classList.remove('active'));

  document.getElementById('panel-' + name)?.classList.add('active');
  document.querySelector(`[data-panel="${name}"]`)?.classList.add('active');

  const titles = {
    dashboard: 'Dashboard',
    pedidos:   'Pedidos',
    inventario:'Inventario / Stock',
    redes:     'Redes Sociales',
    config:    'Configuración'
  };
  document.getElementById('topbarTitle').textContent = titles[name] || name;
  AdminState.panel = name;

  if (name === 'dashboard')  loadDashboard();
  if (name === 'pedidos')    loadPedidos();
  if (name === 'inventario') loadInventario();
  if (name === 'redes')      loadRedes();
  if (name === 'config')     loadConfig();
}

// ── DASHBOARD ────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const [pedidos, productos] = await Promise.all([
      sb.select('pedidos', 'order=created_at.desc&limit=200'),
      sb.select('productos', 'activo=eq.true&select=id,nombre,stock,stock_minimo,categoria')
    ]);

    AdminState.pedidos   = pedidos;
    AdminState.productos = productos;

    const hoy   = new Date();
    const mes   = hoy.getMonth();
    const anio  = hoy.getFullYear();

    const pedidosMes = pedidos.filter(p => {
      const d = new Date(p.created_at);
      return d.getMonth() === mes && d.getFullYear() === anio && p.estado !== 'cancelado';
    });

    const ingresosMes   = pedidosMes.reduce((s, p) => s + Number(p.total), 0);
    const pendientes    = pedidos.filter(p => p.estado === 'pendiente').length;
    const stockBajo     = productos.filter(p => p.stock <= p.stock_minimo).length;

    document.getElementById('statPedidosMes').textContent  = pedidosMes.length;
    document.getElementById('statIngresosMes').textContent = fmt(ingresosMes);
    document.getElementById('statPendientes').textContent  = pendientes;
    document.getElementById('statStockBajo').textContent   = stockBajo;

    // Últimos 5 pedidos
    renderRecentPedidos(pedidos.slice(0, 5));

    // Gráfico ventas mensuales
    renderVentasChart(pedidos);

    // Gráfico por método de pago
    renderMetodoChart(pedidosMes);

  } catch (err) {
    console.error('Error cargando dashboard:', err);
  }
}

function renderRecentPedidos(list) {
  const tbody = document.getElementById('recentPedidosTbody');
  if (!tbody) return;
  tbody.innerHTML = list.length ? list.map(p => `
    <tr>
      <td><strong>${p.codigo}</strong></td>
      <td>${p.cliente_nombre}</td>
      <td>${p.cliente_barrio}</td>
      <td>${fmtMetodo(p.metodo_pago)}</td>
      <td><strong>${fmt(p.total)}</strong></td>
      <td><span class="badge badge--${p.estado}">${p.estado}</span></td>
      <td>${fmtDate(p.created_at)}</td>
    </tr>`).join('')
  : '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:2rem">No hay pedidos aún</td></tr>';
}

function renderVentasChart(pedidos) {
  const ctx = document.getElementById('ventasChart');
  if (!ctx) return;

  // Agrupar por mes (últimos 6 meses)
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push({ label: d.toLocaleString('es', { month: 'short' }), mes: d.getMonth(), anio: d.getFullYear(), total: 0 });
  }

  pedidos.forEach(p => {
    if (p.estado === 'cancelado') return;
    const d = new Date(p.created_at);
    const m = months.find(x => x.mes === d.getMonth() && x.anio === d.getFullYear());
    if (m) m.total += Number(p.total);
  });

  if (window._ventasChartInstance) window._ventasChartInstance.destroy();
  window._ventasChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months.map(m => m.label),
      datasets: [{ label: 'Ingresos', data: months.map(m => m.total),
        backgroundColor: 'rgba(61,158,61,.7)', borderColor: '#3d9e3d',
        borderWidth: 2, borderRadius: 6 }]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { ticks: { callback: v => '$' + (v/1000).toFixed(0) + 'k' },
        grid: { color: 'rgba(0,0,0,.05)' } },
        x: { grid: { display: false } } } }
  });
}

function renderMetodoChart(pedidos) {
  const ctx = document.getElementById('metodoChart');
  if (!ctx) return;
  const counts = { nequi: 0, daviplata: 0, whatsapp: 0 };
  pedidos.forEach(p => { if (counts[p.metodo_pago] !== undefined) counts[p.metodo_pago]++; });

  if (window._metodoChartInstance) window._metodoChartInstance.destroy();
  window._metodoChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Nequi', 'Daviplata', 'WhatsApp'],
      datasets: [{ data: [counts.nequi, counts.daviplata, counts.whatsapp],
        backgroundColor: ['#6b21c4','#ef4444','#25d366'],
        borderWidth: 0 }]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }
  });
}

// ── PEDIDOS ──────────────────────────────────────────────────
async function loadPedidos() {
  try {
    const pedidos = await sb.select('pedidos', 'order=created_at.desc');
    AdminState.pedidos = pedidos;
    renderPedidosTable(pedidos);
  } catch (err) { console.error(err); }
}

function renderPedidosTable(list) {
  const tbody = document.getElementById('pedidosTbody');
  if (!tbody) return;
  tbody.innerHTML = list.length ? list.map(p => `
    <tr>
      <td><strong>${p.codigo}</strong></td>
      <td>
        <div style="font-weight:600">${p.cliente_nombre}</div>
        <div style="font-size:.75rem;color:#888">${p.cliente_telefono}</div>
      </td>
      <td>
        <div>${p.cliente_direccion}</div>
        <div style="font-size:.75rem;color:#888">${p.cliente_barrio}</div>
      </td>
      <td>${fmtMetodo(p.metodo_pago)}</td>
      <td><strong>${fmt(p.total)}</strong></td>
      <td>
        <select class="filter-input" style="padding:.25rem .5rem;font-size:.78rem"
          onchange="updatePedidoEstado(${p.id}, this.value)">
          ${['pendiente','confirmado','enviado','entregado','cancelado'].map(s =>
            `<option value="${s}" ${p.estado===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </td>
      <td style="font-size:.78rem">${fmtDate(p.created_at)}</td>
      <td>
        <button class="btn-admin btn-admin--sm btn-admin--outline" onclick="verDetallePedido(${p.id})">Ver</button>
      </td>
    </tr>`).join('')
  : '<tr><td colspan="8" style="text-align:center;color:#aaa;padding:2rem">No hay pedidos</td></tr>';
}

async function updatePedidoEstado(id, estado) {
  try {
    await sb.update('pedidos', { id }, { estado, updated_at: new Date().toISOString() });
    showAdminToast('✓ Estado actualizado');
  } catch (err) { showAdminToast('❌ Error al actualizar'); }
}

async function verDetallePedido(id) {
  try {
    const [pedido]    = await sb.select('pedidos', `id=eq.${id}`);
    const items       = await sb.select('pedido_items', `pedido_id=eq.${id}`);
    const modal       = document.getElementById('pedidoDetailModal');
    const content     = document.getElementById('pedidoDetailContent');

    content.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.2rem">
        <div><div style="font-size:.7rem;color:#888;text-transform:uppercase;margin-bottom:.2rem">Código</div><strong>${pedido.codigo}</strong></div>
        <div><div style="font-size:.7rem;color:#888;text-transform:uppercase;margin-bottom:.2rem">Estado</div><span class="badge badge--${pedido.estado}">${pedido.estado}</span></div>
        <div><div style="font-size:.7rem;color:#888;text-transform:uppercase;margin-bottom:.2rem">Cliente</div>${pedido.cliente_nombre}</div>
        <div><div style="font-size:.7rem;color:#888;text-transform:uppercase;margin-bottom:.2rem">Teléfono</div>${pedido.cliente_telefono}</div>
        <div style="grid-column:1/-1"><div style="font-size:.7rem;color:#888;text-transform:uppercase;margin-bottom:.2rem">Dirección</div>${pedido.cliente_direccion}, ${pedido.cliente_barrio}</div>
        <div><div style="font-size:.7rem;color:#888;text-transform:uppercase;margin-bottom:.2rem">Método</div>${fmtMetodo(pedido.metodo_pago)}</div>
        <div><div style="font-size:.7rem;color:#888;text-transform:uppercase;margin-bottom:.2rem">Fecha</div>${fmtDate(pedido.created_at)}</div>
      </div>
      <table style="width:100%;font-size:.85rem;border-collapse:collapse">
        <thead><tr style="background:#f4f6f4">
          <th style="padding:.5rem;text-align:left;font-size:.7rem;color:#888">Producto</th>
          <th style="padding:.5rem;text-align:center;font-size:.7rem;color:#888">Cant.</th>
          <th style="padding:.5rem;text-align:right;font-size:.7rem;color:#888">Subtotal</th>
        </tr></thead>
        <tbody>
          ${items.map(i=>`<tr><td style="padding:.5rem">${i.nombre}</td><td style="padding:.5rem;text-align:center">${i.cantidad}</td><td style="padding:.5rem;text-align:right;font-weight:600">${fmt(i.subtotal)}</td></tr>`).join('')}
          <tr style="border-top:2px solid #eee"><td colspan="2" style="padding:.6rem;font-weight:700">Total</td><td style="padding:.6rem;text-align:right;font-weight:800;font-size:1rem">${fmt(pedido.total)}</td></tr>
        </tbody>
      </table>
      <div style="display:flex;gap:.6rem;margin-top:1rem;flex-wrap:wrap">
        <a href="https://wa.me/${pedido.cliente_telefono.replace(/\D/g,'')}?text=${encodeURIComponent(`Hola ${pedido.cliente_nombre}, tu pedido ${pedido.codigo} está siendo procesado.`)}"
           target="_blank" class="btn-admin btn-admin--primary" style="flex:1;justify-content:center">
          📲 Contactar por WhatsApp
        </a>
      </div>`;

    modal.classList.add('active');
  } catch (err) { console.error(err); }
}

function closePedidoDetail() {
  document.getElementById('pedidoDetailModal').classList.remove('active');
}

// Filtros pedidos
function filterPedidos() {
  const search = document.getElementById('pedidoSearch')?.value.toLowerCase() || '';
  const estado = document.getElementById('pedidoEstadoFilter')?.value || '';
  const mes    = document.getElementById('pedidoMesFilter')?.value || '';

  const filtered = AdminState.pedidos.filter(p => {
    const matchSearch = !search || p.codigo.toLowerCase().includes(search) ||
      p.cliente_nombre.toLowerCase().includes(search) || p.cliente_barrio.toLowerCase().includes(search);
    const matchEstado = !estado || p.estado === estado;
    const matchMes    = !mes    || p.created_at.startsWith(mes);
    return matchSearch && matchEstado && matchMes;
  });
  renderPedidosTable(filtered);
}

// Exportar pedidos CSV
function exportPedidosCSV() {
  const rows = [['Código','Cliente','Teléfono','Dirección','Barrio','Método','Total','Estado','Fecha']];
  AdminState.pedidos.forEach(p => rows.push([
    p.codigo, p.cliente_nombre, p.cliente_telefono,
    p.cliente_direccion, p.cliente_barrio, p.metodo_pago,
    p.total, p.estado, fmtDate(p.created_at)
  ]));
  downloadCSV(rows, 'pedidos_colombia_verde.csv');
}

// ── INVENTARIO ───────────────────────────────────────────────
async function loadInventario() {
  try {
    const prods = await sb.select('productos', 'order=categoria,nombre');
    AdminState.productos = prods;
    renderInventarioTable(prods);
  } catch (err) { console.error(err); }
}

function renderInventarioTable(list) {
  const tbody = document.getElementById('inventarioTbody');
  if (!tbody) return;

  // Agrupar por categoría
  const cats = [...new Set(list.map(p => p.categoria))];
  let html = '';

  cats.forEach(cat => {
    const prods = list.filter(p => p.categoria === cat);
    html += `<tr style="background:#f4f6f4"><td colspan="8" style="padding:.5rem 1rem;font-weight:700;font-size:.78rem;text-transform:uppercase;letter-spacing:1px;color:#2d7a2d">📦 ${cat} (${prods.length})</td></tr>`;
    prods.forEach(p => {
      const pct   = Math.min(100, Math.round((p.stock / Math.max(p.stock_minimo * 2, 1)) * 100));
      const lvl   = p.stock <= p.stock_minimo ? 'bajo' : p.stock <= p.stock_minimo * 1.5 ? 'medio' : 'ok';
      html += `
        <tr data-id="${p.id}">
          <td><strong>${p.nombre}</strong></td>
          <td>${p.categoria}</td>
          <td>${fmt(p.precio)} / ${p.unidad}</td>
          <td>
            <div class="stock-bar-wrap">
              <div class="stock-bar"><div class="stock-bar__fill stock-bar__fill--${lvl}" style="width:${pct}%"></div></div>
              <span class="stock-num">${p.stock} ${p.unidad}</span>
            </div>
          </td>
          <td><span class="badge badge--${lvl}">${lvl === 'ok' ? 'OK' : lvl === 'medio' ? 'Medio' : '⚠ Bajo'}</span></td>
          <td>${p.stock_minimo}</td>
          <td><span class="badge ${p.activo ? 'badge--entregado' : 'badge--cancelado'}">${p.activo ? 'Activo' : 'Inactivo'}</span></td>
          <td>
            <div style="display:flex;gap:.4rem">
              <button class="btn-admin btn-admin--sm btn-admin--outline btn-admin--icon" onclick="editarProducto(${p.id})" title="Editar">✏️</button>
              <button class="btn-admin btn-admin--sm btn-admin--outline btn-admin--icon" onclick="ajustarStock(${p.id},'${p.nombre}',${p.stock})" title="Ajustar stock">📊</button>
            </div>
          </td>
        </tr>`;
    });
  });

  tbody.innerHTML = html || '<tr><td colspan="8" style="text-align:center;color:#aaa;padding:2rem">No hay productos</td></tr>';
}

function filterInventario() {
  const q = document.getElementById('invSearch')?.value.toLowerCase() || '';
  const c = document.getElementById('invCatFilter')?.value || '';
  const filtered = AdminState.productos.filter(p =>
    (!q || p.nombre.toLowerCase().includes(q)) && (!c || p.categoria === c));
  renderInventarioTable(filtered);
}

// Modal editar producto
function editarProducto(id) {
  const p = AdminState.productos.find(x => x.id === id);
  if (!p) return;

  document.getElementById('editProdId').value         = p.id;
  document.getElementById('editProdNombre').value     = p.nombre;
  document.getElementById('editProdCategoria').value  = p.categoria;
  document.getElementById('editProdPrecio').value     = p.precio;
  document.getElementById('editProdUnidad').value     = p.unidad;
  document.getElementById('editProdStock').value      = p.stock;
  document.getElementById('editProdStockMin').value   = p.stock_minimo;
  document.getElementById('editProdBadge').value      = p.badge || '';
  document.getElementById('editProdImagen').value     = p.imagen_url || '';
  document.getElementById('editProdActivo').value     = String(p.activo);

  document.getElementById('editProductoModal').classList.add('active');
}

function closeEditProducto() {
  document.getElementById('editProductoModal').classList.remove('active');
}

async function saveProducto() {
  const id = Number(document.getElementById('editProdId').value);
  const data = {
    nombre:      document.getElementById('editProdNombre').value,
    categoria:   document.getElementById('editProdCategoria').value,
    precio:      Number(document.getElementById('editProdPrecio').value),
    unidad:      document.getElementById('editProdUnidad').value,
    stock:       Number(document.getElementById('editProdStock').value),
    stock_minimo:Number(document.getElementById('editProdStockMin').value),
    badge:       document.getElementById('editProdBadge').value || null,
    imagen_url:  document.getElementById('editProdImagen').value,
    activo:      document.getElementById('editProdActivo').value === 'true'
  };

  try {
    if (id) {
      await sb.update('productos', { id }, data);
      showAdminToast('✓ Producto actualizado');
    } else {
      await sb.insert('productos', data);
      showAdminToast('✓ Producto creado');
    }
    closeEditProducto();
    loadInventario();
  } catch (err) { showAdminToast('❌ Error al guardar'); console.error(err); }
}

function nuevoProducto() {
  document.getElementById('editProdId').value = '';
  ['editProdNombre','editProdPrecio','editProdBadge','editProdImagen'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('editProdCategoria').value = 'Frutas';
  document.getElementById('editProdUnidad').value    = 'und';
  document.getElementById('editProdStock').value     = '0';
  document.getElementById('editProdStockMin').value  = '5';
  document.getElementById('editProdActivo').value    = 'true';
  document.getElementById('editProductoModal').classList.add('active');
}

// Ajustar stock rápido
function ajustarStock(id, nombre, stockActual) {
  document.getElementById('ajusteStockId').value     = id;
  document.getElementById('ajusteStockNombre').textContent = nombre;
  document.getElementById('ajusteStockActual').textContent = stockActual;
  document.getElementById('ajusteCantidad').value    = '';
  document.getElementById('ajusteTipo').value        = 'entrada';
  document.getElementById('ajusteMotivo').value      = '';
  document.getElementById('ajusteStockModal').classList.add('active');
}

function closeAjusteStock() {
  document.getElementById('ajusteStockModal').classList.remove('active');
}

async function saveAjusteStock() {
  const id       = Number(document.getElementById('ajusteStockId').value);
  const tipo     = document.getElementById('ajusteTipo').value;
  const cantidad = Number(document.getElementById('ajusteCantidad').value);
  const motivo   = document.getElementById('ajusteMotivo').value;

  if (!cantidad || cantidad <= 0) { showAdminToast('⚠️ Ingresa una cantidad válida'); return; }

  const prod = AdminState.productos.find(p => p.id === id);
  if (!prod) return;

  const nuevoStock = tipo === 'entrada'
    ? prod.stock + cantidad
    : tipo === 'salida'
    ? Math.max(0, prod.stock - cantidad)
    : cantidad; // ajuste directo

  try {
    await sb.update('productos', { id }, { stock: nuevoStock });
    await sb.insert('inventario_movimientos', {
      producto_id: id, tipo, cantidad,
      motivo: motivo || null
    });
    showAdminToast('✓ Stock actualizado');
    closeAjusteStock();
    loadInventario();
  } catch (err) { showAdminToast('❌ Error'); console.error(err); }
}

// Exportar inventario CSV
function exportInventarioCSV() {
  const rows = [['ID','Nombre','Categoría','Precio','Unidad','Stock','Stock Mínimo','Estado']];
  AdminState.productos.forEach(p => rows.push([p.id,p.nombre,p.categoria,p.precio,p.unidad,p.stock,p.stock_minimo,p.activo?'Activo':'Inactivo']));
  downloadCSV(rows, 'inventario_colombia_verde.csv');
}

// ── REDES SOCIALES ───────────────────────────────────────────
async function loadRedes() {
  try {
    const rows = await sb.select('configuracion', 'select=clave,valor');
    rows.forEach(r => { AdminState.config[r.clave] = r.valor; });
    renderRedConfig();
  } catch (err) { console.error(err); }
}

function renderRedConfig() {
  const c = AdminState.config;
  document.getElementById('igHandle').textContent  = '@' + (c.instagram_usuario || 'sin configurar');
  document.getElementById('igUrl').href            = c.instagram_url || '#';
  document.getElementById('waHandle').textContent  = c.whatsapp_numero || 'sin configurar';
  document.getElementById('waUrl').href            = c.whatsapp_url || '#';

  document.getElementById('cfgInstagramUrl').value  = c.instagram_url || '';
  document.getElementById('cfgInstagramUser').value = c.instagram_usuario || '';
  document.getElementById('cfgWhatsappNum').value   = c.whatsapp_numero || '';
  document.getElementById('cfgWhatsappUrl').value   = c.whatsapp_url || '';
}

async function saveRedConfig() {
  const updates = {
    instagram_url:      document.getElementById('cfgInstagramUrl').value,
    instagram_usuario:  document.getElementById('cfgInstagramUser').value,
    whatsapp_numero:    document.getElementById('cfgWhatsappNum').value,
    whatsapp_url:       document.getElementById('cfgWhatsappUrl').value
  };

  try {
    for (const [clave, valor] of Object.entries(updates)) {
      await sb.update('configuracion', { clave }, { valor });
    }
    showAdminToast('✓ Configuración guardada');
    loadRedes();
  } catch (err) { showAdminToast('❌ Error al guardar'); console.error(err); }
}

// ── CONFIG GENERAL ────────────────────────────────────────────
async function loadConfig() {
  try {
    const rows = await sb.select('configuracion', 'select=clave,valor');
    rows.forEach(r => { AdminState.config[r.clave] = r.valor; });

    document.getElementById('cfgTiendaNombre').value = AdminState.config.tienda_nombre || '';
    document.getElementById('cfgCiudad').value       = AdminState.config.tienda_ciudad || '';
    document.getElementById('cfgAdminPass').value    = '';
    document.getElementById('cfgNequiNum').value     = AdminState.config.nequi_numero || '';
    document.getElementById('cfgDaviNum').value      = AdminState.config.daviplata_numero || '';
  } catch (err) { console.error(err); }
}

async function saveConfig() {
  const newPass = document.getElementById('cfgAdminPass').value.trim();
  const updates = {
    tienda_nombre:      document.getElementById('cfgTiendaNombre').value,
    tienda_ciudad:      document.getElementById('cfgCiudad').value,
    nequi_numero:       document.getElementById('cfgNequiNum').value,
    daviplata_numero:   document.getElementById('cfgDaviNum').value
  };
  if (newPass) updates.admin_password = newPass;

  try {
    for (const [clave, valor] of Object.entries(updates)) {
      await sb.update('configuracion', { clave }, { valor, updated_at: new Date().toISOString() });
    }
    showAdminToast('✓ Configuración guardada');
  } catch (err) { showAdminToast('❌ Error al guardar'); console.error(err); }
}

// ── UTILIDADES ────────────────────────────────────────────────
const fmt = n => '$' + Number(n || 0).toLocaleString('es-CO');

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' }) + ' ' +
    d.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });
}

function fmtMetodo(m) {
  return { nequi:'💜 Nequi', daviplata:'❤️ Daviplata', whatsapp:'💚 WhatsApp' }[m] || m;
}

function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

let _adminToast = null;
function showAdminToast(msg) {
  const t = document.getElementById('adminToast');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(_adminToast);
  _adminToast = setTimeout(() => t.classList.remove('show'), 2500);
}

// Cerrar modales con overlay click
['pedidoDetailModal','editProductoModal','ajusteStockModal'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', e => {
    if (e.target.id === id) e.target.classList.remove('active');
  });
});