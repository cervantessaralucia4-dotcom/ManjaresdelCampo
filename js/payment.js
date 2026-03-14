// ============================================================
//  js/payment.js — Pagos Nequi / Daviplata + datos del cliente
// ============================================================

const PAYMENT_CONFIG = {
  nequi: {
    displayNumber: '300 123 4567',
    number:        '3001234567',
    businessName:  'Manjares del Campo',
    appScheme:     'nequi://',
    storeAndroid:  'https://play.google.com/store/apps/details?id=com.nequi.MobileApplication',
    storeIOS:      'https://apps.apple.com/co/app/nequi/id1080007238',
    iconLabel:     'N',
    iconClass:     'modal__header-icon--nequi',
    color:         '#6b21c4'
  },
  daviplata: {
    displayNumber: '300 123 4567',
    number:        '3001234567',
    businessName:  'Manjares del Campo',
    appScheme:     'daviplata://',
    storeAndroid:  'https://play.google.com/store/apps/details?id=com.davivienda.daviplataapp',
    storeIOS:      'https://apps.apple.com/co/app/daviplata/id1091212345',
    iconLabel:     'D',
    iconClass:     'modal__header-icon--davi',
    color:         '#c0392b'
  }
};

let currentPayMethod = null;

// ── Generar código de pedido ──────────────────────────────────
function generateOrderCode() {
  const y = new Date().getFullYear();
  const n = String(Math.floor(Math.random() * 9000) + 1000);
  return `CV-${y}-${n}`;
}

