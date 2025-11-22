"""
Fix corrupted vehicle detection records in database
"""
from app.database import SessionLocal
from app.models import VehicleDetection

def fix_detections():
    db = SessionLocal()
    try:
        # Delete all existing detections (they have corrupted track_ids)
        count = db.query(VehicleDetection).delete()
        db.commit()
        print(f"Deleted {count} corrupted detection records")
        print("Database fixed! You can now process videos again.")
    finally:
        db.close()

if __name__ == "__main__":
    fix_detections()
