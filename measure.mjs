// Ask the same questions of both tables, as a stranger, and print what came
// back. Run before and after the fix: the questions never change, only the
// answers, which is the only way to know the probe works at all.
import { anon, owner } from './client.mjs';
import { strangerCan, clpOf, report, strangerInventsATable } from './probe.mjs';

for (const [cls, label] of [
  ['Patient', 'Patient — the table a coding agent created through the API'],
  ['Invoice', 'Invoice — the table declared with the master key, the way the dashboard does'],
]) {
  report(label, await strangerCan(cls), await clpOf(cls));
}

console.log(`    A stranger creates a brand-new table of their own: ${await strangerInventsATable() ? 'yes' : 'no'}`);

// The users table is the interesting one: read what its permissions SAY, then
// ask it the same questions and watch the two disagree.
const uclp = await clpOf('_User');
console.log('');
console.log(`    _User — the table that came with the backend`);
console.log(`      class permissions:          ${uclp.open.length} of ${uclp.total} operations open to everyone`);
const someone = (await owner.get('/users?limit=1')).json?.results?.[0]?.objectId;
const uList = await anon.get('/users?limit=1000');
const uGet  = someone ? await anon.get(`/users/${someone}`) : null;
const uEdit = someone ? await anon.put(`/users/${someone}`, { email: 'hijacked@example.com' }) : null;
const uDel  = someone ? await anon.del(`/users/${someone}`) : null;
console.log(`      a stranger lists accounts:  ${uList.ok ? `${uList.json?.results?.length ?? 0} row(s)` : 'refused'}`);
console.log(`      a stranger fetches one:     ${uGet?.ok ? 'yes' : `no — ${uGet?.json?.error ?? uGet?.status}`}`);
console.log(`      a stranger edits one:       ${uEdit?.ok ? 'yes' : `no — ${(uEdit?.json?.error ?? String(uEdit?.status)).replace(/user \w+\./, 'user X.')}`}`);
console.log(`      a stranger deletes one:     ${uDel?.ok ? 'yes' : `no — ${uDel?.json?.error ?? uDel?.status}`}`);
console.log('');

const login = await anon.get(`/login?username=ana&password=${encodeURIComponent('correct-horse-1')}`);
if (login.ok) {
  const session = login.json.sessionToken;
  const others = await anon.get(`/users?where=${encodeURIComponent(JSON.stringify({ username: 'bruno' }))}`, { session });
  const row = others.json?.results?.[0] ?? {};
  console.log(`    Ana, signed in, reads Bruno's row:                ${others.ok && others.json?.results?.length ? 'yes' : 'no'}`);
  console.log(`    ...with his e-mail in it:                         ${row.email ? `yes — ${row.email}` : 'no'}`);
  const self = await anon.get('/users/me', { session });
  console.log(`    Ana still reads her own account:                  ${self.ok ? `yes — ${self.json.email ?? 'no e-mail returned'}` : 'no'}`);
} else {
  console.log(`    Ana signs in:                                     no (${login.json?.error ?? login.status})`);
}
console.log('');
