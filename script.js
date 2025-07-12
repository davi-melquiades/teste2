// Importa as funções do Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Variáveis globais do ambiente Canvas
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let app;
let db;
let auth;
let userId = null;
let isAuthReady = false;

// Função para exibir o modal de mensagem
function showMessageModal(title, message) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    document.getElementById('message-modal').classList.remove('hidden');
}

// Event listener para fechar o modal de mensagem
document.getElementById('modal-close-btn').addEventListener('click', () => {
    document.getElementById('message-modal').classList.add('hidden');
});

// Inicializa o Firebase e autentica o usuário
async function initializeFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Observa o estado de autenticação
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                console.log("Usuário autenticado:", userId);
            } else {
                // Se não houver usuário logado, tenta autenticar anonimamente
                if (!initialAuthToken) {
                    await signInAnonymously(auth);
                    console.log("Autenticado anonimamente.");
                }
            }
            isAuthReady = true;
            // Carrega dados após a autenticação estar pronta
            if (isAuthReady) {
                loadCategories();
                loadUpdatesAndNews();
            }
        });

        // Tenta autenticar com o token personalizado se disponível
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
            console.log("Autenticado com token personalizado.");
        } else {
            // Se não houver token, onAuthStateChanged cuidará da autenticação anônima
            console.log("Nenhum token personalizado fornecido. Aguardando onAuthStateChanged para autenticação anônima.");
        }

    } catch (error) {
        console.error("Erro ao inicializar Firebase ou autenticar:", error);
        showMessageModal("Erro de Inicialização", "Não foi possível conectar ao serviço. Por favor, tente novamente mais tarde.");
    }
}

// Carrega categorias do Firestore
async function loadCategories() {
    if (!db || !isAuthReady) {
        console.log("Firestore não pronto ou autenticação pendente para carregar categorias.");
        return;
    }
    try {
        // Caminho para dados públicos
        const categoriesColRef = collection(db, `artifacts/${appId}/public/data/categories`);
        onSnapshot(categoriesColRef, (snapshot) => {
            const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Categorias carregadas:", categories);
            // Aqui você pode atualizar o menu lateral com as categorias
            // Por enquanto, as categorias são estáticas no HTML para o protótipo.
        });
    } catch (error) {
        console.error("Erro ao carregar categorias:", error);
    }
}

// Carrega atualizações e novidades do Firestore
async function loadUpdatesAndNews() {
    if (!db || !isAuthReady) {
        console.log("Firestore não pronto ou autenticação pendente para carregar atualizações.");
        return;
    }
    try {
        const updatesColRef = collection(db, `artifacts/${appId}/public/data/updates`);
        onSnapshot(updatesColRef, (snapshot) => {
            const updates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Atualizações e Notícias carregadas:", updates);
            const updatesNewsContent = document.getElementById('updates-news-content');
            updatesNewsContent.innerHTML = ''; // Limpa o conteúdo existente

            if (updates.length === 0) {
                updatesNewsContent.innerHTML = '<p class="text-gray-600">Nenhuma atualização ou novidade no momento.</p>';
                return;
            }

            updates.forEach(update => {
                const updateElement = `
                    <div class="bg-blue-50 p-4 rounded-lg flex items-center shadow-sm">
                        <i class="fas fa-bullhorn text-primary-blue text-2xl mr-4"></i>
                        <div>
                            <p class="font-semibold text-primary-blue">${update.title}</p>
                            ${update.link ? `<a href="${update.link}" target="_blank" class="text-blue-600 hover:underline text-sm">Saiba mais <i class="fas fa-external-link-alt ml-1 text-xs"></i></a>` : ''}
                            ${update.date ? `<p class="text-xs text-gray-500 mt-1">Última atualização: ${update.date}</p>` : ''}
                        </div>
                    </div>
                `;
                updatesNewsContent.insertAdjacentHTML('beforeend', updateElement);
            });
        });
    } catch (error) {
        console.error("Erro ao carregar atualizações e notícias:", error);
    }
}

// Adiciona uma nova atualização (exemplo para o admin)
async function addUpdate(title, link, date) {
    if (!db || !userId) {
        showMessageModal("Erro", "Usuário não autenticado ou Firestore não inicializado.");
        return;
    }
    try {
        // Dados públicos, mas adicionados por um admin
        const updatesColRef = collection(db, `artifacts/${appId}/public/data/updates`);
        await addDoc(updatesColRef, {
            title: title,
            link: link,
            date: date || new Date().toLocaleDateString('pt-BR'),
            createdAt: new Date()
        });
        showMessageModal("Sucesso", "Atualização adicionada com sucesso!");
    } catch (error) {
        console.error("Erro ao adicionar atualização:", error);
        showMessageModal("Erro", "Não foi possível adicionar a atualização.");
    }
}

// --- Lógica da Interface do Usuário (UI) ---

