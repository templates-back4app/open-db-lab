// Deny everything by default, then open only what someone actually needs.
// Reads become "you have to be signed in"; every write leaves the browser and
// moves into a server function, which is the part that costs real work.
import { owner } from './client.mjs';

const SIGNED_IN_READS_ONLY = {
  find:   { requiresAuthentication: true },
  get:    { requiresAuthentication: true },
  count:  { requiresAuthentication: true },
  create: {},            // {} means nobody from outside — the master key only
  update: {},
  delete: {},
  addField: {},
};

for (const cls of ['Patient', 'Invoice']) {
  const r = await owner.put(`/schemas/${cls}`, { className: cls, classLevelPermissions: SIGNED_IN_READS_ONLY });
  console.log(`  ${cls}: ${r.ok ? 'public read and write closed' : `FAILED — ${r.text.slice(0, 120)}`}`);
}

// the columns nobody else should see, even once signed in
const u = await owner.put('/schemas/_User', {
  className: '_User',
  classLevelPermissions: {
    find: { requiresAuthentication: true }, get: { requiresAuthentication: true },
    count: {}, create: { '*': true }, update: {}, delete: {}, addField: {},
    protectedFields: { '*': ['email'] },
  },
});
console.log(`  _User: ${u.ok ? 'e-mail marked protected, listing closed to strangers' : `FAILED — ${u.text.slice(0, 120)}`}`);
