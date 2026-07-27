import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

async function testLeadsTable() {
  console.log("Checking if 'leads' table exists and is accessible...");
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .limit(1);

  if (error) {
    console.log("Querying 'leads' failed:", error);
  } else {
    console.log("Querying 'leads' succeeded! Current data:", data);
  }
}

testLeadsTable();
