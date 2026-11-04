import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { MsIcon, MsIconDefinition } from 'material-symbols-react-native';
import {
  msFavorite,
  msFavoriteFill,
  msNotifications,
  msNotificationsFill,
  msArrowBack,
  msChevronRight,
  msVitalSigns,
  msMonitorHeart,
  msMedication,
  msMedicationFill,
  msPill,
  msEmergency,
  msCrisisAlert,
  msSos,
  msGroups,
  msCheck,
  msCheckCircle,
  msCheckCircleFill,
  msClose,
  msCancel,
  msAdd,
  msDelete,
  msLocationOn,
  msMyLocation,
  msShield,
  msSecurity,
  msWifi,
  msBolt,
  msDirectionsWalk,
  msWaterDrop,
  msCall,
  msVolumeUp,
  msSchedule,
  msTune,
  msSliders,
  msVisibility,
  msVisibilityOff,
  msMail,
  msLock,
  msPhotoCamera,
  msHelp,
  msEdit,
  msPlayArrow,
  msPause,
  msChat,
  msStethoscope,
  msPsychology,
  msWbSunny,
  msDarkMode,
  msVaccines,
  msAssignment,
  msPerson,
  msPersonAdd,
  msLocalHospital,
  msSmartphone,
  msBatteryFull,
  msBatteryAlert,
  msBatteryLow,
  msWarning,
  msInfo,
  msSync,
  msDragIndicator,
  msDragHandle,
  msKeyboardArrowDown,
  msKeyboardArrowUp,
  msHourglassTop,
  msShare,
  msHistory,
  msSwapVert,
} from '@material-symbols-react-native/rounded-400';

const ICON_MAP: Record<string, MsIconDefinition> = {
  // Brand & Core
  favorite: msFavorite,
  favoriteFill: msFavoriteFill,
  heart: msFavorite,
  heartFill: msFavoriteFill,
  notifications: msNotifications,
  notificationsFill: msNotificationsFill,
  bell: msNotifications,
  arrow_back: msArrowBack,
  back: msArrowBack,
  chevron_right: msChevronRight,
  keyboard_arrow_down: msKeyboardArrowDown,
  keyboard_arrow_up: msKeyboardArrowUp,
  chevron_down: msKeyboardArrowDown,
  chevron_up: msKeyboardArrowUp,

  // Health & Monitoring
  vital_signs: msVitalSigns,
  activity: msVitalSigns,
  monitor_heart: msMonitorHeart,
  medication: msMedication,
  medicationFill: msMedicationFill,
  pill: msMedication,
  emergency: msEmergency,
  crisis_alert: msCrisisAlert,
  siren: msEmergency,
  sos: msSos,
  hospital: msLocalHospital,

  // Social & Network
  groups: msGroups,
  users: msGroups,
  person: msPerson,
  user: msPerson,
  person_add: msPersonAdd,
  user_plus: msPersonAdd,

  // Actions & Feedback
  check: msCheck,
  check_circle: msCheckCircle,
  check_circle_fill: msCheckCircleFill,
  close: msClose,
  cancel: msCancel,
  x: msClose,
  add: msAdd,
  plus: msAdd,
  delete: msDelete,
  trash: msDelete,
  edit: msEdit,
  play: msPlayArrow,
  pause: msPause,
  drag_indicator: msDragIndicator,
  drag_handle: msDragHandle,
  reorder: msDragIndicator,
  swap_vert: msSwapVert,
  share: msShare,
  history: msHistory,
  hourglass_top: msHourglassTop,
  hourglass: msHourglassTop,

  // Sensors & Telemetry
  location: msLocationOn,
  location_on: msLocationOn,
  my_location: msMyLocation,
  crosshair: msMyLocation,
  shield: msShield,
  shield_check: msShield,
  verified_user: msShield,
  shield_alert: msSecurity,
  security: msSecurity,
  wifi: msWifi,
  bolt: msBolt,
  zap: msBolt,
  walk: msDirectionsWalk,
  directions_walk: msDirectionsWalk,
  footprints: msDirectionsWalk,
  water_drop: msWaterDrop,
  droplet: msWaterDrop,
  droplets: msWaterDrop,
  battery_full: msBatteryFull,
  battery_alert: msBatteryAlert,
  battery_low: msBatteryLow,
  smartphone: msSmartphone,
  cellphone: msSmartphone,
  mobile: msSmartphone,
  phone_android: msSmartphone,
  warning: msWarning,
  alert: msWarning,
  info: msInfo,
  sync: msSync,

  // Communication & Utils
  call: msCall,
  phone: msCall,
  phone_call: msCall,
  volume_up: msVolumeUp,
  volume: msVolumeUp,
  schedule: msSchedule,
  clock: msSchedule,
  calendar_today: msSchedule,
  calendar: msSchedule,
  tune: msTune,
  sliders: msTune,
  visibility: msVisibility,
  visibility_off: msVisibilityOff,
  eye: msVisibility,
  eye_off: msVisibilityOff,
  mail: msMail,
  lock: msLock,
  camera: msPhotoCamera,
  photo_camera: msPhotoCamera,
  help: msHelp,
  help_outline: msHelp,
  chat: msChat,
  message: msChat,
  stethoscope: msStethoscope,
  psychology: msPsychology,
  brain: msPsychology,
  sunny: msWbSunny,
  sun: msWbSunny,
  dark_mode: msDarkMode,
  moon: msDarkMode,
  vaccines: msVaccines,
  syringe: msVaccines,
  assignment: msAssignment,
  clipboard: msAssignment,
  description: msAssignment,
  file_text: msAssignment,
};

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Componente unificado de ícones do SeniorInsight baseado no Google Material Symbols (Rounded)
 */
export default function Icon({
  name,
  size = 20,
  color = '#072369',
  style,
}: IconProps) {
  const iconDefinition = ICON_MAP[name] || msHelp;

  if (style) {
    return (
      <View style={[{ justifyContent: 'center', alignItems: 'center' }, style]}>
        <MsIcon
          icon={iconDefinition}
          size={size}
          color={color}
        />
      </View>
    );
  }

  return (
    <MsIcon
      icon={iconDefinition}
      size={size}
      color={color}
    />
  );
}
