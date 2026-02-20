import { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '@/providers/ThemeProvider';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TypeSelector } from './TypeSelector';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { EVENT_TYPE_MAX_PARTICIPANTS, type EventType } from '@/types/event.types';
import type { Event } from '@/types/event.types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EventFormProps {
  initialEvent?: Event;
  onSubmit: (data: {
    title: string;
    type: EventType;
    eventDate: Date;
    location: string;
    maxParticipants: number;
    registrationOpensAt: Date;
  }) => Promise<void>;
  submitLabel: string;
  loading?: boolean;
}

type PickerTarget = 'eventDate' | 'eventTime' | 'opensDate' | 'opensTime' | null;

export function EventForm({ initialEvent, onSubmit, submitLabel, loading = false }: EventFormProps) {
  const { theme } = useTheme();

  const [type, setType] = useState<EventType | null>(initialEvent?.type ?? null);
  const [title, setTitle] = useState(initialEvent?.title ?? '');
  const [eventDate, setEventDate] = useState<Date | null>(initialEvent?.eventDate ?? null);
  const [eventTime, setEventTime] = useState<Date | null>(initialEvent?.eventDate ?? null);
  const [location, setLocation] = useState(initialEvent?.location ?? '');
  const [maxParticipants, setMaxParticipants] = useState(
    initialEvent?.maxParticipants?.toString() ?? '',
  );
  const [opensDate, setOpensDate] = useState<Date | null>(initialEvent?.registrationOpensAt ?? null);
  const [opensTime, setOpensTime] = useState<Date | null>(initialEvent?.registrationOpensAt ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Picker state
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const pickerMode = pickerTarget?.includes('Time') ? 'time' : 'date';
  const pickerValue = (() => {
    if (pickerTarget === 'eventDate') return eventDate ?? new Date();
    if (pickerTarget === 'eventTime') return eventTime ?? new Date();
    if (pickerTarget === 'opensDate') return opensDate ?? new Date();
    if (pickerTarget === 'opensTime') return opensTime ?? new Date();
    return new Date();
  })();

  // Auto-fill quando muda o tipo
  useEffect(() => {
    if (!type || initialEvent) return;

    const max = EVENT_TYPE_MAX_PARTICIPANTS[type];
    if (max > 0) {
      setMaxParticipants(String(max));
    } else {
      setMaxParticipants('');
    }

    if (type === 'sunday' && !title) {
      setTitle('Bate-bola Domingo');
    } else if (type === 'prime' && !title) {
      setTitle('Prime');
    }
  }, [type]);

  function handlePickerChange(_event: DateTimePickerEvent, selectedDate?: Date) {
    if (_event.type === 'dismissed') {
      setPickerTarget(null);
      return;
    }

    if (!selectedDate) {
      setPickerTarget(null);
      return;
    }

    switch (pickerTarget) {
      case 'eventDate':
        setEventDate(selectedDate);
        break;
      case 'eventTime':
        setEventTime(selectedDate);
        break;
      case 'opensDate':
        setOpensDate(selectedDate);
        break;
      case 'opensTime':
        setOpensTime(selectedDate);
        break;
    }

    setPickerTarget(null);
  }

  function mergeDateTime(date: Date, time: Date): Date {
    const merged = new Date(date);
    merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return merged;
  }

  async function handleSubmit() {
    const newErrors: Record<string, string> = {};

    if (!type) newErrors.type = 'Selecione o tipo do evento';
    if (!title || title.length < 3) newErrors.title = 'Título deve ter pelo menos 3 caracteres';
    if (!eventDate) newErrors.eventDate = 'Informe a data do evento';
    if (!eventTime) newErrors.eventTime = 'Informe o horário do evento';
    if (!location || location.length < 2) newErrors.location = 'Informe o local';
    if (!maxParticipants || Number(maxParticipants) < 1) newErrors.maxParticipants = 'Mínimo 1 participante';
    if (!opensDate) newErrors.opensDate = 'Informe quando a lista abre';
    if (!opensTime) newErrors.opensTime = 'Informe o horário de abertura';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    const finalEventDate = mergeDateTime(eventDate!, eventTime!);
    const finalOpensAt = mergeDateTime(opensDate!, opensTime!);

    if (finalOpensAt > finalEventDate) {
      Alert.alert('Erro', 'A lista deve abrir antes do evento');
      return;
    }

    await onSubmit({
      title,
      type: type!,
      eventDate: finalEventDate,
      location,
      maxParticipants: Number(maxParticipants),
      registrationOpensAt: finalOpensAt,
    });
  }

  const isFixedMax = type === 'wednesday' || type === 'sunday' || type === 'prime';

  function formatDateDisplay(date: Date | null): string {
    if (!date) return '';
    return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  }

  function formatTimeDisplay(date: Date | null): string {
    if (!date) return '';
    return format(date, 'HH:mm');
  }

  return (
    <View style={styles.container}>
      <Text variant="label" weight="medium" style={styles.label}>Tipo do evento</Text>
      <TypeSelector value={type} onChange={setType} />
      {errors.type && <Text variant="caption" color="error">{errors.type}</Text>}

      <Input
        label="Título"
        placeholder="Ex: Bate-bola Domingo #05"
        value={title}
        onChangeText={setTitle}
        error={errors.title}
      />

      {/* Data e horário do evento */}
      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text variant="label" weight="medium" style={styles.fieldLabel}>Data do evento</Text>
          <TouchableOpacity
            onPress={() => setPickerTarget('eventDate')}
            style={[styles.pickerButton, { backgroundColor: theme.background.elevated, borderColor: theme.background.border }]}
          >
            <Text variant="body" color={eventDate ? 'primary' : 'muted'}>
              {eventDate ? format(eventDate, 'dd/MM/yyyy') : 'Selecionar'}
            </Text>
          </TouchableOpacity>
          {errors.eventDate && <Text variant="caption" color="error">{errors.eventDate}</Text>}
        </View>
        <View style={styles.halfField}>
          <Text variant="label" weight="medium" style={styles.fieldLabel}>Horário</Text>
          <TouchableOpacity
            onPress={() => setPickerTarget('eventTime')}
            style={[styles.pickerButton, { backgroundColor: theme.background.elevated, borderColor: theme.background.border }]}
          >
            <Text variant="body" color={eventTime ? 'primary' : 'muted'}>
              {eventTime ? formatTimeDisplay(eventTime) : 'Selecionar'}
            </Text>
          </TouchableOpacity>
          {errors.eventTime && <Text variant="caption" color="error">{errors.eventTime}</Text>}
        </View>
      </View>

      {/* Preview inline da data/hora do evento */}
      {eventDate && eventTime && (
        <Text variant="caption" color="accent" style={styles.previewText}>
          📅 {formatDateDisplay(eventDate)} às {formatTimeDisplay(eventTime)}
        </Text>
      )}

      <Input
        label="Local"
        placeholder="Ex: Quadra Central"
        value={location}
        onChangeText={setLocation}
        error={errors.location}
      />

      <Input
        label="Máx. participantes"
        placeholder="Número de vagas"
        value={maxParticipants}
        onChangeText={setMaxParticipants}
        keyboardType="numeric"
        editable={!isFixedMax}
        error={errors.maxParticipants}
      />

      {/* Data e horário de abertura da lista */}
      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text variant="label" weight="medium" style={styles.fieldLabel}>Lista abre em</Text>
          <TouchableOpacity
            onPress={() => setPickerTarget('opensDate')}
            style={[styles.pickerButton, { backgroundColor: theme.background.elevated, borderColor: theme.background.border }]}
          >
            <Text variant="body" color={opensDate ? 'primary' : 'muted'}>
              {opensDate ? format(opensDate, 'dd/MM/yyyy') : 'Selecionar'}
            </Text>
          </TouchableOpacity>
          {errors.opensDate && <Text variant="caption" color="error">{errors.opensDate}</Text>}
        </View>
        <View style={styles.halfField}>
          <Text variant="label" weight="medium" style={styles.fieldLabel}>Horário abertura</Text>
          <TouchableOpacity
            onPress={() => setPickerTarget('opensTime')}
            style={[styles.pickerButton, { backgroundColor: theme.background.elevated, borderColor: theme.background.border }]}
          >
            <Text variant="body" color={opensTime ? 'primary' : 'muted'}>
              {opensTime ? formatTimeDisplay(opensTime) : 'Selecionar'}
            </Text>
          </TouchableOpacity>
          {errors.opensTime && <Text variant="caption" color="error">{errors.opensTime}</Text>}
        </View>
      </View>

      {/* Preview inline da data/hora de abertura */}
      {opensDate && opensTime && (
        <Text variant="caption" color="accent" style={styles.previewText}>
          🔓 Lista abre: {formatDateDisplay(opensDate)} às {formatTimeDisplay(opensTime)}
        </Text>
      )}

      <Button
        label={submitLabel}
        variant="primary"
        size="lg"
        fullWidth
        loading={loading}
        onPress={handleSubmit}
      />

      {/* Picker nativo (Android mostra como modal, iOS inline) */}
      {pickerTarget && (
        <DateTimePicker
          value={pickerValue}
          mode={pickerMode as 'date' | 'time'}
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handlePickerChange}
          minimumDate={pickerMode === 'date' ? new Date() : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing[3],
  },
  label: {
    marginBottom: -Spacing[2],
  },
  fieldLabel: {
    marginBottom: Spacing[1],
  },
  row: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  halfField: {
    flex: 1,
  },
  pickerButton: {
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  previewText: {
    marginTop: -Spacing[1],
    paddingHorizontal: Spacing[1],
  },
});
