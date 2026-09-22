document.addEventListener('DOMContentLoaded', () => {
    // === DOM Elements ===
    const apiNameInput = document.getElementById('api-name-input');
    const apiUrlInput = document.getElementById('api-url-input');
    const addApiBtn = document.getElementById('add-api-btn');
    const apiList = document.getElementById('api-list');

    const chatHistory = document.getElementById('chat-history');
    const aiPromptInput = document.getElementById('ai-prompt-input');
    const sendPromptBtn = document.getElementById('send-prompt-btn');

    const testGameBtn = document.getElementById('test-game-btn');
    const downloadGameBtn = document.getElementById('download-game-btn');

    const emulatorModal = document.getElementById('emulator-modal');
    const closeModal = document.querySelector('.close-modal');

    // === State Management (localStorage) ===
    let apis = JSON.parse(localStorage.getItem('merchkuQ_apis')) || [];
    let chatMessages = JSON.parse(localStorage.getItem('merchkuQ_chat')) || [];

    // Initialize UI from state
    renderApiList();
    renderChatHistory();

    // === API Management ===
    addApiBtn.addEventListener('click', () => {
        const name = apiNameInput.value.trim();
        const url = apiUrlInput.value.trim();

        if (name && url) {
            apis.push({ name, url });
            saveApis();
            renderApiList();
            apiNameInput.value = '';
            apiUrlInput.value = '';
        } else {
            alert('Proszę podać nazwę i URL/Klucz API.');
        }
    });

    function renderApiList() {
        apiList.innerHTML = '';
        apis.forEach((api, index) => {
            const div = document.createElement('div');
            div.className = 'api-item';
            div.innerHTML = `
                <span><strong>${api.name}</strong></span>
                <button onclick="removeApi(${index})">X</button>
            `;
            apiList.appendChild(div);
        });
    }

    window.removeApi = function(index) {
        apis.splice(index, 1);
        saveApis();
        renderApiList();
    };

    function saveApis() {
        localStorage.setItem('merchkuQ_apis', JSON.stringify(apis));
    }

    // === AI Chat ===
    sendPromptBtn.addEventListener('click', handleSendPrompt);
    aiPromptInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendPrompt();
        }
    });

    function handleSendPrompt() {
        const text = aiPromptInput.value.trim();
        if (!text) return;

        // Add user message
        addChatMessage('user', text);
        aiPromptInput.value = '';

        // Simulate AI processing and response
        setTimeout(() => {
            const response = `Przyjąłem polecenie: "${text}". Przekazuję instrukcje do silnika Godot przy użyciu dostępnych API.`;
            addChatMessage('system', `AI: ${response}`);
        }, 1000);
    }

    function addChatMessage(role, text) {
        chatMessages.push({ role, text });
        saveChat();
        appendMessageToUI(role, text);
    }

    function renderChatHistory() {
        // Clear except the first welcome message
        const children = Array.from(chatHistory.children);
        for (let i = 1; i < children.length; i++) {
            chatHistory.removeChild(children[i]);
        }

        chatMessages.forEach(msg => {
            appendMessageToUI(msg.role, msg.text);
        });
    }

    function appendMessageToUI(role, text) {
        const div = document.createElement('div');
        div.className = `message ${role}`;
        div.textContent = text;
        chatHistory.appendChild(div);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    function saveChat() {
        localStorage.setItem('merchkuQ_chat', JSON.stringify(chatMessages));
    }

    // === Game Actions ===

    // Test Game (Emulator)
    testGameBtn.addEventListener('click', () => {
        emulatorModal.style.display = 'block';
        // Simulating emulator loading
        const emulatorContainer = document.getElementById('emulator-container');
        emulatorContainer.innerHTML = '<p>Uruchamianie silnika Godot... Ładowanie sceny...</p>';

        setTimeout(() => {
            emulatorContainer.innerHTML = '<p style="color: white;">GRA URUCHOMIONA (Tryb Podglądu)</p>';
        }, 2000);
    });

    closeModal.addEventListener('click', () => {
        emulatorModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === emulatorModal) {
            emulatorModal.style.display = 'none';
        }
    });

    // Download Game
    downloadGameBtn.addEventListener('click', () => {
        // We use JSZip to generate a simple zip folder representing a Godot project
        if (typeof JSZip === 'undefined') {
            alert('Biblioteka JSZip nie została załadowana.');
            return;
        }

        const zip = new JSZip();

        // Add basic Godot project files
        zip.file("project.godot", `
; Engine configuration file.
; It's best edited using the editor UI and not directly,
; since the parameters that go here are not all obvious.
;
; Format:
;   [section] ; section goes between []
;   param=value ; assign values to parameters

config_version=5

[application]

config/name="merchkuQ_Project"
run/main_scene="res://main.tscn"
config/features=PackedStringArray("4.2", "Forward Plus")
config/icon="res://icon.svg"
        `.trim());

        zip.file("main.tscn", `
[gd_scene format=3 uid="uid://test"]

[node name="Node2D" type="Node2D"]
        `.trim());

        zip.file("README.md", "# Wygenerowano przez merchkuQ AI\n\nTwój projekt Godot jest gotowy.");

        // Generate the zip and trigger download
        zip.generateAsync({type:"blob"})
        .then(function(content) {
            saveAs(content, "merchkuQ_GameProject.zip");
        });
    });
});
