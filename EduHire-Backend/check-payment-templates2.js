require('dotenv').config();
const mongoose = require('mongoose');
const uri = `mongodb+srv://${encodeURIComponent(process.env.MONGO_DB_USERNAME)}:${encodeURIComponent(process.env.MONGO_DB_PASSWORD)}@${process.env.MONGO_DB_HOST}/eduhire?retryWrites=true&w=majority`;
async function main() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  const keys = ['APPLICANT_PAID', 'PAYMENT_CONFIRMATION', 'SUBSCRIPTION_ACTIVATED'];
  const expectedVars = {
    APPLICANT_PAID: ['jobTitle', 'fee'],
    PAYMENT_CONFIRMATION: ['seekerName', 'jobTitle', 'hospitalName'],
    SUBSCRIPTION_ACTIVATED: ['name', 'subscriptionBody', 'amountLine'],
  };
  for (const key of keys) {
    const tpl = await db.collection('emailtemplates').findOne({ key });
    if (!tpl) { console.log(key, '=> MISSING template doc'); continue; }
    const used = [...new Set([...tpl.subject.matchAll(/\{\{(\w+)\}\}/g), ...tpl.body.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]))];
    const missing = used.filter(v => !expectedVars[key].includes(v));
    console.log(key, '=> isActive:', tpl.isActive, '| placeholders:', used, '| unsupplied(BUG if any):', missing);
  }
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
