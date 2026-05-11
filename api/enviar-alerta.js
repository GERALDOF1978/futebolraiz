import admin from 'firebase-admin';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    // 1. Verifica a nova variável única
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      throw new Error('Chave completa ausente. Configure a variável FIREBASE_SERVICE_ACCOUNT na Vercel.');
    }

    // 2. Inicialização perfeita lendo o JSON inteiro
    if (!admin.apps.length) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    const { titulo, mensagem } = req.body;
    const db = admin.firestore();
    
    // 3. Busca a rede de apoio
    const tokensSnapshot = await db.collection('tokens').get();
    const tokens = [];
    tokensSnapshot.forEach(doc => tokens.push(doc.id));

    if (tokens.length === 0) {
      return res.status(200).json({ success: true, message: 'Nenhum telemóvel registado ainda.' });
    }

    // 4. Dispara a notificação
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