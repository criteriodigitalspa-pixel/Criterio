import { Volume2, Usb, Keyboard, Camera, Cpu, Wifi, Bluetooth, MousePointer, Wrench, Cable } from 'lucide-react';

export const QA_ITEMS = [
    { key: 'sonido', label: 'Sonido / Audio', icon: <Volume2 className="w-4 h-4" /> },
    { key: 'usbs', label: 'Puertos USB', icon: <Usb className="w-4 h-4" /> },
    { key: 'teclado', label: 'Teclado', icon: <Keyboard className="w-4 h-4" /> },
    { key: 'camara', label: 'Cámara / Webcam', icon: <Camera className="w-4 h-4" /> },
    { key: 'drivers', label: 'Drivers / Controladores', icon: <Cpu className="w-4 h-4" /> },
    { key: 'wifi', label: 'Conexión WiFi', icon: <Wifi className="w-4 h-4" /> },
    { key: 'bluetooth', label: 'Bluetooth', icon: <Bluetooth className="w-4 h-4" /> },
    { key: 'mouse', label: 'Mouse / Touchpad', icon: <MousePointer className="w-4 h-4" /> },
    { key: 'tornillos', label: 'Tornillos Completos', icon: <Wrench className="w-4 h-4" /> },
    { key: 'entradas', label: 'Entradas (HDMI/Jack)', icon: <Cable className="w-4 h-4" /> }
];
