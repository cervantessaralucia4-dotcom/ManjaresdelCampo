// ============================================================
//  js/data.js — Datos y constantes
// ============================================================

const CATEGORIES = [
  { id: 'Frutas',   count: 0, img: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400&q=80' },
  { id: 'Verduras', count: 0, img: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&q=80' },
  { id: 'Lácteos',  count: 0, img: 'https://plus.unsplash.com/premium_photo-1682129071833-65eed17bcf11?w=400&q=80' },
  { id: 'Granos',   count: 0, img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80' },
  { id: 'Hierbas',  count: 0, img: 'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=400&q=80' }
];

// Se llena desde Supabase al cargar
let PRODUCTS = [];

// Config (se llena desde Supabase)
let APP_CONFIG = {
  whatsapp_numero:   '573001234567',
  instagram_usuario: 'colombiaverde',
  instagram_url:     'https://instagram.com/colombiaverde',
  whatsapp_url:      'https://wa.me/573001234567'
};

const WHATSAPP_NUMBER = () => APP_CONFIG.whatsapp_numero;

// Barrios de Barranquilla para autocompletado
const BARRIOS_BQ = [
  'El Prado','Manga','Bellavista','Boston','Alto Prado','Villa Santos',
  'El Recreo','Las Delicias','San José','Ciudadela 20 de Julio',
  'Las Flores','La Playa','Centro','Rebolo','San Roque','El Silencio',
  'Riomar','El Golf','Villa Country','Los Alpes','Alameda del Rio',
  'Barranquillita','La Loma','Portal del Genovés','Soledad','Malambo'
];