export interface CommercialPreset {
  key: string;
  name: string;
  description: string;
  moduleKeys: string[];
}

export const COMMERCIAL_PRESETS: CommercialPreset[] = [
  {
    key: 'basic',
    name: 'Basic',
    description: 'Pachetul esențial pentru un punct de vânzare standard: POS, Produse, Istoric Vânzări și Adăugare Rapidă.',
    moduleKeys: ['pos', 'products', 'sales_history', 'quick_add']
  },
  {
    key: 'standard',
    name: 'Standard',
    description: 'Pachetul recomandat pentru magazine în creștere: functionalități complete de stoc (recepții, transferuri, pierderi, audit) și rapoarte comerciale.',
    moduleKeys: [
      'pos',
      'products',
      'sales_history',
      'quick_add',
      'reception',
      'transfer',
      'loss_reporting',
      'waste_audit',
      'commercial_reports',
      'store_settings'
    ]
  },
  {
    key: 'premium',
    name: 'Premium',
    description: 'Pachetul complet pentru afaceri competitive: include asistentul AI, retururi avansate și rapoarte detaliate de TVA.',
    moduleKeys: [
      'pos',
      'products',
      'sales_history',
      'quick_add',
      'reception',
      'transfer',
      'loss_reporting',
      'waste_audit',
      'commercial_reports',
      'store_settings',
      'ai_consultant',
      'advanced_returns',
      'vat_reports'
    ]
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    description: 'Pachetul maxim de reziliență și fiscalitate: include modulele Fiscal Bridge și Sincronizare Offline (când sunt disponibile).',
    moduleKeys: [
      'pos',
      'products',
      'sales_history',
      'quick_add',
      'reception',
      'transfer',
      'loss_reporting',
      'waste_audit',
      'commercial_reports',
      'store_settings',
      'ai_consultant',
      'advanced_returns',
      'vat_reports',
      'fiscal_bridge',
      'offline_sync'
    ]
  }
];
