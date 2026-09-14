import React from 'react';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { applyCommand, createFund, totals } from '../../functions/domain.js';
import { accessLocalWorkspace, changeLocalCredentials, createLocalWorkspace, getDirectory,
  mutateLocalWorkspace, parseWorkspaceLink, readWorkspace, rememberWorkspace } from '../services/workspaceStorage';
import WorkspaceApp from '../WorkspaceApp';

vi.mock('../services/workspaceCloud', () => ({ cloudEnabled: false, callWorkspace: vi.fn(), subscribeWorkspace: vi.fn() }));
vi.mock('../App', () => ({ default: () => <h1>Fondo original</h1> }));

const input = { name: 'Viaje del grupo', goalAmount: '1000000', quotaAmount: '25000', deadline: '',
  password: 'clave-viaje-123', recoveryKey: 'recuperacion-viaje' };
const memberCommand = { type: 'addMember', input: { name: 'Ana', phone: '3001234567' } };
const movement = (amount, type = 'contribution') => ({ type: 'addMovement', input: {
  type, amount, memberId: 'ana', date: '2026-09-09', description: type === 'contribution' ? 'Cuota de septiembre' : 'Reserva',
} });

beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto);
  localStorage.clear(); sessionStorage.clear();
  window.history.replaceState({}, '', '/');
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Ahorro común: reglas financieras', () => {
  it('empieza vacío y calcula la meta con el saldo neto, también al superarla', () => {
    const empty = createFund(input);
    expect(empty.members).toEqual([]);
    expect(empty.movements).toEqual([]);
    let fund = applyCommand(empty, memberCommand, 'ana');
    fund = applyCommand(fund, movement(1200000), 'aporte');
    expect(totals(fund)).toMatchObject({ progress: 100, remaining: 0 });
    fund = applyCommand(fund, movement(300000, 'expense'), 'gasto');
    expect(totals(fund)).toEqual({ contributions: 1200000, expenses: 300000, balance: 900000, remaining: 100000, progress: 90 });
    expect(empty.members).toEqual([]);
  });

  it.each([0, -10, Infinity, NaN, '1.5', '', true, 1e15])('rechaza un monto inválido: %s', amount => {
    const fund = applyCommand(createFund(input), memberCommand, 'ana');
    expect(() => applyCommand(fund, movement(amount), 'aporte')).toThrow('Monto');
  });

  it('impide usar integrantes de otro fondo y fechas imposibles', () => {
    expect(() => applyCommand(createFund(input), movement(10000), 'aporte')).toThrow('integrante');
    const fund = applyCommand(createFund(input), memberCommand, 'ana');
    const command = movement(10000);
    command.input.date = '2026-02-30';
    expect(() => applyCommand(fund, command, 'aporte')).toThrow('fecha');
  });

  it('impide sobregiros y eliminar aportes que ya financian gastos', () => {
    let fund = applyCommand(createFund(input), memberCommand, 'ana');
    fund = applyCommand(fund, movement(50000), 'aporte');
    expect(() => applyCommand(fund, movement(50001, 'expense'), 'gasto')).toThrow('saldo disponible');
    fund = applyCommand(fund, movement(20000, 'expense'), 'gasto');
    expect(() => applyCommand(fund, { type: 'deleteMovement', input: { id: 'aporte' } }, '')).toThrow('saldo negativo');
    fund = applyCommand(fund, { type: 'deleteMovement', input: { id: 'gasto' } }, '');
    expect(totals(fund).balance).toBe(50000);
  });
});

describe('Persistencia y acceso por workspace', () => {
  it('aísla datos y claves, conserva el fondo original y detecta ediciones concurrentes', async () => {
    localStorage.setItem('fondo_comun_data_v1', '{"legacy":"intacto"}');
    const first = await createLocalWorkspace(input);
    const second = await createLocalWorkspace({ ...input, name: 'Emergencias', password: 'otra-clave-123' });
    rememberWorkspace({ id: first.id, name: input.name, mode: 'local' });
    rememberWorkspace({ id: second.id, name: 'Emergencias', mode: 'local' });
    expect(getDirectory()).toHaveLength(3);
    mutateLocalWorkspace(first.id, first.token, memberCommand, 0);
    expect(readWorkspace(first.id).fund.members).toHaveLength(1);
    expect(readWorkspace(second.id).fund.members).toHaveLength(0);
    expect(() => mutateLocalWorkspace(second.id, first.token, memberCommand, 0)).toThrow('sesión');
    expect(() => mutateLocalWorkspace(first.id, first.token, memberCommand, 0)).toThrow('otra pestaña');
    await expect(accessLocalWorkspace(second.id, { password: input.password })).rejects.toThrow('incorrecta');
    expect(localStorage.getItem('fondo_comun_data_v1')).toBe('{"legacy":"intacto"}');
    expect(JSON.stringify(readWorkspace(first.id))).not.toContain(input.password);
  });

  it('cambia y recupera la clave únicamente con la credencial del workspace', async () => {
    const workspace = await createLocalWorkspace(input);
    await expect(accessLocalWorkspace(workspace.id, { recovery: true, recoveryKey: '8888', newPassword: 'nueva-clave-123' })).rejects.toThrow('incorrecta');
    const recovered = await accessLocalWorkspace(workspace.id, { recovery: true, recoveryKey: input.recoveryKey, newPassword: 'nueva-clave-123' });
    expect(recovered.token).not.toBe(workspace.token);
    await expect(accessLocalWorkspace(workspace.id, { password: input.password })).rejects.toThrow('incorrecta');
    const changed = await changeLocalCredentials(workspace.id, recovered.token, { password: 'final-clave-123', recoveryKey: 'final-recuperacion' });
    expect(() => mutateLocalWorkspace(workspace.id, recovered.token, memberCommand, 0)).toThrow('sesión');
    expect(changed.token).not.toBe(recovered.token);
  });

  it('acepta enlaces compartidos y rechaza rutas inválidas o locales', () => {
    const id = '5de49c59-cb15-4007-8016-d86b99d3dd95';
    expect(parseWorkspaceLink(`https://fondo.example/?workspace=${id}`)).toBe(id);
    expect(parseWorkspaceLink(id)).toBe(id);
    expect(() => parseWorkspaceLink(`local-${id}`)).toThrow('compartido');
    expect(() => parseWorkspaceLink('../../app_data')).toThrow('válido');
  });
});

