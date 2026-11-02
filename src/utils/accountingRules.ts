import { OFFICIAL_ACCOUNTS } from './formatters';

const LEARNED_PATTERNS_STORAGE_KEY = 'ua_learned_accounting_patterns_v1';

// Rules dictionary with keywords for each official account
const ACCOUNT_RULES: Array<{
  code: string;
  keywords: string[];
  areaHints?: string[];
  reason: string;
}> = [
  {
    code: '1203102', // EQUIPOS COMPUTACIONALES (Inversión)
    keywords: [
      'notebook',
      'laptop',
      'computador',
      'computadora',
      'workstation',
      'pc',
      'torre',
      'servidor',
      'pantalla',
      'monitor',
      'disco duro',
      'disco',
      'ssd',
      'memoria ram',
      'ram',
      'tótem',
      'totem',
      'all in one',
      'estación de trabajo',
      'estacion de trabajo',
      'macbook',
      'imac',
      'procesador',
      'cpu',
    ],
    areaHints: ['Usuarios', 'Laboratorios'],
    reason: 'Identificado como equipamiento computacional de usuario o servidor.',
  },
  {
    code: '1203104', // EQUIPOS DE COMUNICACIONES (Inversión)
    keywords: [
      'switch',
      'access point',
      'ap ',
      'wifi',
      'wi-fi',
      'router',
      'enrutador',
      'cctv',
      'cámara',
      'camara',
      'nvr',
      'dvr',
      'antivandálica',
      'patch panel',
      'transceptor',
      'transceiver',
      'firewall',
      'fortinet',
      'cisco',
      'aruba',
      'ubiquiti',
      'fibra óptica',
      'fibra optica',
    ],
    areaHints: ['Redes', 'CCTV'],
    reason: 'Identificado como infraestructura de comunicaciones, red de datos o CCTV.',
  },
  {
    code: '1203101', // MAQUINAS Y EQUIPOS (Inversión)
    keywords: [
      'taladro',
      'herramienta',
      'multímetro',
      'multimetro',
      'proyector',
      'láser',
      'laser',
      'pantalla interactiva',
      'telón',
      'telon',
      'audio',
      'micrófono',
      'microfono',
      'parlante',
      'dante',
      'ptz',
      'mesa mezclas',
      'consola mezcladora',
      'consola audio',
      'streaming',
      'cámara robótica',
      'camara robotica',
      'amplificador',
      'bafle',
      'shure',
      'máquina',
      'maquina',
      'equipo audiovisual',
    ],
    areaHints: ['Salas de Clases', 'Salones de Eventos'],
    reason: 'Identificado como máquinas, herramientas o equipamiento audiovisual.',
  },
  {
    code: '1204101', // MUEBLES Y UTILES (Inversión)
    keywords: [
      'rack',
      'gabinete',
      'mural',
      'bandeja',
      'organizador',
      'mueble',
      'escritorio',
      'silla',
    ],
    areaHints: ['Laboratorios', 'Redes'],
    reason: 'Identificado como mobiliario técnico o racks de soporte.',
  },
  {
    code: '1304101', // LICENCIAS (Inversión)
    keywords: [
      'licencia',
      'licenciamiento',
      'software',
      'virtualización',
      'virtualizacion',
      'vmware',
      'antivirus',
      'matlab',
      'autocad',
      'windows',
      'microsoft',
      'perpetua',
    ],
    reason: 'Identificado como licencias y software capitalizable institucional.',
  },
  {
    code: '4110200', // HORAS EXTRAS (Gastos en Personal)
    keywords: [
      'horas extras',
      'hora extra',
      'sobretiempo',
      'jornada extraordinaria',
      'turno nocturno',
    ],
    reason: 'Identificado como compensación de horas extras o sobretiempo de personal.',
  },
  {
    code: '4110320', // MOVILIZACION (Gastos)
    keywords: [
      'movilización',
      'movilizacion',
      'flete',
      'traslado',
      'transporte técnico',
      'transporte tecnico',
      'combustible',
      'peaje',
    ],
    reason: 'Identificado como gastos de traslado local o movilización técnica.',
  },
  {
    code: '4110000', // VIATICOS (Gastos)
    keywords: [
      'viático',
      'viatico',
      'viáticos',
      'viaticos',
      'alojamiento',
      'comisión de servicio',
      'comision de servicio',
    ],
    reason: 'Identificado como viáticos para salidas o comisiones técnicas inter-sedes.',
  },
  {
    code: '4140100', // MATERIAL OFICINA (Operación)
    keywords: [
      'material oficina',
      'papelería',
      'papeleria',
      'insumo',
      'etiquetado',
      'rotuladora',
      'velcro',
      'cable',
      'bobina',
      'utp',
      'cat6a',
      'cat6',
      'patch cord',
      'conector',
      'rj45',
      'tóner',
      'toner',
      'cintas',
    ],
    reason: 'Identificado como insumos, material de oficina o cableado consumible.',
  },
  {
    code: '4140200', // ARRIENDOS (Operación)
    keywords: [
      'arriendo',
      'arrendamiento',
      'alquiler',
      'renting',
      'leasing operativo',
      'leasing',
    ],
    reason: 'Identificado como arriendo de equipamiento o servicios en régimen de alquiler.',
  },
  {
    code: '4140500', // SERV. INFORMÁTICO (Operación)
    keywords: [
      'servicio informático',
      'servicios informáticos',
      'servicio informatico',
      'servicios informaticos',
      'contrato externo',
      'enlace',
      'mpls',
      'telecomunicaciones',
      'instalación certificada',
      'instalacion certificada',
      'tendido subterráneo',
      'tendido subterraneo',
      'consultoría',
      'consultoria',
      'desarrollo',
      'soporte externo',
      'cloud',
      'saas',
    ],
    areaHints: ['Salas Especiales', 'Redes'],
    reason: 'Identificado como contratos de servicios informáticos y telecomunicaciones.',
  },
  {
    code: '4150400', // CORREO Y OTROS (Gastos)
    keywords: [
      'correo',
      'encomienda',
      'courier',
      'chilexpress',
      'starken',
      'envío',
      'envio',
    ],
    reason: 'Identificado como gastos de courier o correspondencia técnica.',
  },
  {
    code: '4150500', // PASAJES Y OTROS (Gastos)
    keywords: [
      'pasaje',
      'pasajes',
      'vuelo',
      'bus',
      'boleto',
    ],
    reason: 'Identificado como pasajes para traslados inter-sedes del personal técnico.',
  },
  {
    code: '4150600', // GASTOS VARIOS (Gastos)
    keywords: [
      'gastos varios',
      'imprevistos',
      'ferretería',
      'ferreteria',
      'menores',
    ],
    reason: 'Identificado como gastos varios u operaciones menores de taller.',
  },
  {
    code: '4160100', // REPARACIONES Y MANTENCIONES (Operación)
    keywords: [
      'mantención',
      'mantencion',
      'mantenimiento',
      'soporte preventivo',
      'soporte correctivo',
      'preventivo',
      'preventiva',
      'correctivo',
      'correctiva',
      'contrato anual de mantención',
      'servicio técnico',
      'servicio tecnico',
      'calibración',
      'calibracion',
      'reparación',
      'reparacion',
      'climatización',
      'climatizacion',
      'in-row',
      'banco de baterías',
      'banco de baterias',
      'anclaje',
    ],
    reason: 'Identificado como servicio recurrente de reparaciones o mantención técnica.',
  },
];

