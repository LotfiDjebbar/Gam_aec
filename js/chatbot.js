/**
 * chatbot.js
 * Handles the RAG chatbot logic using Google Gemini API.
 */

// ==========================================
// CONFIGURATION
// ==========================================
// Remplacez cette valeur par votre clé API Google Gemini gratuite
// Obtenez-la sur : https://aistudio.google.com/app/apikey
// L'API Key n'est plus codée en dur pour des raisons de sécurité
let GEMINI_API_KEY = localStorage.getItem('gam_gemini_api_key') || "";
const GEMINI_MODEL = "gemini-2.5-flash";

// ==========================================
// UI ELEMENTS
// ==========================================
const chatToggleBtn = document.getElementById('chat-toggle-btn');
const chatWindow = document.getElementById('chat-window');
const chatCloseBtn = document.getElementById('chat-close-btn');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatMessages = document.getElementById('chat-messages');

let fuse = null;

// Initialize fuzzy search when DATA is ready
function initChatbot() {
  if (window.DATA && window.DATA.length > 0) {
    fuse = new Fuse(window.DATA, {
      keys: ['Commune', 'Wilaya'],
      threshold: 0.3,
      distance: 100
    });
  }
}

// Check for data every 500ms until loaded
const dataCheckInterval = setInterval(() => {
  if (window.DATA && window.DATA.length > 0) {
    initChatbot();
    clearInterval(dataCheckInterval);
  }
}, 500);

// ==========================================
// UI LOGIC
// ==========================================
function toggleChat() {
  chatWindow.classList.toggle('chat-hidden');
  if (!chatWindow.classList.contains('chat-hidden')) {
    chatInput.focus();
  }
}

chatToggleBtn.addEventListener('click', toggleChat);
chatCloseBtn.addEventListener('click', toggleChat);

function appendMessage(sender, text, isMarkdown = false) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg ${sender}-msg`;
  
  if (isMarkdown && typeof marked !== 'undefined') {
    msgDiv.innerHTML = marked.parse(text);
  } else {
    msgDiv.textContent = text;
  }
  
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator() {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'typing-indicator';
  typingDiv.id = 'typing-indicator';
  typingDiv.innerHTML = `
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  `;
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
  const typing = document.getElementById('typing-indicator');
  if (typing) {
    typing.remove();
  }
}

// ==========================================
// API & RAG LOGIC
// ==========================================
async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  // 1. Show user message
  appendMessage('user', text);
  chatInput.value = '';
  chatSendBtn.disabled = true;

  // 2. Extract Commune intent
  let contextData = null;
  const lowerText = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Try exact substring match first (best for multi-word communes)
  if (window.DATA) {
    contextData = window.DATA.find(d => {
      const cName = d.Commune.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return lowerText.includes(cName);
    });
  }

  // Fallback to fuzzy search on significant words
  if (!contextData && fuse) {
    const words = lowerText.split(/[\s,.'-]+/).filter(w => w.length > 3);
    for (const w of words) {
      const results = fuse.search(w);
      if (results.length > 0) {
        contextData = results[0].item;
        break;
      }
    }
  }

  // 3. Build the prompt
  let systemContext = `Tu es un assistant expert en stratégie d'implantation pour GAM Assurance.
L'utilisateur est un décideur métier (directeur commercial) qui s'appuie sur un modèle de scoring (IA) très performant que l'équipe a créé.
Ta mission est d'analyser la zone demandée de manière très directe et professionnelle, comme un consultant en stratégie. Ne mentionne jamais l'aspect technique (pas de XGBoost, pas de Machine Learning). Parle uniquement Business, Potentiel, et Marché. Va droit au but.`;

  if (contextData) {
    let compDetails = [];
    if (contextData.Nb_Agences_SAA > 0) compDetails.push(`SAA (${contextData.Nb_Agences_SAA})`);
    if (contextData.Nb_Agences_ALLIANCE > 0) compDetails.push(`ALLIANCE (${contextData.Nb_Agences_ALLIANCE})`);
    if (contextData.Nb_Agences_AXA > 0) compDetails.push(`AXA (${contextData.Nb_Agences_AXA})`);
    if (contextData.Nb_Agences_CAAR > 0) compDetails.push(`CAAR (${contextData.Nb_Agences_CAAR})`);
    if (contextData.Nb_Agences_CAAT > 0) compDetails.push(`CAAT (${contextData.Nb_Agences_CAAT})`);
    if (contextData.Nb_Agences_CASH > 0) compDetails.push(`CASH (${contextData.Nb_Agences_CASH})`);
    if (contextData.Nb_Agences_CIAR > 0) compDetails.push(`CIAR (${contextData.Nb_Agences_CIAR})`);
    if (contextData.Nb_Agences_TRUST > 0) compDetails.push(`TRUST (${contextData.Nb_Agences_TRUST})`);
    let compString = compDetails.length > 0 ? compDetails.join(', ') : 'Aucun';

    systemContext += `\n\nVoici les données stratégiques et prédictives pour la commune demandée ("${contextData.Commune}", Wilaya de ${contextData.Wilaya}):
