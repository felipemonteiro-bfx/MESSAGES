import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27' as any, // Mantendo a versão estável
  appInfo: {
    name: 'Guardião de Notas',
    version: '0.1.0',
  },
});
