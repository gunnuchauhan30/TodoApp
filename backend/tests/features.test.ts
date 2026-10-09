import request from 'supertest';
import app from '../src/app';
import { registerUser, authed } from './helpers';

const create = (token: string, body: Record<string, unknown>) => request(app).post('/api/v1/todos').set(authed(token)).send(body);
const toggle = (token: string, id: string) => request(app).patch(`/api/v1/todos/${id}/toggle`).set(authed(token));
const list = (token: string, qs = '') => request(app).get(`/api/v1/todos${qs}`).set(authed(token));

describe('Recurring todos', () => {
  it('creates the next occurrence once when a recurring todo is completed', async () => {
    const { token } = await registerUser();
    const { body } = await create(token, {
      title: 'Water plants',
      recurrence: 'weekly',
      dueDate: '2099-01-01T00:00:00.000Z',
      tags: ['home'],
      subtasks: [{ text: 'Balcony', completed: true }]
    });
    const done = await toggle(token, body.data._id);
    expect(done.body.nextTodo).toBeTruthy();
    expect(done.body.nextTodo.completed).toBe(false);
    expect(done.body.nextTodo.recurrence).toBe('weekly');
    expect(done.body.nextTodo.subtasks[0].completed).toBe(false);
    expect(new Date(done.body.nextTodo.dueDate).toISOString().slice(0, 10)).toBe('2099-01-08');

    // un-complete and complete again: no duplicate
    await toggle(token, body.data._id);
    const again = await toggle(token, body.data._id);
    expect(again.body.nextTodo).toBeNull();
    expect((await list(token)).body.total).toBe(2);
  });

  it('clamps monthly recurrence at month end and never schedules in the past', async () => {
    const { token } = await registerUser();
    const m = await create(token, { title: 'Rent', recurrence: 'monthly', dueDate: '2099-01-31T12:00:00.000Z' });
    const next = (await toggle(token, m.body.data._id)).body.nextTodo;
    expect(new Date(next.dueDate).getMonth()).toBe(1); // February
    const old = await create(token, { title: 'Daily', recurrence: 'daily', dueDate: '2020-01-01T00:00:00.000Z' });
    const n2 = (await toggle(token, old.body.data._id)).body.nextTodo;
    expect(new Date(n2.dueDate).getTime()).toBeGreaterThanOrEqual(new Date().setHours(0, 0, 0, 0));
  });

  it('does not repeat non-recurring todos and validates the value', async () => {
    const { token } = await registerUser();
    const plain = await create(token, { title: 'Once' });
    expect((await toggle(token, plain.body.data._id)).body.nextTodo).toBeNull();
    expect((await create(token, { title: 'x', recurrence: 'yearly' })).status).toBe(400);
  });
});

describe('Trash', () => {
  it('lists, restores, permanently deletes and empties', async () => {
    const { token } = await registerUser();
    const ids: string[] = [];
    for (const t of ['A', 'B', 'C']) ids.push((await create(token, { title: t })).body.data._id);
    for (const id of ids) await request(app).delete(`/api/v1/todos/${id}`).set(authed(token)).expect(200);

    const trash = await request(app).get('/api/v1/todos/trash').set(authed(token));
    expect(trash.body.count).toBe(3);

    await request(app).patch(`/api/v1/todos/${ids[0]}/restore`).set(authed(token)).expect(200);
    expect((await list(token)).body.total).toBe(1);

    // cannot permanently delete a live todo
    await request(app).delete(`/api/v1/todos/${ids[0]}/permanent`).set(authed(token)).expect(404);
    await request(app).delete(`/api/v1/todos/${ids[1]}/permanent`).set(authed(token)).expect(200);
    expect((await request(app).get('/api/v1/todos/trash').set(authed(token))).body.count).toBe(1);

    const emptied = await request(app).delete('/api/v1/todos/trash').set(authed(token));
    expect(emptied.body.data.deleted).toBe(1);
  });

  it("does not expose another user's trash", async () => {
    const a = await registerUser('a@example.com');
    const b = await registerUser('b@example.com');
    const id = (await create(a.token, { title: 'Secret' })).body.data._id;
    await request(app).delete(`/api/v1/todos/${id}`).set(authed(a.token));
    expect((await request(app).get('/api/v1/todos/trash').set(authed(b.token))).body.count).toBe(0);
    await request(app).delete(`/api/v1/todos/${id}/permanent`).set(authed(b.token)).expect(404);
  });
});

describe('Bulk actions', () => {
  it('completes, reverts, retags, reprioritises and deletes many at once', async () => {
    const { token } = await registerUser();
    const ids: string[] = [];
    for (const t of ['A', 'B', 'C']) ids.push((await create(token, { title: t })).body.data._id);
    const bulk = (action: string, value?: string, only = ids) =>
      request(app).post('/api/v1/todos/bulk').set(authed(token)).send({ ids: only, action, value });

    expect((await bulk('complete')).body.data.affected).toBe(3);
    expect((await list(token, '?status=completed')).body.total).toBe(3);
    expect((await bulk('pending')).body.data.affected).toBe(3);

    await bulk('addTag', 'Urgent');
    expect((await list(token, '?tag=urgent')).body.total).toBe(3);
    await bulk('removeTag', 'urgent', [ids[0]]);
    expect((await list(token, '?tag=urgent')).body.total).toBe(2);

    await bulk('priority', 'high');
    expect((await list(token, '?priority=high')).body.total).toBe(3);

    expect((await bulk('delete', undefined, [ids[0], ids[1]])).body.data.affected).toBe(2);
    expect((await list(token)).body.total).toBe(1);
  });

  it('spawns recurrences on bulk complete and validates input', async () => {
    const { token } = await registerUser();
    const id = (await create(token, { title: 'Daily', recurrence: 'daily' })).body.data._id;
    const res = await request(app).post('/api/v1/todos/bulk').set(authed(token)).send({ ids: [id], action: 'complete' });
    expect(res.body.data.spawned).toBe(1);
    const bad = await request(app).post('/api/v1/todos/bulk').set(authed(token)).send({ ids: [id], action: 'explode' });
    expect(bad.status).toBe(400);
    expect((await request(app).post('/api/v1/todos/bulk').set(authed(token)).send({ ids: [], action: 'complete' })).status).toBe(400);
  });

  it('cannot touch todos of another user', async () => {
    const a = await registerUser('a@example.com');
    const b = await registerUser('b@example.com');
    const id = (await create(a.token, { title: 'Mine' })).body.data._id;
    const res = await request(app).post('/api/v1/todos/bulk').set(authed(b.token)).send({ ids: [id], action: 'delete' });
    expect(res.body.data.affected).toBe(0);
    expect((await list(a.token)).body.total).toBe(1);
  });
});

