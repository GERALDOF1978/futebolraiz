import admin from 'firebase-admin';

// Conecta ao Firebase de forma segura
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "futebolraiz-fg",
      clientEmail: "firebase-adminsdk-fbsvc@futebolraiz-fg.iam.gserviceaccount.com",
      // A chave privada vem do cofre da Vercel para não vazar no GitHub
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { titulo, mensagem } = req.body;

  try {
    const db = admin.firestore();
    
    // Pega todos os tokens (telemóveis) cadastrados
    const tokensSnapshot = await db.collection('tokens').get();
    const tokens = [];
    tokensSnapshot.forEach(doc => tokens.push(doc.id));

    if (tokens.length === 0) {
      return res.status(200).json({ success: true, message: 'Nenhum dispositivo encontrado.' });
    }

    const payload = {
      notification: { title: titulo, body: mensagem },
      tokens: tokens
    };

    const response = await admin.messaging().sendEachForMulticast(payload);
    return res.status(200).json({ success: true, enviados: response.successCount });
  } catch (error) {
    console.error('Erro ao enviar:', error);
    return res.status(500).json({ error: 'Falha ao enviar notificação' });
  }
}