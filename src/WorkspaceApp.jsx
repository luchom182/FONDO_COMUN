import { lazy, Suspense, useEffect, useState } from 'react';
import { FolderOpen, Plus, Wallet } from 'lucide-react';
import { CreateWorkspace, OpenWorkspace } from './components/organisms/WorkspaceSetup';
import SavingsWorkspace from './components/organisms/SavingsWorkspace';
import { createLocalWorkspace, getDirectory, ORIGINAL, rememberWorkspace, validId } from './services/workspaceStorage';
import { callWorkspace } from './services/workspaceCloud';
import { saveSession } from './hooks/useWorkspace';
import './workspace.css';

const OriginalFund = lazy(() => import('./App'));
const ACTIVE = 'fondo_workspace_active_v1';

function initialId() {
  const parameter = new URLSearchParams(window.location.search).get('workspace');
  if (parameter !== null) return parameter;
  try { return localStorage.getItem(ACTIVE) || ORIGINAL.id; } catch { return ORIGINAL.id; }
}

// THESIS: One selector separates independent savings funds; the active fund owns every action.
// OWN-WORLD: Inherit Fondo Común's dark navy, cyan controls, UI typography and rounded inputs.
// STORY: Choose a fund, see net savings against its goal, then consult or administer its ledger.
// FIRST VIEWPORT: Persistent workspace selector, fund name, savings progress and entry actions.
// FORM: Scoped extension of the incumbent app, with a shared savings ledger.
export default function WorkspaceApp() {
  const [directory, setDirectory] = useState(getDirectory);
  const [id, setId] = useState(initialId);
  const [modal, setModal] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const refresh = () => setDirectory(getDirectory());
    const navigate = () => { setId(initialId()); setModal(''); setNotice(''); };
    window.addEventListener('workspace-directory', refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener('popstate', navigate);
    return () => {
      window.removeEventListener('workspace-directory', refresh);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('popstate', navigate);
    };
  }, []);

  const select = next => {
    const url = new URL(window.location.href);
    url.searchParams.set('workspace', next);
    window.history.pushState({}, '', url);
    try { localStorage.setItem(ACTIVE, next); } catch { /* URL remains the active selection. */ }
    setId(next);
    setModal('');
    setNotice('');
  };

  const create = async values => {
    const result = values.mode === 'local' ? await createLocalWorkspace(values) :
      await callWorkspace('createSavingsWorkspace', values);
    const item = { id: result.id, name: result.fund.name, mode: values.mode };
    saveSession(result.id, result.token);
    // Creation already succeeded; a full directory must not invite a duplicate remote creation.
    let directoryError = '';
    try { rememberWorkspace(item); } catch (e) { directoryError = e.message; }
    select(result.id);
    setNotice(directoryError || `Workspace «${item.name}» creado. Añade a tu primer integrante para comenzar.`);
  };

  const known = directory.find(item => item.id === id);
  const workspace = known || { id, name: 'Workspace compartido', mode: id.startsWith('local-') ? 'local' : 'cloud' };
  const invalid = id !== ORIGINAL.id && !validId(id);
  return <div className="workspace-shell">
    <a className="workspace-skip" href="#active-workspace">Ir al workspace activo</a>
    <nav className="workspace-toolbar" aria-label="Workspaces de ahorro">
      <div className="workspace-toolbar-inner">
        <div className="workspace-picker"><Wallet size={22} aria-hidden="true" />
          <label htmlFor="workspace-selector">Workspace</label>
          <select id="workspace-selector" value={id} onChange={e => select(e.target.value)}>
            {!known && <option value={id}>{invalid ? 'Enlace inválido' : workspace.name}</option>}
            {directory.map(item => <option key={item.id} value={item.id}>{item.name}{item.mode === 'local' ? ' · Local' : ''}</option>)}
          </select>
        </div>
        <div className="workspace-actions">
          <button className="btn btn-outline" onClick={() => setModal('open')}><FolderOpen size={16} /> Abrir enlace</button>
          <button className="btn btn-primary" onClick={() => setModal('create')}><Plus size={17} /> Nuevo workspace</button>
        </div>
      </div>
    </nav>
    {notice && <p className="workspace-success" role="status">{notice}</p>}
    <div id="active-workspace" tabIndex={-1}>
      {invalid ? <main className="workspace-page workspace-empty"><h1>El enlace no es válido</h1><p>Comprueba el enlace del workspace o selecciona uno de tus fondos.</p>
        <button className="btn btn-outline" onClick={() => select(ORIGINAL.id)}>Abrir fondo original</button></main> :
        id === ORIGINAL.id ? <Suspense fallback={<p className="workspace-page" role="status">Cargando fondo original…</p>}><OriginalFund /></Suspense> :
          <SavingsWorkspace key={id} workspace={workspace} />}
    </div>
    {modal === 'create' && <CreateWorkspace onCreate={create} onClose={() => setModal('')} />}
    {modal === 'open' && <OpenWorkspace onOpen={select} onClose={() => setModal('')} />}
  </div>;
}
