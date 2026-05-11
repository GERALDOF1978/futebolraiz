import admin from 'firebase-admin';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error('Chaves da Vercel ausentes. Configure as Variáveis e faça Redeploy.');
    }

    // ==========================================
    // BLINDAGEM DA CHAVE PRIVADA (Limpa os erros da Vercel)
    // ==========================================
    let formatKey = process.env.FIREBASE_PRIVATE_KEY;
    // Se a Vercel colocou aspas no início e no fim, nós retiramos
    if (formatKey.startsWith('"') && formatKey.endsWith('"')) {
      formatKey = formatKey.slice(1, -1);
    }
    // Força a transformação dos \n em quebras de linha reais que o Firebase exige
    formatKey = formatKey.replace(/\\n/g, '\n');

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: "futebolraiz-fg",
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: formatKey,
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