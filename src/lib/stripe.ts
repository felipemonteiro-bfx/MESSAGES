import Stripe from 'stripe';
import { env } from '@/lib/env';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-01-28.clover',
  appInfo: {
    name: 'Guardião de Notas',
    version: '0.1.0',
  },
});
