const db = require('./db');

(async () => {
  try {
    const n = await db.query('SELECT id, user_id, title, detail, level, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20', [20]);
    console.log('notifications for user 20:');
    console.table(n.rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
})();
