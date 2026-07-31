import { describe, it, expect } from 'vitest';
import { formatCOP, sanitizePhone, validateDataStructure } from '../App';
import { INITIAL_DATA } from '../initialData';

// ─── Helpers reutilizables ────────────────────────────────────────────────────

/** Simula birthdayMembersThisMonth */
function getBirthdayMembersForMonth(members, targetMonth) {
  const MONTH_NAMES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return members
    .filter(m => {
      if (!m.birthday) return false;
      const parts = String(m.birthday).split('/');
      if (parts.length < 2) return false;
      return parseInt(parts[1], 10) === targetMonth;
    })
    .map(m => {
      const parts = String(m.birthday).split('/');
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      return { ...m, day, monthName: MONTH_NAMES[month - 1] || '' };
    })
    .sort((a, b) => a.day - b.day);
}

/** Simula validateMemberForm (añadir) */
function validateMemberForm({ name, phone, birthdayDay, birthdayMonth }) {
  const n = (name || '').trim();
  const p = (phone || '').trim();
  if (!n) return { ok: false, error: 'El nombre es obligatorio.' };
  if (!p) return { ok: false, error: 'El número de celular es obligatorio.' };
  if (!birthdayDay || !birthdayMonth) return { ok: false, error: 'La fecha de cumpleaños (día y mes) es obligatoria.' };
  const birthday = `${String(birthdayDay).padStart(2,'0')}/${String(birthdayMonth).padStart(2,'0')}`;
  return { ok: true, member: { id: 'member_test', name: n, phone: p, birthday } };
}

/** Simula handleOpenEditMember — pre-rellena el formulario con datos del miembro */
function buildEditForm(member) {
  const parts = member.birthday ? String(member.birthday).split('/') : [];
  return {
    id: member.id,
    name: member.name || '',
    phone: member.phone || '',
    birthdayDay:   parts[0] ? parseInt(parts[0], 10).toString() : '',
    birthdayMonth: parts[1] ? parseInt(parts[1], 10).toString() : ''
  };
}

/** Simula handleSaveEditMember — aplica cambios al array de miembros */
function applyEditMember(members, editForm) {
  const name = (editForm.name || '').trim();
  const phone = (editForm.phone || '').trim();
  const day = editForm.birthdayDay;
  const month = editForm.birthdayMonth;

  if (!name)           return { ok: false, error: 'El nombre es obligatorio.' };
  if (!phone)          return { ok: false, error: 'El número de celular es obligatorio.' };
  if (!day || !month)  return { ok: false, error: 'La fecha de cumpleaños es obligatoria.' };

  const birthday = `${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')}`;
  const updated = members.map(m =>
    m.id === editForm.id ? { ...m, name, phone, birthday } : m
  );
  return { ok: true, members: updated };
}

// ─── Suites ───────────────────────────────────────────────────────────────────

