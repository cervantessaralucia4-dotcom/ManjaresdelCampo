// ============================================================
//  js/ui.js — Helpers de interfaz
// ============================================================

const UI = (() => {
  const fmt = (n) => '$' + Number(n).toLocaleString('es-CO');

  let _toastTimer = null;
  const showToast = (msg, type = '') => {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = `toast show ${type}`;
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  };

  const renderCategories = (products) => {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;
    const counts = {};
    products.forEach(p => { counts[p.categoria] = (counts[p.categoria] || 0) + 1; });
    grid.innerHTML = CATEGORIES.map(cat => `
      <div class="category-card">
        <div class="category-card__img">
          <img src="${cat.img}" alt="${cat.id}" loading="lazy" />
        </div>
        <div class="category-card__footer">
          <span class="category-card__name">${cat.id}</span>
          <span class="category-card__count">${counts[cat.id] || 0}</span>
        </div>
      </div>`).join('');
  };

  const renderProducts = (products) => {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    if (!products.length) {
      grid.innerHTML = '<p style="color:#888;padding:2rem">No hay productos disponibles.</p>';
      return;
    }
    grid.innerHTML = products.map(p => `
      <div class="product-card">
        <div class="product-card__img-wrap" style="background:${p.imagen_bg||'#f9f9f9'}">
          ${p.badge ? `<span class="product-card__badge">${p.badge}</span>` : ''}
          <img src="${p.imagen_url}" alt="${p.nombre}" loading="lazy" />
        </div>
        <div class="product-card__body">
          <div class="product-card__cat">${p.categoria.toUpperCase()}</div>
          <div class="product-card__name">${p.nombre}</div>
          <div class="product-card__footer">
            <div class="product-card__price">${fmt(p.precio)} <span>/ ${p.unidad}</span></div>
            <button class="product-card__add-btn" onclick="Cart.add(${p.id})">+ Agregar</button>
          </div>
        </div>
      </div>`).join('');
  };

  return { fmt, showToast, renderCategories, renderProducts };
})();