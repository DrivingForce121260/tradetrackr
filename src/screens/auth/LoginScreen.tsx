/**
 * Login Screen
 * Styled like the old mobile app with password recovery
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  const signIn = useAuthStore((state) => state.signInWithEmailPassword);
  const resetPassword = useAuthStore((state) => state.resetPassword);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Fehler', 'Bitte E-Mail und Passwort eingeben');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      // Navigation happens automatically via RootNavigator
    } catch (error: any) {
      Alert.alert('Anmeldefehler', error.message || 'Anmeldung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const emailToUse = forgotPasswordEmail.trim() || email.trim();
    
    if (!emailToUse) {
      Alert.alert('Fehler', 'Bitte E-Mail eingeben');
      return;
    }

    setForgotPasswordLoading(true);
    try {
      await resetPassword(emailToUse);
      Alert.alert(
        'E-Mail gesendet',
        'Passwort-Reset-Link wurde an Ihre E-Mail gesendet ✓',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowForgotPassword(false);
              setForgotPasswordEmail('');
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Fehler', error.message || 'Passwort-Reset fehlgeschlagen');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* AppBar */}
      <View style={styles.appBar}>
        <Text style={styles.appBarTitle}>LOGIN</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Login Card Container */}
          <View style={styles.cardContainer}>
            <View style={styles.card}>
              {/* Logo */}
              <View style={styles.logoContainer}>
                <Image
                  source={require('../../../assets/TTroundLogo.jpg')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>

              {/* Email Field */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Benutzername"
                  placeholderTextColor="#8E8E93"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus={true}
                />
              </View>

              {/* Password Field */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Passpin"
                  placeholderTextColor="#8E8E93"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeIconText}>
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>LogIn</Text>
                    <Text style={styles.loginButtonIcon}>→</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Register Button */}
              <TouchableOpacity
                style={styles.registerButton}
                onPress={() => {
                  // Navigate to register if available, otherwise show alert
                  Alert.alert('Registrierung', 'Bitte kontaktieren Sie Ihren Administrator für eine Registrierung.');
                }}
              >
                <Text style={styles.registerButtonText}>Registrieren</Text>
                <Text style={styles.registerButtonIcon}>+</Text>
              </TouchableOpacity>

              {/* Forgot Password Button */}
              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={() => {
                  setForgotPasswordEmail(email);
                  setShowForgotPassword(true);
                }}
              >
                <Text style={styles.forgotPasswordText}>Passwort vergessen?</Text>
                <Text style={styles.forgotPasswordIcon}>?</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotPassword}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowForgotPassword(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Passwort vergessen?</Text>
            <Text style={styles.modalDescription}>
              Geben Sie Ihre E-Mail-Adresse ein, um einen Link zum Zurücksetzen des Passworts zu erhalten.
            </Text>

            <View style={styles.modalInputContainer}>
              <TextInput
                style={styles.modalInput}
                value={forgotPasswordEmail}
                onChangeText={setForgotPasswordEmail}
                placeholder="E-Mail"
                placeholderTextColor="#8E8E93"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordEmail('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Abbrechen</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSendButton}
                onPress={handleForgotPassword}
                disabled={forgotPasswordLoading || !forgotPasswordEmail.trim()}
              >
                {forgotPasswordLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSendButtonText}>Senden</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  appBar: {
    backgroundColor: '#058bc0',
    paddingTop: Platform.OS === 'android' ? 0 : 44,
    paddingBottom: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  appBarTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  cardContainer: {
    width: '90%',
    maxWidth: 500,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    padding: 32,
    shadowColor: '#058bc0',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  logoContainer: {
    width: 200,
    height: 120,
    alignSelf: 'center',
    marginBottom: 32,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F0F7FF',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  inputContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderColor: 'rgba(5, 139, 192, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 15,
    padding: 4,
  },
  eyeIconText: {
    fontSize: 20,
  },
  loginButton: {
    backgroundColor: '#058bc0',
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  loginButtonIcon: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  registerButton: {
    backgroundColor: '#FFFFFF',
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#058bc0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  registerButtonText: {
    color: '#058bc0',
    fontSize: 16,
    marginRight: 8,
  },
  registerButtonIcon: {
    color: '#058bc0',
    fontSize: 20,
  },
  forgotPasswordButton: {
    backgroundColor: '#FFFFFF',
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#058bc0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    opacity: 0.4,
  },
  forgotPasswordText: {
    color: '#058bc0',
    fontSize: 16,
    marginRight: 8,
  },
  forgotPasswordIcon: {
    color: '#058bc0',
    fontSize: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 20,
    lineHeight: 22,
  },
  modalInputContainer: {
    marginBottom: 20,
  },
  modalInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  modalCancelButtonText: {
    color: '#058bc0',
    fontSize: 16,
  },
  modalSendButton: {
    backgroundColor: '#058bc0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  modalSendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
