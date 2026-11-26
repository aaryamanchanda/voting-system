const assert = require('assert');
const bcrypt = require('bcryptjs');
const db = require('./db');

async function runTests() {
  console.log('🧪 Running Online Voting System Test Suite...\n');

  // Reset DB to clean slate
  db.resetDb();

  // Test 1: Verify Initial Stats
  const initialStats = db.getStats();
  assert.strictEqual(initialStats.totalUsers, 0, 'Initial total users should be 0');
  assert.strictEqual(initialStats.totalVotes, 0, 'Initial total votes should be 0');
  assert.strictEqual(initialStats.partiesCount, 3, 'Should have 3 parties initialized (A, B, C)');
  console.log('✅ Test 1 Passed: Initial DB state and parties verified.');

  // Test 2: User Registration
  const hash1 = await bcrypt.hash('secret123', 10);
  const regResult = db.addUser('alice', hash1);
  assert.strictEqual(regResult.success, true, 'User Alice should be registered');
  assert.strictEqual(regResult.user.username, 'alice', 'Username should match');

  // Duplicate registration check
  const dupResult = db.addUser('alice', hash1);
  assert.strictEqual(dupResult.success, false, 'Duplicate registration should be rejected');
  console.log('✅ Test 2 Passed: Registration and duplicate username prevention verified.');

  // Test 3: User Authentication
  const user = db.getUserByUsername('alice');
  assert(user, 'Alice must exist in database');
  const validPassword = await bcrypt.compare('secret123', user.password);
  const invalidPassword = await bcrypt.compare('wrongpass', user.password);
  assert.strictEqual(validPassword, true, 'Correct password should authenticate');
  assert.strictEqual(invalidPassword, false, 'Wrong password should fail authentication');
  console.log('✅ Test 3 Passed: Password authentication & bcrypt hashing verified.');

  // Test 4: Casting Vote
  const voteResult = db.recordVote(user.id, 'B');
  assert.strictEqual(voteResult.success, true, 'Vote for Party B should succeed');
  assert.strictEqual(voteResult.party.code, 'B', 'Voted party should be B');

  // Verify user hasVoted state
  const updatedUser = db.getUserById(user.id);
  assert.strictEqual(updatedUser.hasVoted, true, 'hasVoted flag must be true');
  assert.strictEqual(updatedUser.votedParty, 'B', 'votedParty must be B');
  console.log('✅ Test 4 Passed: Vote casting verified.');

  // Test 5: Prevent Double Voting
  const secondVote = db.recordVote(user.id, 'A');
  assert.strictEqual(secondVote.success, false, 'Second vote should be strictly rejected');
  assert.strictEqual(secondVote.error, 'You have already voted.', 'Error message should match');
  console.log('✅ Test 5 Passed: Double voting prevention verified.');

  // Test 6: Verify Results Computation
  // Register another user and vote for Party A
  const hash2 = await bcrypt.hash('pass456', 10);
  const user2Result = db.addUser('bob', hash2);
  db.recordVote(user2Result.user.id, 'A');

  const resultsData = db.getResults();
  assert.strictEqual(resultsData.totalVotes, 2, 'Total votes must equal 2');
  assert.strictEqual(resultsData.totalUsers, 2, 'Total registered voters must equal 2');

  const partyA = resultsData.results.find(p => p.code === 'A');
  const partyB = resultsData.results.find(p => p.code === 'B');
  const partyC = resultsData.results.find(p => p.code === 'C');

  assert.strictEqual(partyA.votes, 1, 'Party A should have 1 vote');
  assert.strictEqual(partyA.percentage, 50.0, 'Party A should have 50.0% of votes');

  assert.strictEqual(partyB.votes, 1, 'Party B should have 1 vote');
  assert.strictEqual(partyB.percentage, 50.0, 'Party B should have 50.0% of votes');

  assert.strictEqual(partyC.votes, 0, 'Party C should have 0 votes');
  assert.strictEqual(partyC.percentage, 0, 'Party C should have 0% of votes');
  console.log('✅ Test 6 Passed: Election results calculations and percentages verified.');

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! The pnpm / Node.js voting system is verified.');
}

runTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
