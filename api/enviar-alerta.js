import admin from 'firebase-admin';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error('Chaves da Vercel ausentes. Vá às definições (Environment Variables) da Vercel.');
    }

    // ==========================================
    // RECONSTRUTOR DA CHAVE (Adeus erro DECODER)
    // ==========================================
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    // 1. Remove aspas acidentais
    privateKey = privateKey.replace(/"/g, '');
    // 2. Transforma códigos de texto em quebras de linha reais
    privateKey = privateKey.replace(/\\n/g, '\n');
    
    // 3. Se a Vercel engoliu os espaços todos e deixou tudo numa linha só:
    if (privateKey.indexOf('\n') === -1) {
        privateKey = privateKey.replace('-----BEGIN PRIVATE KEY-----', '');
        privateKey = privateKey.replace('-----END PRIVATE KEY-----', '');
        privateKey = privateKey.replace(/\s+/g, ''); // Remove qualquer espaço extra
        
        // Recria os blocos exatos que o Google exige (64 caracteres)
        const linhas = privateKey.match(/.{1,64}/g);
        privateKey = `-----BEGIN PRIVATE KEY-----\n${linhas.join('\n')}\n-----END PRIVATE KEY-----\n`;
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: "futebolraiz-fg",
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
    }

    const { titulo, mensagem } = req.body;
    const db = admin.firestore();
    
    const tokensSnapshot = await db.collection('tokens').get();
    const tokens = [];
    tokensSnapshot.forEach(doc => tokens.push(doc.id));

    if (tokens.length === 0) {
      return res.status(200).json({ success: true, message: 'Nenhum telemóvel registado ainda.' });
    }

    const payload = {
      notification: { title: titulo, body: mensagem },
      tokens: tokens
    };

    const response = await admin.messaging().sendEachForMulticast(payload);
    return res.status(200).json({ success: true, enviados: response.successCount });
    
  } catch (error) {
    console.error('Erro interno:', error);
    return res.status(500).json({ error: error.message });
  }
}