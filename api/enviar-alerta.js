import admin from 'firebase-admin';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    // 1. Verifica se as chaves secretas estão na Vercel
    if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error('Chaves da Vercel ausentes. Configure as Variáveis e faça Redeploy.');
    }

    // 2. Inicializa a ligação segura
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: "futebolraiz-fg",
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Trata as quebras de linha para evitar conflitos de formatação
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, ''),
        }),
      });
    }

    const { titulo, mensagem } = req.body;
    const db = admin.firestore();
    
    // 3. Procura quem ativou as notificações
    const tokensSnapshot = await db.collection('tokens').get();
    const tokens = [];
    tokensSnapshot.forEach(doc => tokens.push(doc.id));

    if (tokens.length === 0) {
      return res.status(200).json({ success: true, message: 'Nenhum telemóvel registado ainda.' });
    }

    // 4. Dispara a mensagem
    const payload = {
      notification: { title: titulo, body: mensagem },
      tokens: tokens
    };

    const response = await admin.messaging().sendEachForMulticast(payload);
    return res.status(200).json({ success: true, enviados: response.successCount });
    
  } catch (error) {
    console.error('Erro interno:', error);
    // Devolve o erro exato para o ecrã do Painel Admin
    return res.status(500).json({ error: error.message });
  }
}