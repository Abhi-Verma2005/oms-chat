import { NextResponse } from 'next/server';

import { getActivePlan } from '@/db/queries';


export async function GET(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    const plan = await getActivePlan(params.chatId);
    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Failed to get active plan:', error);
    return NextResponse.json(
      { error: 'Failed to get active plan' },
      { status: 500 }
    );
  }
}
