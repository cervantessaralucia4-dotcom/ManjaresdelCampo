// ============================================================
//  js/cart.js — Lógica del carrito
// ============================================================

const Cart = (() => {
  let items = {};

  const getItems  = () => Object.values(items);
  const getTotal  = () => getItems().reduce((s, i) => s + i.precio * i.qty, 0);
  const getTotalQty = () => getItems().reduce((s, i) => s + i.qty, 0);

  const add = (productId) => {
    const p = PRODUCTS.find(x => x.id === productId);
    if (!p) return;
    if (items[productId]) items[productId].qty++;
    else items[productId] = { ...p, qty: 1 };
    _render(); _updateCount();
    UI.showToast(`✓ ${p.nombre} agregado`);
  };

  const changeQty = (productId, delta) => {
    if (!items[productId]) return;
    items[productId].qty += delta;
    if (items[productId].qty <= 0) delete items[productId];
    _render(); _updateCount();
  };

  const removeItem = (productId) => {
    delete items[productId];
    _render(); _updateCount();
    UI.showToast('Producto eliminado');
  };

  const clear = () => {
    items = {};
    _render(); _updateCount();
  };

  const _updateCount = () => {
    const el = document.getElementById('cartCount');
    if (!el) return;
    el.textContent = getTotalQty();
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  };

  const _render = () => {
    const cartItemsEl = document.getElementById('cartItems');
    const cartEmptyEl = document.getElementById('cartEmpty');
    const cartTotalEl = document.getElementById('cartTotal');
    if (!cartItemsEl) return;

    const list = getItems();
    if (list.length === 0) {
      cartEmptyEl.style.display = 'flex';
      cartItemsEl.innerHTML = '';
      if (cartTotalEl) cartTotalEl.textContent = '$0';
      return;
    }

    cartEmptyEl.style.display = 'none';
    cartItemsEl.innerHTML = list.map(item => `
      <div class="cart-item">
        <div class="cart-item__img">
          <img src="${item.imagen_url}" alt="${item.nombre}" loading="lazy" />
        </div>
        <div class="cart-item__info">
          <div class="cart-item__name">${item.nombre}</div>
          <div class="cart-item__price">${UI.fmt(item.precio)} / ${item.unidad}</div>
          <div class="cart-item__controls">
            <button class="cart-item__qty-btn" onclick="Cart.changeQty(${item.id},-1)">−</button>
            <span class="cart-item__qty">${item.qty}</span>
            <button class="cart-item__qty-btn" onclick="Cart.changeQty(${item.id},1)">+</button>
          </div>
        </div>
        <div class="cart-item__right">
          <div class="cart-item__subtotal">${UI.fmt(item.precio * item.qty)}</div>
          <button class="cart-item__delete" onclick="Cart.removeItem(${item.id})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>
    `).join('');
    if (cartTotalEl) cartTotalEl.textContent = UI.fmt(getTotal());
  };

  const buildWhatsAppMessage = (clienteData) => {
    const list = getItems();
    if (!list.length) return null;
    let msg = `🌿 *Pedido Manjares del Campo*\n\n`;
    msg += `👤 *Cliente:* ${clienteData.nombre}\n`;
    msg += `📞 *Tel:* ${clienteData.telefono}\n`;
    msg += `📍 *Dirección:* ${clienteData.direccion}, ${clienteData.barrio}\n\n`;
    msg += `*Productos:*\n`;
    list.forEach(i => { msg += `• ${i.nombre} x${i.qty} — ${UI.fmt(i.precio * i.qty)}\n`; });
    msg += `\n💰 *Total: ${UI.fmt(getTotal())}*`;
    return encodeURIComponent(msg);
  };

  return { add, changeQty, removeItem, clear, getTotal, getTotalQty, getItems, _render, buildWhatsAppMessage };
})();

function openCart()  {
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('active');
  document.body.style.overflow = '';
}
function clearCart() { Cart.clear(); UI.showToast('🗑️ Carrito vaciado'); }