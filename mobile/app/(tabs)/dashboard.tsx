import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, ActivityIndicator, SafeAreaView, TouchableOpacity } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

interface DashboardStats {
  totalPendentes: number;
  totalHoje: number;
  totalSemana: number;
}

export default function DashboardScreen() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPendentes: 0,
    totalHoje: 0,
    totalSemana: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    carregarDashboard();
  }, []);

  const carregarDashboard = async () => {
    try {
      setLoading(true);
      const apiConfig = await AsyncStorage.getItem('apiConfig');
      let config = apiConfig ? JSON.parse(apiConfig) : null;
      if (!config) {
        const apiUrl = await AsyncStorage.getItem('apiUrl');
        const apiPorta = await AsyncStorage.getItem('apiPorta');
        if (!apiUrl || !apiPorta) {
          Alert.alert('Erro', 'Configure o IP e porta da API na aba Ajustes.');
          return;
        }
        config = { ip: apiUrl, port: apiPorta };
        await AsyncStorage.setItem('apiConfig', JSON.stringify(config));
      }
      const apiUrl = `http://${config.ip}:${config.port}/api/encomendas`;
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      if (result.success) {
        const encomendas = result.data || [];
        calcularEstatisticas(encomendas);
      } else {
        Alert.alert('Erro', result.message || 'Erro ao buscar encomendas');
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      Alert.alert('Erro', 'Não foi possível conectar com o servidor.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calcularEstatisticas = (encomendas: any[]) => {
    const hoje = new Date().toISOString().split('T')[0];
    const semanaAtras = new Date();
    semanaAtras.setDate(semanaAtras.getDate() - 7);
    const dataSemanAtras = semanaAtras.toISOString().split('T')[0];
    const pendentes = encomendas.filter(e => e.status === 'pendente');
    const hojeCount = encomendas.filter(e => e.data_recebimento === hoje).length;
    const semanaCount = encomendas.filter(e => e.data_recebimento >= dataSemanAtras).length;
    setStats({
      totalPendentes: pendentes.length,
      totalHoje: hojeCount,
      totalSemana: semanaCount
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    carregarDashboard();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4070f4" />
        <Text style={styles.loadingText}>Carregando dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#4070f4" translucent={false} />
      
      {/* Header azul que se estende até o topo */}
      <SafeAreaView style={styles.topBackground}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.welcomeText}>Bem-vindo</Text>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerSubtitle}>Receba. Registre. Entregue</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={carregarDashboard}
          >
            <Ionicons name="refresh" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Conteúdo principal com fundo branco */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={carregarDashboard}
            colors={['#4070f4']}
            tintColor="#4070f4"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4070f4" />
            <Text style={styles.loadingText}>Carregando dados...</Text>
          </View>
        ) : (
          <View style={styles.dashboardContent}>
            {/* Overview Cards */}
            <View style={styles.overviewContainer}>
              <Text style={styles.sectionTitle}>Visão Geral</Text>
              
              <View style={styles.overviewRow}>
                {/* Card Encomendas Hoje (Cinza) */}
                <TouchableOpacity style={[styles.overviewCard, styles.todayCard]}>
                  <View style={styles.cardIcon}>
                    <Ionicons name="today" size={24} color="#666" />
                  </View>
                  <Text style={styles.cardPercentage}>
                    {stats.totalHoje || 0}
                  </Text>
                  <Text style={styles.cardLabel}>Hoje</Text>
                </TouchableOpacity>

                {/* Card Encomendas da Semana (Verde) */}
                <TouchableOpacity style={[styles.overviewCard, styles.weekCard]}>
                  <View style={styles.cardIcon}>
                    <Ionicons name="calendar" size={24} color="#28a745" />
                  </View>
                  <Text style={styles.cardPercentage}>
                    {stats.totalSemana || 0}
                  </Text>
                  <Text style={styles.cardLabel}>Esta Semana</Text>
                </TouchableOpacity>
              </View>

              {/* Card Pendentes (Azul/Roxo - Maior) */}
              <TouchableOpacity style={[styles.overviewCard, styles.pendingCard]}>
                <View style={styles.pendingCardContent}>
                  <View style={styles.pendingCardLeft}>
                    <Text style={styles.pendingCardTitle}>Encomendas Pendentes</Text>
                    <Text style={styles.pendingCardSubtitle}>
                      Aguardando entrega
                    </Text>
                    <Text style={styles.pendingCardValue}>
                      {stats.totalPendentes || 0}
                    </Text>
                  </View>
                  <View style={styles.pendingCardRight}>
                    <Ionicons name="time" size={48} color="rgba(255,255,255,0.3)" />
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Espaço adicional para scroll */}
            <View style={{ height: 100 }} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4070f4',
  },
  topBackground: {
    backgroundColor: '#4070f4',
    paddingBottom: 120, // Reduzido de 150 para 120
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 40, // Reduzido de 60 para 40
    paddingTop: 10,
  },
  headerContent: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2, // Adicionado para melhor espaçamento
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 4,
    marginBottom: 2, // Adicionado para melhor espaçamento
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    fontWeight: '500',
  },
  refreshButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginTop: 15, // Reduzido de 20 para 15
    backgroundColor: 'transparent',
  },
  dashboardContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 25, // Aumentado de -10 para 25
    paddingHorizontal: 20,
    minHeight: '100%',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  quickActionItem: {
    alignItems: 'center',
  },
  quickActionIcon: {
    backgroundColor: '#4070f4',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#4070f4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  overviewContainer: {
    marginBottom: 20,
    marginTop: 10, // Adicionado espaçamento superior
  },
  sectionTitle: {
    fontSize: 22, // Aumentado de 20 para 22
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20, // Aumentado de 16 para 20
    marginTop: 5, // Adicionado
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20, // Aumentado de 16 para 20
    gap: 12, // Adicionado espaçamento entre cards
  },
  overviewCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18, // Reduzido de 20 para 18
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  todayCard: {
    flex: 0.48,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  weekCard: {
    flex: 0.48,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  pendingCard: {
    backgroundColor: '#4070f4',
    marginTop: 12, // Aumentado de 8 para 12
    padding: 22, // Aumentado para dar mais destaque
  },
  cardIcon: {
    alignSelf: 'flex-end',
    marginBottom: 10, // Reduzido de 12 para 10
  },
  cardPercentage: {
    fontSize: 26, // Aumentado de 24 para 26
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6, // Aumentado de 4 para 6
  },
  cardLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  pendingCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingCardLeft: {
    flex: 1,
  },
  pendingCardTitle: {
    fontSize: 19, // Aumentado de 18 para 19
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 6, // Aumentado de 4 para 6
  },
  pendingCardSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 15, // Aumentado de 12 para 15
  },
  pendingCardValue: {
    fontSize: 36, // Aumentado de 32 para 36
    fontWeight: 'bold',
    color: 'white',
  },
  pendingCardRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
});
