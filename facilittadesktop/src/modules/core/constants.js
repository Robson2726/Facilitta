// === CONSTANTES E CONFIGURAÇÕES ===

export const SELECTORS = {
    // Menu Navigation
    menuEncomendas: '#menu-encomendas',
    menuMoradores: '#menu-moradores',
    menuUsuarios: '#menu-usuarios',
    menuRelatorios: '#menu-relatorios',
    menuAjustes: '#menu-ajustes',
    menuDashboard: '#menu-dashboard',
    
    // Layout Elements
    mainContent: '.main-content',
    loginScreen: '#login-screen',
    appContainer: '#app-container',
    
    // Login Form
    loginForm: '#login-form',
    usernameInput: '#username',
    passwordInput: '#password',
    loginErrorMessage: '#login-error-message',
    loggedUserInfo: '#logged-user-info',
    logoutButton: '#logout-button',
    togglePasswordButton: '#toggle-password',
    passwordToggleIcon: '#password-toggle-icon',
    
    // Search
    topbarSearchInput: '#topbar-search-input',
    
    // Modals
    modalCadastroEncomenda: '#modal-cadastro-encomenda',
    modalCadastroMorador: '#modal-cadastro-morador',
    modalCadastroUsuario: '#modal-cadastro-usuario',
    modalEntregaEncomenda: '#modal-entrega-encomenda',
    modalPerfilUsuario: '#modal-perfil-usuario',
    
    // Forms
    formCadastroEncomenda: '#form-cadastro-encomenda',
    formCadastroMorador: '#form-cadastro-morador',
    formCadastroUsuario: '#form-cadastro-usuario',
    formEntregaEncomenda: '#form-entrega-encomenda',
      // Autocomplete
    inputMorador: '#morador',
    suggestionsMoradorDiv: '#morador-suggestions',
    inputPorteiro: '#porteiro',
    suggestionsPorteiroDiv: '#porteiro-suggestions',
    inputEntregaPorteiro: '#entrega-porteiro',
    suggestionsEntregaPorteiroDiv: '#entrega-porteiro-suggestions',
    
    // Modal specific elements
    modalMoradorTitle: '.modal-title',
    btnSalvarMorador: '#btn-salvar-morador',
    modalUsuarioTitle: '.modal-title',
    btnSalvarUsuario: '#btn-salvar-usuario',
    grupoStatusUsuario: '.grupo-status-usuario'
};

export const CONFIG = {
    // Performance
    SEARCH_DELAY: 300,
    AUTO_SAVE_DELAY: 1000,
    DEBOUNCE_DELAY: 250,
    
    // UI Timing
    MODAL_TRANSITION_DELAY: 150,
    SUGGESTION_BLUR_DELAY: 200,
    STATUS_MESSAGE_DELAY: 3500,
    ERROR_MESSAGE_DELAY: 6000,
    
    // Pagination
    ITEMS_PER_PAGE: 50,
    VIRTUAL_SCROLL_BUFFER: 10,
    
    // Charts
    CHART_ANIMATION_DURATION: 800,
    CHART_RESPONSIVE_BREAKPOINT: 768
};

export const CHART_COLORS = {
    primary: '#1976d2',
    primaryLight: 'rgba(25, 118, 210, 0.1)',
    secondary: '#0288d1',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    info: '#2196f3'
};

export const MESSAGES = {
    LOGIN_SUCCESS: 'Login realizado com sucesso!',
    LOGIN_ERROR: 'Credenciais inválidas. Tente novamente.',
    SAVE_SUCCESS: 'Dados salvos com sucesso!',
    SAVE_ERROR: 'Erro ao salvar dados. Tente novamente.',
    DELETE_SUCCESS: 'Item excluído com sucesso!',
    DELETE_ERROR: 'Erro ao excluir item.',
    CONNECTION_ERROR: 'Erro de conexão com o banco de dados.',
    VALIDATION_ERROR: 'Por favor, preencha todos os campos obrigatórios.',
    SEARCH_NO_RESULTS: 'Nenhum resultado encontrado.',
    OPERATION_SUCCESS: 'Operação realizada com sucesso!'
};

export const VALIDATION_RULES = {
    USERNAME_MIN_LENGTH: 3,
    PASSWORD_MIN_LENGTH: 4,
    NAME_MIN_LENGTH: 2,
    APARTMENT_PATTERN: /^[A-Za-z0-9\-\/\s]+$/,
    PHONE_PATTERN: /^[\(\)\s\-\+\d]+$/
};

export const CSS_CLASSES = {
    ACTIVE: 'active',
    HIDDEN: 'hidden',
    LOADING: 'loading',
    ERROR: 'error',
    SUCCESS: 'success',
    SELECTED: 'selected',
    DISABLED: 'disabled',
    HIGHLIGHTED: 'highlighted'
};