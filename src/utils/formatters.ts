import { AccountingAccount, Project, ApreApprovedRecord, Area } from '../types/budget';

export const OFFICIAL_ACCOUNTS: AccountingAccount[] = [
  {
    code: '1203101',
    name: 'MAQUINAS Y EQUIPOS',
    type: 'Activo',
    categoryLabel: 'Inversión',
    description: 'Proyectores audiovisuales, pantallas interactivas, equipamiento de pruebas y herramientas técnicas.',
  },
  {
    code: '1203102',
    name: 'EQUIPOS COMPUTACIONALES',
    type: 'Activo',
    categoryLabel: 'Inversión',
    description: 'Computadores de escritorio, laptops, workstations, servidores, discos duros y monitores para laboratorios y oficinas.',
  },
  {
    code: '1203104',
    name: 'EQUIPOS DE COMUNICACIONES',
    type: 'Activo',
    categoryLabel: 'Inversión',
    description: 'Switches capa 2/3, access points WiFi 6, fibra óptica, cámaras CCTV, NVR y equipamiento de red de datos.',
  },
  {
    code: '1204101',
    name: 'MUEBLES Y UTILES',
    type: 'Activo',
    categoryLabel: 'Inversión',
    description: 'Racks cerrados, gabinetes murales, bandejas organizadoras y mobiliario técnico de salas y centros de cómputo.',
  },
  {
    code: '1304101',
    name: 'LICENCIAS',
    type: 'Activo',
    categoryLabel: 'Inversión',
    description: 'Licencias perpetuas, sistemas operativos base, software de virtualización y licenciamiento institucional mayor.',
  },
  {
    code: '4110200',
    name: 'HORAS EXTRAS',
    type: 'Gasto',
    categoryLabel: 'Gastos en Personal',
    description: 'Sobretareas de técnicos en eventos institucionales extraordinarios de fin de semana o soporte nocturno.',
  },
  {
    code: '4110320',
    name: 'MOVILIZACION',
    type: 'Gasto',
    categoryLabel: 'Gastos',
    description: 'Traslados locales, transporte técnico de equipamiento mayor entre campus o a terreno en Talca.',
  },
  {
    code: '4110000',
    name: 'VIATICOS',
    type: 'Gasto',
    categoryLabel: 'Gastos',
    description: 'Viáticos y asignaciones de servicio para capacitaciones o asistencias inter-sedes (Santiago/Temuco).',
  },
  {
    code: '4140100',
    name: 'MATERIAL OFICINA',
    type: 'Gasto',
    categoryLabel: 'Operación',
    description: 'Insumos de etiquetado de red, tóner técnico, velcro, rotuladoras y papelería técnica de soporte.',
  },
  {
    code: '4140200',
    name: 'ARRIENDOS',
    type: 'Gasto',
    categoryLabel: 'Operación',
    description: 'Arriendos de plataformas, leasing operativo y arriendo temporal de equipos audiovisuales para eventos.',
  },
  {
    code: '4140500',
    name: 'SERV. INFORMÁTICO',
    type: 'Gasto',
    categoryLabel: 'Operación',
    description: 'Contratos externos de soporte especializado, enlaces de telecomunicaciones, telefonía IP y servicios cloud.',
  },
  {
    code: '4150400',
    name: 'CORREO Y OTROS',
    type: 'Gasto',
    categoryLabel: 'Gastos',
    description: 'Envíos de encomiendas de repuestos, correspondencia técnica y servicios de courier corporativo.',
  },
  {
    code: '4150500',
    name: 'PASAJES Y OTROS',
    type: 'Gasto',
    categoryLabel: 'Gastos',
    description: 'Pasajes de bus/avión para comisiones técnicas o capacitaciones certificadas del personal TIC.',
  },
  {
    code: '4150600',
    name: 'GASTOS VARIOS',
    type: 'Gasto',
    categoryLabel: 'Gastos',
    description: 'Imprevistos menores de operación técnica, ferretería especializada y consumibles no clasificados.',
  },
  {
    code: '4160100',
    name: 'REPARACIONES Y MANTENCIONES',
    type: 'Gasto',
    categoryLabel: 'Operación',
    description: 'Servicios de mantención de redes, salones de eventos, salas de clases, UPS, proyectores y CCTV.',
  },
];

export interface AreaStyle {
  label: Area;
  badge: string;
  dot: string;
  border: string;
}

