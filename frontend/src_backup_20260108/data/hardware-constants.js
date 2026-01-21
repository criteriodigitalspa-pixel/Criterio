export const PROCESSORS = {
    "Intel Core i3": Array.from({ length: 14 }, (_, i) => `${i + 1}ª Gen`),
    "Intel Core i5": Array.from({ length: 14 }, (_, i) => `${i + 1}ª Gen`),
    "Intel Core i7": Array.from({ length: 14 }, (_, i) => `${i + 1}ª Gen`),
    "Intel Core i9": Array.from({ length: 6 }, (_, i) => `${i + 9}ª Gen`),
    "Intel Celeron": ["N Series", "J Series", "G Series", "Dual-Core", "Quad-Core"],
    "Intel Pentium": ["Gold", "Silver", "N Series", "J Series", "Dual-Core", "Quad-Core"],
    "Intel Atom": ["x5", "x7", "Z Series"],
    "Intel Xeon": ["E3", "E5", "W Series", "Mobile"],
    "AMD Ryzen 3": ["Series 3000", "Series 4000", "Series 5000", "Series 7000"],
    "AMD Ryzen 5": ["Series 3000", "Series 4000", "Series 5000", "Series 6000", "Series 7000"],
    "AMD Ryzen 7": ["Series 3000", "Series 4000", "Series 5000", "Series 6000", "Series 7000"],
    "AMD Ryzen 9": ["Series 5000", "Series 6000", "Series 7000"],
    "AMD Athlon": ["Gold", "Silver", "3000 Series", "X4"],
    "AMD A-Series": ["A4", "A6", "A8", "A10", "A12"],
    "Apple Silicon": ["M1", "M1 Pro/Max", "M2", "M2 Pro/Max", "M3", "M3 Pro/Max"]
};

export const GPUS = {
    "NVIDIA GeForce": [
        "GT 710M", "GT 720M", "GT 730M", "GT 740M", "GT 750M",
        "820M", "830M", "840M", "GTX 850M", "GTX 860M", "GTX 870M", "GTX 880M",
        "920M", "920MX", "930M", "930MX", "940M", "940MX", "GTX 950M", "GTX 960M", "GTX 965M", "GTX 970M", "GTX 980M",
        "MX110", "MX130", "MX150", "MX230", "MX250", "MX330", "MX350", "MX450", "MX550", "MX570",
        "GTX 1050", "GTX 1050 Ti", "GTX 1060", "GTX 1070", "GTX 1080",
        "GTX 1650", "GTX 1650 Ti", "GTX 1660 Ti",
        "RTX 2050", "RTX 2060", "RTX 2070", "RTX 2080",
        "RTX 3050", "RTX 3050 Ti", "RTX 3060", "RTX 3070", "RTX 3070 Ti", "RTX 3080", "RTX 3080 Ti",
        "RTX 4050", "RTX 4060", "RTX 4070", "RTX 4080", "RTX 4090"
    ],
    "NVIDIA Quadro/Pro": [
        // Legacy (Kepler/Maxwell)
        "K620M", "K1100M", "K2100M", "K2200M",
        "M500M", "M600M", "M1000M", "M1200", "M2000M", "M2200", "M3000M", "M4000M", "M5000M", "M5500",
        // Pascal
        "P500", "P520", "P600", "P620", "P1000", "P2000", "P3000", "P3200", "P4000", "P4200", "P5000", "P5200",
        // Turing (T Series & RTX)
        "T500", "T550", "T600", "T1000", "T1200", "T2000",
        "Quadro RTX 3000", "Quadro RTX 4000", "Quadro RTX 5000", "Quadro RTX 6000",
        // Ampere (A Series & RTX)
        "RTX A500", "RTX A1000", "RTX A2000", "RTX A3000", "RTX A4000", "RTX A4500", "RTX A5000", "RTX A5500",
        // Ada Lovelace
        "RTX 500 Ada", "RTX 1000 Ada", "RTX 2000 Ada", "RTX 3000 Ada", "RTX 3500 Ada", "RTX 4000 Ada", "RTX 5000 Ada"
    ],
    "Intel": [
        "Gráficos Integrados Intel UHD", "Gráficos Integrados Intel Iris", "Gráficos Integrados Intel HD",
        "HD Graphics 4000", "HD Graphics 4400", "HD Graphics 4600",
        "HD Graphics 520", "HD Graphics 530", "HD Graphics 620", "HD Graphics 630",
        "UHD Graphics 600", "UHD Graphics 620", "UHD Graphics 630",
        "Iris Plus 640", "Iris Plus 650", "Iris Plus G4", "Iris Plus G7",
        "Iris Xe", "Iris Xe Max",
        "Arc A350M", "Arc A370M", "Arc A530M", "Arc A550M", "Arc A570M", "Arc A730M", "Arc A770M"
    ],
    "AMD Radeon": [
        "Gráficos Integrados AMD Radeon", "Gráficos Integrados AMD Vega",
        "R5 M330", "R5 M430", "R7 M260", "R7 M360", "R7 M440", "R7 M460",
        "520", "530", "540", "540X",
        "RX 550", "RX 560", "RX 560X", "RX 570", "RX 580",
        "RX 5300M", "RX 5500M", "RX 5600M", "RX 5700M",
        "RX 6300M", "RX 6400M", "RX 6500M", "RX 6600S", "RX 6600M", "RX 6700S", "RX 6700M", "RX 6800S", "RX 6800M",
        "RX 7600S", "RX 7600M", "RX 7700S",
        "Integrated Vega 3", "Integrated Vega 6", "Integrated Vega 8", "Integrated Vega 10", "Integrated Radeon (Ryzen 6000/7000)"
    ],
    "Apple": ["M1 (7-core)", "M1 (8-core)", "M1 Pro", "M1 Max", "M1 Ultra", "M2", "M2 Pro", "M2 Max", "M2 Ultra", "M3", "M3 Pro", "M3 Max"],
    "Otros": ["Otro Modelo..."]
};

export const RAM_OPTIONS = [
    "4GB", "8GB", "12GB", "16GB", "20GB", "24GB", "32GB", "64GB", "128GB"
];

export const DISK_OPTIONS = [
    "64GB SSD", "128GB SSD", "240GB SSD", "256GB SSD", "480GB SSD", "500GB SSD", "512GB SSD", "1TB SSD", "2TB SSD", "500GB HDD", "1TB HDD", "2TB HDD"
];
