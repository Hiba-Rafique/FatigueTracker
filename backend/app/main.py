from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv
from app.database import test_connection

load_dotenv()

app = FastAPI(title="Smart Student Mental Fatigue Tracker API")

# Setup CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Smart Student Mental Fatigue Tracker API!"}

@app.get("/health")
def health_check():
    is_connected = test_connection()
    return {
        "status": "online" if is_connected else "offline",
        "database": "connected" if is_connected else "disconnected"
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
