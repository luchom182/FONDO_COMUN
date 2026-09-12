// Pure domain shared by the browser and Cloud Functions. Amounts are whole COP.
export const MONTHS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

export function text(value, label, max = 100) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw new Error(`${label}: escribe entre 1 y ${max} caracteres.`);
  }
  return value.trim();
}

export function money(value, label = 'Monto') {
  const amount = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1_000_000_000_000) {
    throw new Error(`${label}: ingresa un valor entero entre 1 y 1.000.000.000.000 COP.`);
  }
  return amount;
}

export function dateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) {
    throw new Error('Selecciona una fecha válida.');
  }
  return value;
}

export function settings(input) {
  return {
    name: text(input.name, 'Nombre', 80),
    goalAmount: money(input.goalAmount, 'Meta de ahorro'),
    quotaAmount: money(input.quotaAmount, 'Cuota sugerida'),
    deadline: input.deadline ? dateOnly(input.deadline) : '',
  };
}

export function createFund(input, now = new Date().toISOString()) {
  return { ...settings(input), schemaVersion: 1, revision: 0, createdAt: now,
    updatedAt: now, members: [], movements: [] };
}

export function totals(fund) {
  const contributions = fund.movements.filter(m => m.type === 'contribution')
    .reduce((sum, m) => sum + m.amount, 0);
  const expenses = fund.movements.filter(m => m.type === 'expense')
    .reduce((sum, m) => sum + m.amount, 0);
  const balance = contributions - expenses;
  return { contributions, expenses, balance, remaining: Math.max(0, fund.goalAmount - balance),
    progress: Math.max(0, Math.min(100, Math.floor(balance / fund.goalAmount * 100))) };
}

export function memberInput(input) {
  const phone = String(input.phone || '').replace(/[\s()+-]/g, '');
  if (phone && !/^\d{7,15}$/.test(phone)) throw new Error('El celular debe tener entre 7 y 15 dígitos.');
  return { name: text(input.name, 'Nombre del integrante'), phone };
}

export function applyCommand(fund, command, id, now = new Date().toISOString()) {
  const input = command?.input || {};
  let changes;
  switch (command?.type) {
    case 'settings':
      changes = settings(input);
      break;
    case 'addMember':
      if (fund.members.length >= 150) throw new Error('Este workspace admite hasta 150 integrantes.');
      changes = { members: [...fund.members, { id, ...memberInput(input) }] };
      break;
    case 'editMember':
      if (!fund.members.some(m => m.id === input.id)) throw new Error('El integrante ya no existe.');
      changes = { members: fund.members.map(m => m.id === input.id ? { ...m, ...memberInput(input) } : m) };
      break;
    case 'addMovement': {
      if (!['contribution', 'expense'].includes(input.type)) throw new Error('Tipo de movimiento inválido.');
      if (fund.movements.length >= 1500) throw new Error('Se alcanzó el límite de 1.500 movimientos de este workspace.');
      const amount = money(input.amount);
      if (input.type === 'expense' && amount > totals(fund).balance) {
        throw new Error('El gasto supera el saldo disponible del workspace.');
      }
      const member = fund.members.find(m => m.id === input.memberId);
      if (input.type === 'contribution' && !member) throw new Error('Selecciona un integrante del workspace.');
      const movement = { id, type: input.type, amount, date: dateOnly(input.date),
        description: text(input.description, 'Concepto', 200),
        memberId: input.type === 'contribution' ? member.id : '', createdAt: now };
      changes = { movements: [movement, ...fund.movements] };
      break;
    }
    case 'deleteMovement': {
      if (!fund.movements.some(m => m.id === input.id)) throw new Error('El movimiento ya no existe.');
      const movements = fund.movements.filter(m => m.id !== input.id);
      if (totals({ ...fund, movements }).balance < 0) {
        throw new Error('No puedes eliminar este aporte: dejaría el fondo con saldo negativo.');
      }
      changes = { movements };
      break;
    }
    default:
      throw new Error('Operación no reconocida.');
  }
  const next = { ...fund, ...changes, revision: fund.revision + 1, updatedAt: now };
  if (new TextEncoder().encode(JSON.stringify(next)).length > 800000) {
    throw new Error('El workspace alcanzó su capacidad de almacenamiento. Exporta el historial y crea un nuevo fondo.');
  }
  return next;
}