- Population 2026: ${contextData.Pop_2026}
- Score IA d'Attractivité: ${contextData.Score_IA_Predictif.toFixed(1)} / 100
- Probabilité de succès commercial: ${contextData['Probabilite_Succes_%'].toFixed(1)}%
- Chiffre d'Affaires Potentiel: ${contextData.Chiffre_Affaires_Potentiel_DA.toLocaleString('fr-FR')} DA
- Concurrence: ${contextData.Nb_Agences_Concurrents_Total} agences présentes.
- Noms des concurrents présents: ${contextData.Concurrents_Noms ? contextData.Concurrents_Noms.replace(/\|/g, ', ') : 'Aucun'}
- Déficit estimé en agences (selon la norme de 1 agence pour 15k hab): ${contextData.Deficit_Agences}
- Présence GAM actuelle: ${contextData.Has_GAM ? 'Oui' : 'Non'}

Tu dois IMPÉRATIVEMENT structurer ta réponse exactement selon ce format (sans aucun emoji) :

**Synthèse pour [Nom de la Commune]**
[1 phrase d'accroche professionnelle]

**Indicateurs Clés**
- **Score d'Attractivité :** ${contextData.Score_IA_Predictif.toFixed(1)} / 100
- **CA Potentiel Estimé :** ${contextData.Chiffre_Affaires_Potentiel_DA.toLocaleString('fr-FR')} DA
- **Probabilité de Succès (pondérée) :** ${contextData['Probabilite_Succes_%'].toFixed(1)}%

**Environnement Concurrentiel**
- **Présence GAM :** ${contextData.Has_GAM ? 'Oui' : 'Non'}
- **Pression Concurrentielle :** ${contextData.Nb_Agences_Concurrents_Total} agences existantes
- **Détail des Acteurs :** ${compString}

**Recommandation Stratégique**
[1 ou 2 phrases claires donnant un avis tranché (ex: Fortement recommandé, À éviter, Opportunité de niche) basé sur les chiffres ci-dessus. Mets en évidence qui a combien d'agences.]`;
  } else {
    systemContext += `\n\nL'utilisateur n'a pas mentionné de nom de commune algérienne que nous avons dans notre base, ou bien le nom est mal orthographié. Demande-lui de préciser la ville.`;
  }

  // 4. Call Gemini API
  showTypingIndicator();

  if (!GEMINI_API_KEY) {
    const userKey = prompt("Pour des raisons de sécurité (clé détectée sur GitHub), l'ancienne clé a été révoquée.\n\nVeuillez coller une nouvelle clé API Gemini gratuite pour utiliser le Chatbot :");
    if (userKey && userKey.trim() !== "") {
      GEMINI_API_KEY = userKey.trim();
      localStorage.setItem('gam_gemini_api_key', GEMINI_API_KEY);
    } else {
      removeTypingIndicator();
      appendMessage('bot', `⚠️ **Clé API manquante**.\nPour que je puisse fonctionner, j'ai besoin d'une clé API Gemini gratuite.\n\n1. [Cliquez ici pour obtenir une clé](https://aistudio.google.com/app/apikey)\n2. Envoyez un nouveau message pour que je vous demande de la coller.`, true);
      chatSendBtn.disabled = false;
      return;
    }
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{ text: `INSTRUCTIONS SYSTEME:\n${systemContext}\n\nQUESTION DE L'UTILISATEUR:\n${text}` }]
        }]
      })
    });

    const data = await response.json();
    removeTypingIndicator();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const botReply = data.candidates[0].content.parts[0].text;
    appendMessage('bot', botReply, true);

  } catch (error) {
    console.error("Erreur API Gemini:", error);
    removeTypingIndicator();
    
    // Si l'erreur mentionne la clé API (ex: 400 API key not valid)
    if (error.message.toLowerCase().includes("key") || error.message.toLowerCase().includes("api")) {
      localStorage.removeItem('gam_gemini_api_key');
      GEMINI_API_KEY = "";
      appendMessage('bot', "⚠️ La clé API saisie est invalide ou a été révoquée. Elle a été supprimée de votre navigateur. Veuillez renvoyer un message pour en saisir une nouvelle.", false);
    } else {
      appendMessage('bot', "Désolé, une erreur est survenue lors de la communication avec l'IA. Vérifiez votre connexion internet.", false);
    }
  }

  chatSendBtn.disabled = false;
  chatInput.focus();
}

chatSendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});
