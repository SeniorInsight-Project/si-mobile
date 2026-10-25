import React from 'react';
import { View } from 'react-native';
import { MsIcon } from 'material-symbols-react-native';
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
  msLocalHospital,
  msSmartphone,
  msBatteryFull,
  msBatteryAlert,
  msBatteryLow,
  msWarning,
  msInfo,
  msSync,
} from '@material-symbols-react-native/rounded-400';

const ICON_MAP = {
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
  person_add: msPerson,
  user_plus: msPerson,

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

/**
 * Componente unificado de ícones do SeniorInsight baseado no Google Material Symbols (Rounded)
 */
export default function Icon({
  name,
  size = 20,
  color = '#072369',
  style,
}) {
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
