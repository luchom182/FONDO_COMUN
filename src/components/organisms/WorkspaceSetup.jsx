import { useState } from 'react';
import { Field, FormActions, FormFeedback, WorkspaceDialog } from '../molecules/WorkspaceDialog';
import { cloudEnabled } from '../../services/workspaceCloud';
import { parseWorkspaceLink, validatePasswords } from '../../services/workspaceStorage';
import { settings } from '../../../functions/domain.js';

export function SettingsFields({ values, update }) {
  return <>
    <Field label="Nombre del workspace" required maxLength={80} value={values.name}
      placeholder="Ej. Ahorro familiar" onChange={e => update('name', e.target.value)} />
    <div className="workspace-form-grid">
      <Field label="Meta de ahorro (COP)" type="number" inputMode="numeric" required min="1" max="1000000000000" step="1"
        value={values.goalAmount} onChange={e => update('goalAmount', e.target.value)} />
      <Field label="Cuota sugerida (COP)" type="number" inputMode="numeric" required min="1" max="1000000000000" step="1"
        value={values.quotaAmount} onChange={e => update('quotaAmount', e.target.value)} />
    </div>
    <Field label="Fecha objetivo (opcional)" type="date" value={values.deadline}
      onChange={e => update('deadline', e.target.value)} />
  </>;
}

export function CredentialFields({ values, update }) {
  return <>
    <Field label="Clave de administrador" type="password" required minLength={8} maxLength={128} autoComplete="new-password"
      value={values.password} onChange={e => update('password', e.target.value)} hint="Usa al menos 8 caracteres. Solo quien administra necesita esta clave." />
    <Field label="Clave de recuperación" type="password" required minLength={8} maxLength={128} autoComplete="new-password"
      value={values.recoveryKey} onChange={e => update('recoveryKey', e.target.value)} hint="Guárdala para restablecer el acceso si olvidas la clave de administrador." />
  </>;
}

export function CreateWorkspace({ onCreate, onClose }) {
  const [values, setValues] = useState({ name: '', goalAmount: '', quotaAmount: '10000', deadline: '',
    password: '', recoveryKey: '', mode: cloudEnabled ? 'cloud' : 'local' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const update = (name, value) => setValues(previous => ({ ...previous, [name]: value }));
  const submit = async event => {
    event.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      settings(values);
      validatePasswords(values.password, values.recoveryKey);
      await onCreate(values);
    } catch (e) { setError(e.message); setBusy(false); }
  };
  return <WorkspaceDialog title="Crear workspace de ahorro" onClose={onClose} busy={busy}>
    <p className="workspace-description">Define una meta y reúne los aportes de tu grupo en un fondo propio.</p>
    <form onSubmit={submit}>
      <fieldset disabled={busy}>
        <SettingsFields values={values} update={update} />
        <Field label="Dónde guardar el workspace" value={values.mode} onChange={e => update('mode', e.target.value)}>
          <option value="cloud" disabled={!cloudEnabled}>Compartido · Firebase</option>
          <option value="local">Local · este navegador</option>
        </Field>
        <p className="workspace-hint workspace-mode-help">{values.mode === 'local' ?
          'Se guardará solo en este navegador. Para compartir entre dispositivos, crea un workspace compartido con Firebase habilitado.' :
          'Tu grupo podrá consultar el fondo desde su enlace. Solo el administrador podrá registrar cambios.'}</p>
        <CredentialFields values={values} update={update} />
      </fieldset>
      <FormFeedback error={error} />
      <FormActions busy={busy} onClose={onClose} label="Crear workspace" />
    </form>
  </WorkspaceDialog>;
}

export function OpenWorkspace({ onOpen, onClose }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  return <WorkspaceDialog title="Abrir workspace compartido" onClose={onClose}>
    <form onSubmit={event => {
      event.preventDefault();
      try { onOpen(parseWorkspaceLink(value)); } catch (e) { setError(e.message); }
    }}>
      <Field label="Enlace o código del workspace" required value={value} onChange={e => setValue(e.target.value)}
        hint="Pide el enlace de consulta al administrador de tu fondo." />
      <FormFeedback error={error} />
      <FormActions onClose={onClose} label="Abrir workspace" />
    </form>
  </WorkspaceDialog>;
}
