import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { formatDate, formatMoney } from '../../utils/workspaceFormat';

export function WorkspaceLedger({ fund, isAdmin, canEdit, open }) {
  const [tab, setTab] = useState('movements');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [month, setMonth] = useState('all');
  const [visibleCount, setVisibleCount] = useState(30);
  const membersById = useMemo(() => new Map(fund.members.map(m => [m.id, m])), [fund.members]);
  const months = [...new Set(fund.movements.map(m => m.date.slice(0, 7)))].sort().reverse();
  const movements = useMemo(() => fund.movements.filter(m => (type === 'all' || m.type === type) &&
    (month === 'all' || m.date.startsWith(month)) && `${m.description} ${membersById.get(m.memberId)?.name || ''}`
      .toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
  [fund.movements, month, type, search, membersById]);
  const memberTotals = useMemo(() => {
    const result = new Map();
    fund.movements.filter(m => m.type === 'contribution').forEach(m => result.set(m.memberId, (result.get(m.memberId) || 0) + m.amount));
    return result;
  }, [fund.movements]);

  return <section className="workspace-ledger" aria-label="Detalle del ahorro">
    <div className="workspace-section-heading">
      <div className="tab-group" role="tablist" aria-label="Detalle del workspace">
        <button id="movements-tab" className={`tab-btn ${tab === 'movements' ? 'active' : ''}`} role="tab"
          aria-selected={tab === 'movements'} aria-controls="workspace-ledger-panel" onClick={() => setTab('movements')}>Movimientos ({fund.movements.length})</button>
        <button id="members-tab" className={`tab-btn ${tab === 'members' ? 'active' : ''}`} role="tab"
          aria-selected={tab === 'members'} aria-controls="workspace-ledger-panel" onClick={() => setTab('members')}><Users size={16} /> Integrantes ({fund.members.length})</button>
      </div>
      {isAdmin && <button className="btn btn-outline" disabled={!canEdit} onClick={() => open({ type: 'member' })}><Plus size={16} /> Añadir integrante</button>}
    </div>
    <div id="workspace-ledger-panel" role="tabpanel" aria-labelledby={tab === 'members' ? 'members-tab' : 'movements-tab'}>
      {tab === 'movements' ? <>
        <div className="workspace-filters">
          <label className="workspace-search"><Search size={18} aria-hidden="true" />
            <input aria-label="Buscar movimientos" placeholder="Buscar concepto o integrante" value={search}
              onChange={e => { setSearch(e.target.value); setVisibleCount(30); }} />
          </label>
          <label>Tipo<select className="form-select" value={type} onChange={e => { setType(e.target.value); setVisibleCount(30); }}>
            <option value="all">Todos los movimientos</option><option value="contribution">Aportes</option><option value="expense">Gastos</option>
          </select></label>
          <label>Mes<select className="form-select" value={month} onChange={e => { setMonth(e.target.value); setVisibleCount(30); }}>
            <option value="all">Todos los meses</option>{months.map(value => <option key={value} value={value}>{new Date(`${value}-01T12:00:00`).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}</option>)}
          </select></label>
        </div>
        {movements.length ? <>
          <ul className="workspace-movements">
            {movements.slice(0, visibleCount).map(movement => <li key={movement.id} className="workspace-movement">
              <span className={`workspace-movement-icon ${movement.type}`} aria-hidden="true">{movement.type === 'contribution' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}</span>
              <div className="workspace-movement-detail"><strong>{movement.description}</strong>
                <span>{movement.type === 'contribution' ? `Aporte · ${membersById.get(movement.memberId)?.name || 'Integrante'}` : 'Gasto del fondo'} · {formatDate(movement.date)}</span>
              </div>
              <strong className={`workspace-amount ${movement.type}`}>{movement.type === 'contribution' ? '+' : '−'}{formatMoney(movement.amount)}</strong>
              {isAdmin && <button className="btn btn-outline workspace-icon-button" disabled={!canEdit}
                aria-label={`Eliminar ${movement.description}`} onClick={() => open({ type: 'delete', movement })}><Trash2 size={17} /></button>}
            </li>)}
          </ul>
          {movements.length > visibleCount && <button className="btn btn-outline" onClick={() => setVisibleCount(n => n + 30)}>Mostrar más movimientos</button>}
        </> : <div className="workspace-empty">
          <h3>{fund.movements.length ? 'No hay movimientos con estos filtros' : 'El primer aporte inicia la meta'}</h3>
          <p>{fund.movements.length ? 'Prueba otro mes, tipo o búsqueda.' : fund.members.length ?
            'Cada aporte y gasto quedará registrado aquí para todo el grupo.' : 'Añade a los integrantes del grupo para comenzar a registrar sus aportes.'}</p>
          {isAdmin && !fund.movements.length && <button className="btn btn-primary" disabled={!canEdit}
            onClick={() => open({ type: fund.members.length ? 'contribution' : 'member' })}>
            <Plus size={16} /> {fund.members.length ? 'Registrar primer aporte' : 'Añadir primer integrante'}</button>}
        </div>}
      </> : fund.members.length ? <ul className="workspace-members">
        {fund.members.map(member => <li key={member.id}>
          <div className="workspace-member-name"><strong>{member.name}</strong><span>{member.phone || 'Sin celular registrado'}</span></div>
          <div className="workspace-member-total"><strong>{formatMoney(memberTotals.get(member.id) || 0)}</strong><span>Aportado al fondo</span></div>
          {isAdmin && <div className="workspace-actions">
            <button className="btn btn-outline workspace-icon-button" disabled={!canEdit} aria-label={`Editar a ${member.name}`}
              onClick={() => open({ type: 'member', member })}><Pencil size={16} /></button>
            <button className="btn btn-outline" disabled={!canEdit} onClick={() => open({ type: 'contribution', memberId: member.id })}>Registrar aporte</button>
          </div>}
        </li>)}
      </ul> : <div className="workspace-empty"><h3>Tu grupo empieza aquí</h3><p>Los integrantes y sus aportes acumulados aparecerán en esta lista.</p>
        {isAdmin && <button className="btn btn-primary" disabled={!canEdit} onClick={() => open({ type: 'member' })}>Añadir primer integrante</button>}
      </div>}
    </div>
  </section>;
}
