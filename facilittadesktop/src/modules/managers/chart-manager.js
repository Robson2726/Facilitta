// === GERENCIADOR DE GRÁFICOS OTIMIZADO ===

import { $, createElement } from '../core/dom-utils.js';
import { perfMonitor, globalCache } from '../core/performance.js';
import { CHART_COLORS, CONFIG } from '../core/constants.js';

class ChartManager {
    constructor() {
        this.charts = new Map();
        this.isChartJSLoaded = false;
        this.chartJSLoadPromise = null;
        
        this.checkChartJS();
    }

    async checkChartJS() {
        if (typeof Chart !== 'undefined') {
            this.isChartJSLoaded = true;
            console.log('[ChartManager] Chart.js loaded, version:', Chart.version || 'unknown');
            return true;
        }

        console.warn('[ChartManager] Chart.js not loaded, attempting to load...');
        return this.loadChartJS();
    }

    async loadChartJS() {
        if (this.chartJSLoadPromise) {
            return this.chartJSLoadPromise;
        }

        this.chartJSLoadPromise = new Promise((resolve, reject) => {
            // Tenta CDN principal
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js';
            
            script.onload = () => {
                this.isChartJSLoaded = true;
                console.log('[ChartManager] Chart.js loaded successfully');
                resolve(true);
            };
            
            script.onerror = () => {
                // Fallback para versão alternativa
                console.warn('[ChartManager] Primary CDN failed, trying fallback...');
                const fallbackScript = document.createElement('script');
                fallbackScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.js';
                
                fallbackScript.onload = () => {
                    this.isChartJSLoaded = true;
                    console.log('[ChartManager] Chart.js loaded from fallback CDN');
                    resolve(true);
                };
                
                fallbackScript.onerror = () => {
                    console.error('[ChartManager] Failed to load Chart.js from all CDNs');
                    reject(new Error('Chart.js failed to load'));
                };
                
                document.head.appendChild(fallbackScript);
            };
            
            document.head.appendChild(script);
        });

        return this.chartJSLoadPromise;
    }

