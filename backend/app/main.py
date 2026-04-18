from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health, api, auth, student, admin

import uvicorn
import os
from dotenv import load_dotenv
import oracledb



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

# Centralized error handler for Oracle database errors
@app.exception_handler(oracledb.Error)
async def oracle_exception_handler(request: Request, exc: oracledb.Error):
    error_obj, = exc.args
    status_code = 500
    
    # 1: Unique constraint, 1400: Cannot insert null, 2290: Check constraint, 2291: FK constraint, 2292: Child record found
    if hasattr(error_obj, 'code') and error_obj.code in (1, 1400, 2290, 2291, 2292):
        status_code = 400
        
    return JSONResponse(
        status_code=status_code,
        content={
            "detail": "Database error", 
            "error_code": getattr(error_obj, 'code', 'Unknown'), 
            "error_message": getattr(error_obj, 'message', str(exc))
        }
    )

app.include_router(health.router)
app.include_router(api.router, prefix="/api")
app.include_router(auth.router)
app.include_router(student.router, prefix="/api")
app.include_router(admin.router,   prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Smart Student Mental Fatigue Tracker API!"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
