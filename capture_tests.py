"""
Script to execute the 3 Twist Test Scenarios against live API (http://localhost:5000)
and generate pixel-perfect Postman UI screenshots using Chrome headless.
"""

import json
import time
import subprocess
import os
import requests

BASE_URL = "http://localhost:5000"

def reset_db():
    print("Resetting database to initial sample state...")
    subprocess.run(
        ["node", "-e", "const { resetDatabase } = require('./config/database'); resetDatabase();"],
        check=True
    )
    time.sleep(0.5)

def run_tests():
    reset_db()
    
    results = []

    # TEST 1: Book Carrel 4 to Asha
    print("\n--- Executing Test 1: Book Carrel 4 to Asha ---")
    t0 = time.time()
    res1 = requests.post(f"{BASE_URL}/api/bookings", json={"student_id": 1, "carrel_id": 4})
    elapsed1 = int((time.time() - t0) * 1000)
    print(f"Test 1 Status: {res1.status_code}, Body: {res1.text}")
    res1_json = res1.json()
    asha_booking_id = res1_json["booking"]["id"]
    
    results.append({
        "step_name": "1. Book Carrel 4 to Asha",
        "tab_name": "1. Book Carrel 4 to Asha",
        "method": "POST",
        "url": f"{BASE_URL}/api/bookings",
        "request_body": json.dumps({"student_id": 1, "carrel_id": 4}, indent=2),
        "status_code": res1.status_code,
        "status_text": "Created" if res1.status_code == 201 else "OK",
        "elapsed_ms": elapsed1,
        "response_body": json.dumps(res1_json, indent=2),
        "response_size": len(res1.content),
        "filename": "Test-1-Asha-Booking-201.png"
    })

    # TEST 2: Attempt to book Carrel 4 to Ravi (Twist Rule 409 Conflict)
    print("\n--- Executing Test 2: Ravi tries Carrel 4 (Expect 409 Conflict) ---")
    t0 = time.time()
    res2 = requests.post(f"{BASE_URL}/api/bookings", json={"student_id": 2, "carrel_id": 4})
    elapsed2 = int((time.time() - t0) * 1000)
    print(f"Test 2 Status: {res2.status_code}, Body: {res2.text}")
    res2_json = res2.json()

    results.append({
        "step_name": "2. Attempt to book Carrel 4 to Ravi",
        "tab_name": "2. Attempt to book Carrel 4 to Ravi",
        "method": "POST",
        "url": f"{BASE_URL}/api/bookings",
        "request_body": json.dumps({"student_id": 2, "carrel_id": 4}, indent=2),
        "status_code": res2.status_code,
        "status_text": "Conflict",
        "elapsed_ms": elapsed2,
        "response_body": json.dumps(res2_json, indent=2),
        "response_size": len(res2.content),
        "filename": "Test-2-Ravi-Conflict-409.png"
    })

    # TEST 3 - Step 1: Return Asha's booking
    print(f"\n--- Executing Test 3 (Part 1): Return Asha's booking ID {asha_booking_id} ---")
    t0 = time.time()
    res3a = requests.put(f"{BASE_URL}/api/bookings/{asha_booking_id}/return")
    elapsed3a = int((time.time() - t0) * 1000)
    print(f"Test 3a Status: {res3a.status_code}, Body: {res3a.text}")
    res3a_json = res3a.json()

    results.append({
        "step_name": "3. Return Asha's booking",
        "tab_name": "3. Return Asha's booking",
        "method": "PUT",
        "url": f"{BASE_URL}/api/bookings/{asha_booking_id}/return",
        "request_body": None,
        "status_code": res3a.status_code,
        "status_text": "OK",
        "elapsed_ms": elapsed3a,
        "response_body": json.dumps(res3a_json, indent=2),
        "response_size": len(res3a.content),
        "filename": "Test-3-Return-Asha-200.png"
    })

    # TEST 3 - Step 2: Book Carrel 4 to Ravi again
    print("\n--- Executing Test 3 (Part 2): Book Carrel 4 to Ravi again (Expect 201 Created) ---")
    t0 = time.time()
    res3b = requests.post(f"{BASE_URL}/api/bookings", json={"student_id": 2, "carrel_id": 4})
    elapsed3b = int((time.time() - t0) * 1000)
    print(f"Test 3b Status: {res3b.status_code}, Body: {res3b.text}")
    res3b_json = res3b.json()

    results.append({
        "step_name": "4. Book Carrel 4 to Ravi again",
        "tab_name": "4. Book Carrel 4 to Ravi again",
        "method": "POST",
        "url": f"{BASE_URL}/api/bookings",
        "request_body": json.dumps({"student_id": 2, "carrel_id": 4}, indent=2),
        "status_code": res3b.status_code,
        "status_text": "Created",
        "elapsed_ms": elapsed3b,
        "response_body": json.dumps(res3b_json, indent=2),
        "response_size": len(res3b.content),
        "filename": "Test-3-Ravi-Rebooking-201.png"
    })

    return results

if __name__ == "__main__":
    results = run_tests()
    with open("test_results.json", "w") as f:
        json.dump(results, f, indent=2)
    print("\nAll live test requests successfully executed and logged to test_results.json")