describe('Flujo visible de workspaces', () => {
  it('crea, registra un aporte y conserva los datos al cambiar de workspace y recargar', async () => {
    render(<WorkspaceApp />);
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo workspace' }));
    fireEvent.change(screen.getByLabelText('Nombre del workspace'), { target: { value: input.name } });
    fireEvent.change(screen.getByLabelText('Meta de ahorro (COP)'), { target: { value: input.goalAmount } });
    fireEvent.change(screen.getByLabelText('Clave de administrador'), { target: { value: input.password } });
    fireEvent.change(screen.getByLabelText('Clave de recuperación'), { target: { value: input.recoveryKey } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear workspace', exact: true }));
    await screen.findByRole('heading', { name: input.name });
    expect(screen.getByText('Guardado en este navegador')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Compartir' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Añadir primer integrante' }));
    fireEvent.change(screen.getByLabelText('Nombre del integrante'), { target: { value: 'Ana' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar integrante' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Registrar primer aporte' }));
    fireEvent.change(screen.getByLabelText('Monto (COP)'), { target: { value: '75000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar aporte' }));
    await screen.findByText('Aporte al ahorro común');
    const activeId = new URLSearchParams(window.location.search).get('workspace');
    fireEvent.change(screen.getByLabelText('Workspace'), { target: { value: 'original' } });
    await screen.findByRole('heading', { name: 'Fondo original' });
    fireEvent.change(screen.getByLabelText('Workspace'), { target: { value: activeId } });
    await screen.findByText('Aporte al ahorro común');
    fireEvent.click(screen.getByRole('button', { name: 'Salir de admin' }));
    expect(screen.queryByRole('button', { name: 'Registrar aporte', exact: true })).toBeNull();
    cleanup();
    render(<WorkspaceApp />);
    await screen.findByText('Aporte al ahorro común');
    expect(screen.getByRole('button', { name: 'Acceso administrador' })).toBeTruthy();
    expect(readWorkspace(activeId).fund.movements[0].amount).toBe(75000);
  });

  it('rechaza una clave de otro fondo y no hereda sus permisos al cambiar', async () => {
    const first = await createLocalWorkspace(input);
    const second = await createLocalWorkspace({ ...input, name: 'Segundo fondo', password: 'segunda-clave-123' });
    for (const [workspace, name] of [[first, input.name], [second, 'Segundo fondo']]) {
      rememberWorkspace({ id: workspace.id, name, mode: 'local' });
    }
    sessionStorage.setItem(`fondo_workspace_session:${first.id}`, first.token);
    window.history.replaceState({}, '', `/?workspace=${first.id}`);
    render(<WorkspaceApp />);
    await screen.findByRole('button', { name: 'Salir de admin' });
    fireEvent.change(screen.getByLabelText('Workspace'), { target: { value: second.id } });
    await screen.findByRole('button', { name: 'Acceso administrador' });
    expect(screen.queryByRole('button', { name: 'Salir de admin' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Acceso administrador' }));
    fireEvent.change(screen.getByLabelText('Clave de administrador'), { target: { value: input.password } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Ingresar' }));
    await screen.findByText('La clave ingresada es incorrecta.');
  });

  it('actualiza un workspace local al recibir cambios de otra pestaña', async () => {
    const workspace = await createLocalWorkspace(input);
    window.history.replaceState({}, '', `/?workspace=${workspace.id}`);
    render(<WorkspaceApp />);
    await screen.findByRole('heading', { name: input.name });
    act(() => {
      mutateLocalWorkspace(workspace.id, workspace.token, memberCommand, 0);
      window.dispatchEvent(new StorageEvent('storage', { key: `fondo_workspace_v1:${workspace.id}` }));
    });
    expect(screen.getByRole('tab', { name: 'Integrantes (1)' })).toBeTruthy();
  });
});