const sidebar = document.getElementById('sidebar');
const openSidebarBtn = document.getElementById('open-sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar');
const adminLoginLink = document.getElementById('admin-login-link');
const adminLoginScreen = document.getElementById('admin-login-screen');
const closeAdminLoginBtn = document.getElementById('close-admin-login');
const adminLoginForm = document.getElementById('admin-login-form');
const adminDashboardScreen = document.getElementById('admin-dashboard-screen');
const closeAdminDashboardBtn = document.getElementById('close-admin-dashboard');
const updateContentBtn = document.getElementById('update-content-btn');

const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const chatMessages = document.getElementById('chat-messages');
const quickSuggestions = document.getElementById('quick-suggestions');
const autocompleteSuggestions = document.getElementById('autocomplete-suggestions');

// Abre o menu lateral
openSidebarBtn.addEventListener('click', () => {
    sidebar.classList.remove('-translate-x-full');
});

// Fecha o menu lateral
closeSidebarBtn.addEventListener('click', () => {
    sidebar.classList.add('-translate-x-full');
});

// Simula o clique em uma categoria do menu lateral
document.querySelectorAll('.sidebar-category').forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        const category = e.currentTarget.dataset.category;
        addMessageToChat('user', `Mostre-me sobre ${category}`);
        simulateBotResponse(`Aqui está um resumo sobre ${category}.`, `Acesse a política oficial completa de ${category}.pdf`);
        sidebar.classList.add('-translate-x-full'); // Fecha o menu após a seleção
    });
});

// Abre a tela de login administrativo
adminLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    adminLoginScreen.classList.remove('hidden');
    // Esconde a sidebar em mobile ao abrir o login
    sidebar.classList.add('-translate-x-full');
});

// Fecha a tela de login administrativo
closeAdminLoginBtn.addEventListener('click', () => {
    adminLoginScreen.classList.add('hidden');
});

// Simula o login administrativo
adminLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;

    // Simples validação de login (apenas para protótipo)
    if (username === 'admin' && password === 'admin123') {
        adminLoginScreen.classList.add('hidden');
        adminDashboardScreen.classList.remove('hidden');
        showMessageModal("Sucesso", "Login administrativo realizado!");
    } else {
        showMessageModal("Erro de Login", "Usuário ou senha incorretos.");
    }
});

// Fecha o painel administrativo
closeAdminDashboardBtn.addEventListener('click', () => {
    adminDashboardScreen.classList.add('hidden');
});

// Simula a atualização de conteúdo (para o admin)
updateContentBtn.addEventListener('click', () => {
    // Aqui você poderia abrir um modal ou uma nova interface para o admin
    // digitar o novo conteúdo ou fazer upload de um arquivo.
    // Por simplicidade, vamos simular a adição de uma nova atualização.
    const newTitle = prompt("Digite o título da nova atualização:");
    if (newTitle) {
        const newLink = prompt("Digite o link (opcional):");
        addUpdate(newTitle, newLink);
    }
});


// Adiciona uma mensagem ao chat
function addMessageToChat(sender, message, link = null, date = null, showFeedback = false) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('flex', 'mb-4');

    let messageContent = `<p>${message}</p>`;
    if (link) {
        messageContent += `<a href="${link}" target="_blank" class="text-blue-600 hover:underline text-sm mt-2 block">Acesse o documento <i class="fas fa-external-link-alt ml-1 text-xs"></i></a>`;
    }
    if (date) {
        messageContent += `<p class="text-xs text-gray-500 mt-1 flex items-center"><i class="fas fa-calendar-alt mr-1"></i> Última atualização: ${date}</p>`;
    }

    if (sender === 'user') {
        messageDiv.classList.add('justify-end');
        messageDiv.innerHTML = `
            <div class="bg-blue-200 text-gray-800 p-4 rounded-lg rounded-br-none max-w-[80%] shadow-sm">
                ${messageContent}
            </div>
        `;
    } else {
        messageDiv.classList.add('justify-start');
        messageDiv.innerHTML = `
            <div class="bg-primary-blue text-white p-4 rounded-lg rounded-bl-none max-w-[80%] shadow-sm">
                <div class="flex items-center mb-2">
                    <i class="fas fa-info-circle mr-2"></i>
                    <span class="font-semibold">NormaBot:</span>
                </div>
                ${messageContent}
            </div>
        `;
    }
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Rola para o final

    if (showFeedback && sender === 'bot') {
        const feedbackDiv = document.createElement('div');
        feedbackDiv.classList.add('flex', 'justify-start', 'mt-2', 'mb-4');
        feedbackDiv.innerHTML = `
            <div class="bg-gray-100 p-3 rounded-lg shadow-sm">
                <p class="text-sm text-gray-700 mb-2">Essa resposta ajudou?</p>
                <div class="flex gap-2">
                    <button class="feedback-btn bg-green-500 text-white px-3 py-1 rounded-full text-xs hover:bg-green-600 transition-colors" data-feedback="yes">Sim</button>
                    <button class="feedback-btn bg-red-500 text-white px-3 py-1 rounded-full text-xs hover:bg-red-600 transition-colors" data-feedback="no">Não</button>
                </div>
                <div class="feedback-input mt-2 hidden">
                    <input type="text" placeholder="Sua sugestão de melhoria..." class="w-full p-2 border border-gray-300 rounded-md text-sm">
                    <button class="submit-feedback-btn bg-primary-blue text-white px-3 py-1 rounded-full text-xs mt-2 hover:bg-blue-700 transition-colors">Enviar</button>
                </div>
            </div>
        `;
        chatMessages.appendChild(feedbackDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Rola para o final
    }
}

