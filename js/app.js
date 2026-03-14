// ============================================================
//  js/app.js — Inicialización de la tienda
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {

  // ── Cargar config y productos desde Supabase ───────────────
  try {
    const [cfgRows, products] = await Promise.all([
      sb.select('configuracion', 'select=clave,valor'),
      sb.select('productos', 'activo=eq.true&order=categoria,nombre')
    ]);

    // Aplicar configuración
    cfgRows.forEach(row => { APP_CONFIG[row.clave] = row.valor; });

    // Actualizar links dinámicos
    document.querySelectorAll('[data-wa-link]').forEach(el => {
      el.href = APP_CONFIG.whatsapp_url;
    });
    document.querySelectorAll('[data-ig-link]').forEach(el => {
      el.href = APP_CONFIG.instagram_url;
    });

    // Guardar productos globalmente y renderizar
    PRODUCTS.push(...products);
    UI.renderCategories(products);
    UI.renderProducts(products);

  } catch (err) {
    console.warn('No se pudo conectar a Supabase. Usando datos de ejemplo.', err);
    // Fallback con productos hardcodeados si Supabase no está configurado
    const fallback = [
      {id:1,nombre:'Mango Tommy',categoria:'Frutas',precio:4500,unidad:'und',badge:'FRESCO',imagen_url:'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=500&q=80',imagen_bg:'#f9f3e8'},
      {id:2,nombre:'Aguacate Hass',categoria:'Frutas',precio:3000,unidad:'und',badge:'ORGÁNICO',imagen_url:'https://images.unsplash.com/photo-1632556198878-aacaec4b6b52?w=500&q=80',imagen_bg:'#f5eaf0'},
      {id:3,nombre:'Tomate Chonto',categoria:'Verduras',precio:2500,unidad:'kg',badge:null,imagen_url:'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&q=80',imagen_bg:'#f5e8e8'},
      {id:4,nombre:'Mazorca Criolla',categoria:'Granos',precio:1500,unidad:'und',badge:'LOCAL',imagen_url:'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=500&q=80',imagen_bg:'#f9f5e0'},
      {id:5,nombre:'Banano Criollo',categoria:'Frutas',precio:2000,unidad:'kg',badge:'LOCAL',imagen_url:'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500&q=80',imagen_bg:'#f9f6e0'},
      {id:6,nombre:'Coco Fresco',categoria:'Frutas',precio:3500,unidad:'und',badge:'FRESCO',imagen_url:'https://images.unsplash.com/photo-1551529834-525807d6b4f3?w=500&q=80',imagen_bg:'#f0ebe0'},
      {id:7,nombre:'Ahuyama',categoria:'Verduras',precio:1800,unidad:'kg',badge:'LOCAL',imagen_url:'https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=500&q=80',imagen_bg:'#f9f0e0'},
      {id:8,nombre:'Queso Costeño',categoria:'Lácteos',precio:8500,unidad:'und',badge:'ARTESANAL',imagen_url:'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=500&q=80',imagen_bg:'#f9f5e0'}
    ];
    PRODUCTS.push(...fallback);
    UI.renderCategories(fallback);
    UI.renderProducts(fallback);
  }

  Cart._render();

  // ── Botón carrito ──────────────────────────────────────────
  document.getElementById('cartBtn')?.addEventListener('click', openCart);

  // ── Botón WhatsApp del drawer ──────────────────────────────
  document.getElementById('btnPedirWA')?.addEventListener('click', pedirPorWhatsApp);

  // ── Tecla Escape ──────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closePayModal(); closeCart(); }
  });

  // ── Smooth scroll ──────────────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
  });

  console.log('%c🌿 Manjares del Campo listo', 'color:#2d8c2d;font-weight:bold');
});