// --- src/modules/auth.js ---
// Módulo de Autenticação

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const loginForm = document.getElementById('login-form');
        const logoutButton = document.getElementById('logout-button');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (logoutButton) {
            logoutButton.addEventListener('click', () => this.handleLogout());
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username')?.value?.trim();
        const password = document.getElementById('password')?.value;

        if (!username || !password) {
            this.showLoginError('Por favor, preencha todos os campos.');
            return;
        }

        try {
            if (!window.electronAPI?.loginUser) {
                this.showLoginError('Erro: API de login não disponível.');
                return;
            }

            const result = await window.electronAPI.loginUser({ username, password });
            
            if (result.success && result.user) {
                console.log('[Auth] Login bem-sucedido:', result.user);
                this.currentUser = result.user;
                this.showAppScreen();
                this.showStatusMessage(`Bem-vindo, ${result.user.name}!`, 'success');
            } else {
                this.showLoginError(result.message || 'Erro ao fazer login.');
            }
        } catch (error) {
            console.error('[Auth] Erro no login:', error);
            this.showLoginError('Erro interno. Verifique a configuração do banco.');
        }
    }

    handleLogout() {
        this.currentUser = null;
        this.showLoginScreen();
        this.showStatusMessage('Logout realizado com sucesso.', 'info');
    }

    showLoginScreen() {
        console.log("Mostrando login.");
        const loginScreen = document.getElementById('login-screen');
        const appContainer = document.getElementById('app-container');
        const loggedUserInfo = document.getElementById('logged-user-info');
        const menuUsuarios = document.getElementById('menu-usuarios');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const loginErrorMessage = document.getElementById('login-error-message');

        if (loginScreen) loginScreen.classList.remove('hidden');
        if (appContainer) appContainer.classList.add('hidden');
        if (loggedUserInfo) loggedUserInfo.textContent = 'Usuário: -';
        if (menuUsuarios) menuUsuarios.style.display = 'none';
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';
        if (loginErrorMessage) loginErrorMessage.style.display = 'none';
    }

    showAppScreen() {
        console.log("Mostrando app.");
        if (!this.currentUser) {
            this.showLoginScreen();
            return;
        }

        const loginScreen = document.getElementById('login-screen');
        const appContainer = document.getElementById('app-container');
        const loggedUserInfo = document.getElementById('logged-user-info');
        const menuUsuarios = document.getElementById('menu-usuarios');

        if (loginScreen) loginScreen.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');
        
        const userDisplayInfo = `${this.currentUser.name} (${this.currentUser.status || 'Status Desconhecido'})`;
        
        if (loggedUserInfo) loggedUserInfo.textContent = `Usuário: ${userDisplayInfo}`;
        if (menuUsuarios) menuUsuarios.style.display = this.currentUser.role === 'admin' ? 'flex' : 'none';
        
        // Carregar dashboard inicial
        if (window.contentManager) {
            window.contentManager.carregarConteudo('Dashboard', true);
        }
    }

    showLoginError(message) {
        const loginErrorMessage = document.getElementById('login-error-message');
        if (loginErrorMessage) {
            loginErrorMessage.textContent = message;
            loginErrorMessage.style.display = 'block';
        }
    }

    showStatusMessage(message, type = 'info', stickyError = false) {
        const el = document.getElementById('status-message');
        if (el) {
            el.textContent = message;
            el.className = `status-message status-${type}`;
            el.style.display = 'block';
            if (type === 'success' || (type === 'error' && !stickyError)) {
                const delay = type === 'success' ? 3500 : 6000;
                setTimeout(() => { 
                    if (el.textContent === message) { 
                        el.style.display = 'none'; 
                    } 
                }, delay);
            }
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAdmin() {
        return this.currentUser?.role === 'admin';
    }
}

// Exportar para uso global
window.AuthManager = AuthManager; 