import { type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/middleware'

export function middleware(request: NextRequest) {
  return createClient(request)
}
