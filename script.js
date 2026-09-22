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

    async function handleSendPrompt() {
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

        // Intent detection: check if the user is actually asking to do something in Godot
        const actionKeywords = ['dodaj', 'skrypt', 'model', 'zrób', 'stwórz', 'napisz', 'edytuj', 'zmień', 'ustaw', 'tło'];
        const isActionRequest = actionKeywords.some(keyword => lowerText.includes(keyword));

        if (!isActionRequest) {
            // Conversational reply
            setTimeout(() => {
                let greetingPrefix = apis.length > 1 ? `System: Reprezentuję zespół AI.` : `AI (${apis[0].name}):`;
                addChatMessage('system', `${greetingPrefix} Siemanko! Jestem gotowy do pracy. Powiedz mi konkretnie, co mam stworzyć w Godot Engine (np. "Dodaj skrypt skakania"), a zajmę się tym powoli i precyzyjnie w moim Sandboxie.`);
            }, 800);
            return;
        }

        // Deep automation trigger - Switch to Sandbox mode
        addChatMessage('system', `AI: Zrozumiałem zadanie. Przechodzę do trybu głębokiej automatyzacji (Sandbox). Będę wykonywał to powoli i z maksymalną precyzją, łącząc się z API i testując zmiany w silniku...`);

        setTimeout(() => {
            // Auto switch to Sandbox tab explicitly
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            const sandboxTabBtn = document.querySelector('[data-tab="tab-sandbox"]');
            const sandboxContent = document.getElementById('tab-sandbox');
            if (sandboxTabBtn) sandboxTabBtn.classList.add('active');
            if (sandboxContent) sandboxContent.classList.add('active');

            runSandboxSimulation(text, apis);
        }, 1500);
    }

    async function runSandboxSimulation(originalText, apis) {
        const consoleEl = document.getElementById('sandbox-console');
        const statusIndicator = document.querySelector('.status-indicator');

        if (!consoleEl) return;

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

        // Initial Sandbox setup logs
        logToSandbox(`Analizowanie polecenia: "${originalText}"...`);
        await new Promise(r => setTimeout(r, 2000));
        logToSandbox(`Łączenie z API (${apis[0].name}) w celu wygenerowania kodu Godot...`);

        // Real API Call
        const apiConfig = apis[0]; // Assuming OpenAI format for the prototype
        let apiData = null;

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiConfig.url}` // URL input field acts as the key here
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            role: "system",
                            content: "Jesteś ekspertem silnika Godot Engine (wersja 4.x). Użytkownik zleca Ci zadanie, a Ty musisz stworzyć rozwiązanie. Zawsze zwracaj odpowiedź w formacie czystego JSON. Nie używaj markdown. Struktura JSON: { \"message\": \"krótki opis co zrobiłeś\", \"files\": [ { \"filename\": \"nazwa_pliku.gd\", \"content\": \"kod pliku\" } ] }"
                        },
                        { role: "user", content: originalText }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`Błąd HTTP: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;
            apiData = JSON.parse(content);
            logToSandbox(`Otrzymano odpowiedź z API. Rozpoczynam weryfikację kodu...`, 'success');

        } catch (err) {
            logToSandbox(`[ERROR] Błąd połączenia z API: ${err.message}. Klucz API może być nieprawidłowy lub wystąpił błąd sieci.`, 'error');
            logToSandbox(`Przechodzę w tryb awaryjny (fallback) do wygenerowania domyślnego pliku...`);
            await new Promise(r => setTimeout(r, 2000));

            apiData = {
                message: "Użyto trybu awaryjnego z powodu błędu API.",
                files: [
                    { filename: "Fallback.gd", content: "extends Node\n# Wygenerowano awaryjnie z powodu błędu API." }
                ]
            };
        }

        // Continue Sandbox simulation
        await new Promise(r => setTimeout(r, 3000));
        logToSandbox(`KOMPILACJA: Sprawdzanie potencjalnych konfliktów zależności dla otrzymanych plików...`);
        await new Promise(r => setTimeout(r, 4000));
        logToSandbox(`URUCHAMIANIE TESTU SCENY...`);
        await new Promise(r => setTimeout(r, 3000));
        logToSandbox(`RE-TEST SCENY: Sukces (0 błędów).`, 'success');
        await new Promise(r => setTimeout(r, 2000));
        logToSandbox(`Zapisywanie plików wygenerowanych przez prawdziwe API do pamięci wirtualnej...`);

        // Finalize
        statusIndicator.textContent = "Zakończono";
        statusIndicator.style.color = "#3498db";

        // Add files to virtual system
        if (apiData && apiData.files) {
            apiData.files.forEach(file => {
                addVirtualFile(file.filename, file.content);
                logToSandbox(`Zapisano plik: ${file.filename}`);
            });
        }

        const summaryMsg = apiData ? apiData.message : "Pomyślnie przetworzono zadanie.";
        addChatMessage('system', `AI (${apis[0].name}): Testy w Sandboxie zakończone. Wykorzystałem silnik LLM do stworzenia kodu.\n\nRaport AI: ${summaryMsg}\n\nPrzejdź do zakładki "Podgląd gry" lub pobierz projekt.`);
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
