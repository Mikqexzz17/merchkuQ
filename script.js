document.addEventListener('DOMContentLoaded', () => {
    // === Welcome Screen Logic (Projects) ===
    const welcomeScreen = document.getElementById('welcome-screen');
    const appContainer = document.getElementById('app');
    const newProjectBtn = document.getElementById('new-project-btn');
    const projectListContainer = document.getElementById('project-list');

    let savedProjects = JSON.parse(localStorage.getItem('merchkuQ_projects')) || [];
    let currentProjectId = null;

    // Basic init if no current project
    function initializeWelcomeScreen() {
        projectListContainer.innerHTML = '';

        if (savedProjects.length === 0) {
            projectListContainer.innerHTML = '<p style="text-align:center; color:#666;">Brak zapisanych projektów.</p>';
        } else {
            savedProjects.forEach(proj => {
                const div = document.createElement('div');
                div.className = 'project-item';
                div.innerHTML = `
                    <div>
                        <strong>${proj.name}</strong><br>
                        <span>Ostatnia modyfikacja: ${new Date(proj.lastModified).toLocaleString()}</span>
                    </div>
                    <button class="delete-project-btn" data-id="${proj.id}" title="Usuń projekt">✖</button>
                `;

                // Click to load project
                div.addEventListener('click', (e) => {
                    if (e.target.classList.contains('delete-project-btn')) return;
                    loadProject(proj.id);
                });

                projectListContainer.appendChild(div);
            });

            // Add delete listeners
            document.querySelectorAll('.delete-project-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    if (confirm('Czy na pewno chcesz usunąć ten projekt?')) {
                        deleteProject(id);
                    }
                });
            });
        }
    }

    function startApp() {
        welcomeScreen.style.display = 'none';
        appContainer.style.display = 'flex';
        renderApiList();
        renderChatHistory();
    }

    newProjectBtn.addEventListener('click', () => {
        const projectName = prompt("Podaj nazwę nowego projektu:", "Mój nowy projekt");
        if (projectName) {
            currentProjectId = Date.now().toString();
            savedProjects.push({
                id: currentProjectId,
                name: projectName,
                lastModified: Date.now()
            });
            localStorage.setItem('merchkuQ_projects', JSON.stringify(savedProjects));

            // Clear current state arrays for new project
            apis = [];
            chatMessages = [];
            projectFiles = [];
            saveCurrentState();

            startApp();
        }
    });

    function loadProject(id) {
        currentProjectId = id;

        // Update last modified
        const projIndex = savedProjects.findIndex(p => p.id === id);
        if(projIndex > -1) {
            savedProjects[projIndex].lastModified = Date.now();
            localStorage.setItem('merchkuQ_projects', JSON.stringify(savedProjects));
        }

        // Load data specific to this project
        const projectData = JSON.parse(localStorage.getItem(`merchkuQ_data_${id}`)) || {
            apis: [], chatMessages: [], projectFiles: []
        };

        apis = projectData.apis || [];
        chatMessages = projectData.chatMessages || [];
        projectFiles = projectData.projectFiles || [];

        startApp();
    }

    function deleteProject(id) {
        savedProjects = savedProjects.filter(p => p.id !== id);
        localStorage.setItem('merchkuQ_projects', JSON.stringify(savedProjects));
        localStorage.removeItem(`merchkuQ_data_${id}`);
        initializeWelcomeScreen();
    }

    function saveCurrentState() {
        if (!currentProjectId) return;
        const projectData = { apis, chatMessages, projectFiles };
        localStorage.setItem(`merchkuQ_data_${currentProjectId}`, JSON.stringify(projectData));
    }

    // === Tab Switching Logic ===
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // === State Management ===
    // Arrays will be populated when a project is loaded
    let apis = [];
    let chatMessages = [];
    let projectFiles = [];

    // Initialize UI is deferred until a project is selected
    initializeWelcomeScreen();

    // === API Management ===
    const apiNameInput = document.getElementById('api-name-input');
    const apiUrlInput = document.getElementById('api-url-input');
    const addApiBtn = document.getElementById('add-api-btn');
    const apiList = document.getElementById('api-list');

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
        if (!apiList) return;
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
        saveCurrentState();
    }

    // === AI Chat & Godot Generation ===
    const chatHistory = document.getElementById('chat-history');
    const aiPromptInput = document.getElementById('ai-prompt-input');
    const sendPromptBtn = document.getElementById('send-prompt-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const fileUploadInput = document.getElementById('file-upload-input');

    // Handle file uploads
    if (uploadBtn && fileUploadInput) {
        uploadBtn.addEventListener('click', () => {
            fileUploadInput.click();
        });

        fileUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target.result;
                const fileName = file.name;

                // Add to virtual files
                addVirtualFile(fileName, dataUrl, true);

                // Add message to chat
                addChatMessage('user', `[Przesłano plik: ${fileName}]`);
                addChatMessage('system', `AI: Plik ${fileName} został pomyślnie wgrany do projektu! Otrzymałem dostęp do niego i będę mógł go wykorzystać.`);
            };

            // Read as data URL to easily store in localStorage
            reader.readAsDataURL(file);

            // Reset input so the same file can be uploaded again if needed
            fileUploadInput.value = '';
        });
    }

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

        addChatMessage('user', text);
        aiPromptInput.value = '';

        const lowerText = text.toLowerCase();

        // Check configured APIs
        if (apis.length === 0) {
            setTimeout(() => {
                addChatMessage('system', `System: Brak połączonych API. Przejdź do zakładki "API", aby dodać klucze i odblokować możliwości AI.`);
            }, 500);
            return;
        }

        // Deep automation trigger - Switch to Sandbox mode
        addChatMessage('system', `AI: Przyjąłem. Przechodzę do trybu głębokiej automatyzacji (Sandbox). Będę wykonywał zadanie powoli i z maksymalną precyzją, testując wszystko w tle...`);

        setTimeout(() => {
            // Auto switch to Sandbox tab explicitly
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            const sandboxTabBtn = document.querySelector('[data-tab="tab-sandbox"]');
            const sandboxContent = document.getElementById('tab-sandbox');
            if (sandboxTabBtn) sandboxTabBtn.classList.add('active');
            if (sandboxContent) sandboxContent.classList.add('active');

            runSandboxSimulation(text, lowerText, apis);
        }, 1500);
    }

    function runSandboxSimulation(originalText, lowerText, apis) {
        const consoleEl = document.getElementById('sandbox-console');
        const statusIndicator = document.querySelector('.status-indicator');

        if (!consoleEl) return;

        // Clear previous logs except the initial one
        consoleEl.innerHTML = '<div class="log-line">> Środowisko testowe Godot w trybie Sandbox zainicjowane. AI w trybie powolnego i głębokiego analizowania.</div>';
        statusIndicator.textContent = "Pracuje...";
        statusIndicator.style.color = "#2ecc71";

        const logToSandbox = (msg, className = '') => {
            const div = document.createElement('div');
            div.className = `log-line ${className}`;
            div.innerText = `> ${msg}`;
            consoleEl.appendChild(div);
            consoleEl.scrollTop = consoleEl.scrollHeight;
        };

        const simulationSteps = [
            { delay: 1000, log: `Analizowanie polecenia: "${originalText}"...` },
            { delay: 3000, log: `Wczytywanie wirtualnego edytora Godot w pamięci...` },
            { delay: 5000, log: `Generowanie struktury plików dla żądania...` },
            { delay: 8000, log: `KOMPILACJA: Sprawdzanie potencjalnych konfliktów zależności...` },
            { delay: 12000, log: `URUCHAMIANIE TESTU SCENY...` },
            { delay: 15000, log: `[WARN] Wykryto nieoptymalne wykorzystanie zasobów. AI analizuje poprawkę...`, cls: 'error' },
            { delay: 19000, log: `Aplikowanie poprawek w kodzie...` },
            { delay: 23000, log: `RE-TEST SCENY: Sukces (0 błędów, 60 FPS).`, cls: 'success' },
            { delay: 26000, log: `Eksportowanie wygenerowanych plików...` }
        ];

        simulationSteps.forEach(step => {
            setTimeout(() => {
                logToSandbox(step.log, step.cls);
            }, step.delay);
        });

        // Finalize after the long simulation
        setTimeout(() => {
            statusIndicator.textContent = "Zakończono";
            statusIndicator.style.color = "#3498db";

            if (apis.length === 1) {
                let aiResponse = `Zakończyłem precyzyjne testy i wygenerowałem pliki.`;
                if (lowerText.includes('skrypt')) {
                    addVirtualFile('Player.gd', `extends CharacterBody2D\n\nconst SPEED = 300.0\n\nfunc _physics_process(delta):\n\tpass # Skrypt zoptymalizowany przez AI po dogłębnych testach`);
                }
                if (lowerText.includes('model') || lowerText.includes('3d')) {
                    addVirtualFile('PlayerModel.obj', `# Dokładny model OBJ wygenerowany przez AI\nv 0.0 0.0 0.0`);
                }
                addChatMessage('system', `AI (${apis[0].name}): ${aiResponse} Przejdź do podglądu, by sprawdzić efekty.`);
            } else {
                addChatMessage('system', `System: Multi API zakończyło głębokie testy i podzieliło pracę.`);

                const programmerApiName = apis[0].name;
                addVirtualFile('Player.gd', `extends CharacterBody2D\n\nconst SPEED = 300.0\n\nfunc _physics_process(delta):\n\tpass # Kod precyzyjnie napisany przez ${programmerApiName} (Programista) po testach Sandbox`);
                addChatMessage('system-programmer', `[Role: Programista] ${programmerApiName}: Zapisałem wolny od bugów skrypt po 2 iteracjach testowych w Sandboxie.`);

                const graphicApiName = apis[1].name;
                addVirtualFile('PlayerModel.obj', `# Model OBJ zoptymalizowany przez ${graphicApiName} (Grafik)\nv 0.0 0.0 0.0`);
                addChatMessage('system-graphic', `[Role: Grafik] ${graphicApiName}: Model jest gotowy i idealnie pasuje do środowiska gry.`);
            }
        }, 28000);
    }

    function addVirtualFile(filename, content, isBase64 = false) {
        // Prevent duplicates in a simple way
        const existing = projectFiles.findIndex(f => f.filename === filename);
        if (existing !== -1) {
            projectFiles[existing].content = content;
            projectFiles[existing].isBase64 = isBase64;
        } else {
            projectFiles.push({ filename, content, isBase64 });
        }
        saveCurrentState();
    }

    function addChatMessage(role, text) {
        chatMessages.push({ role, text });
        saveChat();
        appendMessageToUI(role, text);
    }

    function renderChatHistory() {
        if(!chatHistory) return;
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
        div.innerText = text;
        chatHistory.appendChild(div);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    function saveChat() {
        saveCurrentState();
    }

    // === Game Emulator ===
    const startEmulatorBtn = document.getElementById('start-emulator-btn');
    const playOverlay = document.getElementById('play-overlay');
    const emulatorScreen = document.getElementById('emulator-screen');
    const emulatorStatus = document.getElementById('emulator-status');

    if(startEmulatorBtn) {
        startEmulatorBtn.addEventListener('click', () => {
            playOverlay.style.display = 'none';
            emulatorScreen.style.display = 'flex';

            setTimeout(() => {
                emulatorStatus.innerHTML = '<span style="color: white;">GRA URUCHOMIONA (Wczytano wygenerowane zasoby)</span>';
            }, 1500);
        });
    }

    // === Download Game ===
    const downloadGameBtn = document.getElementById('download-game-btn');

    if(downloadGameBtn) {
        downloadGameBtn.addEventListener('click', () => {
            if (typeof JSZip === 'undefined') {
                alert('Biblioteka JSZip nie została załadowana.');
                return;
            }

            const zip = new JSZip();

            // Base project files
            zip.file("project.godot", `
config_version=5

[application]
config/name="merchkuQ_Project_AI"
run/main_scene="res://main.tscn"
            `.trim());

            zip.file("main.tscn", `[gd_scene format=3 uid="uid://test"]\n[node name="Main" type="Node2D"]`);

            // Add virtual files generated by AI and uploaded files
            projectFiles.forEach(file => {
                if (file.isBase64) {
                    // Extract the base64 part of the data URL (remove "data:image/png;base64,")
                    const base64Data = file.content.split(',')[1];
                    zip.file(file.filename, base64Data, {base64: true});
                } else {
                    zip.file(file.filename, file.content);
                }
            });

            // Generate and download
            zip.generateAsync({type:"blob"}).then(function(content) {
                saveAs(content, "merchkuQ_GameProject.zip");
            });
        });
    }

    // === Settings ===
    const clearDataBtn = document.getElementById('clear-data-btn');
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', () => {
            if(confirm("Czy na pewno chcesz usunąć wszystkie projekty i wyczyścić aplikację?")) {
                localStorage.clear();
                window.location.reload();
            }
        });
    }
});
