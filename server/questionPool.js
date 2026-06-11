// Curated trivia pool the host can pick questions from. The data lives in a JSON
// file shared with the client (the builder imports the same file directly).
const pool = require('../src/data/questionPool.json');

const byId = new Map(pool.map((q) => [q.id, q]));

function getPoolQuestion(id) {
  return byId.get(id);
}

module.exports = { pool, getPoolQuestion };
