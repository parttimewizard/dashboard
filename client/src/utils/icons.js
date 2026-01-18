import { 
  Server, HardDrive, Database, Globe, Network, 
  Cpu, Box, Cloud, Shield, Lock, LayoutGrid, 
  Terminal, Smartphone, Laptop, Wifi, Monitor,
  FileDigit, Folder, Layers, Activity, Router,
  Printer, Radio, Speaker, Webcam
} from 'lucide-react';

export const iconMap = {
  'server': Server,
  'hard-drive': HardDrive,
  'database': Database,
  'globe': Globe,
  'network': Network,
  'cpu': Cpu,
  'box': Box,
  'cloud': Cloud,
  'shield': Shield,
  'lock': Lock,
  'layout-grid': LayoutGrid,
  'terminal': Terminal,
  'smartphone': Smartphone,
  'laptop': Laptop,
  'wifi': Wifi,
  'monitor': Monitor,
  'file-digit': FileDigit,
  'folder': Folder,
  'layers': Layers,
  'activity': Activity,
  'router': Router,
  'printer': Printer,
  'radio': Radio,
  'speaker': Speaker,
  'webcam': Webcam
};

export const getIconComponent = (iconName) => {
  return iconMap[iconName] || Globe;
};
