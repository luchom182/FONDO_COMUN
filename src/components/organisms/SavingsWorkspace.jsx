import { useState } from 'react';
import { Check, Cloud, Copy, Download, KeyRound, LockKeyhole, LogOut, Plus, Settings, Wallet } from 'lucide-react';
import { totals } from '../../../functions/domain.js';
import { useWorkspace } from '../../hooks/useWorkspace';
import { shareLink } from '../../services/workspaceStorage';
import { exportWorkspace, formatDate, formatMoney, today } from '../../utils/workspaceFormat';
import { AccessWorkspace, DeleteMovement, EditWorkspace, MemberForm, MovementForm } from './WorkspaceForms';
import { WorkspaceLedger } from './WorkspaceLedger';
import { Field, WorkspaceDialog } from '../molecules/WorkspaceDialog';

const STATUS = { loading: 'Conectando…', local: 'Guardado en este navegador', synced: 'Sincronizado con el grupo',
  offline: 'Sin conexión · solo consulta', missing: 'Workspace no encontrado', error: 'Conexión no disponible' };

function ShareWorkspace({ id, onClose }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const url = shareLink(id);
  return <WorkspaceDialog title="Compartir ahorro común" onClose={onClose}>
    <p className="workspace-description">Cualquier persona con este enlace puede consultar los integrantes, aportes y gastos. La clave de administrador se comparte por separado.</p>
    <Field label="Enlace de consulta" readOnly value={url} onFocus={e => e.target.select()} />
    <div className="workspace-actions">
      <button className="btn btn-primary" onClick={async () => {
        try { await navigator.clipboard.writeText(url); setCopied(true); setError(''); }
        catch { setError('Selecciona el enlace y cópialo manualmente.'); }
      }}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? 'Enlace copiado' : 'Copiar enlace'}</button>
      <button className="btn btn-outline" onClick={onClose}>Listo</button>
    </div>
    <p role="status" className="workspace-hint">{error || (copied ? 'El enlace está listo para compartir con tu grupo.' : '')}</p>
  </WorkspaceDialog>;
}

