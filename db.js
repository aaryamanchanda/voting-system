const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

const DEFAULT_DATA = {
  users: [],
  parties: [
    {
      code: 'A',
      name: 'Party A',
      description: 'Committed to innovation, public services, and sustainable progress.',
      color: '#3b82f6'
    },
    {
      code: 'B',
      name: 'Party B',
      description: 'Dedicated to economic prosperity, governance reform, and community development.',
      color: '#10b981'
    },
    {
      code: 'C',
      name: 'Party C',
      description: 'Focused on environmental protection, social equity, and educational advancement.',
      color: '#f59e0b'
    }
  ]
};

function ensureDbFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DATA, null, 2), 'utf-8');
  }
}

function readDb() {
  ensureDbFile();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return DEFAULT_DATA;
  }
}

function writeDb(data) {
  ensureDbFile();
  const tempFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

function getUsers() {
  return readDb().users || [];
}

function getUserById(id) {
  const users = getUsers();
  return users.find(u => u.id === id) || null;
}

function getUserByUsername(username) {
  const users = getUsers();
  return users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
}

function addUser(username, passwordHash) {
  const db = readDb();
  if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return { success: false, error: 'Username already exists. Please choose a different username.' };
  }

  const newUser = {
    id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    username: username.trim(),
    password: passwordHash,
    hasVoted: false,
    votedParty: null,
    votedAt: null,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDb(db);
  return { success: true, user: newUser };
}

function getParties() {
  const db = readDb();
  return db.parties || [];
}

function recordVote(userId, partyCode) {
  const db = readDb();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return { success: false, error: 'User not found.' };
  }
  if (user.hasVoted) {
    return { success: false, error: 'You have already voted.' };
  }

  const party = db.parties.find(p => p.code.toUpperCase() === partyCode.toUpperCase());
  if (!party) {
    return { success: false, error: 'Invalid party choice.' };
  }

  user.hasVoted = true;
  user.votedParty = party.code;
  user.votedAt = new Date().toISOString();

  writeDb(db);
  return { success: true, user, party };
}

function getResults() {
  const db = readDb();
  const users = db.users || [];
  const parties = db.parties || [];

  const totalVotes = users.filter(u => u.hasVoted).length;

  const results = parties.map(p => {
    const votes = users.filter(u => u.hasVoted && u.votedParty === p.code).length;
    const percentage = totalVotes > 0 ? Number(((votes / totalVotes) * 100).toFixed(1)) : 0;
    return {
      code: p.code,
      name: p.name,
      description: p.description,
      color: p.color,
      votes,
      percentage
    };
  });

  return { totalVotes, totalUsers: users.length, results };
}

function getStats() {
  const db = readDb();
  const users = db.users || [];
  const parties = db.parties || [];
  const totalVotes = users.filter(u => u.hasVoted).length;
  return {
    totalUsers: users.length,
    totalVotes,
    partiesCount: parties.length
  };
}

function resetDb() {
  ensureDbFile();
  writeDb(DEFAULT_DATA);
}

module.exports = {
  getUserById,
  getUserByUsername,
  addUser,
  getParties,
  recordVote,
  getResults,
  getStats,
  resetDb
};
