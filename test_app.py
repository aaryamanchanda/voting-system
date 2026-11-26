import unittest
from app import app, init_db, get_db_connection
import json

class VotingSystemWebTestCase(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        app.config['WTF_CSRF_ENABLED'] = False
        self.client = app.test_client()
        init_db()
        # Clean users for testing
        conn = get_db_connection()
        conn.execute("DELETE FROM users")
        conn.commit()
        conn.close()

    def test_home_page(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Secure & Transparent Online Voting', response.data)

    def test_registration_and_login(self):
        # Register user 1
        reg_resp = self.client.post('/register', data={
            'username': 'alice',
            'password': 'secretpassword',
            'confirm_password': 'secretpassword'
        }, follow_redirects=True)
        self.assertEqual(reg_resp.status_code, 200)
        self.assertIn(b'Registration successful', reg_resp.data)

        # Prevent duplicate registration
        dup_resp = self.client.post('/register', data={
            'username': 'alice',
            'password': 'anotherpassword',
            'confirm_password': 'anotherpassword'
        }, follow_redirects=True)
        self.assertIn(b'Username already exists', dup_resp.data)

        # Login with correct password
        login_resp = self.client.post('/login', data={
            'username': 'alice',
            'password': 'secretpassword'
        }, follow_redirects=True)
        self.assertIn(b'Welcome back, alice', login_resp.data)

        # Logout
        logout_resp = self.client.get('/logout', follow_redirects=True)
        self.assertIn(b'logged out successfully', logout_resp.data)

    def test_voting_flow_and_duplicate_vote_prevention(self):
        # Register and login voter Bob
        self.client.post('/register', data={
            'username': 'bob',
            'password': 'password123',
            'confirm_password': 'password123'
        })
        self.client.post('/login', data={
            'username': 'bob',
            'password': 'password123'
        })

        # Cast vote for Party B
        vote_resp = self.client.post('/vote', data={'party': 'B'}, follow_redirects=True)
        self.assertIn(b'Vote cast successfully for Party B', vote_resp.data)

        # Try to vote again
        second_vote_resp = self.client.post('/vote', data={'party': 'A'}, follow_redirects=True)
        self.assertIn(b'You have already voted', second_vote_resp.data)

        # Check API results
        api_resp = self.client.get('/api/results')
        self.assertEqual(api_resp.status_code, 200)
        data = json.loads(api_resp.data)
        self.assertEqual(data['total_votes'], 1)
        party_b = next(p for p in data['parties'] if p['code'] == 'B')
        self.assertEqual(party_b['votes'], 1)
        self.assertEqual(party_b['percentage'], 100.0)

if __name__ == '__main__':
    unittest.main()
