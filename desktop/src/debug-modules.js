// --- src/debug-modules.js ---
// Script de Debug para Módulos

class DebugManager {
    constructor() {
        this.logs = [];
        this.init();
    }

    init() {
        console.log('[Debug] Inicializando debug manager...');
        this.setupErrorHandling();
        this.monitorModules();
    }

    setupErrorHandling() {
        // Capturar erros globais
        window.addEventListener('error', (event) => {
            this.logError('Erro global:', event.error);
        });

        // Capturar promessas rejeitadas
        window.addEventListener('unhandledrejection', (event) => {
            this.logError('Promise rejeitada:', event.reason);
        });

        // Monitorar mudanças no DOM - aguardar DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupDOMObserver();
            });
        } else {
            this.setupDOMObserver();
        }
    }

    setupDOMObserver() {
        try {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        // Verificar se elementos importantes foram removidos
                        const loginScreen = document.getElementById('login-screen');
                        const appContainer = document.getElementById('app-container');
                        
                        if (!loginScreen && !appContainer) {
                            this.logWarning('Elementos principais do app foram removidos!');
                        }
                    }
                });
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        } catch (error) {
            this.logError('Erro ao configurar MutationObserver:', error);
        }
    }

    monitorModules() {
        const modules = [
            'AuthManager', 'ModalsManager', 'AutocompleteManager', 
            'SearchManager', 'ContentManager', 'DashboardManager', 
            'FormsManager', 'AppManager'
        ];

        modules.forEach(module => {
            if (typeof window[module] === 'undefined') {
                this.logError(`Módulo ${module} não foi carregado!`);
            } else {
                this.logSuccess(`Módulo ${module} carregado com sucesso`);
            }
        });

        // Verificar se os managers estão sendo inicializados
        setTimeout(() => {
            const managers = [
                'authManager', 'modalManager', 'autocompleteManager',
                'searchManager', 'contentManager', 'dashboardManager',
                'formsManager', 'appManager'
            ];

            managers.forEach(manager => {
                if (typeof window[manager] === 'undefined') {
                    this.logError(`Manager ${manager} não foi inicializado!`);
                } else {
                    this.logSuccess(`Manager ${manager} inicializado com sucesso`);
                }
            });
        }, 2000);
    }

    logError(message, error = null) {
        const log = `[ERRO] ${message} ${error ? error.stack || error.message : ''}`;
        console.error(log);
        this.logs.push({ type: 'error', message: log, timestamp: new Date() });
    }

    logWarning(message) {
        const log = `[AVISO] ${message}`;
        console.warn(log);
        this.logs.push({ type: 'warning', message: log, timestamp: new Date() });
    }

    logSuccess(message) {
        const log = `[SUCESSO] ${message}`;
        console.log(log);
        this.logs.push({ type: 'success', message: log, timestamp: new Date() });
    }

    logInfo(message) {
        const log = `[INFO] ${message}`;
        console.log(log);
        this.logs.push({ type: 'info', message: log, timestamp: new Date() });
    }

    // Método para verificar se há problemas específicos
    checkForIssues() {
        this.logInfo('Verificando problemas conhecidos...');

        // Verificar se há múltiplos event listeners
        this.checkDuplicateEventListeners();

        // Verificar se há conflitos de nomes
        this.checkNameConflicts();

        // Verificar se há problemas de timing
        this.checkTimingIssues();
    }

    checkDuplicateEventListeners() {
        this.logInfo('Verificando event listeners duplicados...');
        
        const forms = [
            'form-cadastro-encomenda',
            'form-cadastro-morador', 
            'form-cadastro-usuario',
            'form-entrega-encomenda',
            'form-config-banco'
        ];

        forms.forEach(formId => {
            const form = document.getElementById(formId);
            if (form) {
                // Verificar se há múltiplos event listeners
                const listeners = getEventListeners(form);
                if (listeners && listeners.submit && listeners.submit.length > 1) {
                    this.logWarning(`Formulário ${formId} tem múltiplos event listeners de submit!`);
                }
            }
        });
    }

    checkNameConflicts() {
        this.logInfo('Verificando conflitos de nomes...');
        
        // Verificar se há funções globais com nomes conflitantes
        const globalFunctions = Object.keys(window).filter(key => 
            typeof window[key] === 'function' && 
            key.includes('Manager') && 
            key !== 'DebugManager'
        );

        if (globalFunctions.length > 8) {
            this.logWarning(`Muitas funções globais encontradas: ${globalFunctions.join(', ')}`);
        }
    }

    checkTimingIssues() {
        this.logInfo('Verificando problemas de timing...');
        
        // Verificar se o DOM está pronto
        if (document.readyState !== 'complete') {
            this.logWarning('DOM ainda não está completamente carregado');
        }

        // Verificar se os módulos foram carregados na ordem correta
        const loadOrder = [
            'AuthManager', 'ModalsManager', 'AutocompleteManager',
            'SearchManager', 'ContentManager', 'DashboardManager',
            'FormsManager', 'AppManager'
        ];

        loadOrder.forEach((module, index) => {
            if (typeof window[module] === 'undefined') {
                this.logError(`Módulo ${module} não carregado na posição ${index}`);
            }
        });
    }

    // Método para obter logs
    getLogs() {
        return this.logs;
    }

    // Método para limpar logs
    clearLogs() {
        this.logs = [];
    }

    // Método para exportar logs
    exportLogs() {
        const logText = this.logs.map(log => 
            `[${log.timestamp.toISOString()}] ${log.type.toUpperCase()}: ${log.message}`
        ).join('\n');
        
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug-logs-${new Date().toISOString().slice(0, 19)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Função auxiliar para obter event listeners (simplificada)
function getEventListeners(element) {
    // Esta é uma implementação simplificada
    // Em um ambiente real, você precisaria de ferramentas de debug mais avançadas
    return null;
}

// Inicializar debug manager apenas quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.debugManager = new DebugManager();
    });
} else {
    window.debugManager = new DebugManager();
}

// Adicionar métodos de debug ao console
console.debug = function(...args) {
    if (window.debugManager) {
        window.debugManager.logInfo(args.join(' '));
    }
    console.log(...args);
};

// Exportar para uso global
window.DebugManager = DebugManager; 