import { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, Image, View, ActivityIndicator, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { loginWithGoogle } from '../services/authService';
import { runtimeConfig } from '../config/runtime';

// Necessário para o Expo fechar a janela do navegador após o login
WebBrowser.maybeCompleteAuthSession();

export default function SocialButton({ title, onSuccess }) {
  const [carregando, setCarregando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState('');

  // CONFIGURAÇÃO DO GOOGLE SIGN-IN
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: runtimeConfig.google.clientId || 'SEU_WEB_CLIENT_ID_AQUI.apps.googleusercontent.com',
    iosClientId: runtimeConfig.google.iosClientId || 'SEU_IOS_CLIENT_ID_AQUI.apps.googleusercontent.com',
    androidClientId: runtimeConfig.google.androidClientId || 'SEU_ANDROID_CLIENT_ID_AQUI.apps.googleusercontent.com',
  });

  // Ouve a resposta do Google assim que o utilizador fecha a janela de login
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      enviarTokenParaOBackend(id_token);
    } else if (response?.type === 'error') {
      setMensagemErro('Erro ao contactar o Google.');
      setCarregando(false);
    } else if (response?.type === 'dismiss') {
      setCarregando(false);
    }
  }, [response]);

  const handleGoogleLogin = async () => {
    setCarregando(true);
    setMensagemErro('');
    
    // Abre a janela oficial do Google para o utilizador escolher a conta
    promptAsync(); 
  };

  const enviarTokenParaOBackend = async (idTokenReal) => {
    try {
      console.log("Enviando idToken real para o Heroku...");
      
      // Agora envia o token VERDADEIRO para o seu backend
      const resultado = await loginWithGoogle(idTokenReal);
      
      setCarregando(false);
      
      if (onSuccess) {
        onSuccess(resultado);
      }
    } catch (error) {
      setCarregando(false);
      const mensagem = error.message === 'Failed to fetch' 
        ? 'Erro de ligação ao servidor (CORS ou Heroku offline).' 
        : `Acesso Recusado: ${error.message}`;
      setMensagemErro(mensagem);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleGoogleLogin} 
        activeOpacity={0.7}
        disabled={carregando || !request}
      >
        {carregando ? (
          <ActivityIndicator size="small" color="#334155" style={styles.icon} />
        ) : (
          <Image 
            source={{ uri: 'https://img.icons8.com/color/48/000000/google-logo.png' }} 
            style={styles.icon} 
          />
        )}
        <Text style={styles.buttonText}>
          {carregando ? 'A autenticar...' : title}
        </Text>
      </TouchableOpacity>
      
      {mensagemErro ? (
        <Text style={styles.errorText}>{mensagemErro}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', alignItems: 'center' },
  button: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    width: '100%',
    paddingVertical: 15,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#CBD5E1', 
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  icon: { width: 24, height: 24, marginRight: 12 },
  buttonText: { color: '#334155', fontSize: 16, fontWeight: '600' },
  errorText: { color: '#E53E3E', fontSize: 12, marginTop: 8, textAlign: 'center', fontWeight: '600' }
});