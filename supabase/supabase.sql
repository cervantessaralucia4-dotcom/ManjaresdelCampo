-- ============================================================
--  Manjares del Campo — Supabase Schema
--  Pega este script en Supabase > SQL Editor > Run
-- ============================================================

-- 1. PRODUCTOS
create table if not exists productos (
  id           bigserial primary key,
  nombre       text not null,
  categoria    text not null,  -- 'Frutas' | 'Verduras' | 'Lácteos' | 'Granos' | 'Hierbas'
  precio       numeric(10,2) not null,
  unidad       text default 'und',  -- 'und' | 'kg' | 'lb'
  stock        integer default 0,
  stock_minimo integer default 5,
  badge        text,               -- 'FRESCO' | 'ORGÁNICO' | 'LOCAL' | null
  imagen_url   text,
  imagen_bg    text default '#f9f9f9',
  activo       boolean default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- 2. PEDIDOS
create table if not exists pedidos (
  id              bigserial primary key,
  codigo          text unique not null,   -- CV-2025-0001
  -- Datos del cliente
  cliente_nombre  text not null,
  cliente_telefono text not null,
  cliente_direccion text not null,
  cliente_barrio   text not null,
  -- Pago
  metodo_pago     text not null,          -- 'nequi' | 'daviplata' | 'whatsapp'
  total           numeric(10,2) not null,
  estado          text default 'pendiente', -- 'pendiente' | 'confirmado' | 'enviado' | 'entregado' | 'cancelado'
  -- WhatsApp comprobante
  comprobante_url text,
  notas           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 3. ITEMS DEL PEDIDO
create table if not exists pedido_items (
  id          bigserial primary key,
  pedido_id   bigint references pedidos(id) on delete cascade,
  producto_id bigint references productos(id),
  nombre      text not null,      -- snapshot del nombre al momento de compra
  precio      numeric(10,2) not null,
  cantidad    integer not null,
  subtotal    numeric(10,2) not null
);

-- 4. INVENTARIO (movimientos)
create table if not exists inventario_movimientos (
  id          bigserial primary key,
  producto_id bigint references productos(id) on delete cascade,
  tipo        text not null,   -- 'entrada' | 'salida' | 'ajuste'
  cantidad    integer not null,
  motivo      text,
  pedido_id   bigint references pedidos(id),
  created_at  timestamptz default now()
);

-- 5. CONFIGURACIÓN (redes sociales, datos tienda)
create table if not exists configuracion (
  clave  text primary key,
  valor  text,
  updated_at timestamptz default now()
);

-- ── INSERTAR CONFIGURACIÓN INICIAL ──────────────────────────
insert into configuracion (clave, valor) values
  ('whatsapp_numero',    '573001234567'),
  ('instagram_usuario',  'colombiaverde'),
  ('instagram_url',      'https://instagram.com/colombiaverde'),
  ('whatsapp_url',       'https://wa.me/573001234567'),
  ('admin_password',     'admin2025'),
  ('tienda_nombre',      'Manjares del Campo'),
  ('tienda_ciudad',      'Barranquilla')
on conflict (clave) do nothing;

-- ── INSERTAR PRODUCTOS DE EJEMPLO ───────────────────────────
insert into productos (nombre, categoria, precio, unidad, stock, stock_minimo, badge, imagen_url, imagen_bg) values
  ('Mango Tommy',     'Frutas',   4500,  'und', 50, 10, 'FRESCO',   'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=500&q=80', '#f9f3e8'),
  ('Aguacate Hass',   'Frutas',   3000,  'und', 40, 8,  'ORGÁNICO', 'https://images.unsplash.com/photo-1632556198878-aacaec4b6b52?w=500&q=80', '#f5eaf0'),
  ('Tomate Chonto',   'Verduras', 2500,  'kg',  60, 12, null,       'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&q=80', '#f5e8e8'),
  ('Mazorca Criolla', 'Granos',   1500,  'und', 80, 15, 'LOCAL',    'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=500&q=80', '#f9f5e0'),
  ('Banano Criollo',  'Frutas',   2000,  'kg',  70, 10, 'LOCAL',    'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500&q=80', '#f9f6e0'),
  ('Coco Fresco',     'Frutas',   3500,  'und', 30, 5,  'FRESCO',   'https://images.unsplash.com/photo-1551529834-525807d6b4f3?w=500&q=80', '#f0ebe0'),
  ('Ahuyama',         'Verduras', 1800,  'kg',  45, 8,  'LOCAL',    'https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=500&q=80', '#f9f0e0'),
  ('Queso Costeño',   'Lácteos',  8500,  'und', 20, 4,  'ARTESANAL','https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=500&q=80', '#f9f5e0')
on conflict do nothing;

-- ── ROW LEVEL SECURITY (RLS) ─────────────────────────────────
-- Lectura pública para productos (la tienda los necesita)
alter table productos enable row level security;
create policy "Productos visibles para todos" on productos
  for select using (activo = true);

-- Pedidos: solo insertar (el cliente crea, admin lee via service_role)
alter table pedidos enable row level security;
create policy "Crear pedido" on pedidos
  for insert with check (true);

alter table pedido_items enable row level security;
create policy "Crear items" on pedido_items
  for insert with check (true);

-- Config: solo lectura pública
alter table configuracion enable row level security;
create policy "Config pública" on configuracion
  for select using (true);

-- ── FUNCIÓN: actualizar updated_at automáticamente ───────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_productos_updated
  before update on productos
  for each row execute function set_updated_at();

create trigger trg_pedidos_updated
  before update on pedidos
  for each row execute function set_updated_at();

-- ── VISTA: Ventas mensuales ───────────────────────────────────
create or replace view ventas_mensuales as
select
  date_trunc('month', created_at) as mes,
  count(*)                        as total_pedidos,
  sum(total)                      as ingresos,
  avg(total)                      as ticket_promedio
from pedidos
where estado != 'cancelado'
group by 1
order by 1 desc;

-- ── VISTA: Stock bajo ─────────────────────────────────────────
create or replace view productos_stock_bajo as
select id, nombre, categoria, stock, stock_minimo
from productos
where stock <= stock_minimo and activo = true
order by (stock::float / nullif(stock_minimo,0));