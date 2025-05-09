let collectionKey = null;
const ragApiUrl = 'http://localhost:5000/'; //colocar a url de prod aqui
function handleFileName() {
    const fileInput = document.getElementById('pdfFile');
    const fileName = document.getElementById('fileName');
    if (fileInput.files.length > 0) {
        fileName.textContent = fileInput.files[0].name;
        uploadPDF();
    } else {
        fileName.textContent = 'Nenhum arquivo';
    }
}

async function uploadPDF() {
    const file = document.getElementById('pdfFile').files[0];
    if (!file) return;

    const formData = new FormData();

    formData.append('file', file);

    try {
        const response = await fetch(ragApiUrl + 'upload-pdf', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();
        collectionKey = data.collectionKey;
        appendMessage("📎 PDF enviado com sucesso: " + file.name + " collectionKey: " + collectionKey);
    } catch (error) {
        appendMessage("❌ Erro ao enviar o PDF.");
    }
}

async function sendQuestion() {
    const input = document.getElementById('questionInput');
    const question = input.value.trim();
    if (!question) return;

    appendMessage("🧠 Você: " + question);
    input.value = '';

    if (!collectionKey) {
        appendMessage("⚠️ Por favor, envie um PDF antes de fazer perguntas.");
        return;
    }

    const payload = {
        collection: collectionKey,
        question
    };

    try {
        const response = await fetch(ragApiUrl + 'send-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        appendMessage("🤖 Resposta:\n" + data.answer);
    } catch (error) {
        appendMessage("❌ Erro ao enviar a pergunta.");
    }
}

function appendMessage(text) {
    const chatOutput = document.getElementById('chatOutput');
    const msg = document.createElement('div');
    msg.className = 'chat-message';
    msg.textContent = text;
    chatOutput.appendChild(msg);
    chatOutput.scrollTop = chatOutput.scrollHeight;
}