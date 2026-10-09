import request from 'supertest';
import app from '../src/app';
import { registerUser, authed } from './helpers';

const create = (token: string, body: Record<string, unknown>) =>
  request(app).post('/api/v1/todos').set(authed(token)).send(body);

describe('Todos API', () => {
  it('requires authentication', async () => {
    expect((await request(app).get('/api/v1/todos')).status).toBe(401);
  });

  it('creates a todo with priority, tags, due date and subtasks', async () => {
    const { token } = await registerUser();
    const res = await create(token, {
      title: 'Buy gas pipe',
      priority: 'high',
      tags: ['Home', 'home', 'Urgent'],
      dueDate: '2030-01-01T00:00:00.000Z',
      subtasks: [{ text: 'Measure', completed: true }, { text: '' }]
    });
    expect(res.status).toBe(201);
    expect(res.body.data.priority).toBe('high');
    expect(res.body.data.priorityRank).toBe(3);
    expect(res.body.data.tags).toEqual(['home', 'urgent']);
    expect(res.body.data.subtasks).toHaveLength(1);
  });

  it('validates input', async () => {
    const { token } = await registerUser();
    expect((await create(token, {})).status).toBe(400);
    expect((await create(token, { title: 'x', priority: 'urgent' })).status).toBe(400);
    expect((await create(token, { title: 'x', dueDate: 'not-a-date' })).status).toBe(400);
  });

  it('paginates, searches, filters and sorts', async () => {
    const { token } = await registerUser();
    for (let i = 1; i <= 12; i++) {
      await create(token, { title: `Task ${i}`, priority: i % 2 ? 'low' : 'high', tags: i <= 3 ? ['work'] : [] });
    }
    const page2 = await request(app).get('/api/v1/todos?page=2&limit=5').set(authed(token));
    expect(page2.body.total).toBe(12);
    expect(page2.body.pages).toBe(3);
    expect(page2.body.count).toBe(5);

    const search = await request(app).get('/api/v1/todos?search=task 1').set(authed(token));
    expect(search.body.total).toBe(4); // Task 1, 10, 11, 12

    const byTag = await request(app).get('/api/v1/todos?tag=work').set(authed(token));
    expect(byTag.body.total).toBe(3);

    const high = await request(app).get('/api/v1/todos?priority=high&sortBy=title&dir=asc&limit=50').set(authed(token));
    expect(high.body.total).toBe(6);
    expect(high.body.data[0].title).toBe('Task 10');
  });

  it('toggles, updates and filters by status', async () => {
    const { token } = await registerUser();
    const { body } = await create(token, { title: 'Walk' });
    const id = body.data._id;
    const toggled = await request(app).patch(`/api/v1/todos/${id}/toggle`).set(authed(token));
    expect(toggled.body.data.completed).toBe(true);
    const upd = await request(app).put(`/api/v1/todos/${id}`).set(authed(token)).send({ title: 'Walk dog' });
    expect(upd.body.data.title).toBe('Walk dog');
    const done = await request(app).get('/api/v1/todos?status=completed').set(authed(token));
    expect(done.body.total).toBe(1);
    const pending = await request(app).get('/api/v1/todos?status=pending').set(authed(token));
    expect(pending.body.total).toBe(0);
  });

  it('soft-deletes and restores', async () => {
    const { token } = await registerUser();
    const id = (await create(token, { title: 'Temp' })).body.data._id;
    await request(app).delete(`/api/v1/todos/${id}`).set(authed(token)).expect(200);
    expect((await request(app).get('/api/v1/todos').set(authed(token))).body.total).toBe(0);
    await request(app).get(`/api/v1/todos/${id}`).set(authed(token)).expect(404);
    await request(app).patch(`/api/v1/todos/${id}/restore`).set(authed(token)).expect(200);
    expect((await request(app).get('/api/v1/todos').set(authed(token))).body.total).toBe(1);
  });

  it("never exposes another user's todos", async () => {
    const a = await registerUser('a@example.com');
    const b = await registerUser('b@example.com');
    const id = (await create(a.token, { title: 'Private' })).body.data._id;
    await request(app).get(`/api/v1/todos/${id}`).set(authed(b.token)).expect(404);
    await request(app).delete(`/api/v1/todos/${id}`).set(authed(b.token)).expect(404);
    expect((await request(app).get('/api/v1/todos').set(authed(b.token))).body.total).toBe(0);
  });

  it('persists drag-and-drop reordering', async () => {
    const { token } = await registerUser();
    const ids: string[] = [];
    for (const t of ['A', 'B', 'C']) ids.push((await create(token, { title: t })).body.data._id);
    // default order: newest first => C, B, A. Move A to the top.
    await request(app)
      .patch('/api/v1/todos/reorder')
      .set(authed(token))
      .send({ ids: [ids[0], ids[2], ids[1]] })
      .expect(200);
    const list = await request(app).get('/api/v1/todos').set(authed(token));
    expect(list.body.data.map((t: { title: string }) => t.title)).toEqual(['A', 'C', 'B']);
  });

  it('lists distinct tags', async () => {
    const { token } = await registerUser();
    await create(token, { title: '1', tags: ['b', 'a'] });
    await create(token, { title: '2', tags: ['a', 'c'] });
    const res = await request(app).get('/api/v1/todos/tags').set(authed(token));
    expect(res.body.data).toEqual(['a', 'b', 'c']);
  });

  it('uploads and removes an attachment', async () => {
    const { token } = await registerUser();
    const id = (await create(token, { title: 'With file' })).body.data._id;
    const up = await request(app)
      .post(`/api/v1/todos/${id}/attachments`)
      .set(authed(token))
      .attach('file', Buffer.from('hello'), { filename: 'note.txt', contentType: 'text/plain' });
    expect(up.status).toBe(201);
    expect(up.body.data.attachments).toHaveLength(1);
    const bad = await request(app)
      .post(`/api/v1/todos/${id}/attachments`)
      .set(authed(token))
      .attach('file', Buffer.from('MZ'), { filename: 'virus.exe', contentType: 'application/x-msdownload' });
    expect(bad.status).toBe(400);
    const attId = up.body.data.attachments[0]._id;
    const del = await request(app).delete(`/api/v1/todos/${id}/attachments/${attId}`).set(authed(token));
    expect(del.body.data.attachments).toHaveLength(0);
  });

  it('strips HTML brackets from input', async () => {
    const { token } = await registerUser();
    const res = await create(token, { title: '<script>alert(1)</script>Hi' });
    expect(res.body.data.title).not.toContain('<');
  });
});
