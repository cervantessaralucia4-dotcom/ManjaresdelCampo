// ============================================================
//  js/supabase.js — Cliente Supabase compartido
//  ⚠️  Reemplaza SUPABASE_URL y SUPABASE_ANON_KEY con los tuyos
//      Supabase > tu proyecto > Settings > API
// ============================================================

const SUPABASE_URL      = 'https://tquasfussmwzaajlbbhd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxdWFzZnVzc213emFhamxiYmhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTQzMTUsImV4cCI6MjA4OTA5MDMxNX0.aVJAIOkgB3HMqQDaAdvbV9F8bchIPlIoD2Fh0Vi0zMM';

// Cliente liviano sin SDK — fetch directo a la REST API de Supabase
const sb = {

  // ── Headers base ──────────────────────────────────────────
  _headers(useServiceRole = false) {
    return {
      'Content-Type': 'application/json',
      'apikey':       SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'return=representation'
    };
  },

  // ── SELECT ─────────────────────────────────────────────────
  async select(table, params = '') {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
      headers: this._headers()
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  // ── INSERT ─────────────────────────────────────────────────
  async insert(table, body) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(body)
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  // ── UPDATE ─────────────────────────────────────────────────
  async update(table, match, body) {
    const query = Object.entries(match).map(([k,v]) => `${k}=eq.${v}`).join('&');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      method: 'PATCH',
      headers: this._headers(),
      body: JSON.stringify(body)
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  // ── DELETE ─────────────────────────────────────────────────
  async delete(table, match) {
    const query = Object.entries(match).map(([k,v]) => `${k}=eq.${v}`).join('&');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      method: 'DELETE',
      headers: this._headers()
    });
    if (!res.ok) throw await res.json();
    return res.status === 204 ? [] : res.json();
  },

  // ── SELECT con SERVICE ROLE (solo admin) ──────────────────
  async adminSelect(table, params = '', serviceKey) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
      headers: {
        'Content-Type':  'application/json',
        'apikey':        serviceKey,
        'Authorization': `Bearer ${serviceKey}`
      }
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async adminUpdate(table, match, body, serviceKey) {
    const query = Object.entries(match).map(([k,v]) => `${k}=eq.${v}`).join('&');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      method: 'PATCH',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer':        'return=representation'
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async adminInsert(table, body, serviceKey) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer':        'return=representation'
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw await res.json();
    return res.json();
  }
};