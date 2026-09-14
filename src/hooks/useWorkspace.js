import { useCallback, useEffect, useRef, useState } from 'react';
import { accessLocalWorkspace, cacheWorkspace, changeLocalCredentials, mutateLocalWorkspace,
  readWorkspace, rememberWorkspace } from '../services/workspaceStorage';
import { callWorkspace, cloudEnabled, subscribeWorkspace } from '../services/workspaceCloud';

const sessionKey = id => `fondo_workspace_session:${id}`;
export function saveSession(id, token) {
  try { token ? sessionStorage.setItem(sessionKey(id), token) : sessionStorage.removeItem(sessionKey(id)); }
  catch { /* The current tab can still keep its session in memory. */ }
}

function readSession(id) {
  try { return sessionStorage.getItem(sessionKey(id)) || ''; } catch { return ''; }
}

// The parent keys the component by workspace id; subscriptions, forms and sessions are isolated.
export function useWorkspace(workspace) {
  const { id, mode } = workspace;
  const [fund, setFund] = useState(null);
  const [token, setToken] = useState(() => readSession(id));
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const lock = useRef(false);
  const mounted = useRef(true);
  const fundRef = useRef(null);

  useEffect(() => {
    mounted.current = true;
    let live = true;
    const accept = next => {
      if (!live) return;
      // Ignore a late response for an older revision.
      if (fundRef.current && next.revision < fundRef.current.revision) return;
      fundRef.current = next;
      setFund(next);
      try { rememberWorkspace({ id, mode, name: next.name }); } catch (e) { setError(e.message); }
    };
    const loadLocal = () => {
      try {
        const cached = readWorkspace(id);
        const next = mode === 'local' ? cached?.fund : cached;
        if (next?.schemaVersion === 1 && Array.isArray(next.members) && Array.isArray(next.movements)) accept(next);
        else if (mode === 'local') throw new Error('No se encontró el workspace local en este navegador.');
        if (mode === 'local') setStatus('local');
      } catch (e) { setError(e.message); setStatus('error'); }
    };
    loadLocal();
    if (mode === 'local') {
      const listener = event => { if (!event.key || event.key.includes(id)) loadLocal(); };
      window.addEventListener('storage', listener);
      return () => { live = false; mounted.current = false; window.removeEventListener('storage', listener); };
    }
    if (!cloudEnabled) {
      setStatus('error');
      setError('Esta instalación aún no tiene habilitados los workspaces compartidos. Consulta la configuración de Firebase en el README.');
      return () => { live = false; mounted.current = false; };
    }
    const timer = setTimeout(() => {
      if (live) { setStatus('offline'); setError('La conexión está tardando. Puedes reintentar; los datos guardados son de solo consulta.'); }
    }, 10000);
    const unsubscribe = subscribeWorkspace(id, (next, fromCache) => {
      if (!live) return;
      if (!fromCache) clearTimeout(timer);
      if (!next) {
        if (!fromCache) {
          fundRef.current = null;
          setFund(null);
          setStatus('missing');
          setError('No se encontró este workspace. Comprueba el enlace con su administrador.');
        }
        return;
      }
      accept(next);
      setStatus(fromCache ? 'offline' : 'synced');
      setError('');
      try { cacheWorkspace(id, next); } catch (e) { setError(e.message); }
    }, () => {
      if (live) { clearTimeout(timer); setStatus('error'); setError('No se pudo cargar el workspace. Revisa la conexión y las reglas de Firestore.'); }
    });
    return () => { live = false; mounted.current = false; clearTimeout(timer); unsubscribe(); };
  }, [id, mode, attempt]);

  const run = useCallback(async action => {
    if (lock.current) throw new Error('Espera a que termine la operación actual.');
    lock.current = true;
    setBusy(true);
    try { return await action(); }
    catch (e) {
      if (e.code === 'functions/unauthenticated' || e.message.includes('sesión venció')) {
        saveSession(id, '');
        if (mounted.current) setToken('');
      }
      throw e;
    } finally { lock.current = false; if (mounted.current) setBusy(false); }
  }, [id]);

  const useToken = next => {
    saveSession(id, next);
    if (mounted.current) setToken(next);
  };

  const login = input => run(async () => {
    const result = mode === 'local' ? await accessLocalWorkspace(id, input) :
      await callWorkspace('accessSavingsWorkspace', { id, ...input });
    useToken(result.token);
  });

  const changeCredentials = input => run(async () => {
    const result = mode === 'local' ? await changeLocalCredentials(id, token, input) :
      await callWorkspace('changeSavingsCredentials', { id, token, ...input });
    useToken(result.token);
  });

  const mutate = command => run(async () => {
    if (!token) throw new Error('Ingresa como administrador para modificar este workspace.');
    if (!['local', 'synced'].includes(status)) throw new Error('Espera a recuperar la conexión antes de guardar cambios.');
    const revision = fundRef.current.revision;
    const result = mode === 'local' ? mutateLocalWorkspace(id, token, command, revision) :
      await callWorkspace('mutateSavingsWorkspace', { id, token, command, revision });
    if (mounted.current && result.fund.revision >= fundRef.current.revision) {
      fundRef.current = result.fund;
      setFund(result.fund);
      try { rememberWorkspace({ id, mode, name: result.fund.name }); } catch (e) { setError(e.message); }
    }
  });

  return { fund, status, error, busy, isAdmin: Boolean(token), login, changeCredentials, mutate,
    logout: () => useToken(''), retry: () => { setError(''); setStatus('loading'); setAttempt(n => n + 1); } };
}