export default function SavingsWorkspace({ workspace }) {
  const api = useWorkspace(workspace);
  const [modal, setModal] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const { fund, status, error, busy, isAdmin } = api;
  const close = () => setModal(null);
  if (!fund) return <main className="workspace-page workspace-empty" aria-busy={status === 'loading'}>
    <Wallet size={36} aria-hidden="true" />
    <h1>{status === 'loading' ? 'Abriendo tu ahorro común…' : 'No se pudo abrir el workspace'}</h1>
    <p role={error ? 'alert' : 'status'}>{error || 'Cargando los datos del fondo.'}</p>
    {status !== 'loading' && <button className="btn btn-outline" onClick={api.retry}>Reintentar</button>}
  </main>;

  const summary = totals(fund);
  const canEdit = isAdmin && !busy && ['local', 'synced'].includes(status);
  const deadlinePassed = fund.deadline && fund.deadline < today() && summary.remaining > 0;
  return <main className="workspace-page">
    <header className="workspace-heading">
      <div><h1>{fund.name}</h1><p className="workspace-sync" role="status"><Cloud size={15} aria-hidden="true" />{STATUS[status]}</p></div>
      <div className="workspace-actions">
        {workspace.mode === 'cloud' && <button className="btn btn-outline" onClick={() => setModal({ type: 'share' })}><Copy size={16} /> Compartir</button>}
        <button className="btn btn-outline" disabled={exporting} onClick={async () => {
          setExporting(true); setExportError('');
          try { await exportWorkspace(fund); } catch { setExportError('No se pudo exportar el archivo. Intenta nuevamente.'); }
          finally { setExporting(false); }
        }}><Download size={16} />{exporting ? 'Exportando…' : 'Exportar Excel'}</button>
        {isAdmin ? <button className="btn btn-outline" disabled={busy} onClick={() => { api.logout(); close(); }}><LogOut size={16} /> Salir de admin</button> :
          <button className="btn btn-primary" onClick={() => setModal({ type: 'login' })}><LockKeyhole size={16} /> Acceso administrador</button>}
      </div>
    </header>
    {error && <div className="workspace-notice"><p role="alert">{error}</p><button className="btn btn-outline" onClick={api.retry}>Reintentar</button></div>}
    {exportError && <p className="workspace-error" role="alert">{exportError}</p>}

    <section className="workspace-goal" aria-labelledby="savings-heading">
      <div className="workspace-goal-main">
        <h2 id="savings-heading">Ahorro común</h2>
        <p className="workspace-balance">{formatMoney(summary.balance)}</p>
        <p className="workspace-goal-caption">disponibles de una meta de <strong>{formatMoney(fund.goalAmount)}</strong></p>
        <div className="workspace-progress-label"><span>{summary.remaining === 0 ? '¡Meta alcanzada!' : `Faltan ${formatMoney(summary.remaining)}`}</span><strong>{summary.progress}%</strong></div>
        <progress max="100" value={summary.progress} aria-label="Avance hacia la meta de ahorro" />
        {fund.deadline && <p className={`workspace-deadline ${deadlinePassed ? 'overdue' : ''}`}>{deadlinePassed ? 'Fecha objetivo cumplida' : 'Fecha objetivo'}: {formatDate(fund.deadline)}{deadlinePassed ? ' · la meta sigue abierta' : ''}</p>}
      </div>
      <div className="workspace-goal-detail">
        <dl><div><dt>Aportes recibidos</dt><dd>{formatMoney(summary.contributions)}</dd></div>
          <div><dt>Gastos del fondo</dt><dd>{formatMoney(summary.expenses)}</dd></div>
          <div><dt>Cuota sugerida</dt><dd>{formatMoney(fund.quotaAmount)}</dd></div>
          <div><dt>Integrantes</dt><dd>{fund.members.length}</dd></div></dl>
        <p className="workspace-hint">El avance se calcula con los aportes menos los gastos.</p>
      </div>
    </section>

    <div className="workspace-command-bar">
      {isAdmin ? <>
        <div className="workspace-actions">
          <button className="btn btn-primary" disabled={!canEdit || !fund.members.length} onClick={() => setModal({ type: 'contribution' })}><Plus size={18} /> Registrar aporte</button>
          <button className="btn btn-outline" disabled={!canEdit || summary.balance <= 0} onClick={() => setModal({ type: 'expense' })}>Registrar gasto</button>
        </div>
        <div className="workspace-actions">
          <button className="btn btn-outline" disabled={!canEdit} onClick={() => setModal({ type: 'settings' })}><Settings size={16} /> Configurar</button>
          <button className="btn btn-outline" disabled={!canEdit} onClick={() => setModal({ type: 'credentials' })}><KeyRound size={16} /> Cambiar claves</button>
        </div>
      </> : <p className="workspace-hint"><LockKeyhole size={16} aria-hidden="true" /> Estás en modo consulta. El administrador registra los aportes y gastos del grupo.</p>}
    </div>
    <WorkspaceLedger fund={fund} isAdmin={isAdmin} canEdit={canEdit} open={setModal} />

    {modal?.type === 'share' && <ShareWorkspace id={workspace.id} onClose={close} />}
    {modal?.type === 'login' && <AccessWorkspace api={api} onClose={close} />}
    {isAdmin && <>
      {modal?.type === 'credentials' && <AccessWorkspace api={api} onClose={close} change />}
      {modal?.type === 'settings' && <EditWorkspace api={api} onClose={close} />}
      {modal?.type === 'member' && <MemberForm api={api} member={modal.member} onClose={close} />}
      {['contribution', 'expense'].includes(modal?.type) && <MovementForm api={api} type={modal.type} memberId={modal.memberId} onClose={close} />}
      {modal?.type === 'delete' && <DeleteMovement api={api} movement={modal.movement} onClose={close} />}
    </>}
  </main>;
}
