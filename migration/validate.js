const { MongoClient } = require('mongodb');
const MONGO_URI = 'mongodb+srv://amirtham_db_user:faDXYJMLOTx2IOrS@cluster0.aszzz.mongodb.net/?appName=Cluster0';

async function validate() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db('amc_business');

  // Site-level debits (excludes Company Expenses)
  const siteDebit = await db.collection('transactions').aggregate([
    { $match: { company: 'Main', type: 'Debit', siteName: { $ne: 'Company Expenses' } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]).toArray();

  // Company Expenses debits
  const compExp = await db.collection('transactions').aggregate([
    { $match: { company: 'Main', type: 'Debit', siteName: 'Company Expenses' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]).toArray();

  // Total Credits (Revenue)
  const credit = await db.collection('transactions').aggregate([
    { $match: { company: 'Main', type: 'Credit' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]).toArray();

  const revenue = credit[0]?.total || 0;
  const siteExp = siteDebit[0]?.total || 0;
  const compExpAmt = compExp[0]?.total || 0;
  const profit = revenue - siteExp;
  const netProfit = profit - compExpAmt;

  console.log('Dashboard KPI Reconciliation:');
  console.log('  Revenue (Credit):        ', revenue, '  (Expected: 2,881,568)');
  console.log('  Site Expenditure (Debit): ', siteExp, '  (Expected: 1,798,984)');
  console.log('  Profit:                  ', profit, '  (Expected: 1,082,584)');
  console.log('  Company Expenses:        ', compExpAmt, '  (Expected: 338,902)');
  console.log('  Net Profit:              ', netProfit, '  (Expected: 743,682)');

  // Check some sample transactions
  console.log('\n--- Sample data checks ---');
  const txCount = await db.collection('transactions').countDocuments();
  const siteCount = await db.collection('sites').countDocuments();
  const matCount = await db.collection('materials').countDocuments();
  
  console.log('  Total transactions:', txCount);
  console.log('  Total sites:', siteCount);
  console.log('  Total materials:', matCount);
  
  // Check a specific transaction
  const sample = await db.collection('transactions').findOne({ transactionId: 'TXN25102112002' });
  console.log('\n  Sample transaction:', JSON.stringify(sample, null, 2).substring(0, 300));
  
  // Check a specific site
  const sampleSite = await db.collection('sites').findOne({ siteId: 'AC91833' });
  console.log('\n  Sample site:', JSON.stringify(sampleSite, null, 2).substring(0, 300));

  // Check dimensions
  const dims = await db.collection('dimensions').find().toArray();
  console.log('\n  Dimensions:');
  dims.forEach(d => console.log(`    ${d.name}: ${d.values.length} values`));

  await client.close();
}

validate().catch(console.error);
