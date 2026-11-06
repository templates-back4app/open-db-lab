// Build the two tables the two ways they actually get built: one by a client
// holding only the app id (which is how a coding agent creates a table), and
// one through the schema API with the master key (which is what the dashboard
// does). Then put somebody else's data in them.
import { anon, owner, waitUp } from './client.mjs';

await waitUp();

// 1. the way an agent creates a table: just write to it and it appears
const agentMade = await anon.post('/classes/Patient', {
  name: 'Ana Ribeiro', diagnosis: 'hypertension', phone: '+55 11 90000-0001',
});
// 2. the way the dashboard creates a table: declare it with the master key
await owner.post('/schemas/Invoice', {
  className: 'Invoice',
  fields: { amount: { type: 'Number' }, customer: { type: 'String' } },
});
const dashMade = await owner.post('/classes/Invoice', { amount: 1990, customer: 'Ana Ribeiro' });

// a few more rows so "how much leaks" is a number and not a yes
for (const p of [
  { name: 'Bruno Alves', diagnosis: 'type 2 diabetes', phone: '+55 11 90000-0002' },
  { name: 'Carla Dias',  diagnosis: 'asthma',          phone: '+55 11 90000-0003' },
]) await owner.post('/classes/Patient', p);

// two real accounts, because "can a stranger read your users" needs users
for (const u of [
  { username: 'ana',   password: 'correct-horse-1', email: 'ana@example.com' },
  { username: 'bruno', password: 'correct-horse-2', email: 'bruno@example.com' },
]) await anon.post('/users', u);

console.log(`  agent-created table:     Patient   (created by a client holding only the app id: ${agentMade.ok ? 'accepted' : 'refused'})`);
console.log(`  dashboard-created table: Invoice   (declared with the master key: ${dashMade.ok ? 'accepted' : 'refused'})`);
console.log(`  seeded:                  3 Patient row(s), 1 Invoice row, 2 user account(s)`);
