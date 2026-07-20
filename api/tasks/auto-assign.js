const { connectDb } = require('../../serverless/lib/db');
const { requireAuth } = require('../../serverless/lib/auth');
const { autoAssignInProgressSlots } = require('../../serverless/lib/autoAssign');

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  if (!requireAuth(req, res)) return;

  try {
    await connectDb();
    const tasks = await autoAssignInProgressSlots();
    return res.status(200).json({ assignedCount: tasks.length, tasks });
  } catch (error) {
    console.error('Auto-assign API error:', error.message);
    return res.status(500).json({ message: 'Failed to auto-assign tasks', error: error.message });
  }
};
