// What permissions does a brand-new table get, and what can a stranger do with
// it? Nothing here reads a setting and infers an answer: every line is a real
// request, and the answer is whatever the backend did.
//
// Every probe runs against a row that is unambiguously somebody else's, written
// with the master key, so each answer means the same thing: what can you reach
// that is not yours? Anything the probe destroys, it puts back.
import { anon, owner } from './client.mjs';

const OPS = ['find', 'get', 'count', 'create', 'update', 'delete', 'addField'];

export async function strangerCan(cls) {
  // somebody else's row, and a decoy for the delete probe — both written by the owner
  const theirs = await owner.post(`/classes/${cls}`, { name: 'Dora Melo', diagnosis: 'migraine', probe: 'not-yours' });
  const decoy  = await owner.post(`/classes/${cls}`, { name: 'Elias Pinto', diagnosis: 'eczema', probe: 'decoy' });

  const total  = (await owner.get(`/classes/${cls}?limit=0&count=1`)).json?.count ?? 0;
  const find   = await anon.get(`/classes/${cls}?limit=1000`);
  const get    = await anon.get(`/classes/${cls}/${theirs.json.objectId}`);
  const count  = await anon.get(`/classes/${cls}?limit=0&count=1`);
  const create = await anon.post(`/classes/${cls}`, { probe: 'written-by-a-stranger' });
  const update = await anon.put(`/classes/${cls}/${theirs.json.objectId}`, { diagnosis: 'edited-by-a-stranger' });
  const del    = await anon.del(`/classes/${cls}/${decoy.json.objectId}`);

  // put back whatever the stranger managed to change, so the next phase starts clean
  if (create.ok) await owner.del(`/classes/${cls}/${create.json.objectId}`);
  await owner.del(`/classes/${cls}/${theirs.json.objectId}`);
  if (!del.ok) await owner.del(`/classes/${cls}/${decoy.json.objectId}`);

  return {
    total,
    read:   find.ok ? (find.json?.results?.length ?? 0) : null,
    get:    get.ok,
    count:  count.ok ? (count.json?.count ?? 0) : null,
    create: create.ok,
    update: update.ok,
    delete: del.ok,
  };
}

// what the class-level permissions literally say, straight from the schema
export async function clpOf(cls) {
  const r = await owner.get(`/schemas/${cls}`);
  if (!r.ok) return null;
  const clp = r.json?.classLevelPermissions ?? {};
  const open = OPS.filter((op) => clp[op]?.['*'] === true);
  return { clp, open, total: OPS.length, protectedFields: clp.protectedFields ?? null };
}

// can a stranger bring a table of their own into existence? Asked with a name
// that has never existed, because writing to a table that already exists is a
// different question.
export async function strangerInventsATable() {
  const cls = `Backdoor${Date.now()}`;
  const made = await anon.post(`/classes/${cls}`, { hello: 'from a stranger' });
  if (made.ok) {                                   // clean the row, then the table itself
    await owner.del(`/classes/${cls}/${made.json.objectId}`);
    await owner.del(`/schemas/${cls}`);
  }
  return made.ok;
}

export const yn = (v) => (v === null ? '—' : v ? 'yes' : 'no');

export function report(label, can, clp) {
  console.log(`    ${label}`);
  console.log(`      class permissions:          ${clp ? `${clp.open.length} of ${clp.total} operations open to everyone` : 'no schema'}`);
  if (clp?.open.length) console.log(`      which ones:                 ${clp.open.join(', ')}`);
  console.log(`      a stranger reads rows:      ${can.read === null ? 'refused' : `${can.read} of ${can.total} — every row in the table`}`);
  console.log(`      a stranger counts rows:     ${can.count === null ? 'refused' : can.count}`);
  console.log(`      a stranger adds a row:      ${yn(can.create)}`);
  console.log(`      a stranger edits yours:     ${yn(can.update)}`);
  console.log(`      a stranger deletes yours:   ${yn(can.delete)}`);
  console.log('');
}
