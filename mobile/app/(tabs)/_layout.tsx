import React, { useRef, useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, TouchableOpacity, Animated, Modal, TextInput, ScrollView, Text, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Encomenda {
  id: string;
  morador_nome: string;
  apartamento: string;
  bloco: string;
  quantidade: number;
  data_recebimento: string;
  hora_recebimento: string;
  porteiro_nome: string;
  observacoes?: string;
  status: 'pendente' | 'entregue';
}

// Ícone especial para escanear (central)
function TabBarIcon(props: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size?: number;
  focused?: boolean;
}) {
  const { size = 24, focused = false } = props;

  // Ícone especial para escanear (central)
  if (props.name === 'scan') {
    return (
      <View
        style={[
          styles.scanIconContainer,
          focused && styles.scanIconFocused,
        ]}>
        <Ionicons
          name="scan"
          size={32}
          color="white"
        />
      </View>
    );
  }

  return <Ionicons size={size} {...props} />;
}

export default function TabLayout() {
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  
  // Estados para o modal de pesquisa
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<Encomenda[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const buscarEncomendas = async (texto: string) => {
    if (!texto.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      // Buscar configuração da API
      const apiConfig = await AsyncStorage.getItem('apiConfig');
      if (!apiConfig) {
        Alert.alert('Erro', 'Configure a API na aba Ajustes primeiro.');
        return;
      }

      const config = JSON.parse(apiConfig);
      const apiUrl = `http://${config.ip}:${config.port}/api/encomendas`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      

      const result = await response.json();

      if (result.success) {
        const encomendas = result.data || [];
        // CORREÇÃO: Filtrar apenas pendentes usando status retornado da API
        const filtered = encomendas
          .filter((e: Encomenda) => e.status === 'pendente')
          .filter((e: Encomenda) => 
            e.morador_nome.toLowerCase().includes(texto.toLowerCase()) ||
            (e.observacoes && e.observacoes.toLowerCase().includes(texto.toLowerCase()))
          );
        
        setSearchResults(filtered);
      } else {
        Alert.alert('Erro', 'Erro ao buscar encomendas');
      }
    } catch (error) {
      console.error('Erro ao buscar:', error);
      Alert.alert('Erro', 'Não foi possível conectar com o servidor.');
    } finally {
      setSearchLoading(false);
    }
  };

  const marcarComoEntregue = async (encomendaId: string) => {
    try {
      const config = JSON.parse(await AsyncStorage.getItem('apiConfig') || '{}');
      const apiUrl = `http://${config.ip}:${config.port}/api/encomendas/${encomendaId}/entregar`;

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data_entrega: new Date().toISOString().split('T')[0],
          hora_entrega: new Date().toTimeString().split(' ')[0].substring(0, 5),
        }),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert('Sucesso', 'Encomenda marcada como entregue!');
        // Atualizar resultados da pesquisa
        buscarEncomendas(searchText);
      } else {
        Alert.alert('Erro', result.message || 'Erro ao marcar como entregue');
      }
    } catch (error) {
      console.error('Erro ao marcar como entregue:', error);
      Alert.alert('Erro', 'Não foi possível conectar com o servidor.');
    }
  };

  const abrirModalPesquisa = () => {
    setSearchText('');
    setSearchResults([]);
    setSearchModalVisible(true);
  };

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#4070f4',
          tabBarInactiveTintColor: '#8E8E93',
          tabBarStyle: [
            styles.tabBarStyle,
            {
              // Ilha flutuante
              backgroundColor: 'transparent',
              borderTopWidth: 0,
              elevation: 0,
              shadowOpacity: 0,
            }
          ],
          tabBarBackground: () => (
            <View style={styles.tabBarIsland} />
          ),
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginBottom: 8,
          },
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
          },
          headerTintColor: '#007AFF',
          headerShown: false
        }}>
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            headerTitle: 'Dashboard',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name="grid-outline"
                color={color}
                focused={focused}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="cadastrar"
          options={{
            title: 'Cadastrar',
            headerTitle: 'Cadastrar Encomenda',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name="add-circle-outline"
                color={color}
                focused={focused}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="escanear"
          options={{
            title: '',
            headerTitle: 'Escanear Documento',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name="scan" color={color} focused={focused} />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              // Previne a navegação padrão
              e.preventDefault();
              // Navega diretamente para a tela de câmera
              router.push('/(camera)/scanner');
            },
          }}
        />

        <Tabs.Screen
          name="pesquisar"
          options={{
            title: 'Entregar',
            headerTitle: 'Entregar encomendas',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name="cube-outline"
                color={color}
                focused={focused}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="ajustes"
          options={{
            title: 'Ajustes',
            headerTitle: 'Configurações',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name="settings-outline"
                color={color}
                focused={focused}
              />
            ),
          }}
        />

        {/* Ocultar as abas padrão do Expo */}
        <Tabs.Screen
          name="index"
          options={{
            href: null, // Oculta a aba
          }}
        />
        <Tabs.Screen
          name="two"
          options={{
            href: null, // Oculta a aba
          }}
        />
      </Tabs>

      {/* Botão Flutuante de Pesquisa */}
      <TouchableOpacity
        style={styles.searchFloatingButton}
        onPress={abrirModalPesquisa}
        activeOpacity={0.8}
      >
        <Ionicons name="search" size={24} color="#4070f4" />
      </TouchableOpacity>

      {/* Botão Flutuante Melhorado para Modo Lote */}
      <Animated.View
        style={[
          styles.loteButtonContainer,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.loteButton}
          onPress={() => router.push('/modo-lote')}
        >
          <Ionicons name="layers" size={32} color="white" />
        </TouchableOpacity>
      </Animated.View>

      {/* Modal de Pesquisa Rápida */}
      <Modal visible={searchModalVisible} animationType="slide" transparent>
        <View style={styles.searchModalOverlay}>
          <View style={styles.searchModalContainer}>
            <View style={styles.searchModalHeader}>
              <Text style={styles.searchModalTitle}>Pesquisa Rápida</Text>
              <TouchableOpacity onPress={() => setSearchModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#007AFF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar encomendas pendentes..."
                value={searchText}
                onChangeText={(text) => {
                  setSearchText(text);
                  buscarEncomendas(text);
                }}
                autoFocus
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => {
                  setSearchText('');
                  setSearchResults([]);
                }}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>

            {searchLoading && (
              <View style={styles.searchLoadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.searchLoadingText}>Buscando...</Text>
              </View>
            )}

            <ScrollView style={styles.searchResults}>
              {searchText.trim() === '' ? (
                <View style={styles.searchEmptyState}>
                  <Ionicons name="search-outline" size={48} color="#ccc" />
                  <Text style={styles.searchEmptyTitle}>Digite para pesquisar</Text>
                  <Text style={styles.searchEmptySubtitle}>
                    Busque por nome do morador ou observações
                  </Text>
                </View>
              ) : searchResults.length > 0 ? (
                searchResults.map((encomenda) => (
                  <View key={encomenda.id} style={styles.searchResultItem}>
                    <View style={styles.searchResultHeader}>
                      <Text style={styles.searchResultName}>{encomenda.morador_nome}</Text>
                      <Text style={styles.searchResultDate}>
                        {(() => {
                          const [ano, mes, dia] = encomenda.data_recebimento.split('-');
                          return `${dia}/${mes}/${ano}`;
                        })()} {encomenda.hora_recebimento}
                      </Text>
                    </View>
                    
                    <View style={styles.searchResultDetails}>
                      <Text style={styles.searchResultDetail}>
                        <Ionicons name="cube" size={14} color="#666" /> 
                        Qtd: {encomenda.quantidade}
                      </Text>
                      <Text style={styles.searchResultDetail}>
                        <Ionicons name="person" size={14} color="#666" /> 
                        {encomenda.porteiro_nome}
                      </Text>
                    </View>

                    {encomenda.observacoes && (
                      <Text style={styles.searchResultObs}>{encomenda.observacoes}</Text>
                    )}
                  </View>
                ))
              ) : !searchLoading ? (
                <View style={styles.searchEmptyState}>
                  <Ionicons name="mail-open-outline" size={48} color="#ccc" />
                  <Text style={styles.searchEmptyTitle}>Nenhum resultado</Text>
                  <Text style={styles.searchEmptySubtitle}>
                    Não encontramos encomendas pendentes com esse termo
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  tabBarStyle: {
    position: 'absolute',
    bottom: 25,
    left: 35,
    right: 35,
    height: 70,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarIsland: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: '#ffffff',
    borderRadius: 35,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    // Borda sutil
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  scanIconContainer: {
    backgroundColor: '#4070f4',
    borderRadius: 32,
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -22,
    shadowColor: '#4070f4',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    // Efeito de brilho sutil
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  scanIconFocused: {
    backgroundColor: '#3056d3',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    transform: [{ scale: 1.05 }],
    // Intensificar o brilho quando focado
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  searchFloatingButton: {
    position: 'absolute',
    right: 25,
    bottom: 185,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    zIndex: 999,
  },
  loteButtonContainer: {
    position: 'absolute',
    right: 25,
    bottom: 110,
    // ...existing code...
  },
  loteButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4070f4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    // Efeito vidro
    backdropFilter: 'blur(10px)',
    overflow: 'hidden',
    zIndex: 1000, 
  },
  searchModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  searchModalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '95%',
    minHeight: '85%',
  },
  searchModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 20,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  searchLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  searchLoadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  searchResults: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchEmptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  searchEmptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  searchEmptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  searchResultItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  searchResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  searchResultDate: {
    fontSize: 12,
    color: '#666',
  },
  searchResultDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  searchResultDetail: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  searchResultObs: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  searchResultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4070f4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  searchResultButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});
