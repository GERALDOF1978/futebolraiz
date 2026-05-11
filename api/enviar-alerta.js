import admin from 'firebase-admin';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    let certKey = process.env.FIREBASE_PRIVATE_KEY || "";
    
    // A BLINDAGEM MÁXIMA: Força as quebras de linha e limpa aspas indesejadas da Vercel
    certKey = certKey.replace(/\\n/g, '\n').replace(/^"|"$/g, '');

    if (!certKey.includes('-----BEGIN PRIVATE KEY-----')) {
        throw new Error("A chave privada não foi encontrada ou está no formato incorreto na Vercel.");
    }

    // Inicializa com os seus dados fixos + chave limpa
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: "futebolraiz-fg",
          clientEmail: "firebase-adminsdk-fbsvc@futebolraiz-fg.iam.gserviceaccount.com",
          privateKey: certKey,
        }),
      });
    }

    const { titulo, mensagem } = req.body;
    const db = admin.firestore();
    
    // Busca a nossa rede para apoiar
    const tokensSnapshot = await db.collection('tokens').get();
    const tokens = [];
    tokensSnapshot.forEach(doc => tokens.push(doc.id));

    if (tokens.length === 0) {
      return res.status(200).json({ success: true, message: 'Nenhum celular registrado para apoiar ainda.' });
    }

    const payload = {
      notification: { title: titulo, body: mensagem },
      tokens: tokens
    };

    const response = await admin.messaging().sendEachForMulticast(payload);
    return res.status(200).json({ success: true, enviados: response.successCount });
    
  } catch (error) {
    console.error('Erro detalhado:', error);
    return res.status(500).json({ error: error.message });
  }
}