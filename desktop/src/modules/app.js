// --- src/modules/app.js ---
// Módulo Principal da Aplicação

class AppManager {
    constructor() {
        this.modules = {};
        this.init();
    }

    async init() {
        console.log('[App] Inicializando aplicação...');
        
        // Aguardar DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeModules());
        } else {
            this.initializeModules();
        }
    }

    initializeModules() {
        console.log('[App] Inicializando módulos...');

        try {
            // Usar instâncias globais já criadas
            this.modules.auth = window.authManager;
            this.modules.modal = window.modalManager;
            this.modules.search = window.searchManager;
            this.modules.content = window.contentManager;
            this.modules.dashboard = window.dashboardManager;
            this.modules.forms = window.formsManager;

            // Configurar referências globais (opcional, se já não estiver feito)
            window.authManager = this.modules.auth;
            window.modalManager = this.modules.modal;
            window.searchManager = this.modules.search;
            window.contentManager = this.modules.content;
            window.dashboardManager = this.modules.dashboard;
            window.formsManager = this.modules.forms;

            // Configurar navegação
            this.setupNavigation();

            console.log('[App] Módulos inicializados com sucesso');
            
            // Verificar se há usuário logado
            this.checkInitialState();

        } catch (error) {
            console.error('[App] Erro ao inicializar módulos:', error);
        }
    }

    setupNavigation() {
        const menuItems = [
            { id: 'menu-dashboard', title: 'Dashboard', loadData: true },
            { id: 'menu-encomendas', title: 'Dashboard Encomendas', loadData: true },
            { id: 'menu-moradores', title: 'Moradores', loadData: true },
            { id: 'menu-usuarios', title: 'Usuários', loadData: true },
            { id: 'menu-relatorios', title: 'Relatórios', loadData: false },
            { id: 'menu-ajustes', title: 'Ajustes', loadData: false }
        ];

        menuItems.forEach(item => {
            const element = document.getElementById(item.id);
            if (element) {
                element.addEventListener('click', () => {
                    this.modules.content.carregarConteudo(item.title, item.loadData);
                });
            }
        });
    }

    checkInitialState() {
        // Se não há usuário logado, mostrar tela de login
        if (!this.modules.auth.getCurrentUser()) {
            this.modules.auth.showLoginScreen();
        } else {
            // Se há usuário logado, mostrar app e carregar dashboard
            this.modules.auth.showAppScreen();
        }
    }

    // Métodos de utilidade
    showStatusMessage(message, type = 'info', stickyError = false) {
        this.modules.auth.showStatusMessage(message, type, stickyError);
    }

    getCurrentUser() {
        return this.modules.auth.getCurrentUser();
    }

    isAdmin() {
        return this.modules.auth.isAdmin();
    }
}

// Inicializar aplicação quando o script for carregado
window.AppManager = AppManager; 