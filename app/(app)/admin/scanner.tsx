import { useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';
import { scanPassport, confirmAttendance } from '@/services/registrationService';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { formatEventDate, formatEventTime } from '@/utils/dateUtils';
import type { Registration } from '@/types/registration.types';
import type { Event } from '@/types/event.types';

type ScanState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'success'; registration: Registration; event: Event }
  | { phase: 'already_attended'; registration: Registration; event: Event }
  | { phase: 'error'; message: string };

export default function ScannerScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>({ phase: 'idle' });
  const [confirming, setConfirming] = useState(false);

  const handleBarcode = useCallback(
    async (data: string) => {
      if (scanState.phase !== 'idle') return;

      setScanState({ phase: 'loading' });
      try {
        const result = await scanPassport(data);
        if (result.registration.status === 'attended') {
          setScanState({ phase: 'already_attended', ...result });
        } else {
          setScanState({ phase: 'success', ...result });
        }
      } catch (err: unknown) {
        setScanState({
          phase: 'error',
          message: err instanceof Error ? err.message : 'QR Code inválido',
        });
      }
    },
    [scanState.phase],
  );

  async function handleConfirm() {
    if (scanState.phase !== 'success' || !user) return;
    setConfirming(true);
    try {
      await confirmAttendance(scanState.registration.id, user.uid);
      Alert.alert('Presença confirmada!', `${scanState.registration.displayName} foi marcado como presente.`, [
        { text: 'OK', onPress: () => setScanState({ phase: 'idle' }) },
      ]);
    } catch (err: unknown) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Erro ao confirmar presença');
    } finally {
      setConfirming(false);
    }
  }

  function handleReset() {
    setScanState({ phase: 'idle' });
  }

  // Sem permissão
  if (!permission) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <LoadingSpinner fullScreen />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <View style={styles.permissionContainer}>
          <Text variant="h3" weight="bold" style={styles.permissionTitle}>
            Câmera necessária
          </Text>
          <Text variant="body" color="muted" style={styles.permissionDesc}>
            Precisamos acessar a câmera para ler os QR Codes dos passaportes.
          </Text>
          <Button
            label="Permitir câmera"
            variant="primary"
            size="lg"
            fullWidth
            onPress={requestPermission}
          />
          <Button
            label="Voltar"
            variant="ghost"
            size="md"
            onPress={() => router.back()}
            style={styles.backBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Câmera em tela cheia */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={
          scanState.phase === 'idle'
            ? ({ data }) => handleBarcode(data)
            : undefined
        }
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />

      {/* Overlay escuro nas bordas */}
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          {/* Área transparente central */}
          <View style={[styles.viewfinder, { borderColor: theme.accent.primary }]} />
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom} />
      </View>

      {/* Botão voltar */}
      <SafeAreaView style={styles.topBar} pointerEvents="box-none">
        <Button
          label="← Voltar"
          variant="ghost"
          size="sm"
          onPress={() => router.back()}
          style={styles.backOverlay}
        />
        <Text variant="h4" weight="bold" style={[styles.scannerTitle, { color: '#FFFFFF' }]}>
          Scanner QR
        </Text>
        <View style={styles.topBarRight} />
      </SafeAreaView>

      {/* Instrução */}
      {scanState.phase === 'idle' && (
        <View style={styles.hint}>
          <Text variant="body" style={{ color: '#FFFFFF' }}>
            Aponte para o QR Code do passaporte
          </Text>
        </View>
      )}

      {/* Loading */}
      {scanState.phase === 'loading' && (
        <View style={[styles.resultSheet, { backgroundColor: theme.background.elevated }]}>
          <LoadingSpinner />
          <Text variant="body" color="muted">Verificando passaporte...</Text>
        </View>
      )}

      {/* Resultado: sucesso */}
      {scanState.phase === 'success' && (
        <View style={[styles.resultSheet, { backgroundColor: theme.background.elevated }]}>
          <Badge variant="success" label="✓ Passaporte válido" />

          <Text variant="h4" weight="bold" style={styles.resultName}>
            {scanState.registration.displayName}
          </Text>

          <Text variant="body" color="secondary" style={styles.resultEvent}>
            {scanState.event.title}
          </Text>
          <Text variant="caption" color="muted">
            {formatEventDate(scanState.event.eventDate)} às {formatEventTime(scanState.event.eventDate)}
          </Text>
          <Text variant="caption" color="muted">
            Posição #{scanState.registration.position}
          </Text>

          <View style={styles.resultActions}>
            <Button
              label="Cancelar"
              variant="ghost"
              size="md"
              onPress={handleReset}
            />
            <Button
              label="Confirmar presença"
              variant="primary"
              size="md"
              loading={confirming}
              onPress={handleConfirm}
            />
          </View>
        </View>
      )}

      {/* Resultado: já confirmado */}
      {scanState.phase === 'already_attended' && (
        <View style={[styles.resultSheet, { backgroundColor: theme.background.elevated }]}>
          <Badge variant="warning" label="Já confirmado" />

          <Text variant="h4" weight="bold" style={styles.resultName}>
            {scanState.registration.displayName}
          </Text>
          <Text variant="body" color="muted">
            Presença já foi registrada anteriormente.
          </Text>

          <Button
            label="Escanear outro"
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleReset}
            style={styles.singleAction}
          />
        </View>
      )}

      {/* Resultado: erro */}
      {scanState.phase === 'error' && (
        <View style={[styles.resultSheet, { backgroundColor: theme.background.elevated }]}>
          <Badge variant="error" label="QR inválido" />
          <Text variant="body" color="muted" style={styles.resultName}>
            {scanState.message}
          </Text>
          <Button
            label="Tentar novamente"
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleReset}
            style={styles.singleAction}
          />
        </View>
      )}
    </View>
  );
}

const VIEWFINDER_SIZE = 260;
const OVERLAY_COLOR = 'rgba(0,0,0,0.6)';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Overlay escuro
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  overlayTop: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
  },
  overlayMiddle: {
    height: VIEWFINDER_SIZE,
    flexDirection: 'row',
  },
  overlaySide: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
  },
  overlayBottom: {
    flex: 1.5,
    backgroundColor: OVERLAY_COLOR,
  },
  viewfinder: {
    width: VIEWFINDER_SIZE,
    height: VIEWFINDER_SIZE,
    borderWidth: 2,
    borderRadius: BorderRadius.md,
  },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[2],
    paddingTop: Spacing[2],
  },
  backOverlay: {
    // Tint branco visível sobre câmera
  },
  scannerTitle: {
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  topBarRight: {
    width: 70, // balance do botão voltar
  },

  // Instrução
  hint: {
    position: 'absolute',
    bottom: '36%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  // Result sheet
  resultSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing[5],
    paddingBottom: Spacing[8],
    gap: Spacing[3],
    alignItems: 'flex-start',
  },
  resultName: {
    marginTop: Spacing[1],
  },
  resultEvent: {
    marginTop: Spacing[1],
  },
  resultActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing[2],
    alignSelf: 'stretch',
    marginTop: Spacing[2],
  },
  singleAction: {
    marginTop: Spacing[2],
    alignSelf: 'stretch',
  },

  // Permissão
  permissionContainer: {
    flex: 1,
    paddingHorizontal: Spacing[6],
    justifyContent: 'center',
    gap: Spacing[4],
  },
  permissionTitle: {
    textAlign: 'center',
  },
  permissionDesc: {
    textAlign: 'center',
  },
  backBtn: {
    alignSelf: 'center',
  },
});
