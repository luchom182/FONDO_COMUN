import { describe, it, expect } from 'vitest';
import { formatCOP, sanitizePhone, validateDataStructure } from '../App';
import { INITIAL_DATA } from '../initialData';

// ─── Helpers reutilizables ────────────────────────────────────────────────────

/**
 * Simula la lógica de filtrado de cumpleañeros del mes actual
 * (misma lógica que el useMemo birthdayMembersThisMonth en App.jsx)
 */
function getBirthdayMembersForMonth(members, targetMonth /* 1-12 */) {
  return members
    .filter(m => {
      if (!m.birthday) return false;
      const d = new Date(m.birthday + 'T12:00:00');
      return (d.getMonth() + 1) === targetMonth;
    })
    .map(m => {
      const d = new Date(m.birthday + 'T12:00:00');
      const age = new Date().getFullYear() - d.getFullYear();
      return { ...m, age, day: d.getDate(), monthName: d.toLocaleString('es-ES', { month: 'long' }) };
    })
    .sort((a, b) => a.day - b.day);
}

/**
 * Simula la validación del formulario de añadir integrante
 * (misma lógica que handleAddMember en App.jsx)
 */
function validateMemberForm({ name, phone, birthday }) {
  const n = (name || '').trim();
  const p = (phone || '').trim();
  const b = (birthday || '').trim();

  if (!n) return { ok: false, error: 'El nombre es obligatorio.' };
  if (!p) return { ok: false, error: 'El número de celular es obligatorio.' };
  if (!b) return { ok: false, error: 'La fecha de cumpleaños es obligatoria.' };

  return {
    ok: true,
    member: {
      id: 'member_test',
      name: n,
      phone: p,
      birthday: b
    }
  };
}

// ─── Suite de tests ───────────────────────────────────────────────────────────