export const AREA_CONFIG: Record<Area, AreaStyle> = {
  Usuarios: {
    label: 'Usuarios',
    badge: 'bg-indigo-50 text-indigo-900 border-indigo-200',
    dot: 'bg-indigo-600',
    border: 'border-l-indigo-500',
  },
  Laboratorios: {
    label: 'Laboratorios',
    badge: 'bg-amber-50 text-amber-900 border-amber-200',
    dot: 'bg-amber-600',
    border: 'border-l-amber-500',
  },
  'Salas de Clases': {
    label: 'Salas de Clases',
    badge: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    dot: 'bg-emerald-600',
    border: 'border-l-emerald-500',
  },
  Redes: {
    label: 'Redes',
    badge: 'bg-sky-50 text-sky-900 border-sky-200',
    dot: 'bg-sky-600',
    border: 'border-l-sky-500',
  },
  'Salones de Eventos': {
    label: 'Salones de Eventos',
    badge: 'bg-rose-50 text-rose-900 border-rose-200',
    dot: 'bg-rose-600',
    border: 'border-l-rose-500',
  },
  'Salas Especiales': {
    label: 'Salas Especiales',
    badge: 'bg-slate-100 text-slate-800 border-slate-300',
    dot: 'bg-slate-600',
    border: 'border-l-slate-500',
  },
  CCTV: {
    label: 'CCTV',
    badge: 'bg-purple-50 text-purple-900 border-purple-200',
    dot: 'bg-purple-600',
    border: 'border-l-purple-500',
  },
};

export const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export function formatDateSpanish(dateString: string): string {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const monthName = MONTH_NAMES[month - 1] || '';
    return `${day} de ${monthName} de ${year}`;
  }
  return dateString;
}

export function formatCLP(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '$ 0';
  }
  // Chilean currency uses dots as thousands separators
  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$ ${formatted}`;
}

export function parseCLP(value: string): number {
  const cleaned = value.replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}

export function getAccountByCode(code?: string): AccountingAccount | undefined {
  if (!code) return undefined;
  return OFFICIAL_ACCOUNTS.find((acc) => acc.code === code);
}

// Generate CSV conforming to the exact 27 corporate columns expected by the APRE platform
export function generateRealApreExportCSV(projects: Project[]): string {
  const headers = [
    'DISTRIBUCIÓN',
    'CÓDIGO PRES',
    'AÑO',
    'SUCURSAL',
    'CÓDIGO TIPO CUENTA',
    'TIPO CUENTA',
    'CÓDIGO CENTRO',
    'CENTRO COSTO',
    'CÓDIGO GRUPO CUENTA',
    'GRUPO CUENTA',
    'CÓDIGO CUENTA',
    'CUENTA CONTABLE',
    'CÓDIGO ITEM',
    'ITEM COSTO',
    'DETALLE',
    'JUSTIFICACIÓN',
    'CANTIDAD',
    'MONTO TOTAL',
    'MONTO EJECUTADO',
    'SALDO',
    'DIVISA',
    'TIPO CENTRO GESTIÓN',
    'GRUPO CENT. BANCO',
    'CTA CORRIENTE',
    'TIPO FINANCIAMIENTO',
    'USUARIO CRE',
    'INSTITUCIÓN',
  ];

  const rows: string[][] = [];

  let presCounter = 761520;

  projects.forEach((proj) => {
    proj.items.forEach((item) => {
      presCounter++;
      const account = getAccountByCode(item.accountCode);
      const isActivo = account?.type === 'Activo';
      const codigoTipoCuenta = isActivo ? '4' : '8';
      const tipoCuenta = isActivo ? 'ACTIVOS' : 'GASTOS';
      const codigoGrupoCuenta = isActivo ? '1' : '2';
      const grupoCuenta = isActivo ? 'INVERSIÓN' : 'GASTOS DE OPERACIÓN';
      const itemCosto = isActivo ? 'ITEM ACTIVO' : 'MAQ. Y EQUIPO';

      const row = [
        `"[2026] ${MONTH_NAMES[proj.estimatedStartMonth - 1]?.toUpperCase() || 'MARZO'} A NOVIEMBRE"`,
        `"${proj.apreCodigoPres || presCounter}"`,
        `"2026"`,
        `"TALCA"`,
        `"${codigoTipoCuenta}"`,
        `"${tipoCuenta}"`,
        `"621007"`,
        `"INFORMÁTICA"`,
        `"${codigoGrupoCuenta}"`,
        `"${grupoCuenta}"`,
        `"${account?.code || '1203102'}"`,
        `"${account ? account.name : 'EQUIPOS COMPUTACIONALES'}"`,
        `"40404"`,
        `"${itemCosto}"`,
        `"${proj.title.replace(/"/g, '""')} - ${item.description.replace(/"/g, '""')}"`,
        `"${proj.justification.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        `"[2026] CLP Monto: ${Math.round(item.totalPriceCLP)} Cantidad: ${item.quantity}"`,
        `${Math.round(item.totalPriceCLP)}`,
        `0`,
        `${Math.round(item.totalPriceCLP)}`,
        `"PESO CHILENO"`,
        `"APOYO"`,
        `"VICE. ADM. Y FINANZAS / BANCO DE CREDITO E INVERSIONES / TBANC / BANCO NOVA"`,
        `"44074221"`,
        `"INSTITUCIONAL"`,
        `"PAOLA COORDINADORA TIC ${new Date().toISOString().slice(0, 10)}"`,
        `"UNIVERSIDAD AUTONOMA DE CHILE"`,
      ];
      rows.push(row);
    });
  });

  const bom = '\uFEFF';
  return bom + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
}

