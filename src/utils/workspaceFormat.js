import { totals } from '../../functions/domain.js';

export const formatMoney = value => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
}).format(Number.isFinite(Number(value)) ? Number(value) : 0);

export function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export const formatDate = value => new Intl.DateTimeFormat('es-CO', {
  day: 'numeric', month: 'short', year: 'numeric',
}).format(new Date(`${value}T12:00:00`));

export async function exportWorkspace(fund) {
  const XLSX = await import('xlsx');
  const summary = totals(fund);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Workspace', fund.name], ['Meta (COP)', fund.goalAmount], ['Fecha objetivo', fund.deadline],
    ['Cuota sugerida (COP)', fund.quotaAmount], ['Aportes (COP)', summary.contributions],
    ['Gastos (COP)', summary.expenses], ['Saldo (COP)', summary.balance],
  ]), 'Resumen');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Nombre', 'Celular', 'Aportado (COP)'], ...fund.members.map(member => [member.name, member.phone,
      fund.movements.filter(m => m.memberId === member.id).reduce((sum, m) => sum + m.amount, 0)]),
  ]), 'Integrantes');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Fecha', 'Tipo', 'Integrante', 'Concepto', 'Monto (COP)'], ...fund.movements.map(movement => [
      movement.date, movement.type === 'contribution' ? 'Aporte' : 'Gasto',
      fund.members.find(member => member.id === movement.memberId)?.name || '', movement.description,
      movement.type === 'expense' ? -movement.amount : movement.amount,
    ]),
  ]), 'Movimientos');
  const name = fund.name.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 60);
  XLSX.writeFile(workbook, `${name}_${today()}.xlsx`);
}
