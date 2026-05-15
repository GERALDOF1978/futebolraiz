import admin from 'firebase-admin';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    let certKey = process.env.FIREBASE_PRIVATE_KEY || "";
    certKey = certKey.replace(/\\n/g, '\n').replace(/^"|"$/g, '');

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: "futebolraiz-fg",
          clientEmail: "firebase-adminsdk-fbsvc@futebolraiz-fg.iam.gserviceaccount.com",
          privateKey: certKey,
        }),
      });
    }

    const { email, senha } = req.body;

    if (!email || !senha || senha.length < 6) {
      return res.status(400).json({ error: 'E-mail inválido ou senha muito curta (mínimo de 6 caracteres).' });
    }

    // A MÁGICA: Cria o utilizador no Firebase Auth sem deslogar quem está a usar o painel
    const userRecord = await admin.auth().createUser({
      email: email,
      password: senha,
    });

    return res.status(200).json({ success: true, message: 'Novo administrador adicionado com sucesso!' });
    
  } catch (error) {
    console.error('Erro ao criar admin:', error);
    // Mensagem amigável se o e-mail já existir
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: 'Este e-mail já está registado como administrador.' });
    }
    return res.status(500).json({ error: error.message });
  }
}