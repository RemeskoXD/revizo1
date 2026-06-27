import { getStripe } from './lib/stripe';
async function test() {
  const stripe = getStripe();
  const charges = await stripe.charges.list({ limit: 5 });
  console.log(charges.data.length);
}
test();