// Retrieve learned patterns from localStorage
export function getLearnedPatterns(): Record<string, string> {
  try {
    const data = localStorage.getItem(LEARNED_PATTERNS_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
}

// Save a learned pattern when Paola assigns an account
export function saveLearnedPattern(description: string, accountCode: string) {
  try {
    const patterns = getLearnedPatterns();
    // Normalize key
    const normalized = description.toLowerCase().trim();
    if (normalized.length >= 3) {
      patterns[normalized] = accountCode;
      localStorage.setItem(LEARNED_PATTERNS_STORAGE_KEY, JSON.stringify(patterns));
    }
  } catch (e) {
    console.warn('Could not save learned pattern:', e);
  }
}

export interface DeductionResult {
  accountCode: string;
  accountName: string;
  accountType: 'Activo' | 'Gasto';
  confidence: number; // 0 to 100
  reason: string;
  source: 'memory' | 'rule' | 'area_heuristic';
  isAmbiguous: boolean; // if true, needs Paola's confirmation
}

// Deduce account based on description, learned memory, and domain rules
export function deduceAccountForItem(description: string, area?: string): DeductionResult | null {
  if (!description || description.trim().length === 0) return null;

  const descLower = description.toLowerCase().trim();

  // 1. Check exact learned memory from Paola's past actions
  const learned = getLearnedPatterns();
  if (learned[descLower]) {
    const code = learned[descLower];
    const acc = OFFICIAL_ACCOUNTS.find((a) => a.code === code);
    if (acc) {
      return {
        accountCode: acc.code,
        accountName: acc.name,
        accountType: acc.type,
        confidence: 98,
        reason: 'Asignación aprendida de decisiones previas de Paola.',
        source: 'memory',
        isAmbiguous: false,
      };
    }
  }

  // Check partial learned match
  for (const [savedDesc, code] of Object.entries(learned)) {
    if (descLower.includes(savedDesc) || savedDesc.includes(descLower)) {
      const acc = OFFICIAL_ACCOUNTS.find((a) => a.code === code);
      if (acc) {
        return {
          accountCode: acc.code,
          accountName: acc.name,
          accountType: acc.type,
          confidence: 92,
          reason: `Patrón similar a "${savedDesc}" previamente aprobado por Paola.`,
          source: 'memory',
          isAmbiguous: false,
        };
      }
    }
  }

  // 2. Evaluate rule matches
  const matches: Array<{
    code: string;
    score: number;
    matchedKeywords: string[];
    reason: string;
  }> = [];

  ACCOUNT_RULES.forEach((rule) => {
    let score = 0;
    const matched: string[] = [];

    rule.keywords.forEach((kw) => {
      if (descLower.includes(kw.toLowerCase())) {
        score += kw.length > 5 ? 30 : 20;
        matched.push(kw);
      }
    });

    if (rule.areaHints && area && rule.areaHints.includes(area)) {
      score += 15;
    }

    if (score > 0) {
      matches.push({
        code: rule.code,
        score,
        matchedKeywords: matched,
        reason: rule.reason,
      });
    }
  });

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  if (matches.length === 0) {
    // No match found -> ambiguous / unclassified
    return {
      accountCode: '',
      accountName: 'Sin Deducir',
      accountType: 'Gasto',
      confidence: 10,
      reason: 'No se encontraron coincidencias claras con el catálogo institucional.',
      source: 'rule',
      isAmbiguous: true,
    };
  }

  const best = matches[0];
  const second = matches[1];

  // If top two are too close, it's ambiguous
  const isAmbiguous = second ? best.score - second.score < 15 || best.score < 30 : best.score < 25;
  const confidence = Math.min(95, Math.max(30, best.score * 1.8));

  const acc = OFFICIAL_ACCOUNTS.find((a) => a.code === best.code);
  if (!acc) return null;

  return {
    accountCode: acc.code,
    accountName: acc.name,
    accountType: acc.type,
    confidence: Math.round(confidence),
    reason: isAmbiguous
      ? `Coincidencia parcial con palabras clave [${best.matchedKeywords.join(', ')}]. Requiere confirmación de Paola.`
      : `${best.reason} (Coincidencia: ${best.matchedKeywords.join(', ')})`,
    source: 'rule',
    isAmbiguous,
  };
}
