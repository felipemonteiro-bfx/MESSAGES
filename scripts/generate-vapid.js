// Script para gerar chaves VAPID (push disfarçado - Sugestão 3)
const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('\n✅ Chaves VAPID geradas:\n');
console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
console.log('\n📋 Adicione ao .env.local e na Vercel (Environment Variables):\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('\n⚠️  A chave privada é secreta! Não compartilhe nem commite no Git.\n');
