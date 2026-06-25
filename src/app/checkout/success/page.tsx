import { getOrderForSuccess } from '@/actions/orders';
import { CheckoutSuccessClient } from './CheckoutSuccessClient';

// Dynamic: reads ?session_id to resolve the order (so a guest can self-cancel).
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const order = session_id ? await getOrderForSuccess(session_id) : null;
  return <CheckoutSuccessClient sessionId={session_id} status={order?.status} />;
}