// ── Abrir modal ───────────────────────────────────────────────
function openPayModal(method) {
  if (Cart.getItems().length === 0) {
    UI.showToast('⚠️ Agrega productos al carrito primero');
    return;
  }
  currentPayMethod = method;
  const cfg = PAYMENT_CONFIG[method];
  const total = Cart.getTotal();

  document.getElementById('modalHeader').innerHTML = `
    <div class="modal__header-icon ${cfg.iconClass}">${cfg.iconLabel}</div>
    <div>
      <div class="modal__header-title">Pagar con ${method === 'nequi' ? 'Nequi' : 'Daviplata'}</div>
      <div class="modal__header-sub">${cfg.businessName}</div>
    </div>`;

  document.getElementById('modalAmount').textContent = `💰 Total: ${UI.fmt(total)}`;
  document.getElementById('modalNumber').textContent = cfg.displayNumber;
  generatePayQR(cfg.number, total, method, cfg.color);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  document.getElementById('storeLinkBtn').href = isIOS ? cfg.storeIOS : cfg.storeAndroid;

  _resetModal();
  document.getElementById('modalOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closePayModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  document.body.style.overflow = '';
  currentPayMethod = null;
}

function handleModalOverlay(e) {
  if (e.target === document.getElementById('modalOverlay')) closePayModal();
}

// ── Tabs ──────────────────────────────────────────────────────
function switchModalTab(tab, btn) {
  document.querySelectorAll('.modal__tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.modal__tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
}

// ── Copiar número ─────────────────────────────────────────────
function copyPayNumber() {
  const n = PAYMENT_CONFIG[currentPayMethod].number;
  navigator.clipboard.writeText(n)
    .then(()  => UI.showToast('📋 Número copiado'))
    .catch(()  => { /* fallback */ UI.showToast('📋 ' + n); });
}

// ── Validar formulario de cliente ─────────────────────────────
function _getClienteData() {
  const nombre    = document.getElementById('clienteNombre')?.value.trim();
  const telefono  = document.getElementById('clienteTelefono')?.value.trim();
  const direccion = document.getElementById('clienteDireccion')?.value.trim();
  const barrio    = document.getElementById('clienteBarrio')?.value.trim();

  if (!nombre)              { UI.showToast('⚠️ Ingresa tu nombre completo');   return null; }
  if (!telefono || telefono.length < 10) { UI.showToast('⚠️ Ingresa tu número de celular (10 dígitos)'); return null; }
  if (!direccion)           { UI.showToast('⚠️ Ingresa tu dirección de entrega'); return null; }
  if (!barrio)              { UI.showToast('⚠️ Ingresa tu barrio / municipio');   return null; }

  return { nombre, telefono, direccion, barrio };
}

// ── Confirmar pago + guardar pedido en Supabase ───────────────
async function confirmPayment() {
  const cliente = _getClienteData();
  if (!cliente) return;

  const btn     = document.getElementById('confirmPayBtn');
  const txtEl   = btn.querySelector('.btn-text');
  const spinEl  = btn.querySelector('.btn-spinner');

  btn.disabled     = true;
  txtEl.style.display = 'none';
  spinEl.style.display = 'inline';

  try {
    const pedidoData = {
      codigo:            generateOrderCode(),
      cliente_nombre:    cliente.nombre,
      cliente_telefono:  cliente.telefono,
      cliente_direccion: cliente.direccion,
      cliente_barrio:    cliente.barrio,
      metodo_pago:       currentPayMethod,
      total:             Cart.getTotal(),
      estado:            'pendiente'
    };

    // 1. Insertar pedido
    const [pedido] = await sb.insert('pedidos', pedidoData);

    // 2. Insertar items
    const items = Cart.getItems().map(i => ({
      pedido_id:   pedido.id,
      producto_id: i.id,
      nombre:      i.nombre,
      precio:      i.precio,
      cantidad:    i.qty,
      subtotal:    i.precio * i.qty
    }));
    await sb.insert('pedido_items', items);

    // 3. Descontar stock
    for (const item of Cart.getItems()) {
      const [prod] = await sb.select('productos', `id=eq.${item.id}&select=stock`);
      if (prod) {
        await sb.update('productos', { id: item.id }, { stock: Math.max(0, prod.stock - item.qty) });
      }
    }

    // Éxito
    btn.disabled     = false;
    txtEl.style.display = 'inline';
    spinEl.style.display = 'none';

    document.getElementById('modalBody').style.display    = 'none';
    document.getElementById('modalSuccess').style.display = 'block';
    document.getElementById('successCode').textContent    = pedido.codigo;

    Cart.clear();

  } catch (err) {
    console.error('Error al guardar pedido:', err);
    btn.disabled     = false;
    txtEl.style.display = 'inline';
    spinEl.style.display = 'none';
    UI.showToast('❌ Error al procesar. Intenta de nuevo.');
  }
}

// ── Abrir app de pago (link) ──────────────────────────────────
function openPayApp() {
  const cfg   = PAYMENT_CONFIG[currentPayMethod];
  const total = Cart.getTotal();
  const scheme = `${cfg.appScheme}?amount=${total}&description=Pago%20Colombia%20Verde`;
  window.location.href = scheme;
  setTimeout(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    window.open(isIOS ? cfg.storeIOS : cfg.storeAndroid, '_blank');
  }, 1500);
  UI.showToast('📲 Abriendo aplicación...');
}

// ── Pedir por WhatsApp desde el carrito ───────────────────────
async function pedirPorWhatsApp() {
  const cliente = _getClienteDataWA();
  if (!cliente) return;
  const msg = Cart.buildWhatsAppMessage(cliente);
  if (!msg) { UI.showToast('⚠️ El carrito está vacío'); return; }

  // Guardar pedido como 'whatsapp'
  try {
    const pedidoData = {
      codigo:            generateOrderCode(),
      cliente_nombre:    cliente.nombre,
      cliente_telefono:  cliente.telefono,
      cliente_direccion: cliente.direccion || 'Por confirmar',
      cliente_barrio:    cliente.barrio || 'Por confirmar',
      metodo_pago:       'whatsapp',
      total:             Cart.getTotal(),
      estado:            'pendiente'
    };
    const [pedido] = await sb.insert('pedidos', pedidoData);
    const items = Cart.getItems().map(i => ({
      pedido_id: pedido.id, producto_id: i.id,
      nombre: i.nombre, precio: i.precio, cantidad: i.qty, subtotal: i.precio * i.qty
    }));
    await sb.insert('pedido_items', items);
  } catch(e) { console.warn('No se pudo guardar el pedido WA:', e); }

  window.open(`https://wa.me/${APP_CONFIG.whatsapp_numero}?text=${msg}`, '_blank');
}

// Helper para WA checkout rápido (sin modal)
function _getClienteDataWA() {
  // Si el modal está abierto, usa sus campos
  const n = document.getElementById('clienteNombre')?.value.trim();
  const t = document.getElementById('clienteTelefono')?.value.trim();
  if (n && t) return {
    nombre:    n,
    telefono:  t,
    direccion: document.getElementById('clienteDireccion')?.value.trim() || '',
    barrio:    document.getElementById('clienteBarrio')?.value.trim() || ''
  };
  // Si no hay modal abierto, abre el modal de nequi para pedir datos
  openPayModal('nequi');
  UI.showToast('📝 Completa tus datos para continuar');
  return null;
}

// ── QR canvas ────────────────────────────────────────────────
function generatePayQR(number, amount, method, color) {
  const canvas = document.getElementById('qrCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = 200;
  canvas.width = size; canvas.height = size;
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,size,size);
  const mod = 7;

  const drawFinder = (ox, oy) => {
    ctx.fillStyle = color; ctx.fillRect(ox, oy, 7*mod, 7*mod);
    ctx.fillStyle = '#fff'; ctx.fillRect(ox+mod, oy+mod, 5*mod, 5*mod);
    ctx.fillStyle = color; ctx.fillRect(ox+2*mod, oy+2*mod, 3*mod, 3*mod);
  };
  const m = 8;
  drawFinder(m, m);
  drawFinder(size-7*mod-m, m);
  drawFinder(m, size-7*mod-m);

  let rng = [...`${number}${amount}`].reduce((s,c)=>s+c.charCodeAt(0),0);
  const next = () => { rng=(rng*1664525+1013904223)&0xffffffff; return (rng>>>0)/0xffffffff; };
  const ds = m+8*mod, dsize = size-2*ds, cols = Math.floor(dsize/mod);
  ctx.fillStyle = color;
  for (let r=0;r<cols;r++) for (let c=0;c<cols;c++)
    if (next()>.45) ctx.fillRect(ds+c*mod, ds+r*mod, mod-1, mod-1);

  const lw=36, lh=36, lx=size/2-lw/2, ly=size/2-lh/2;
  ctx.fillStyle='#fff'; ctx.fillRect(lx-4,ly-4,lw+8,lh+8);
  ctx.fillStyle=color;
  ctx.beginPath(); ctx.roundRect(lx,ly,lw,lh,8); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='bold 18px Inter,sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(method==='nequi'?'N':'D', size/2, size/2);
}

function _resetModal() {
  document.getElementById('modalBody').style.display    = 'block';
  document.getElementById('modalSuccess').style.display = 'none';
  document.querySelectorAll('.modal__tab').forEach((b,i) => b.classList.toggle('active', i===0));
  document.querySelectorAll('.modal__tab-content').forEach((c,i) => c.classList.toggle('active', i===0));
  ['clienteNombre','clienteTelefono','clienteDireccion','clienteBarrio'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}