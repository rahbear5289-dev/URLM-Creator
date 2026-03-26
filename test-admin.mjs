import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bjykyqhfgazxkmnpqdsn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqeWt5cWhmZ2F6eGttbnBxZHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MDgzNDcsImV4cCI6MjA4OTk4NDM0N30.Wg48sLArWC1AH1xcAu0qYHhf1pDa6_i_LJes2T_zjTw'
);

async function run() {
  console.log("1. Logging in with old password `password123`...");
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'admin@urlm.app',
    password: 'password123'
  });

  if (signInError) {
    console.error("Login failed:", signInError.message);
    return;
  }
  
  console.log("Logged in successfully. Access token acquired.");
  
  console.log("2. Updating password to `Admin@7869`...");
  const { data: updateData, error: updateError } = await supabase.auth.updateUser({
    password: 'Admin@7869'
  });

  if (updateError) {
    console.error("Failed to update password:", updateError.message);
  } else {
    console.log("SUCCESS! Password changed to Admin@7869 for admin@urlm.app");
  }
}

run();
