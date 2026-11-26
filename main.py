import sys
from users import User, register_user, login_user
from votes import VotingSystem

def run_cli():
    voting_system = VotingSystem()
    while True:
        print("\n--- CLI Voting Menu ---")
        print("1. Register")
        print("2. Login")
        print("3. Vote")
        print("4. View Results")
        print("5. Exit")
        choice = input("Enter your choice: ")
        if choice == "1":
            register_user()
        elif choice == "2":
            login_user()
        elif choice == "3":
            voting_system.vote()
        elif choice == "4":
            voting_system.view_results()
        elif choice == "5":
            print("Exiting CLI.")
            break
        else:
            print("Invalid Choice. Please try again.")

def run_web():
    from app import app, init_db
    init_db()
    print("\n" + "="*50)
    print("🚀 Online Voting System Web Application")
    print("👉 Open your browser at: http://127.0.0.1:5000")
    print("="*50 + "\n")
    app.run(debug=True, host="0.0.0.0", port=5000)

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--cli":
        run_cli()
        return

    print("========================================")
    print("       ONLINE VOTING SYSTEM")
    print("========================================")
    print("1. Launch Web Application (Recommended)")
    print("2. Run in Terminal (CLI Mode)")
    print("3. Exit")
    choice = input("Select an option (1/2/3) [Default 1]: ").strip()

    if choice == "2":
        run_cli()
    elif choice == "3":
        print("Goodbye!")
    else:
        run_web()

if __name__ == "__main__":
    main()