describe('Export / import', () => {
  it('exports JSON and CSV (with formula-injection protection)', async () => {
    const { token } = await registerUser();
    await create(token, { title: '=HYPERLINK("evil")', description: 'a, "quoted"\nline', tags: ['x', 'y'], priority: 'high', subtasks: [{ text: 'one', completed: true }, { text: 'two' }] });

    const json = await request(app).get('/api/v1/todos/export').set(authed(token));
    expect(json.headers['content-disposition']).toContain('.json');
    expect(json.body.todos).toHaveLength(1);
    expect(json.body.todos[0].tags).toEqual(['x', 'y']);

    const csv = await request(app).get('/api/v1/todos/export?format=csv').set(authed(token));
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text).toContain("'=HYPERLINK"); // apostrophe-prefixed
    expect(csv.text).toContain('[x] one | [ ] two');
  });

  it('round-trips through import and skips invalid rows', async () => {
    const { token } = await registerUser();
    await create(token, { title: 'Keep me', priority: 'low', tags: ['a'], recurrence: 'daily', subtasks: [{ text: 's', completed: true }] });
    const exported = (await request(app).get('/api/v1/todos/export').set(authed(token))).body;

    const other = await registerUser('other@example.com');
    const rows = [...exported.todos, { title: '' }, 'junk', { title: 'Bad priority', priority: 'urgent' }, { title: 'CSV style', tags: 'a;b', subtasks: '[x] done | [ ] open', completed: 'yes' }];
    const res = await request(app).post('/api/v1/todos/import').set(authed(other.token)).send({ todos: rows });
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ imported: 2, skipped: 3 });

    const all = (await list(other.token, '?limit=50')).body.data;
    expect(all.map((t: { title: string }) => t.title)).toEqual(['Keep me', 'CSV style']); // file order preserved
    const csvRow = all[1];
    expect(csvRow.completed).toBe(true);
    expect(csvRow.tags).toEqual(['a', 'b']);
    expect(csvRow.subtasks.map((s: { completed: boolean }) => s.completed)).toEqual([true, false]);
    expect(all[0].recurrence).toBe('daily');
  });

  it('rejects empty or oversized imports', async () => {
    const { token } = await registerUser();
    expect((await request(app).post('/api/v1/todos/import').set(authed(token)).send({ todos: [] })).status).toBe(400);
    expect((await request(app).post('/api/v1/todos/import').set(authed(token)).send({ todos: Array(501).fill({ title: 'x' }) })).status).toBe(400);
  });
});

describe('Profile', () => {
  it('updates the display name', async () => {
    const { token } = await registerUser();
    const res = await request(app).patch('/api/v1/auth/profile').set(authed(token)).send({ name: '  New Name ' });
    expect(res.body.data.user.name).toBe('New Name');
    expect((await request(app).patch('/api/v1/auth/profile').set(authed(token)).send({ name: 'x' })).status).toBe(400);
  });

  it('changes the password, rotates tokens and revokes the old refresh token', async () => {
    const { token, refreshToken } = await registerUser();
    const bad = await request(app).patch('/api/v1/auth/password').set(authed(token)).send({ currentPassword: 'wrong', newPassword: 'newsecret1' });
    expect(bad.status).toBe(401);
    const same = await request(app).patch('/api/v1/auth/password').set(authed(token)).send({ currentPassword: 'secret123', newPassword: 'secret123' });
    expect(same.status).toBe(400);

    const ok = await request(app).patch('/api/v1/auth/password').set(authed(token)).send({ currentPassword: 'secret123', newPassword: 'newsecret1' });
    expect(ok.status).toBe(200);
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken })).status).toBe(401);
    expect((await request(app).post('/api/v1/auth/login').send({ email: 'jane@example.com', password: 'secret123' })).status).toBe(401);
    expect((await request(app).post('/api/v1/auth/login').send({ email: 'jane@example.com', password: 'newsecret1' })).status).toBe(200);
  });

  it('deletes the account and all its data, but only with the right password', async () => {
    const { token } = await registerUser();
    await create(token, { title: 'Will vanish' });
    expect((await request(app).delete('/api/v1/auth/account').set(authed(token)).send({ password: 'nope' })).status).toBe(401);
    await request(app).delete('/api/v1/auth/account').set(authed(token)).send({ password: 'secret123' }).expect(200);
    expect((await request(app).post('/api/v1/auth/login').send({ email: 'jane@example.com', password: 'secret123' })).status).toBe(401);
    // another user signing up with the same email starts with a clean slate
    const fresh = await registerUser();
    expect((await list(fresh.token)).body.total).toBe(0);
  });
});
