import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// TODO: Reemplaza con tus credenciales de la nueva cuenta de Supabase
const supabaseUrl = 'https://qttvsaonebquasfaxecs.supabase.co'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0dHZzYW9uZWJxdWFzZmF4ZWNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0ODA4MzksImV4cCI6MjA5MzA1NjgzOX0.USV-BSJlABKno2GggdZbS8mNndn-JCJ8-nItmu066WE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
