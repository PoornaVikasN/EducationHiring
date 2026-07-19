require('dotenv').config();
const mongoose = require('mongoose');
const uri = `mongodb+srv://${encodeURIComponent(process.env.MONGO_DB_USERNAME)}:${encodeURIComponent(process.env.MONGO_DB_PASSWORD)}@${process.env.MONGO_DB_HOST}/eduhire?retryWrites=true&w=majority`;
async function main() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const cols = await db.listCollections().toArray();
  console.log('collections matching template:', cols.map(c=>c.name).filter(n=>/template/i.test(n)));
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