// Simula a resposta do chatbot
function simulateBotResponse(message, documentLink = null) {
    setTimeout(() => {
        addMessageToChat('bot', message, documentLink, '01/06/2025', true); // Adiciona feedback
    }, 500);
}

// Event listener para botões de sugestões rápidas
quickSuggestions.addEventListener('click', (e) => {
    if (e.target.classList.contains('suggestion-btn')) {
        const query = e.target.dataset.query;
        addMessageToChat('user', query);
        simulateBotResponse(`Entendi, você perguntou sobre ${query}. Aqui está o resumo da política de ${query}.`, `https://placehold.co/200x100/0056b3/ffffff?text=Documento+de+${query}.pdf`);
    }
});

// Event listener para o campo de input e botão de enviar
sendBtn.addEventListener('click', () => {
    const query = userInput.value.trim();
    if (query) {
        addMessageToChat('user', query);
        userInput.value = '';
        autocompleteSuggestions.classList.add('hidden'); // Esconde sugestões
        simulateBotResponse(`Processando sua dúvida sobre "${query}". Aqui está a informação relevante.`);
    }
});

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendBtn.click();
    }
});

// Simula autocompletar
const autocompleteData = [
    "reembolso de despesas",
    "política de reembolso",
    "formulário de reembolso",
    "regras de viagens",
    "política de home office",
    "solicitar férias",
    "código de conduta",
    "banco de horas",
    "comunicação interna"
];

userInput.addEventListener('input', () => {
    const inputValue = userInput.value.toLowerCase();
    autocompleteSuggestions.innerHTML = '';
    if (inputValue.length > 1) {
        const filteredSuggestions = autocompleteData.filter(item =>
            item.toLowerCase().includes(inputValue)
        );
        if (filteredSuggestions.length > 0) {
            filteredSuggestions.forEach(suggestion => {
                const div = document.createElement('div');
                div.classList.add('p-3', 'cursor-pointer', 'hover:bg-gray-100', 'border-b', 'border-gray-100');
                div.textContent = suggestion;
                div.addEventListener('click', () => {
                    userInput.value = suggestion;
                    autocompleteSuggestions.classList.add('hidden');
                    sendBtn.click(); // Envia a pergunta ao selecionar
                });
                autocompleteSuggestions.appendChild(div);
            });
            autocompleteSuggestions.classList.remove('hidden');
        } else {
            autocompleteSuggestions.classList.add('hidden');
        }
    } else {
        autocompleteSuggestions.classList.add('hidden');
    }
});

// Fecha as sugestões de autocompletar ao clicar fora
document.addEventListener('click', (e) => {
    if (!userInput.contains(e.target) && !autocompleteSuggestions.contains(e.target)) {
        autocompleteSuggestions.classList.add('hidden');
    }
});

// Lógica de feedback "Essa resposta ajudou?"
chatMessages.addEventListener('click', (e) => {
    if (e.target.classList.contains('feedback-btn')) {
        const feedbackType = e.target.dataset.feedback;
        const feedbackContainer = e.target.closest('.feedback-div'); // Container do feedback
        const feedbackInput = e.target.closest('.feedback-div').querySelector('.feedback-input');

        if (feedbackType === 'yes') {
            showMessageModal("Obrigado!", "Ficamos felizes em ajudar!");
            // Oculta os botões de feedback
            e.target.closest('.flex.gap-2').classList.add('hidden');
        } else if (feedbackType === 'no') {
            feedbackInput.classList.remove('hidden');
            // Oculta os botões de feedback
            e.target.closest('.flex.gap-2').classList.add('hidden');
        }
    } else if (e.target.classList.contains('submit-feedback-btn')) {
        const suggestionInput = e.target.previousElementSibling;
        const suggestion = suggestionInput.value.trim();
        if (suggestion) {
            showMessageModal("Obrigado!", `Sua sugestão "${suggestion}" foi enviada para melhoria.`);
            suggestionInput.value = '';
            e.target.closest('.feedback-input').classList.add('hidden');
        } else {
            showMessageModal("Atenção", "Por favor, digite sua sugestão.");
        }
    }
});

// Inicializa o Firebase ao carregar a janela
window.onload = initializeFirebase;
