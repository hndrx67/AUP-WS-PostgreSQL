ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rfid_code text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_rfid_code_idx
  ON profiles (rfid_code)
  WHERE rfid_code IS NOT NULL AND rfid_code <> '';
