import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const { authUserId } = await req.json();
    if (!authUserId) {
      return NextResponse.json({ hasHistory: false, count: 0 });
    }

    const { count } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('auth_user_id', authUserId)
      .in('status', ['completed', 'feedback', 'active']);

    return NextResponse.json({
      hasHistory: (count ?? 0) > 0,
      count:      count ?? 0,
    });
  } catch {
    return NextResponse.json({ hasHistory: false, count: 0 });
  }
}
