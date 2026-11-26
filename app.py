import os
import sqlite3
import werkzeug
if not hasattr(werkzeug, '__version__'):
    import importlib.metadata
    try:
        werkzeug.__version__ = importlib.metadata.version("werkzeug")
    except Exception:
        werkzeug.__version__ = "3.1.3"

from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "online-voting-system-secret-key-2026")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = os.path.join(BASE_DIR, "voting_system.db")

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            has_voted INTEGER DEFAULT 0,
            voted_party TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Parties table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS parties (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            color TEXT NOT NULL
        )
    ''')

    # Pre-populate default parties A, B, C matching the original system
    cursor.execute("SELECT COUNT(*) FROM parties")
    if cursor.fetchone()[0] == 0:
        cursor.executemany('''
            INSERT INTO parties (code, name, description, color)
            VALUES (?, ?, ?, ?)
        ''', [
            ('A', 'Party A', 'Committed to innovation, public services, and sustainable progress.', '#3b82f6'),
            ('B', 'Party B', 'Dedicated to economic prosperity, governance reform, and community development.', '#10b981'),
            ('C', 'Party C', 'Focused on environmental protection, social equity, and educational advancement.', '#f59e0b')
        ])

    conn.commit()
    conn.close()

def get_current_user():
    user_id = session.get("user_id")
    if not user_id:
        return None
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return user

@app.context_processor
def inject_user():
    return dict(current_user=get_current_user())

@app.route("/")
def index():
    conn = get_db_connection()
    total_votes = conn.execute("SELECT COUNT(*) FROM users WHERE has_voted = 1").fetchone()[0]
    total_users = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    parties_count = conn.execute("SELECT COUNT(*) FROM parties").fetchone()[0]
    conn.close()
    return render_template("index.html", total_votes=total_votes, total_users=total_users, parties_count=parties_count)

@app.route("/register", methods=["GET", "POST"])
def register():
    if session.get("user_id"):
        return redirect(url_for("vote"))
        
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        confirm_password = request.form.get("confirm_password", "")

        if not username or not password:
            flash("Username and password are required.", "danger")
            return render_template("register.html")

        if password != confirm_password:
            flash("Passwords do not match.", "danger")
            return render_template("register.html")

        conn = get_db_connection()
        user_check = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if user_check:
            conn.close()
            flash("Username already exists. Please choose a different username.", "warning")
            return render_template("register.html")

        hashed_pw = generate_password_hash(password)
        conn.execute("INSERT INTO users (username, password) VALUES (?, ?)", (username, hashed_pw))
        conn.commit()
        conn.close()

        flash("Registration successful! You can now log in.", "success")
        return redirect(url_for("login"))

    return render_template("register.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    if session.get("user_id"):
        return redirect(url_for("vote"))

    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")

        conn = get_db_connection()
        user = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        conn.close()

        if user and check_password_hash(user["password"], password):
            session["user_id"] = user["id"]
            session["username"] = user["username"]
            flash(f"Welcome back, {user['username']}!", "success")
            return redirect(url_for("vote"))
        else:
            flash("Invalid username or password.", "danger")

    return render_template("login.html")

@app.route("/logout")
def logout():
    session.clear()
    flash("You have been logged out successfully.", "info")
    return redirect(url_for("index"))

@app.route("/vote", methods=["GET", "POST"])
def vote():
    if not session.get("user_id"):
        flash("Please log in to cast your vote.", "warning")
        return redirect(url_for("login"))

    user = get_current_user()
    if not user:
        session.clear()
        return redirect(url_for("login"))

    conn = get_db_connection()
    parties = conn.execute("SELECT * FROM parties ORDER BY code ASC").fetchall()

    if request.method == "POST":
        if user["has_voted"]:
            conn.close()
            flash("You have already voted.", "warning")
            return redirect(url_for("results"))

        party_code = request.form.get("party")
        party_match = conn.execute("SELECT * FROM parties WHERE code = ?", (party_code,)).fetchone()

        if not party_match:
            conn.close()
            flash("Invalid party choice.", "danger")
            return render_template("vote.html", parties=parties, user=user)

        conn.execute("UPDATE users SET has_voted = 1, voted_party = ? WHERE id = ?", (party_code, user["id"]))
        conn.commit()
        conn.close()

        flash(f"Vote cast successfully for {party_match['name']}!", "success")
        return redirect(url_for("results"))

    conn.close()
    return render_template("vote.html", parties=parties, user=user)

@app.route("/results")
def results():
    conn = get_db_connection()
    parties = conn.execute("SELECT * FROM parties ORDER BY code ASC").fetchall()
    
    # Calculate vote counts per party
    results_data = []
    total_votes = conn.execute("SELECT COUNT(*) FROM users WHERE has_voted = 1").fetchone()[0]

    for p in parties:
        votes = conn.execute("SELECT COUNT(*) FROM users WHERE voted_party = ?", (p["code"],)).fetchone()[0]
        percentage = round((votes / total_votes * 100), 1) if total_votes > 0 else 0
        results_data.append({
            "code": p["code"],
            "name": p["name"],
            "description": p["description"],
            "color": p["color"],
            "votes": votes,
            "percentage": percentage
        })

    conn.close()
    return render_template("results.html", results=results_data, total_votes=total_votes)

@app.route("/api/results")
def api_results():
    conn = get_db_connection()
    parties = conn.execute("SELECT * FROM parties ORDER BY code ASC").fetchall()
    total_votes = conn.execute("SELECT COUNT(*) FROM users WHERE has_voted = 1").fetchone()[0]
    
    data = []
    for p in parties:
        votes = conn.execute("SELECT COUNT(*) FROM users WHERE voted_party = ?", (p["code"],)).fetchone()[0]
        percentage = round((votes / total_votes * 100), 1) if total_votes > 0 else 0
        data.append({
            "code": p["code"],
            "name": p["name"],
            "color": p["color"],
            "votes": votes,
            "percentage": percentage
        })
    conn.close()
    return jsonify({"total_votes": total_votes, "parties": data})

if __name__ == "__main__":
    init_db()
    print("Online Voting System web app running at http://127.0.0.1:5000")
    app.run(debug=True, host="0.0.0.0", port=5000)
