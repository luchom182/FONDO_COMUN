import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export function Field({ label, hint, children, ...props }) {
  const id = useId();
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{label}</label>
      {children ? <select id={id} className="form-select" aria-describedby={hint ? `${id}-hint` : undefined} {...props}>{children}</select> :
        <input id={id} className="form-input" aria-describedby={hint ? `${id}-hint` : undefined} {...props} />}
      {hint && <small id={`${id}-hint`} className="workspace-hint">{hint}</small>}
    </div>
  );
}

export function WorkspaceDialog({ title, onClose, busy = false, children }) {
  const dialog = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current;
    element.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { element.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return (
    <dialog ref={dialog} className="workspace-dialog" aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
      <div className="modal-header">
        <h2 id={titleId} className="modal-title">{title}</h2>
        <button type="button" className="close-btn" aria-label="Cerrar ventana" disabled={busy} onClick={onClose}><X size={22} /></button>
      </div>
      {children}
    </dialog>
  );
}

export function FormFeedback({ error }) {
  return error ? <p className="workspace-error" role="alert">{error}</p> : null;
}

export function FormActions({ busy, onClose, label = 'Guardar cambios' }) {
  return <div className="workspace-actions workspace-form-actions">
    <button type="button" className="btn btn-outline" disabled={busy} onClick={onClose}>Cancelar</button>
    <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Guardando…' : label}</button>
  </div>;
}