describe('Resistencia a Errores y Pruebas Unitarias - Fondo Común', () => {

  // ── 1. Formateador de moneda ────────────────────────────────────────────────
  describe('1. Formateador de Moneda COP (formatCOP)', () => {
    it('Debe formatear números válidos en Pesos Colombianos', () => {
      expect(formatCOP(10000)).toContain('10.000');
    });

    it('Debe manejar 0 correctamente', () => {
      expect(formatCOP(0)).toContain('0');
    });

    it('Debe protegerse contra valores NaN, null o undefined retornando $ 0', () => {
      expect(formatCOP(NaN)).toContain('0');
      expect(formatCOP(null)).toContain('0');
      expect(formatCOP(undefined)).toContain('0');
      expect(formatCOP('texto_invalido')).toContain('0');
    });
  });

  // ── 2. Sanitizador de teléfonos ────────────────────────────────────────────
  describe('2. Sanitizador de Números Telefónicos (sanitizePhone)', () => {
    it('Debe limpiar guiones, espacios y paréntesis dejando solo dígitos', () => {
      expect(sanitizePhone('+57 (318) 384-5272')).toBe('573183845272');
      expect(sanitizePhone('316 717 5648')).toBe('3167175648');
    });

    it('Debe retornar string vacío si el teléfono es null o undefined', () => {
      expect(sanitizePhone(null)).toBe('');
      expect(sanitizePhone(undefined)).toBe('');
    });
  });

  // ── 3. Validador de estructura de datos ────────────────────────────────────
  describe('3. Validador de Estructura de Datos (validateDataStructure)', () => {
    it('Debe retornar la estructura cargada si el objeto es válido', () => {
      const validMock = {
        title: 'Prueba',
        quotaAmount: 10000,
        members: [{ id: '1', name: 'Juan' }],
        periods: [{ id: 'JUNIO_Q1', month: 'JUNIO', day: 5 }],
        payments: [],
        expenses: []
      };
      const result = validateDataStructure(validMock);
      expect(result.title).toBe('Prueba');
      expect(result.members.length).toBe(1);
    });

    it('Debe restaurar INITIAL_DATA si se pasa un localStorage corrupto o null', () => {
      expect(validateDataStructure(null)).toEqual(INITIAL_DATA);
      expect(validateDataStructure(undefined)).toEqual(INITIAL_DATA);
      expect(validateDataStructure('cadena_corrupta')).toEqual(INITIAL_DATA);
      expect(validateDataStructure({})).toEqual(INITIAL_DATA);
    });

    it('Debe reparar arreglos faltantes o nulos dentro del objeto', () => {
      const corruptPartial = {
        title: 'Fondo',
        members: null,
        payments: 'no_es_arreglo'
      };
      const result = validateDataStructure(corruptPartial);
      expect(Array.isArray(result.members)).toBe(true);
      expect(Array.isArray(result.payments)).toBe(true);
      expect(result.members.length).toBe(20);
    });
  });

  // ── 4. Métricas financieras ─────────────────────────────────────────────────
  describe('4. Métricas Financieras y Lógica de Negocio', () => {
    it('El saldo neto disponible debe ser exactamente Recaudado menos Gastos', () => {
      const totalCollected = INITIAL_DATA.payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      const totalExpenses = INITIAL_DATA.expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
      const netBalance = totalCollected - totalExpenses;

      expect(totalCollected).toBe(850000);
      expect(totalExpenses).toBe(170500);
      expect(netBalance).toBe(679500);
    });
  });

  // ── 5. Validación del formulario Añadir Integrante (NUEVO) ─────────────────
  describe('5. Validación del Formulario — Añadir Integrante', () => {
    it('Debe crear el integrante correctamente con los tres campos completos', () => {
      const result = validateMemberForm({
        name: 'María López',
        phone: '3001234567',
        birthday: '1990-07-15'
      });
      expect(result.ok).toBe(true);
      expect(result.member.name).toBe('María López');
      expect(result.member.phone).toBe('3001234567');
      expect(result.member.birthday).toBe('1990-07-15');
    });

    it('Debe rechazar si el nombre está vacío o es solo espacios', () => {
      const r1 = validateMemberForm({ name: '', phone: '3001234567', birthday: '1990-07-15' });
      const r2 = validateMemberForm({ name: '   ', phone: '3001234567', birthday: '1990-07-15' });
      expect(r1.ok).toBe(false);
      expect(r1.error).toContain('nombre');
      expect(r2.ok).toBe(false);
    });

    it('Debe rechazar si el celular está vacío', () => {
      const result = validateMemberForm({ name: 'Juan', phone: '', birthday: '1990-07-15' });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('celular');
    });

    it('Debe rechazar si la fecha de cumpleaños está vacía', () => {
      const result = validateMemberForm({ name: 'Juan', phone: '3001234567', birthday: '' });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('cumpleaños');
    });

    it('Debe rechazar si los tres campos están ausentes', () => {
      const result = validateMemberForm({ name: '', phone: '', birthday: '' });
      expect(result.ok).toBe(false);
    });

    it('Debe recortar espacios en blanco al inicio y fin del nombre', () => {
      const result = validateMemberForm({
        name: '  Pedro Ramírez  ',
        phone: '3009876543',
        birthday: '1985-03-22'
      });
      expect(result.ok).toBe(true);
      expect(result.member.name).toBe('Pedro Ramírez');
    });
  });

  // ── 6. Lógica de cumpleañeros del mes (NUEVO) ──────────────────────────────
  describe('6. Cumpleañeros del Mes — Filtrado y Ordenación', () => {
    const mockMembers = [
      { id: 'm1', name: 'Ana Torres',    phone: '3001111111', birthday: '1992-07-05' },  // julio
      { id: 'm2', name: 'Carlos Ruiz',   phone: '3002222222', birthday: '1985-07-20' },  // julio
      { id: 'm3', name: 'Luisa Gómez',   phone: '3003333333', birthday: '1990-12-25' },  // diciembre
      { id: 'm4', name: 'Pedro Ríos',    phone: '3004444444', birthday: '1988-07-01' },  // julio
      { id: 'm5', name: 'Sin Cumple',    phone: '3005555555', birthday: null },           // sin fecha
      { id: 'm6', name: 'Sin Fecha',     phone: '3006666666' },                           // sin campo
    ];

    it('Debe retornar solo los integrantes que cumplen en el mes indicado', () => {
      const result = getBirthdayMembersForMonth(mockMembers, 7); // julio
      const nombres = result.map(m => m.name);
      expect(nombres).toContain('Ana Torres');
      expect(nombres).toContain('Carlos Ruiz');
      expect(nombres).toContain('Pedro Ríos');
      expect(nombres).not.toContain('Luisa Gómez');
      expect(nombres).not.toContain('Sin Cumple');
    });

    it('Debe retornar lista vacía si nadie cumple años en ese mes', () => {
      const result = getBirthdayMembersForMonth(mockMembers, 3); // marzo — nadie
      expect(result).toHaveLength(0);
    });

    it('Debe ordenar los cumpleañeros por día ascendente', () => {
      const result = getBirthdayMembersForMonth(mockMembers, 7);
      const dias = result.map(m => m.day);
      expect(dias).toEqual([...dias].sort((a, b) => a - b));
    });

    it('Debe calcular la edad correctamente a partir del año de nacimiento', () => {
      const result = getBirthdayMembersForMonth(mockMembers, 7);
      const ana = result.find(m => m.name === 'Ana Torres');
      const anioActual = new Date().getFullYear();
      expect(ana.age).toBe(anioActual - 1992);
    });

    it('Debe ignorar miembros sin campo birthday o con birthday null', () => {
      const result = getBirthdayMembersForMonth(mockMembers, 7);
      const nombres = result.map(m => m.name);
      expect(nombres).not.toContain('Sin Cumple');
      expect(nombres).not.toContain('Sin Fecha');
    });

    it('Debe incluir el nombre del mes en español en cada resultado', () => {
      const result = getBirthdayMembersForMonth(mockMembers, 7);
      result.forEach(m => {
        expect(m.monthName).toBe('julio');
      });
    });
  });

});
