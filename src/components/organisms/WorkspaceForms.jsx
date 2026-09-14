import { useState } from 'react';
import { Field, FormActions, FormFeedback, WorkspaceDialog } from '../molecules/WorkspaceDialog';
import { CredentialFields, SettingsFields } from './WorkspaceSetup';
import { today } from '../../utils/workspaceFormat';

export function AccessWorkspace({ api, onClose, change = false }) {
  const [recovery, setRecovery] = useState(false);
  const [values, setValues] = useState({ password: '', recoveryKey: '', newPassword: '' });
  const [error, setError] = useState('');
  const update = (key, value) => setValues(previous => ({ ...previous, [key]: value }));
  const submit = async event => {
    event.preventDefault();
    setError('');
    try {
      if (change) await api.changeCredentials(values);
      else await api.login({ ...values, recovery });
      onClose();
    } catch (e) { setError(e.message); }
  };
  return <WorkspaceDialog title={change ? 'Cambiar claves del workspace' : recovery ? 'Recuperar acceso' : 'Acceso administrador'}
    onClose={onClose} busy={api.busy}>
    <p className="workspace-description">{change ? 'Las claves nuevas reemplazan las anteriores y cierran las otras sesiones de administración.' :
      'El acceso se aplica únicamente a este workspace.'}</p>
    <form onSubmit={submit}>
      <fieldset disabled={api.busy}>
        {change ? <CredentialFields values={values} update={update} /> : recovery ? <>
          <Field label="Clave de recuperación" type="password" required maxLength={128} autoComplete="off"
            value={values.recoveryKey} onChange={e => update('recoveryKey', e.target.value)} />
          <Field label="Nueva clave de administrador" type="password" required minLength={8} maxLength={128} autoComplete="new-password"
            value={values.newPassword} onChange={e => update('newPassword', e.target.value)} />
        </> : <Field label="Clave de administrador" type="password" required maxLength={128} autoComplete="current-password"
          value={values.password} onChange={e => update('password', e.target.value)} />}
      </fieldset>
      <FormFeedback error={error} />
      {!change && <button type="button" className="workspace-text-button" disabled={api.busy}
        onClick={() => { setRecovery(!recovery); setError(''); }}>
        {recovery ? 'Volver al acceso administrador' : '¿Olvidaste tu clave?'}
      </button>}
      <FormActions busy={api.busy} onClose={onClose} label={change ? 'Guardar claves' : recovery ? 'Restablecer acceso' : 'Ingresar'} />
    </form>
  </WorkspaceDialog>;
}

export function EditWorkspace({ api, onClose }) {
  const [values, setValues] = useState(api.fund);
  const [error, setError] = useState('');
  return <WorkspaceDialog title="Configurar ahorro común" onClose={onClose} busy={api.busy}>
    <form onSubmit={async event => {
      event.preventDefault(); setError('');
      try { await api.mutate({ type: 'settings', input: values }); onClose(); } catch (e) { setError(e.message); }
    }}>
      <fieldset disabled={api.busy}><SettingsFields values={values}
        update={(key, value) => setValues(previous => ({ ...previous, [key]: value }))} /></fieldset>
      <FormFeedback error={error} /><FormActions busy={api.busy} onClose={onClose} />
    </form>
  </WorkspaceDialog>;
}

export function MemberForm({ api, member, onClose }) {
  const [values, setValues] = useState(member || { name: '', phone: '' });
  const [error, setError] = useState('');
  return <WorkspaceDialog title={member ? 'Editar integrante' : 'Añadir integrante'} onClose={onClose} busy={api.busy}>
    <form onSubmit={async event => {
      event.preventDefault(); setError('');
      try { await api.mutate({ type: member ? 'editMember' : 'addMember', input: values }); onClose(); }
      catch (e) { setError(e.message); }
    }}>
      <fieldset disabled={api.busy}>
        <Field label="Nombre del integrante" required maxLength={100} value={values.name}
          onChange={e => setValues(previous => ({ ...previous, name: e.target.value }))} />
        <Field label="Celular (opcional)" type="tel" maxLength={25} value={values.phone}
          onChange={e => setValues(previous => ({ ...previous, phone: e.target.value }))} />
      </fieldset>
      <FormFeedback error={error} /><FormActions busy={api.busy} onClose={onClose} label="Guardar integrante" />
    </form>
  </WorkspaceDialog>;
}

export function MovementForm({ api, type, memberId = '', onClose }) {
  const [values, setValues] = useState({ type, memberId: memberId || api.fund.members[0]?.id || '',
    amount: type === 'contribution' ? api.fund.quotaAmount : '', date: today(),
    description: type === 'contribution' ? 'Aporte al ahorro común' : '' });
  const [error, setError] = useState('');
  const update = (key, value) => setValues(previous => ({ ...previous, [key]: value }));
  return <WorkspaceDialog title={type === 'contribution' ? 'Registrar aporte' : 'Registrar gasto'} onClose={onClose} busy={api.busy}>
    <form onSubmit={async event => {
      event.preventDefault(); setError('');
      try { await api.mutate({ type: 'addMovement', input: values }); onClose(); } catch (e) { setError(e.message); }
    }}>
      <fieldset disabled={api.busy}>
        {type === 'contribution' && <Field label="Integrante" required value={values.memberId} onChange={e => update('memberId', e.target.value)}>
          <option value="">Selecciona un integrante</option>
          {api.fund.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
        </Field>}
        <div className="workspace-form-grid">
          <Field label="Monto (COP)" type="number" inputMode="numeric" required min="1" max="1000000000000" step="1"
            value={values.amount} onChange={e => update('amount', e.target.value)} />
          <Field label="Fecha" type="date" required value={values.date} onChange={e => update('date', e.target.value)} />
        </div>
        <Field label="Concepto" required maxLength={200} value={values.description} onChange={e => update('description', e.target.value)} />
      </fieldset>
      <FormFeedback error={error} /><FormActions busy={api.busy} onClose={onClose} label={type === 'contribution' ? 'Guardar aporte' : 'Guardar gasto'} />
    </form>
  </WorkspaceDialog>;
}

export function DeleteMovement({ api, movement, onClose }) {
  const [error, setError] = useState('');
  return <WorkspaceDialog title="Eliminar movimiento" onClose={onClose} busy={api.busy}>
    <p className="workspace-description">Se eliminará «{movement.description}» y se recalculará el saldo del fondo.</p>
    <form onSubmit={async event => {
      event.preventDefault(); setError('');
      try { await api.mutate({ type: 'deleteMovement', input: { id: movement.id } }); onClose(); }
      catch (e) { setError(e.message); }
    }}><FormFeedback error={error} /><FormActions busy={api.busy} onClose={onClose} label="Eliminar movimiento" /></form>
  </WorkspaceDialog>;
}