describe('Resistencia a Errores y Pruebas Unitarias - Fondo Común', () => {

  // ── 1. formatCOP ───────────────────────────────────────────────────────────
  describe('1. Formateador de Moneda COP (formatCOP)', () => {
    it('Formatea números válidos en Pesos Colombianos', () => {
      expect(formatCOP(10000)).toContain('10.000');
    });
    it('Maneja 0 correctamente', () => {
      expect(formatCOP(0)).toContain('0');
    });
    it('Protege contra NaN, null, undefined y texto', () => {
      expect(formatCOP(NaN)).toContain('0');
      expect(formatCOP(null)).toContain('0');
      expect(formatCOP(undefined)).toContain('0');
      expect(formatCOP('texto')).toContain('0');
    });
  });

  // ── 2. sanitizePhone ───────────────────────────────────────────────────────
  describe('2. Sanitizador de Teléfonos (sanitizePhone)', () => {
    it('Limpia guiones, espacios y paréntesis', () => {
      expect(sanitizePhone('+57 (318) 384-5272')).toBe('573183845272');
      expect(sanitizePhone('316 717 5648')).toBe('3167175648');
    });
    it('Retorna string vacío si recibe null o undefined', () => {
      expect(sanitizePhone(null)).toBe('');
      expect(sanitizePhone(undefined)).toBe('');
    });
  });

  // ── 3. validateDataStructure ───────────────────────────────────────────────
  describe('3. Validador de Estructura (validateDataStructure)', () => {
    it('Acepta objeto válido y retorna sus datos', () => {
      const valid = { title: 'T', quotaAmount: 10000, members: [{ id:'1', name:'A' }], periods: [{ id:'X', month:'JULIO', day:5 }], payments: [], expenses: [] };
      const r = validateDataStructure(valid);
      expect(r.title).toBe('T');
      expect(r.members.length).toBe(1);
    });
    it('Restaura INITIAL_DATA si los datos son nulos o corruptos', () => {
      expect(validateDataStructure(null)).toEqual(INITIAL_DATA);
      expect(validateDataStructure({})).toEqual(INITIAL_DATA);
    });
    it('Repara arrays faltantes con datos de INITIAL_DATA', () => {
      const r = validateDataStructure({ title: 'X', members: null, payments: 'bad' });
      expect(Array.isArray(r.members)).toBe(true);
      expect(Array.isArray(r.payments)).toBe(true);
    });
  });

  // ── 4. Métricas financieras ────────────────────────────────────────────────
  describe('4. Métricas Financieras', () => {
    it('Saldo neto = recaudado − gastos', () => {
      const totalCollected = INITIAL_DATA.payments.reduce((a, p) => a + (Number(p.amount) || 0), 0);
      const totalExpenses  = INITIAL_DATA.expenses.reduce((a, e) => a + (Number(e.amount) || 0), 0);
      expect(totalCollected).toBe(850000);
      expect(totalExpenses).toBe(170500);
      expect(totalCollected - totalExpenses).toBe(679500);
    });
  });

  // ── 5. Añadir integrante ───────────────────────────────────────────────────
  describe('5. Validación del Formulario — Añadir Integrante', () => {
    it('Crea miembro con los 3 campos completos (DD/MM)', () => {
      const r = validateMemberForm({ name: 'María López', phone: '3001234567', birthdayDay: '15', birthdayMonth: '7' });
      expect(r.ok).toBe(true);
      expect(r.member.birthday).toBe('15/07');
    });
    it('Rellena con ceros el día y mes si son menores de 10', () => {
      const r = validateMemberForm({ name: 'Ana', phone: '3001111111', birthdayDay: '3', birthdayMonth: '4' });
      expect(r.ok).toBe(true);
      expect(r.member.birthday).toBe('03/04');
    });
    it('Rechaza nombre vacío', () => {
      const r = validateMemberForm({ name: '', phone: '3001234567', birthdayDay: '10', birthdayMonth: '5' });
      expect(r.ok).toBe(false);
      expect(r.error).toContain('nombre');
    });
    it('Rechaza celular vacío', () => {
      const r = validateMemberForm({ name: 'Juan', phone: '', birthdayDay: '10', birthdayMonth: '5' });
      expect(r.ok).toBe(false);
      expect(r.error).toContain('celular');
    });
    it('Rechaza cumpleaños incompleto', () => {
      const r = validateMemberForm({ name: 'Juan', phone: '3001234567', birthdayDay: '', birthdayMonth: '' });
      expect(r.ok).toBe(false);
      expect(r.error).toContain('cumpleaños');
    });
    it('Recorta espacios del nombre', () => {
      const r = validateMemberForm({ name: '  Pedro  ', phone: '3009876543', birthdayDay: '22', birthdayMonth: '3' });
      expect(r.ok).toBe(true);
      expect(r.member.name).toBe('Pedro');
    });
  });

  // ── 6. Cumpleañeros del mes ────────────────────────────────────────────────
  describe('6. Cumpleañeros del Mes (DD/MM)', () => {
    const members = [
      { id: 'm1', name: 'Ana Torres',    phone: '3001', birthday: '05/07' },
      { id: 'm2', name: 'Carlos Ruiz',   phone: '3002', birthday: '20/07' },
      { id: 'm3', name: 'Luisa Gómez',   phone: '3003', birthday: '25/12' },
      { id: 'm4', name: 'Pedro Ríos',    phone: '3004', birthday: '01/07' },
      { id: 'm5', name: 'Sin Cumple',    phone: '3005', birthday: null    },
      { id: 'm6', name: 'Sin Fecha',     phone: '3006'                    },
    ];

    it('Retorna solo los integrantes del mes indicado', () => {
      const r = getBirthdayMembersForMonth(members, 7);
      expect(r.map(m => m.name)).toContain('Ana Torres');
      expect(r.map(m => m.name)).toContain('Carlos Ruiz');
      expect(r.map(m => m.name)).not.toContain('Luisa Gómez');
    });
    it('Retorna lista vacía si nadie cumple ese mes', () => {
      expect(getBirthdayMembersForMonth(members, 3)).toHaveLength(0);
    });
    it('Ordena por día ascendente', () => {
      const dias = getBirthdayMembersForMonth(members, 7).map(m => m.day);
      expect(dias).toEqual([...dias].sort((a, b) => a - b));
    });
    it('Ignora miembros sin birthday o birthday null', () => {
      const nombres = getBirthdayMembersForMonth(members, 7).map(m => m.name);
      expect(nombres).not.toContain('Sin Cumple');
      expect(nombres).not.toContain('Sin Fecha');
    });
    it('Incluye monthName en español', () => {
      const r = getBirthdayMembersForMonth(members, 7);
      r.forEach(m => expect(m.monthName).toBe('julio'));
    });
  });

  // ── 7. Editar integrante (NUEVO) ───────────────────────────────────────────
  describe('7. Editar Integrante — buildEditForm y applyEditMember', () => {
    const baseMember = { id: '5', name: 'OSCAR AGUDELO', phone: '3117717498', birthday: '15/04' };
    const members = [
      { id: '1', name: 'ANDRES VASQUEZ', phone: '3183845272', birthday: '29/03' },
      baseMember,
      { id: '12', name: 'DANIEL UNDA',    phone: '3125160632', birthday: '03/07' },
    ];

    it('buildEditForm pre-rellena correctamente el formulario desde DD/MM', () => {
      const form = buildEditForm(baseMember);
      expect(form.id).toBe('5');
      expect(form.name).toBe('OSCAR AGUDELO');
      expect(form.phone).toBe('3117717498');
      expect(form.birthdayDay).toBe('15');
      expect(form.birthdayMonth).toBe('4');
    });

    it('buildEditForm deja vacíos día y mes si no hay birthday', () => {
      const form = buildEditForm({ id: '3', name: 'SIN FECHA', phone: '3001' });
      expect(form.birthdayDay).toBe('');
      expect(form.birthdayMonth).toBe('');
    });

    it('applyEditMember actualiza solo el miembro correcto', () => {
      const editForm = { id: '5', name: 'OSCAR A. AGUDELO', phone: '3117777777', birthdayDay: '15', birthdayMonth: '4' };
      const r = applyEditMember(members, editForm);
      expect(r.ok).toBe(true);
      const updated = r.members.find(m => m.id === '5');
      expect(updated.name).toBe('OSCAR A. AGUDELO');
      expect(updated.phone).toBe('3117777777');
      expect(updated.birthday).toBe('15/04');
    });

    it('applyEditMember NO modifica los otros integrantes', () => {
      const editForm = { id: '5', name: 'OSCAR NUEVO', phone: '3000000000', birthdayDay: '15', birthdayMonth: '4' };
      const r = applyEditMember(members, editForm);
      const andres = r.members.find(m => m.id === '1');
      const daniel = r.members.find(m => m.id === '12');
      expect(andres.name).toBe('ANDRES VASQUEZ');
      expect(daniel.name).toBe('DANIEL UNDA');
    });

    it('applyEditMember formatea DD/MM correctamente con padding de ceros', () => {
      const editForm = { id: '5', name: 'OSCAR', phone: '3111', birthdayDay: '3', birthdayMonth: '7' };
      const r = applyEditMember(members, editForm);
      expect(r.members.find(m => m.id === '5').birthday).toBe('03/07');
    });

    it('applyEditMember rechaza nombre vacío', () => {
      const r = applyEditMember(members, { id:'5', name:'', phone:'3111', birthdayDay:'15', birthdayMonth:'4' });
      expect(r.ok).toBe(false);
      expect(r.error).toContain('nombre');
    });

    it('applyEditMember rechaza celular vacío', () => {
      const r = applyEditMember(members, { id:'5', name:'Oscar', phone:'', birthdayDay:'15', birthdayMonth:'4' });
      expect(r.ok).toBe(false);
      expect(r.error).toContain('celular');
    });

    it('applyEditMember rechaza cuando falta día o mes', () => {
      const r = applyEditMember(members, { id:'5', name:'Oscar', phone:'3111', birthdayDay:'', birthdayMonth:'' });
      expect(r.ok).toBe(false);
      expect(r.error).toContain('cumpleaños');
    });

    it('Verificar que todos los miembros de INITIAL_DATA tienen birthday en formato DD/MM', () => {
      const invalid = INITIAL_DATA.members.filter(m => {
        if (!m.birthday) return true; // vacío → inválido
        const parts = m.birthday.split('/');
        return parts.length !== 2 || isNaN(parseInt(parts[0])) || isNaN(parseInt(parts[1]));
      });
      expect(invalid).toHaveLength(0);
    });
  });

});
