import os
import sys
import subprocess
import time
import signal

def run():
    print("====================================================")
    print("         PulseSINAPI - Boot Orchestrator            ")
    print("====================================================")
    
    # 1. Check database and seed if missing
    db_path = "backend/sinapi.db"
    if not os.path.exists(db_path):
        print("[DB] database sinapi.db not found. Seeding mock database...")
        # Run seeder
        res = subprocess.run([
            "backend/.venv/bin/python3", "-m", "backend.generate_mock_data"
        ], env={**os.environ, "PYTHONPATH": "."})
        if res.returncode != 0:
            print("[Error] Seeding database failed.")
            sys.exit(1)
    else:
        print("[DB] database sinapi.db exists.")

    processes = []
    
    # Graceful shutdown handler
    def signal_handler(sig, frame):
        print("\n[Orchestrator] Shutting down PulseSINAPI Explorer processes...")
        for p in processes:
            try:
                p.terminate()
                p.wait(timeout=2)
            except Exception:
                p.kill()
        print("[Orchestrator] Stopped. Goodbye!")
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        # 2. Start Backend
        print("[Backend] Launching FastAPI server on http://localhost:8000 ...")
        backend_proc = subprocess.Popen(
            ["backend/.venv/bin/python3", "-m", "backend.app"],
            env={**os.environ, "PYTHONPATH": "."}
        )
        processes.append(backend_proc)
        
        # Wait a short moment for backend to initialize ports
        time.sleep(1.5)
        
        # 3. Start Frontend
        print("[Frontend] Launching Vite Dev Server on http://localhost:5173 ...")
        frontend_proc = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd="frontend"
        )
        processes.append(frontend_proc)
        
        # Poll processes to keep runner active
        while True:
            for p in processes:
                if p.poll() is not None:
                    print(f"\n[Warning] Process {p.pid} terminated unexpectedly. Shutting down...")
                    signal_handler(None, None)
            time.sleep(1)
            
    except KeyboardInterrupt:
        signal_handler(None, None)

if __name__ == "__main__":
    run()
