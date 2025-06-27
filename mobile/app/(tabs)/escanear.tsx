import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, FlatList, TextInput, Alert, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
// @ts-expect-error: dependência não possui tipos TypeScript
import MLKitOcr from 'react-native-mlkit-ocr';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface Morador {
  id: string;
  nome: string;
  apartamento: string;
  bloco: string;
}

interface CadastroEncomendaProps {
  visible: boolean;
  morador: Morador | null;
  onClose: () => void;
  onSuccess: () => void;
}

const CadastroEncomendaModal: React.FC<CadastroEncomendaProps> = ({ visible, morador, onClose, onSuccess }) => {
  const [quantidade, setQuantidade] = useState('1');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);

  const cadastrar = async () => {
    if (!morador) {
      Alert.alert('Erro', 'Selecione um morador.');
      return;
    }
    if (!quantidade || isNaN(Number(quantidade)) || Number(quantidade) < 1) {
      Alert.alert('Erro', 'Quantidade inválida.');
      return;
    }
    setLoading(true);
    try {
      const apiConfig = await AsyncStorage.getItem('apiConfig');
      if (!apiConfig) throw new Error('API não configurada');
      const config = JSON.parse(apiConfig);
      const apiUrl = `http://${config.ip}:${config.port}/api/encomendas`;
      const body = {
        morador_nome: morador.nome,
        apartamento: morador.apartamento,
        bloco: morador.bloco,
        quantidade,
        observacoes,
        porteiro_nome: '', // Pode ser preenchido pelo usuário logado, se houver
        data_recebimento: new Date().toISOString().split('T')[0],
        hora_recebimento: new Date().toTimeString().split(' ')[0].substring(0, 5),
      };
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (result.success) {
        Alert.alert('Sucesso', 'Encomenda cadastrada!');
        onSuccess();
        onClose();
      } else {
        Alert.alert('Erro', result.message || 'Erro ao cadastrar encomenda');
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao cadastrar encomenda');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setQuantidade('1');
      setObservacoes('');
    }
  }, [visible, morador]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Registrar Encomenda</Text>
          <Text style={styles.modalLabel}>Morador</Text>
          <Text style={styles.modalValue}>{morador?.nome || ''}</Text>
          <Text style={styles.modalLabel}>Apartamento / Bloco</Text>
          <Text style={styles.modalValue}>{morador?.apartamento} / {morador?.bloco}</Text>
          <Text style={styles.modalLabel}>Quantidade</Text>
          <TextInput
            style={styles.modalInput}
            keyboardType="numeric"
            value={quantidade}
            onChangeText={setQuantidade}
            editable={!loading}
          />
          <Text style={styles.modalLabel}>Observações</Text>
          <TextInput
            style={[styles.modalInput, { height: 60 }]}
            value={observacoes}
            onChangeText={setObservacoes}
            editable={!loading}
            multiline
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalButton} onPress={onClose} disabled={loading}>
              <Text style={styles.modalButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#4070f4' }]} onPress={cadastrar} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.modalButtonText, { color: '#fff' }]}>Salvar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default function EscanearScreen() {
  const cameraRef = useRef<any>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [moradores, setMoradores] = useState<Morador[]>([]);
  const [moradoresSugeridos, setMoradoresSugeridos] = useState<Morador[]>([]);
  const [moradorSelecionado, setMoradorSelecionado] = useState<Morador | null>(null);
  const [modalCadastroVisible, setModalCadastroVisible] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      buscarMoradores();
    })();
  }, []);

  // Busca todos os moradores para sugerir
  const buscarMoradores = async () => {
    try {
      const apiConfig = await AsyncStorage.getItem('apiConfig');
      if (!apiConfig) return;
      const config = JSON.parse(apiConfig);
      const apiUrl = `http://${config.ip}:${config.port}/api/moradores`;
      const response = await fetch(apiUrl);
      const result = await response.json();
      if (result.success) setMoradores(result.data || []);
    } catch {}
  };

  // Processa frame da câmera e faz OCR
  const onCameraFrame = async (frame: any) => {
    if (scanning) return;
    setScanning(true);
    try {
      const result = await MLKitOcr.detectFromUri(frame.uri);
      const text = result.map((block: any) => block.text).join(' ');
      setOcrText(text);
      sugerirMoradores(text);
    } catch (e) {
      setOcrText('');
    }
    setScanning(false);
  };

  // Sugere moradores similares ao texto lido
  const sugerirMoradores = (texto: string) => {
    if (!texto || moradores.length === 0) {
      setMoradoresSugeridos([]);
      return;
    }
    const textoLower = texto.toLowerCase();
    const sugeridos = moradores.filter(m =>
      m.nome.toLowerCase().includes(textoLower)
    );
    setMoradoresSugeridos(sugeridos.slice(0, 5));
  };

  // Ao selecionar morador, abre modal de cadastro
  const selecionarMorador = (morador: Morador) => {
    setMoradorSelecionado(morador);
    setModalCadastroVisible(true);
  };

  if (hasPermission === null) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4070f4" /></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.center}><Text>Permissão da câmera negada.</Text></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Corrija o uso do componente Camera */}
      {/* @ts-expect-error: O tipo do Camera pode não ser reconhecido corretamente pelo TypeScript */}
      <Camera
        ref={cameraRef}
        style={{ flex: 1 }}
        type={'back'}
        onCameraReady={() => setScanning(false)}
        onBarCodeScanned={undefined}
        onMountError={() => Alert.alert('Erro', 'Erro ao acessar câmera')}
      />
      <View style={styles.ocrOverlay}>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={async () => {
            if (!cameraRef.current) return;
            const photo = await cameraRef.current.takePictureAsync({ base64: false });
            onCameraFrame(photo);
          }}
        >
          <Ionicons name="scan" size={32} color="#fff" />
          <Text style={{ color: '#fff', marginTop: 4 }}>Escanear</Text>
        </TouchableOpacity>
        <Text style={styles.ocrText}>{ocrText ? `Texto lido: ${ocrText}` : 'Aponte para a etiqueta e toque em Escanear'}</Text>
        {moradoresSugeridos.length > 0 && (
          <View style={styles.sugestoesContainer}>
            <Text style={styles.sugestoesTitulo}>Moradores sugeridos:</Text>
            <FlatList
              data={moradoresSugeridos}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.sugestaoItem} onPress={() => selecionarMorador(item)}>
                  <Ionicons name="person" size={18} color="#4070f4" />
                  <Text style={styles.sugestaoNome}>{item.nome}</Text>
                  <Text style={styles.sugestaoAp}>{item.apartamento} / {item.bloco}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>
      <CadastroEncomendaModal
        visible={modalCadastroVisible}
        morador={moradorSelecionado}
        onClose={() => setModalCadastroVisible(false)}
        onSuccess={() => {
          setModalCadastroVisible(false);
          setMoradorSelecionado(null);
          setOcrText('');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  ocrOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
  },
  scanButton: {
    alignSelf: 'center',
    backgroundColor: '#4070f4',
    borderRadius: 30,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ocrText: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 14,
  },
  sugestoesContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  sugestoesTitulo: {
    fontWeight: 'bold',
    color: '#4070f4',
    marginBottom: 6,
  },
  sugestaoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sugestaoNome: {
    marginLeft: 8,
    fontWeight: '600',
    color: '#222',
    flex: 1,
  },
  sugestaoAp: {
    color: '#666',
    fontSize: 12,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#4070f4',
  },
  modalLabel: {
    fontWeight: '600',
    marginTop: 8,
    color: '#333',
  },
  modalValue: {
    color: '#222',
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
    marginBottom: 8,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  modalButtonText: {
    fontWeight: 'bold',
    color: '#4070f4',
  },
});

// Não há nada no seu código que force o uso do Expo Go ou EAS Build diretamente.
// O que determina se você está usando Expo Go ou EAS Build é como você executa o app:
// - Expo Go: `npx expo start` e abre o app pelo Expo Go no celular (OCR NÃO FUNCIONA!)
// - EAS Build: `eas build --platform android` ou `eas run --platform android` e instala o APK/AAB gerado (OCR FUNCIONA!)

// Para garantir que você está usando EAS Build, siga estes passos:

// 1. No terminal, rode:
   // eas build:configure

// 2. Para buildar e testar no Android, rode:
   // 
   
//    ou para rodar direto no aparelho:
   // eas run --platform android

// 3. Instale o APK/AAB gerado no seu dispositivo Android.

// Não é necessário alterar o código para "mudar" para EAS Build.
// Apenas rode o build e instale o app nativo no seu dispositivo Android.

// As instruções abaixo são para você, não para o código:

// Esse erro ocorre porque você está tentando usar um comando (`expo export:embed`)
// que só funciona para projetos Expo Managed (sem dependências nativas customizadas).

// Como seu projeto usa `react-native-mlkit-ocr` (nativo), você deve SEMPRE usar EAS Build:
// 1. No terminal, rode:
//    eas build:configure
// 2. Para buildar e testar no Android, rode:
//    eas build --platform android
//    ou para rodar direto no aparelho:
//    eas run --platform android
// 3. Instale o APK/AAB gerado no seu dispositivo Android.

// Não use `expo export`, `expo build` ou Expo Go para testar OCR nativo.
// Apenas EAS Build funciona para seu caso.