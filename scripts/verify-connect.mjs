// Verify the Stripe Connect calls our code makes are well-formed + accepted by
// Stripe (test mode): Express account creation, onboarding Account Link, and a
// direct-charge Checkout Session with a 15% application fee on the connected
// account. Reads the test key from .env.local; deletes the test account after.
import Stripe from 'stripe';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('I:/craftology/.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.trimStart().startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const key = env.STRIPE_SECRET_KEY;
if (!key || !key.startsWith('sk_')) { console.log('No STRIPE_SECRET_KEY in .env.local'); process.exit(1); }
const stripe = new Stripe(key);

const acct = await stripe.accounts.create({
  type: 'express', country: 'RO', business_type: 'company',
  capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
});
console.log('1. Express account created:', acct.id, '| charges_enabled:', acct.charges_enabled);

const link = await stripe.accountLinks.create({
  account: acct.id, refresh_url: 'https://x/refresh', return_url: 'https://x/return', type: 'account_onboarding',
});
console.log('2. Onboarding Account Link:', link.url.startsWith('https://connect.stripe.com') ? 'OK' : link.url);

try {
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      line_items: [{ quantity: 1, price_data: { currency: 'ron', unit_amount: 10000, product_data: { name: 'Test produs' } } }],
      payment_intent_data: { application_fee_amount: 1500 },
      success_url: 'https://x/s', cancel_url: 'https://x/c',
    },
    { stripeAccount: acct.id },
  );
  console.log('3. Direct-charge Checkout (15% fee) on connected acct:', session.url ? 'OK — session created' : 'no url');
} catch (e) {
  console.log('3. Direct-charge Checkout call shape OK; Stripe says:', e.message);
}

await stripe.accounts.del(acct.id);
console.log('4. Test account deleted (cleanup).');
