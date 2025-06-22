import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Modal, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

export default function AjustesScreen() {
  const [apiUrl, setApiUrl] = useState('');
  const [porta, setPorta] = useState('3001');
  const [qrScannerVisible, setQrScannerVisible] = useState(false);
  const [manualConfigVisible, setManualConfigVisible] = useState(false);
  const [tempApiUrl, setTempApiUrl] = useState('');
  const [tempPorta, setTempPorta] = useState('3001');
  const [permission, requestPermission] = useCameraPermissions();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  useEffect(() => {
    if (apiUrl && porta) {
      verificarConexaoAutomatica();
    }
  }, [apiUrl, porta]);

  const carregarConfiguracoes = async () => {
    try {
      const config = await AsyncStorage.getItem('apiConfig');
      if (config) {
        const parsedConfig = JSON.parse(config);
        setApiUrl(parsedConfig.ip || '');
        setPorta(parsedConfig.port || '3001');
      } else {
        // Verificar configuração antiga
        const urlSalva = await AsyncStorage.getItem('apiUrl');
        const portaSalva = await AsyncStorage.getItem('apiPorta');
        if (urlSalva) setApiUrl(urlSalva);
        if (portaSalva) setPorta(portaSalva);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const verificarConexaoAutomatica = async () => {
    setIsCheckingConnection(true);
    try {
      const testUrl = `http://${apiUrl.trim()}:${porta.trim()}/api/status`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      setIsConnected(response.ok);
    } catch (error) {
      setIsConnected(false);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const testarConexao = async () => {
    if (!apiUrl.trim() || !porta.trim()) {
      Alert.alert('Erro', 'Configure o IP e porta antes de testar.');
      return;
    }

    setIsCheckingConnection(true);
    try {
      const testUrl = `http://${apiUrl.trim()}:${porta.trim()}/api/status`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        setIsConnected(true);
        Alert.alert('Sucesso', 'Conexão estabelecida com sucesso!');
      } else {
        setIsConnected(false);
        Alert.alert('Erro', 'Servidor não responde corretamente.');
      }
    } catch (error) {
      setIsConnected(false);
      if ((error as any).name === 'AbortError') {
        Alert.alert('Erro', 'Tempo de conexão esgotado (timeout).');
      } else {
        Alert.alert('Erro', 'Não foi possível conectar ao servidor. Verifique IP, porta e conexão de rede.');
      }
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const abrirQrScanner = async () => {
    if (!permission) {
      return;
    }

    if (!permission.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permissão', 'Acesso à câmera é necessário para escanear QR Code.');
        return;
      }
    }

    setQrScannerVisible(true);
  };

  const onQrCodeScanned = (data: string) => {
    try {
      // Esperamos um QR Code no formato: {"ip": "192.168.1.100", "port": "3001"}
      const config = JSON.parse(data);
      
      if (config.ip && config.port) {
        setApiUrl(config.ip);
        setPorta(config.port);
        setQrScannerVisible(false);
        salvarConfiguracao(config.ip, config.port);
        Alert.alert('Sucesso', 'Configurações carregadas do QR Code!');
      } else {
        Alert.alert('Erro', 'QR Code inválido. Formato esperado: {"ip": "xxx.xxx.xxx.xxx", "port": "xxxx"}');
      }
    } catch (error) {
      Alert.alert('Erro', 'QR Code inválido. Não foi possível ler as configurações.');
    }
  };

  const abrirConfiguracaoManual = () => {
    setTempApiUrl(apiUrl);
    setTempPorta(porta);
    setManualConfigVisible(true);
  };

  const salvarConfiguracao = async (ip: string, port: string) => {
    try {
      const config = {
        ip: ip.trim(),
        port: port.trim()
      };

      await AsyncStorage.setItem('apiConfig', JSON.stringify(config));
      await AsyncStorage.setItem('apiUrl', ip.trim());
      await AsyncStorage.setItem('apiPorta', port.trim());
      
      // Verificar conexão após salvar
      setApiUrl(ip.trim());
      setPorta(port.trim());
    } catch (error) {
      console.error('Erro ao salvar:', error);
      throw error;
    }
  };

  const salvarConfiguracaoManual = async () => {
    if (!tempApiUrl.trim()) {
      Alert.alert('Erro', 'Digite o IP do servidor!');
      return;
    }

    if (!tempPorta.trim()) {
      Alert.alert('Erro', 'Digite a porta do servidor!');
      return;
    }

    try {
      await salvarConfiguracao(tempApiUrl, tempPorta);
      setApiUrl(tempApiUrl.trim());
      setPorta(tempPorta.trim());
      setManualConfigVisible(false);
      Alert.alert('Sucesso', 'Configurações salvas com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar as configurações.');
    }
  };

  const limparConfiguracoes = () => {
    Alert.alert(
      'Confirmação',
      'Deseja limpar todas as configurações?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            setApiUrl('');
            setPorta('3001');
            await AsyncStorage.removeItem('apiConfig');
            await AsyncStorage.removeItem('apiUrl');
            await AsyncStorage.removeItem('apiPorta');
            Alert.alert('Sucesso', 'Configurações limpas!');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor="#F2F2F7" translucent={false} />
      <ScrollView style={styles.content}>
        {/* Status da conexão atual */}
        <View style={styles.statusHeader}>
         
          <Text style={styles.statusTitle}>Status da Conexão</Text>
          {isCheckingConnection && (
            <ActivityIndicator size="small" color="#4070f4" style={{ marginLeft: 10 }} />
          )}
        </View>
        {apiUrl && porta ? (
          <View style={[
            styles.statusConnected,
            isConnected === false && styles.statusDisconnected,
            isConnected === null && styles.statusChecking
          ]}>
            <View style={styles.statusIndicator}>
              <View style={[
                styles.statusDot,
                isConnected === false && styles.statusDotOff,
                isConnected === null && styles.statusDotChecking
              ]} />
              {isConnected === true && <View style={styles.statusRipple} />}
            </View>
            <View style={styles.statusInfo}>
              <Text style={[
                styles.statusLabel,
                isConnected === false && styles.statusLabelOff,
                isConnected === null && styles.statusLabelChecking
              ]}>
                {isCheckingConnection ? 'Verificando...' : 
                 isConnected === true ? 'Conectado' : 
                 isConnected === false ? 'Desconectado' : 'Configurado'}
              </Text>
              <Text style={styles.statusValue}>{apiUrl}:{porta}</Text>
            </View>
            <Ionicons 
              name={isConnected === true ? "checkmark-circle" : 
                   isConnected === false ? "close-circle" : "time"} 
              size={24} 
              color={isConnected === true ? "#28a745" : 
                    isConnected === false ? "#dc3545" : "#ffc107"} 
            />
          </View>
        ) : (
          <View style={styles.statusDisconnected}>
            <View style={styles.statusIndicatorOff}>
              <View style={styles.statusDotOff} />
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusLabelOff}>Não configurado</Text>
              <Text style={styles.statusValueOff}>Configure a conexão com o servidor</Text>
            </View>
            <Ionicons name="alert-circle" size={24} color="#dc3545" />
          </View>
        )}

        {/* Botões principais */}
        <View style={styles.mainButtonsContainer}>
          <TouchableOpacity style={styles.qrCodeButton} onPress={abrirQrScanner}>
            <View style={styles.qrCodeContent}>
              <View style={styles.qrCodeIconContainer}>
                <Ionicons name="qr-code" size={48} color="white" />
              </View>
              <View style={styles.qrCodeText}>
                <Text style={styles.qrCodeTitle}>Escanear QR Code</Text>
                <Text style={styles.qrCodeSubtitle}>
                  Configuração automática e rápida
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.manualButton} onPress={abrirConfiguracaoManual}>
            <View style={styles.manualContent}>
              <View style={styles.manualIconContainer}>
                <Ionicons name="create" size={24} color="#6c757d" />
              </View>
              <Text style={styles.manualTitle}>Configuração Manual</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Botões secundários */}
        <View style={styles.secondaryButtonsContainer}>
          <TouchableOpacity style={styles.secondaryButton} onPress={testarConexao}>
            <Ionicons name="wifi" size={20} color="#17a2b8" />
            <Text style={styles.secondaryButtonText}>Testar Conexão</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={() => setShowHelp(true)}
          >
            <Ionicons name="help-circle" size={20} color="#4070f4" />
            <Text style={styles.secondaryButtonText}>Como configurar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={limparConfiguracoes}>
            <Ionicons name="trash" size={20} color="#dc3545" />
            <Text style={styles.secondaryButtonText}>Limpar Dados</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de Ajuda */}
      <Modal visible={showHelp} animationType="slide" transparent>
        <View style={styles.helpModalOverlay}>
          <View style={styles.helpModalContainer}>
            <View style={styles.helpModalHeader}>
              <Text style={styles.helpModalTitle}> Como conectar ao servidor</Text>
              <TouchableOpacity onPress={() => setShowHelp(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.helpModalContent}>
              <View style={styles.helpSection}>
                <View style={styles.helpItem}>
                  <View style={styles.helpIconContainer}>
                    <Ionicons name="qr-code" size={24} color="#4070f4" />
                  </View>
                  <View style={styles.helpText}>
                    <Text style={styles.helpTitle}>QR Code (Recomendado)</Text>
                    <Text style={styles.helpDescription}>
                      Método mais rápido e sem erros. Solicite o QR Code ao administrador do sistema.
                    </Text>
                  </View>
                </View>

                <View style={styles.helpItem}>
                  <View style={styles.helpIconContainer}>
                    <Ionicons name="create" size={24} color="#6c757d" />
                  </View>
                  <View style={styles.helpText}>
                    <Text style={styles.helpTitle}>Configuração manual</Text>
                    <Text style={styles.helpDescription}>
                      Insira manualmente o IP e porta do servidor. A porta padrão é 3001.
                    </Text>
                  </View>
                </View>

                <View style={styles.helpItem}>
                  <View style={styles.helpIconContainer}>
                    <Ionicons name="wifi" size={24} color="#17a2b8" />
                  </View>
                  <View style={styles.helpText}>
                    <Text style={styles.helpTitle}>Teste de conexão</Text>
                    <Text style={styles.helpDescription}>
                      Sempre teste a conexão após configurar para garantir que está funcionando.
                    </Text>
                  </View>
                </View>

                <View style={styles.helpTip}>
                  <Ionicons name="bulb" size={20} color="#ffc107" />
                  <Text style={styles.helpTipText}>
                    <Text style={styles.helpTipBold}>Dica:</Text> Mantenha o dispositivo na mesma rede Wi-Fi do servidor
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Configuração Manual */}
      <Modal visible={manualConfigVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Configuração manual</Text>
              <TouchableOpacity onPress={() => setManualConfigVisible(false)}>
                <Ionicons name="close" size={24} color="#4070f4" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.card}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>IP do servidor *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 192.168.1.100"
                    value={tempApiUrl}
                    onChangeText={setTempApiUrl}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Porta *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 3001"
                    value={tempPorta}
                    onChangeText={setTempPorta}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.modalCancelButton} 
                  onPress={() => setManualConfigVisible(false)}
                >
                  <Text style={styles.modalCancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.modalSaveButton} 
                  onPress={salvarConfiguracaoManual}
                >
                  <Text style={styles.modalSaveButtonText}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal do QR Scanner */}
      <Modal visible={qrScannerVisible} animationType="slide">
        <View style={styles.qrContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={({ data }) => onQrCodeScanned(data)}
          >
            <View style={styles.qrOverlay}>
              <View style={styles.qrHeader}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setQrScannerVisible(false)}
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>

              <View style={styles.qrScanArea}>
                <View style={styles.qrFrame} />
                <Text style={styles.qrInstruction}>
                  Aponte o leitor para o QR Code gerado no FacilittaDesktop
                </Text>
              </View>
            </View>
          </CameraView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    paddingTop: 50,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  statusConnected: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fff9',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
    marginBottom: 30,
  },
  statusDisconnected: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff8f8',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
    marginBottom: 30,
  },
  statusChecking: {
    backgroundColor: '#fff9e6',
    borderLeftColor: '#ffc107',
    marginBottom: 30,
  },
  statusIndicator: {
    position: 'relative',
    width: 16,
    height: 16,
    marginRight: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#28a745',
    position: 'absolute',
    top: 4,
    left: 4,
  },
  statusRipple: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(40, 167, 69, 0.3)',
    position: 'absolute',
  },
  statusIndicatorOff: {
    width: 16,
    height: 16,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDotOff: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#dc3545',
  },
  statusDotChecking: {
    backgroundColor: '#ffc107',
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#28a745',
    marginBottom: 2,
  },
  statusLabelOff: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc3545',
    marginBottom: 2,
  },
  statusLabelChecking: {
    color: '#856404',
  },
  statusValue: {
    fontSize: 12,
    color: '#666',
  },
  statusValueOff: {
    fontSize: 12,
    color: '#666',
  },
  mainButtonsContainer: {
    marginBottom: 30,
  },
  qrCodeButton: {
    backgroundColor: '#4070f4',
    borderRadius: 20,
    padding: 30,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  qrCodeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qrCodeIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 30,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 25,
  },
  qrCodeText: {
    flex: 1,
  },
  qrCodeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  qrCodeSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
  },
  manualButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  manualContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualIconContainer: {
    backgroundColor: '#e9ecef',
    borderRadius: 12,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  manualTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  unifiedButton: {
    flex: 1,
    backgroundColor: '#4070f4',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  unifiedButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
    textAlign: 'center',
  },
  unifiedButtonSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 16,
  },
  primaryButton: {
    backgroundColor: '#4070f4',
    borderRadius: 16,
    padding: 25,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  primaryButtonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  primaryButtonSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  secondaryButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    gap: 10,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 12,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    color: '#333',
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  infoBold: {
    fontWeight: '600',
    color: '#4070f4',
  },
  helpModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpModalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 20,
    width: width - 40,
    maxHeight: height * 0.7,
  },
  helpModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  helpModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  helpModalContent: {
    padding: 20,
  },
  helpSection: {
    gap: 20,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  helpIconContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  helpText: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  helpDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  helpTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff9e6',
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
  },
  helpTipText: {
    fontSize: 14,
    color: '#856404',
    marginLeft: 10,
    flex: 1,
  },
  helpTipBold: {
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 20,
    width: width - 40,
    maxHeight: height * 0.6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4070f4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  inputGroup: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalCancelButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    flex: 1,
    marginRight: 10,
  },
  modalCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalSaveButton: {
    backgroundColor: '#4070f4',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    flex: 1,
  },
  modalSaveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  qrContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  qrOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  qrHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    paddingTop: 50,
  },
  closeButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrScanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrFrame: {
    width: width * 0.7,
    height: width * 0.7,
    borderWidth: 2,
    borderColor: '#4070f4',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  qrInstruction: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
    padding: 10,
  },
  saveButton: {
    backgroundColor: '#4070f4',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    flex: 1,
  },
  testButton: {
    backgroundColor: '#4070f4',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    flex: 1,
  },
});
