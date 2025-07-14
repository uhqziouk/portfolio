require('dotenv').config();
const express = require('express');
const requestIp = require('request-ip');
const axios = require('axios');
const UAParser = require('ua-parser-js');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static('public'));
app.use(express.json());
app.use(requestIp.mw());

function formatDate() {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Paris'
  }).format(new Date());
}

app.post('/collect', async (req, res) => {
  try {
    const ip = req.clientIp;
    const { userAgent, screenResolution, language } = req.body;

    // Analyse du User-Agent
    const parser = new UAParser(userAgent);
    const uaResult = parser.getResult();

    // API géoloc via IP (ipapi.co)
    const ipData = await axios.get(`https://ipapi.co/${ip}/json/`).then(r => r.data);

    // Génère un identifiant de session
    const sessionID = uuidv4();

    // Formatage des données
    const message = {
      content: null,
      embeds: [
        {
          title: "🕵️ Nouvelle visite détectée",
          color: 0x3498db,
          description: [
            `📅 **Date** : ${formatDate()}`,
            `🆔 **Session ID** : \`${sessionID}\``
          ].join('\n'),
          fields: [
            {
              name: "🌐 Adresse IP & Localisation",
              value:
                `\`\`\`\nIP : ${ip}\nPays : ${ipData.country_name} (${ipData.country})\nRégion : ${ipData.region}\nVille : ${ipData.city}\nFAI : ${ipData.org}\n\`\`\``
            },
            {
              name: "💻 Appareil & Navigateur",
              value:
                `\`\`\`\nType : ${uaResult.device.type || 'Desktop'}\nOS : ${uaResult.os.name} ${uaResult.os.version || ''}\nNavigateur : ${uaResult.browser.name} ${uaResult.browser.version}\n\`\`\``
            },
            {
              name: "🧾 Autres données",
              value:
                `\`\`\`\nLangue : ${language}\nRésolution : ${screenResolution}\nUser-Agent : ${userAgent}\n\`\`\``
            }
          ],
          timestamp: new Date().toISOString()
        }
      ]
    };

    await axios.post(process.env.DISCORD_WEBHOOK_URL, message);
    res.sendStatus(200);

  } catch (err) {
    console.error("Erreur lors de la collecte :", err.message);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`Serveur opérationnel sur http://localhost:${PORT}`);
});
