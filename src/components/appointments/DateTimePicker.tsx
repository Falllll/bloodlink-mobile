import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppText } from '@/components/ui/Text';
import { colors, radii, spacing, surfaces } from '@/theme/tokens';

// Opening hours SHOWN to the donor. Operational numbers, not medical ones, and NOT
// validated by the backend -- the backend only demands a time in the future.
const OPENING_HOUR = 8;
const CLOSING_HOUR = 16;
const SLOT_MINUTES = 30;
const DAYS_AHEAD = 14;

// These are clock times, not availability. Nothing here is ever marked as taken: the client
// does not know capacity and must not pretend to. The server is the only judge of a booking.

export interface DateTimePickerProps {
  value: string | null;                 // ISO-8601 (UTC) of the chosen time
  onChange: (iso: string | null) => void;
  disabled?: boolean;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/** Clock times for one day, in the device zone, dropping any that are already past. */
function timesFor(day: Date, now: Date): Date[] {
  const out: Date[] = [];
  for (let minutes = OPENING_HOUR * 60; minutes < CLOSING_HOUR * 60; minutes += SLOT_MINUTES) {
    const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes);
    if (at.getTime() > now.getTime()) out.push(at);
  }
  return out;
}

export function DateTimePicker({ value, onChange, disabled = false }: DateTimePickerProps) {
  const now = useMemo(() => new Date(), []);
  const days = useMemo(() => {
    const today = startOfDay(now);
    return Array.from(
      { length: DAYS_AHEAD },
      (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + i),
    ).filter((day) => timesFor(day, now).length > 0);
  }, [now]);

  const [day, setDay] = useState<Date | null>(value ? startOfDay(new Date(value)) : (days[0] ?? null));
  const times = day ? timesFor(day, now) : [];

  function pickDay(next: Date) {
    setDay(next);
    if (value && !sameDay(new Date(value), next)) onChange(null);
  }

  return (
    <View style={{ gap: spacing.md }} testID="schedule-picker">
      <AppText variant="label" tone="muted">
        {`Jam operasional ${String(OPENING_HOUR).padStart(2, '0')}.00–${String(CLOSING_HOUR).padStart(2, '0')}.00, waktu perangkat`}
      </AppText>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        {days.map((d) => (
          <Choice
            key={d.toISOString()}
            label={d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
            selected={day !== null && sameDay(d, day)}
            disabled={disabled}
            onPress={() => pickDay(d)}
          />
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {times.map((t) => (
          <Choice
            key={t.toISOString()}
            label={t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            selected={value !== null && new Date(value).getTime() === t.getTime()}
            disabled={disabled}
            onPress={() => onChange(t.toISOString())}
          />
        ))}
      </View>
    </View>
  );
}

function Choice({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={{
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: selected ? colors.brand : surfaces.flat.borderColor,
        backgroundColor: selected ? colors.secondary : surfaces.flat.background,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <AppText variant="label" tone={selected ? 'strong' : 'soft'}>{label}</AppText>
    </Pressable>
  );
}
