// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://sygcohrlgvqzbazzslbh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Z2NvaHJsZ3ZxemJhenpzbGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0MzY1MDAsImV4cCI6MjA1MDAxMjUwMH0.WHg79V2sFsGhg4AENlW7K2PIfTPdJbqCsFQSX-Za86c";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);