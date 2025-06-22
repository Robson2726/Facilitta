// === GERENCIADOR DE AUTENTICAÇÃO ===

import { $, classUtils, formUtils } from '../core/dom-utils.js';
import { eventManager } from '../core/event-manager.js';
import { SELECTORS, MESSAGES, CSS_CLASSES } from '../core/constants.js';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.loginForm = null;
        this.passwordVisible = false;
        
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.loginForm = $(SELECTORS.loginForm);
        this.usernameInput = $(SELECTORS.usernameInput);
        this.passwordInput = $(SELECTORS.passwordInput);
        this.loginErrorMessage = $(SELECTORS.loginErrorMessage);
        this.loggedUserInfo = $(SELECTORS.loggedUserInfo);
        this.logoutButton = $(SELECTORS.logoutButton);
        this.togglePasswordButton = $(SELECTORS.togglePasswordButton);
        this.passwordToggleIcon = $(SELECTORS.passwordToggleIcon);
        this.loginScreen = $(SELECTORS.loginScreen);
        this.appContainer = $(SELECTORS.appContainer);
    }

    setupEventListeners() {
        // Login form submission
        if (this.loginForm) {
            eventManager.on(this.loginForm, 'submit', async (e) => {
                e.preventDefault();
                await this.handleLogin();
            });
        }

        // Logout button
        if (this.logoutButton) {
            eventManager.on(this.logoutButton, 'click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }

        // Toggle password visibility
        if (this.togglePasswordButton) {
            eventManager.on(this.togglePasswordButton, 'click', (e) => {
                e.preventDefault();
                this.togglePasswordVisibility();
            });
        }

        // Enter key shortcuts
        if (this.usernameInput) {
            eventManager.on(this.usernameInput, 'keydown', (e) => {
                if (e.key === 'Enter') {
                    this.passwordInput?.focus();
                }
            });
        }

        if (this.passwordInput) {
            eventManager.on(this.passwordInput, 'keydown', (e) => {
                if (e.key === 'Enter') {
                    this.handleLogin();
                }
            });
        }
    }

    async handleLogin() {
        if (!this.loginForm) return;

        const formData = formUtils.getData(this.loginForm);
        const { username, password } = formData;

        // Validação básica
        if (!username?.trim() || !password?.trim()) {
            this.showLoginError(MESSAGES.VALIDATION_ERROR);
            return;
        }

        // UI Loading state
        this.setLoginLoading(true);
        this.clearLoginError();

        try {
            // Chamada para o backend via Electron
            const result = await window.electronAPI.authenticate(username, password);
            
            if (result.success) {
                this.currentUser = result.user;
                this.isAuthenticated = true;
                
                // Atualiza UI de usuário logado
                this.updateLoggedUserInfo();
                
                // Transição para app
                this.showAppScreen();
                
                // Evento customizado de login bem-sucedido
                this.dispatchAuthEvent('login-success', result.user);
                
            } else {
                this.showLoginError(result.message || MESSAGES.LOGIN_ERROR);
            }
            
        } catch (error) {
            console.error('Login error:', error);
            this.showLoginError(MESSAGES.CONNECTION_ERROR);
        } finally {
            this.setLoginLoading(false);
        }
    }

    handleLogout() {
        // Limpa dados do usuário
        this.currentUser = null;
        this.isAuthenticated = false;
        
        // Reset form
        if (this.loginForm) {
            formUtils.reset(this.loginForm);
        }
        
        // Volta para tela de login
        this.showLoginScreen();
        
        // Evento customizado de logout
        this.dispatchAuthEvent('logout');
        
        // Focus no campo username
        setTimeout(() => {
            this.usernameInput?.focus();
        }, 100);
    }

    togglePasswordVisibility() {
        if (!this.passwordInput || !this.passwordToggleIcon) return;

        this.passwordVisible = !this.passwordVisible;
        
        // Altera o tipo do input
        this.passwordInput.type = this.passwordVisible ? 'text' : 'password';
        
        // Atualiza ícone (assumindo que usa classes CSS)
        if (this.passwordVisible) {
            classUtils.remove(this.passwordToggleIcon, 'fa-eye');
            classUtils.add(this.passwordToggleIcon, 'fa-eye-slash');
        } else {
            classUtils.remove(this.passwordToggleIcon, 'fa-eye-slash');
            classUtils.add(this.passwordToggleIcon, 'fa-eye');
        }
        
        // Mantém foco no campo
        this.passwordInput.focus();
    }

    showLoginScreen() {
        if (this.loginScreen && this.appContainer) {
            classUtils.remove(this.loginScreen, CSS_CLASSES.HIDDEN);
            classUtils.add(this.appContainer, CSS_CLASSES.HIDDEN);
        }
        
        // Limpa informações do usuário
        this.clearLoggedUserInfo();
    }

    showAppScreen() {
        if (this.loginScreen && this.appContainer) {
            classUtils.add(this.loginScreen, CSS_CLASSES.HIDDEN);
            classUtils.remove(this.appContainer, CSS_CLASSES.HIDDEN);
        }
    }

    setLoginLoading(loading) {
        const submitButton = this.loginForm?.querySelector('button[type="submit"]');
        
        if (submitButton) {
            if (loading) {
                submitButton.disabled = true;
                submitButton.textContent = 'Entrando...';
                classUtils.add(submitButton, CSS_CLASSES.LOADING);
            } else {
                submitButton.disabled = false;
                submitButton.textContent = 'Entrar';
                classUtils.remove(submitButton, CSS_CLASSES.LOADING);
            }
        }

        // Desabilita inputs durante loading
        if (this.usernameInput) this.usernameInput.disabled = loading;
        if (this.passwordInput) this.passwordInput.disabled = loading;
    }

    showLoginError(message) {
        if (this.loginErrorMessage) {
            this.loginErrorMessage.textContent = message;
            classUtils.remove(this.loginErrorMessage, CSS_CLASSES.HIDDEN);
            classUtils.add(this.loginErrorMessage, CSS_CLASSES.ERROR);
        }
    }

    clearLoginError() {
        if (this.loginErrorMessage) {
            this.loginErrorMessage.textContent = '';
            classUtils.add(this.loginErrorMessage, CSS_CLASSES.HIDDEN);
            classUtils.remove(this.loginErrorMessage, CSS_CLASSES.ERROR);
        }
    }

    updateLoggedUserInfo() {
        if (this.loggedUserInfo && this.currentUser) {
            const userDisplayName = this.currentUser.displayName || this.currentUser.username;
            this.loggedUserInfo.textContent = `Olá, ${userDisplayName}`;
            classUtils.remove(this.loggedUserInfo, CSS_CLASSES.HIDDEN);
        }
    }

    clearLoggedUserInfo() {
        if (this.loggedUserInfo) {
            this.loggedUserInfo.textContent = '';
            classUtils.add(this.loggedUserInfo, CSS_CLASSES.HIDDEN);
        }
    }

    dispatchAuthEvent(type, data = null) {
        const event = new CustomEvent(`auth-${type}`, {
            detail: { user: data },
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    // Getters públicos
    getCurrentUser() {
        return this.currentUser;
    }

    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    getUserRole() {
        return this.currentUser?.role || null;
    }

    hasPermission(permission) {
        if (!this.isAuthenticated || !this.currentUser) return false;
        
        // Lógica de permissões baseada no role
        const permissions = this.currentUser.permissions || [];
        return permissions.includes(permission) || this.currentUser.role === 'admin';
    }

    // Método para verificar se o usuário ainda está autenticado
    async validateSession() {
        if (!this.isAuthenticated) return false;

        try {
            const result = await window.electronAPI.validateSession();
            if (!result.valid) {
                this.handleLogout();
                return false;
            }
            return true;
        } catch (error) {
            console.error('Session validation error:', error);
            this.handleLogout();
            return false;
        }
    }

    // Método para atualizar dados do usuário
    async refreshUserData() {
        if (!this.isAuthenticated) return null;

        try {
            const result = await window.electronAPI.getCurrentUser();
            if (result.success) {
                this.currentUser = result.user;
                this.updateLoggedUserInfo();
                return this.currentUser;
            }
        } catch (error) {
            console.error('Failed to refresh user data:', error);
        }
        
        return null;
    }

    // Cleanup
    destroy() {
        eventManager.removeAllFromElement(this.loginForm);
        eventManager.removeAllFromElement(this.logoutButton);
        eventManager.removeAllFromElement(this.togglePasswordButton);
        eventManager.removeAllFromElement(this.usernameInput);
        eventManager.removeAllFromElement(this.passwordInput);
    }
}

// Instância global
export const authManager = new AuthManager();

// Event listeners globais para auth
document.addEventListener('auth-login-success', (e) => {
    console.log('User logged in:', e.detail.user);
});

document.addEventListener('auth-logout', () => {
    console.log('User logged out');
});

// Verificação periódica de sessão (opcional)
let sessionCheckInterval = null;

export function startSessionMonitoring(intervalMs = 5 * 60 * 1000) { // 5 minutos
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
    }

    sessionCheckInterval = setInterval(async () => {
        if (authManager.isUserAuthenticated()) {
            await authManager.validateSession();
        }
    }, intervalMs);
}

export function stopSessionMonitoring() {
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
        sessionCheckInterval = null;
    }
}

// Auto-start session monitoring
startSessionMonitoring();