export function downloadApreExportCSV(projects: Project[], filename = 'PRESUPUESTO_CARGA_APRE_2026.csv') {
  const csvData = generateRealApreExportCSV(projects);
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Parse imported APRE approval CSV file
export function parseApreApprovedCSV(csvContent: string): ApreApprovedRecord[] {
  if (!csvContent || csvContent.trim().length === 0) return [];

  // Remove BOM if present
  let cleanContent = csvContent;
  if (cleanContent.charCodeAt(0) === 0xfeff) {
    cleanContent = cleanContent.slice(1);
  }

  const lines = cleanContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  // Detect delimiter (; or ,)
  const headerLine = lines[0];
  const delimiter = headerLine.includes(';') ? ';' : ',';

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === delimiter && !insideQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(headerLine).map((h) => h.replace(/^"|"$/g, '').toUpperCase().trim());

  const records: ApreApprovedRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseLine(lines[i]);
    if (row.length < 5) continue;

    const getCol = (possibleNames: string[]): string => {
      for (const name of possibleNames) {
        const idx = headers.indexOf(name);
        if (idx !== -1 && row[idx] !== undefined) {
          return row[idx].replace(/^"|"$/g, '').trim();
        }
      }
      return '';
    };

    const codigoPres = getCol(['CÓDIGO PRES', 'CODIGO PRES', 'CODIGO_PRES', 'CODIGO']);
    const montoTotalStr = getCol(['MONTO TOTAL', 'MONTO_TOTAL', 'MONTO']);
    const montoEjecStr = getCol(['MONTO EJECUTADO', 'MONTO_EJECUTADO']);
    const saldoStr = getCol(['SALDO']);
    const cuentaContable = getCol(['CUENTA CONTABLE', 'CUENTA_CONTABLE', 'CUENTA']);
    const codigoCuenta = getCol(['CÓDIGO CUENTA', 'CODIGO CUENTA', 'CODIGO_CUENTA']);
    const detalle = getCol(['DETALLE', 'NOMBRE_PROYECTO', 'DESCRIPCION']);
    const justificacion = getCol(['JUSTIFICACIÓN', 'JUSTIFICACION']);
    const sucursal = getCol(['SUCURSAL']) || 'TALCA';
    const centroCosto = getCol(['CENTRO COSTO', 'CENTRO_COSTO']) || 'INFORMÁTICA';
    const tipoCuenta = getCol(['TIPO CUENTA', 'TIPO_CUENTA']) || 'GASTOS';
    const grupoCuenta = getCol(['GRUPO CUENTA', 'GRUPO_CUENTA']) || 'GASTOS DE OPERACIÓN';
    const itemCosto = getCol(['ITEM COSTO', 'ITEM_COSTO']) || 'INFORMÁTICO';
    const cantidadDesc = getCol(['CANTIDAD', 'CANTIDAD_DESC']) || '';

    const montoTotal = parseInt(montoTotalStr.replace(/[^0-9]/g, ''), 10) || 0;
    const montoEjecutado = parseInt(montoEjecStr.replace(/[^0-9]/g, ''), 10) || 0;
    const saldo = parseInt(saldoStr.replace(/[^0-9]/g, ''), 10) || montoTotal;

    records.push({
      distribucion: getCol(['DISTRIBUCIÓN', 'DISTRIBUCION']) || '[2026] MARZO A NOVIEMBRE',
      codigoPres: codigoPres || `APRE-${i}`,
      ano: 2026,
      sucursal,
      codigoTipoCuenta: getCol(['CÓDIGO TIPO CUENTA', 'CODIGO TIPO CUENTA']) || '8',
      tipoCuenta,
      codigoCentro: getCol(['CÓDIGO CENTRO', 'CODIGO CENTRO']) || '621007',
      centroCosto,
      codigoGrupoCuenta: getCol(['CÓDIGO GRUPO CUENTA', 'CODIGO GRUPO CUENTA']) || '2',
      grupoCuenta,
      codigoCuenta: codigoCuenta || '4160100',
      cuentaContable: cuentaContable || 'REPARACIONES Y MANTENCIONES',
      codigoItem: getCol(['CÓDIGO ITEM', 'CODIGO ITEM']) || '40404',
      itemCosto,
      detalle: detalle || `Ítem Aprobado APRE ${i}`,
      justificacion: justificacion || 'Aprobado según presupuesto corporativo APRE 2026',
      cantidadDesc,
      montoTotal,
      montoEjecutado,
      saldo,
      divisa: 'PESO CHILENO',
      ctaCorriente: '44074221',
      usuarioCre: getCol(['USUARIO CRE', 'USUARIO_CRE']) || 'APRE CORPORATIVO',
    });
  }

  return records;
}
