// Script de teste para validar JWT do Zoom
// Execute com: node test-zoom-jwt.js

require('dotenv').config();
const jwt = require('jsonwebtoken');

console.log('=== TESTE DE GERAÇÃO DE JWT DO ZOOM ===\n');

// Verificar se as credenciais estão configuradas
const sdkKey = process.env.ZOOM_SDK_KEY;
const sdkSecret = process.env.ZOOM_SDK_SECRET;

if (!sdkKey || !sdkSecret) {
  console.error('❌ ERRO: ZOOM_SDK_KEY e ZOOM_SDK_SECRET devem estar configurados no .env');
  process.exit(1);
}

console.log('✅ Credenciais encontradas:');
console.log('   ZOOM_SDK_KEY:', sdkKey.substring(0, 10) + '...');
console.log('   ZOOM_SDK_SECRET:', sdkSecret.substring(0, 10) + '...\n');

// Parâmetros de teste
const meetingNumber = '88420561093'; // Use o número da sua reunião de teste
const role = 0; // 0 = participante, 1 = host

console.log('📋 Parâmetros:');
console.log('   Meeting Number:', meetingNumber);
console.log('   Role:', role, '(0=participante, 1=host)\n');

// Gerar JWT seguindo EXATAMENTE a documentação oficial
const iat = Math.round(new Date().getTime() / 1000) - 30;
const exp = iat + 60 * 60 * 2;
const tokenExp = exp;

console.log('⏰ Timestamps:');
console.log('   iat (issued at):', iat, '(' + new Date(iat * 1000).toISOString() + ')');
console.log('   exp (expires):', exp, '(' + new Date(exp * 1000).toISOString() + ')');
console.log('   tokenExp:', tokenExp, '(' + new Date(tokenExp * 1000).toISOString() + ')');
console.log('   Validade: 2 horas\n');

// Payload EXATO da documentação oficial
const payload = {
  appKey: sdkKey,
  mn: String(meetingNumber),
  role: role,
  iat: iat,
  exp: exp,
  tokenExp: tokenExp
};

console.log('📦 Payload JWT:');
console.log(JSON.stringify(payload, null, 2));
console.log();

// Gerar signature
const signature = jwt.sign(payload, sdkSecret, { algorithm: 'HS256' });

console.log('🔐 JWT Signature gerado:');
console.log(signature);
console.log('\nTamanho:', signature.length, 'caracteres\n');

// Decodificar para verificar
const decoded = jwt.decode(signature, { complete: true });

console.log('📖 JWT Decodificado:');
console.log('Header:', JSON.stringify(decoded.header, null, 2));
console.log('Payload:', JSON.stringify(decoded.payload, null, 2));
console.log();

// Verificar assinatura
try {
  jwt.verify(signature, sdkSecret, { algorithms: ['HS256'] });
  console.log('✅ Assinatura JWT válida (verificada com sucesso)');
} catch (error) {
  console.log('❌ Erro ao verificar assinatura:', error.message);
}

console.log('\n=== FIM DO TESTE ===\n');

console.log('📝 IMPORTANTE:');
console.log('1. Verifique se seu app no Zoom Marketplace é do tipo "Meeting SDK"');
console.log('   (NÃO deve ser "JWT App" que está deprecated)');
console.log('2. ZOOM_SDK_KEY deve ser o "Client ID"');
console.log('3. ZOOM_SDK_SECRET deve ser o "Client Secret"');
console.log('4. O app deve estar ATIVADO no Zoom Marketplace');
console.log('5. O Meeting Number deve existir e estar ativo\n');