    async createChart(canvasId, config) {
        if (!this.isChartJSLoaded) {
            await this.loadChartJS();
        }

        const canvas = $(canvasId);
        if (!canvas) {
            console.error(`[ChartManager] Canvas ${canvasId} not found`);
            return null;
        }

        // Destrói chart existente se houver
        this.destroyChart(canvasId);

        perfMonitor.startMeasure(`chart-creation-${canvasId}`);

        try {
            const ctx = canvas.getContext('2d');
            const chart = new Chart(ctx, {
                ...config,
                options: {
                    ...config.options,
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: CONFIG.CHART_ANIMATION_DURATION,
                        easing: 'easeInOutQuart'
                    },
                    plugins: {
                        legend: {
                            display: config.options?.plugins?.legend?.display ?? true,
                            position: 'top'
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            borderColor: CHART_COLORS.primary,
                            borderWidth: 1
                        }
                    }
                }
            });

            this.charts.set(canvasId, chart);
            perfMonitor.endMeasure(`chart-creation-${canvasId}`);
            
            console.log(`[ChartManager] Chart created: ${canvasId}`);
            return chart;
            
        } catch (error) {
            console.error(`[ChartManager] Error creating chart ${canvasId}:`, error);
            return null;
        }
    }

    async updateChart(canvasId, newData) {
        const chart = this.charts.get(canvasId);
        if (!chart) {
            console.warn(`[ChartManager] Chart ${canvasId} not found for update`);
            return false;
        }

        perfMonitor.startMeasure(`chart-update-${canvasId}`);

        try {
            // Update data
            if (newData.labels) {
                chart.data.labels = newData.labels;
            }
            
            if (newData.datasets) {
                chart.data.datasets = newData.datasets;
            }

            chart.update('active');
            perfMonitor.endMeasure(`chart-update-${canvasId}`);
            
            return true;
        } catch (error) {
            console.error(`[ChartManager] Error updating chart ${canvasId}:`, error);
            return false;
        }
    }

    destroyChart(canvasId) {
        const chart = this.charts.get(canvasId);
        if (chart) {
            chart.destroy();
            this.charts.delete(canvasId);
            console.log(`[ChartManager] Chart destroyed: ${canvasId}`);
        }
    }

    async createEncomendasPorDiaChart(canvasId, rawData = null) {
        const cacheKey = 'chart-data-dias';
        let chartData = globalCache.get(cacheKey);

        if (!chartData) {
            chartData = await this.generateEncomendasPorDiaData(rawData);
            globalCache.set(cacheKey, chartData, 5 * 60 * 1000); // 5 minutos
        }

        const config = {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Encomendas Recebidas',
                    data: chartData.data,
                    borderColor: CHART_COLORS.primary,
                    backgroundColor: CHART_COLORS.primaryLight,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: CHART_COLORS.primary,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            title: (context) => {
                                return `Data: ${context[0].label}`;
                            },
                            label: (context) => {
                                const value = context.parsed.y;
                                return `${value} encomenda${value !== 1 ? 's' : ''}`;
                            }
                        }
                    }
                }
            }
        };

        return this.createChart(canvasId, config);
    }

    async createEncomendasPorMesChart(canvasId, rawData = null) {
        const cacheKey = 'chart-data-meses';
        let chartData = globalCache.get(cacheKey);

        if (!chartData) {
            chartData = await this.generateEncomendasPorMesData(rawData);
            globalCache.set(cacheKey, chartData, 10 * 60 * 1000); // 10 minutos
        }

        const config = {
            type: 'bar',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Encomendas por Mês',
                    data: chartData.data,
                    backgroundColor: CHART_COLORS.primary,
                    borderColor: CHART_COLORS.primary,
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            title: (context) => {
                                return `Mês: ${context[0].label}`;
                            },
                            label: (context) => {
                                const value = context.parsed.y;
                                return `${value} encomenda${value !== 1 ? 's' : ''}`;
                            }
                        }
                    }
                }
            }
        };

        return this.createChart(canvasId, config);
    }

    async generateEncomendasPorDiaData(rawData) {
        if (rawData && window.electronAPI?.getDashboardChartRawData) {
            try {
                const data = await window.electronAPI.getDashboardChartRawData();
                return this.processRealDataDias(data);
            } catch (error) {
                console.warn('[ChartManager] Failed to get real data, using mock data');
            }
        }

        // Dados mock para desenvolvimento
        return {
            labels: this.generateUltimosDiasLabels(15),
            data: this.generateRandomData(15, 0, 8)
        };
    }

    async generateEncomendasPorMesData(rawData) {
        if (rawData && window.electronAPI?.getDashboardChartRawData) {
            try {
                const data = await window.electronAPI.getDashboardChartRawData();
                return this.processRealDataMeses(data);
            } catch (error) {
                console.warn('[ChartManager] Failed to get real data, using mock data');
            }
        }

        // Dados mock para desenvolvimento
        return {
            labels: this.generateUltimosMesesLabels(12),
            data: this.generateRandomData(12, 5, 25)
        };
    }

    processRealDataDias(rawData) {
        const labels = this.generateUltimosDiasLabels(15);
        const data = new Array(15).fill(0);
        
        // Processa dados reais
        if (rawData && rawData.length > 0) {
            const hoje = new Date();
            
            rawData.forEach(item => {
                const itemDate = new Date(item.data_recebimento);
                const diffTime = hoje - itemDate;
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays >= 0 && diffDays < 15) {
                    const index = 14 - diffDays; // Inverte para mostrar mais recente à direita
                    data[index]++;
                }
            });
        }
        
        return { labels, data };
    }

    processRealDataMeses(rawData) {
        const labels = this.generateUltimosMesesLabels(12);
        const data = new Array(12).fill(0);
        
        if (rawData && rawData.length > 0) {
            const hoje = new Date();
            
            rawData.forEach(item => {
                const itemDate = new Date(item.data_recebimento);
                const diffMonths = (hoje.getFullYear() - itemDate.getFullYear()) * 12 + 
                                 (hoje.getMonth() - itemDate.getMonth());
                
                if (diffMonths >= 0 && diffMonths < 12) {
                    const index = 11 - diffMonths;
                    data[index]++;
                }
            });
        }
        
        return { labels, data };
    }

    generateUltimosDiasLabels(qtd) {
        const labels = [];
        const hoje = new Date();
        
        for (let i = qtd - 1; i >= 0; i--) {
            const data = new Date(hoje);
            data.setDate(data.getDate() - i);
            labels.push(data.toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit' 
            }));
        }
        
        return labels;
    }

    generateUltimosMesesLabels(qtd) {
        const labels = [];
        const hoje = new Date();
        
        for (let i = qtd - 1; i >= 0; i--) {
            const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
            labels.push(data.toLocaleDateString('pt-BR', { 
                month: 'short', 
                year: '2-digit' 
            }));
        }
        
        return labels;
    }

    generateRandomData(qtd, min, max) {
        return Array.from({ length: qtd }, () => 
            Math.floor(Math.random() * (max - min + 1)) + min
        );
    }

    // Método para inicializar todos os gráficos do dashboard
    async initializeDashboardCharts() {
        if (!this.isChartJSLoaded) {
            await this.loadChartJS();
        }

        perfMonitor.startMeasure('dashboard-charts-init');

        try {
            // Busca dados raw uma vez
            let rawData = null;
            if (window.electronAPI?.getDashboardChartRawData) {
                try {
                    rawData = await window.electronAPI.getDashboardChartRawData();
                } catch (error) {
                    console.warn('[ChartManager] Could not fetch raw data');
                }
            }

            // Cria gráficos em paralelo
            const chartPromises = [
                this.createEncomendasPorDiaChart('#chartEncomendasPorDia', rawData),
                this.createEncomendasPorMesChart('#chartEncomendasPorMes', rawData)
            ];

            await Promise.all(chartPromises);
            
            perfMonitor.endMeasure('dashboard-charts-init');
            console.log('[ChartManager] Dashboard charts initialized');
            
        } catch (error) {
            console.error('[ChartManager] Error initializing dashboard charts:', error);
        }
    }

    // Método para atualizar todos os gráficos
    async refreshAllCharts() {
        console.log('[ChartManager] Refreshing all charts...');
        
        // Limpa cache
        globalCache.delete('chart-data-dias');
        globalCache.delete('chart-data-meses');
        
        // Recria gráficos
        await this.initializeDashboardCharts();
    }

    // Método para redimensionar gráficos
    resizeCharts() {
        this.charts.forEach((chart, canvasId) => {
            try {
                chart.resize();
            } catch (error) {
                console.error(`[ChartManager] Error resizing chart ${canvasId}:`, error);
            }
        });
    }

    // Estatísticas
    getStats() {
        return {
            totalCharts: this.charts.size,
            chartJSLoaded: this.isChartJSLoaded,
            activeCharts: Array.from(this.charts.keys())
        };
    }

    // Cleanup
    destroy() {
        this.charts.forEach((chart, canvasId) => {
            this.destroyChart(canvasId);
        });
        this.charts.clear();
    }
}

// Instância global
export const chartManager = new ChartManager();

// Atalhos para uso externo
export const initializeDashboardCharts = () => chartManager.initializeDashboardCharts();
export const refreshAllCharts = () => chartManager.refreshAllCharts();
export const createChart = (canvasId, config) => chartManager.createChart(canvasId, config);

// Auto-resize nos gráficos quando a janela redimensiona
window.addEventListener('resize', () => {
    chartManager.resizeCharts();
});