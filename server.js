const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup template engine & static assets
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'online-voting-system-pnpm-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
  })
);

// User context & Flash message middleware
app.use((req, res, next) => {
  res.locals.currentUser = req.session.userId ? db.getUserById(req.session.userId) : null;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
});

function setFlash(req, type, message) {
  req.session.flash = { type, message };
}

// Authentication guard
function requireAuth(req, res, next) {
  if (!req.session.userId || !db.getUserById(req.session.userId)) {
    setFlash(req, 'warning', 'Please sign in to cast your vote.');
    return res.redirect('/login');
  }
  next();
}

// ---------------- ROUTES ----------------

// Home Page
app.get('/', (req, res) => {
  const stats = db.getStats();
  res.render('index', { stats });
});

// Register Page
app.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/vote');
  res.render('register');
});

app.post('/register', async (req, res) => {
  const { username, password, confirm_password } = req.body;

  if (!username || !password) {
    setFlash(req, 'danger', 'Username and password are required.');
    return res.status(400).render('register');
  }

  if (password !== confirm_password) {
    setFlash(req, 'danger', 'Passwords do not match.');
    return res.status(400).render('register');
  }

  if (username.trim().length < 3) {
    setFlash(req, 'danger', 'Username must be at least 3 characters.');
    return res.status(400).render('register');
  }

  const existing = db.getUserByUsername(username);
  if (existing) {
    setFlash(req, 'warning', 'Username already exists. Please choose a different username.');
    return res.status(409).render('register');
  }

  const hash = await bcrypt.hash(password, 10);
  const result = db.addUser(username, hash);

  if (!result.success) {
    setFlash(req, 'danger', result.error);
    return res.status(400).render('register');
  }

  // Auto-login upon registration
  req.session.userId = result.user.id;
  setFlash(req, 'success', `Welcome, ${result.user.username}! Your account has been created.`);
  res.redirect('/vote');
});

// Login Page
app.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/vote');
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    setFlash(req, 'danger', 'Please enter your username and password.');
    return res.status(400).render('login');
  }

  const user = db.getUserByUsername(username);
  if (!user) {
    setFlash(req, 'danger', 'Invalid username or password.');
    return res.status(401).render('login');
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    setFlash(req, 'danger', 'Invalid username or password.');
    return res.status(401).render('login');
  }

  req.session.userId = user.id;
  setFlash(req, 'success', `Welcome back, ${user.username}!`);
  res.redirect('/vote');
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    res.redirect('/');
  });
});

// Ballot / Vote Page
app.get('/vote', requireAuth, (req, res) => {
  const user = db.getUserById(req.session.userId);
  const parties = db.getParties();
  res.render('vote', { user, parties });
});

app.post('/vote', requireAuth, (req, res) => {
  const { party } = req.body;
  const user = db.getUserById(req.session.userId);

  if (!party) {
    setFlash(req, 'danger', 'Please select a party before submitting your vote.');
    return res.redirect('/vote');
  }

  if (user.hasVoted) {
    setFlash(req, 'warning', 'You have already voted.');
    return res.redirect('/results');
  }

  const voteResult = db.recordVote(user.id, party);
  if (!voteResult.success) {
    setFlash(req, 'danger', voteResult.error);
    return res.redirect('/vote');
  }

  setFlash(req, 'success', `Vote cast successfully for ${voteResult.party.name}!`);
  res.redirect('/results');
});

// Results Page
app.get('/results', (req, res) => {
  const data = db.getResults();
  res.render('results', { results: data.results, totalVotes: data.totalVotes });
});

// API endpoint for real-time results polling
app.get('/api/results', (req, res) => {
  const data = db.getResults();
  res.json({
    totalVotes: data.totalVotes,
    parties: data.results.map(p => ({
      code: p.code,
      name: p.name,
      color: p.color,
      votes: p.votes,
      percentage: p.percentage
    }))
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🗳️  Online Voting System (Node.js & Express)`);
    console.log(`🚀 Server running at: http://localhost:${PORT}`);
    console.log(`==================================================\n`);
  });
}

module.exports = app;
