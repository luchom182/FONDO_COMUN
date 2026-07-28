import { describe, it, expect } from 'vitest';
import { formatCOP, sanitizePhone, validateDataStructure } from '../App';
import { INITIAL_DATA } from '../initialData';

describe('Resistencia a Errores y Pruebas Unitarias - Fondo Común', () => {

  describe('1. Formateador de Moneda COP (formatCOP)', () => {
    it('Debe formatear números válidos en Pesos Colombianos', () => {
      const formatted = formatCOP(10000);
      expect(formatted).toContain('10.000');
    });

    it('Debe manejar 0 correctamente', () => {
      const formatted = formatCOP(0);
      expect(formatted).toContain('0');
    });

    it('Debe protegerse contra valores NaN, null o undefined retornando $ 0', () => {
      expect(formatCOP(NaN)).toContain('0');
      expect(formatCOP(null)).toContain('0');
      expect(formatCOP(undefined)).toContain('0');
      expect(formatCOP('texto_invalido')).toContain('0');
    });
  });

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

});
