import { Project } from '../types/budget';

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    code: 'TIC-TAL-2026-001',
    title: 'Renovación Estaciones de Trabajo Laboratorio de Computación 2',
    area: 'Laboratorios',
    responsible: 'Roberto',
    estimatedStartMonth: 2, // Febrero
    justification: 'Equipos actuales con más de 6 años de antigüedad, fallas recurrentes de motherboard y limitación para asignaturas de desarrollo y modelado 3D de la Facultad de Ingeniería.',
    reviewStatus: 'Aprobado',
    directorNotes: 'Aprobado en reunión de planificación con Vicedecano. Prioridad alta para inicio de semestre académico.',
    items: [
      {
        id: 'item-1-1',
        description: 'Workstations Core i7 32GB RAM SSD 1TB con pantalla 24"',
        quantity: 25,
        unitPriceCLP: 980000,
        totalPriceCLP: 24500000,
        accountCode: '1203102', // Equipos Computacionales
      },
      {
        id: 'item-1-2',
        description: 'Licencias de software de virtualización y laboratorio',
        quantity: 25,
        unitPriceCLP: 45000,
        totalPriceCLP: 1125000,
        accountCode: '1304101', // Licencias (Inversión)
      },
    ],
    requestedBudgetCLP: 25625000,
    approvedCeilingCLP: 25625000,
    executedBudgetCLP: 25625000,
    progressPercentage: 100,
    executionStatus: 'Completado',
    isExtrapresupuestario: false,
    bitacora: [],
  },
  {
    id: 'proj-2',
    code: 'TIC-TAL-2026-002',
    title: 'Migración y Densificación WiFi 6 Campus Alameda y Patios Centrales',
    area: 'Redes',
    responsible: 'Cristian',
    estimatedStartMonth: 3, // Marzo
    justification: 'Aumento de demanda concurrente por matrícula 2026; los AP actuales sufren saturación en horas punta de receso estudiantil en cafetería y biblioteca.',
    reviewStatus: 'Aprobado',
    directorNotes: 'Validado técnicamente. Se solicita asegurar cobertura continua en patio techado y biblioteca.',
    items: [
      {
        id: 'item-2-1',
        description: 'Access Points WiFi 6 Empresarial para alta concurrencia',
        quantity: 14,
        unitPriceCLP: 620000,
        totalPriceCLP: 8680000,
        accountCode: '1203104', // Equipos de Comunicaciones
      },
      {
        id: 'item-2-2',
        description: 'Switch PoE+ 24 puertos administrable capa 3',
        quantity: 2,
        unitPriceCLP: 1450000,
        totalPriceCLP: 2900000,
        accountCode: '1203104', // Equipos de Comunicaciones
      },
      {
        id: 'item-2-3',
        description: 'Bobinas de cable UTP Cat6A LSZH e insumos de certificación',
        quantity: 4,
        unitPriceCLP: 210000,
        totalPriceCLP: 840000,
        accountCode: '4140100', // Material Oficina / Insumos
      },
    ],
    requestedBudgetCLP: 12420000,
    approvedCeilingCLP: 12420000,
    executedBudgetCLP: 9800000,
    progressPercentage: 75,
    executionStatus: 'En Plazo',
    isExtrapresupuestario: false,
    bitacora: [],
  },
  {
    id: 'proj-3',
    code: 'TIC-TAL-2026-003',
    title: 'Modernización Audiovisual Aulas Híbridas Edificio B (Pisos 2 y 3)',
    area: 'Salas de Clases',
    responsible: 'Claudio',
    estimatedStartMonth: 4, // Abril
    justification: 'Estandarización de 8 salas docentes con proyectores de tiro ultracorto láser de encendido instantáneo y microfonía de techo para clases sincrónicas.',
    reviewStatus: 'Aprobado',
    directorNotes: 'Revisado con Paola. Requiere coordinación con Dirección de Operaciones para trabajos en fines de semana.',
    items: [
      {
        id: 'item-3-1',
        description: 'Proyector Láser WUXGA 4500 lúmenes alta durabilidad',
        quantity: 8,
        unitPriceCLP: 1250000,
        totalPriceCLP: 10000000,
        accountCode: '1203101', // Máquinas y Equipos
      },
      {
        id: 'item-3-2',
        description: 'Sistema de audio ambiental y caja de conexiones de pared',
        quantity: 8,
        unitPriceCLP: 420000,
        totalPriceCLP: 3360000,
        accountCode: '1203101', // Máquinas y Equipos
      },
      {
        id: 'item-3-3',
        description: 'Servicio técnico de anclaje e instalación certificada',
        quantity: 1,
        unitPriceCLP: 1800000,
        totalPriceCLP: 1800000,
        accountCode: '4160100', // Reparaciones y Mantenciones
      },
    ],
    requestedBudgetCLP: 15160000,
    approvedCeilingCLP: 15160000,
    executedBudgetCLP: 6500000,
    progressPercentage: 40,
    executionStatus: 'Atrasado',
    isExtrapresupuestario: false,
    bitacora: [
      {
        id: 'bita-1',
        date: '2026-04-18',
        reason: 'Quiebre de stock en distribuidor mayorista nacional de los soportes motorizados de techo.',
        correctiveAction: 'Se gestionó alternativa técnica con proveedor regional en Talca con entrega programada para el 8 de mayo.',
        expectedResolutionDate: '2026-05-15',
        author: 'Claudio',
        role: 'tecnico',
      },
    ],
  },
  {
    id: 'proj-4',
    code: 'TIC-TAL-2026-004',
    title: 'Ampliación Circuito Cerrado de Televisión (CCTV) Perimetral y Estacionamientos',
    area: 'CCTV',
    responsible: 'Ignacio',
    estimatedStartMonth: 5, // Mayo
    justification: 'Requerimiento de Seguridad Institucional para cubrir puntos ciegos en acceso vehicular por calle 5 Poniente y sector bicicletas.',
    reviewStatus: 'Aprobado',
    directorNotes: 'Revisión conforme con Director Administrativo de Sede Talca.',
    items: [
      {
        id: 'item-4-1',
        description: 'Cámaras IP Domo antivandálicas 4K visión nocturna 40m',
        quantity: 12,
        unitPriceCLP: 310000,
        totalPriceCLP: 3720000,
        accountCode: '1203104', // Equipos de Comunicaciones
      },
      {
        id: 'item-4-2',
        description: 'NVR 32 Canales con almacenamiento RAID 16TB institucional',
        quantity: 1,
        unitPriceCLP: 2850000,
        totalPriceCLP: 2850000,
        accountCode: '1203104', // Equipos de Comunicaciones
      },
      {
        id: 'item-4-3',
        description: 'Tendido subterráneo de fibra óptica y canalización conduit',
        quantity: 1,
        unitPriceCLP: 1950000,
        totalPriceCLP: 1950000,
        accountCode: '4140500', // Serv. Informático
      },
    ],
    requestedBudgetCLP: 8520000,
    approvedCeilingCLP: 8520000,
    executedBudgetCLP: 2500000,
    progressPercentage: 30,
    executionStatus: 'En Plazo',
    isExtrapresupuestario: false,
    bitacora: [],
  },
  {
    id: 'proj-5',
    code: 'TIC-TAL-2026-005',
    title: 'Contrato Anual Mantención Preventiva Climatización y UPS Data Center Talca',
    area: 'Redes',
    responsible: 'Paola',
    estimatedStartMonth: 1, // Enero
    justification: 'Garantizar continuidad operativa de los 4 racks de servidores locales y conmutación central ante oscilaciones térmicas de verano en el Maule.',
    reviewStatus: 'Aprobado',
    directorNotes: 'Servicio crítico e imprescindible.',
    items: [
      {
        id: 'item-5-1',
        description: 'Mantención trimestral de UPS trifásica 40kVA con banco de baterías',
        quantity: 4,
        unitPriceCLP: 850000,
        totalPriceCLP: 3400000,
        accountCode: '4160100', // Reparaciones y Mantenciones
      },
      {
        id: 'item-5-2',
        description: 'Mantención semestral unidades de precisión In-Row Rittal',
        quantity: 2,
        unitPriceCLP: 950000,
        totalPriceCLP: 1900000,
        accountCode: '4160100', // Reparaciones y Mantenciones
      },
    ],
    requestedBudgetCLP: 5300000,
    approvedCeilingCLP: 5300000,
    executedBudgetCLP: 2550000,
    progressPercentage: 50,
    executionStatus: 'En Plazo',
    isExtrapresupuestario: false,
    bitacora: [],
  },
  {
    id: 'proj-6',
    code: 'TIC-TAL-2026-006',
    title: 'Renovación Portátiles Docentes y Estaciones de Autoatención Estudiantil',
    area: 'Usuarios',
    responsible: 'Juan',
    estimatedStartMonth: 6, // Junio
    justification: 'Recambio de 18 laptops para académicos de planta y 6 tótems de impresión de certificados estudiantiles.',
    reviewStatus: 'En Revisión',
    directorNotes: 'Revisando cotizaciones con compras corporativas de Santiago para obtener descuento por volumen.',
    items: [
      {
        id: 'item-6-1',
        description: 'Notebook Corporativo 14" Ryzen 7 16GB RAM 512GB SSD',
        quantity: 18,
        unitPriceCLP: 740000,
        totalPriceCLP: 13320000,
        accountCode: undefined, // Pendiente de asignación oficial por Paola
      },
      {
        id: 'item-6-2',
        description: 'Tótem touch interactivo con lector de credencial TUI',
        quantity: 6,
        unitPriceCLP: 890000,
        totalPriceCLP: 5340000,
        accountCode: undefined, // Pendiente de asignación oficial por Paola
      },
    ],
    requestedBudgetCLP: 18660000,
    approvedCeilingCLP: 18660000,
    executedBudgetCLP: 0,
    progressPercentage: 0,
    executionStatus: 'No Iniciado',
    isExtrapresupuestario: false,
    bitacora: [],
  },
  {
    id: 'proj-7',
    code: 'TIC-TAL-2026-007',
    title: 'Equipamiento Streaming y Audio Digital Aula Magna y Salón de Honor',
    area: 'Salones de Eventos',
    responsible: 'Marianela',
    estimatedStartMonth: 7, // Julio
    justification: 'Atención de ceremonias de titulación, congresos internacionales y eventos institucionales con transmisión híbrida 4K y microfonía inalámbrica Dante.',
    reviewStatus: 'Ajuste Solicitado',
    directorNotes: 'Reducir el número de cámaras PTZ de 3 a 2 para ajustarse a los topes sectoriales.',
    items: [
      {
        id: 'item-7-1',
        description: 'Cámara Robótica PTZ NDI/Dante zoom óptico 30x',
        quantity: 2,
        unitPriceCLP: 2150000,
        totalPriceCLP: 4300000,
        accountCode: '1203101', // Máquinas y Equipos
      },
      {
        id: 'item-7-2',
        description: 'Consola mezcladora digital de 16 canales y microfonía shure',
        quantity: 1,
        unitPriceCLP: 3200000,
        totalPriceCLP: 3200000,
        accountCode: '1203101', // Máquinas y Equipos
      },
    ],
    requestedBudgetCLP: 7500000,
    approvedCeilingCLP: 7500000,
    executedBudgetCLP: 0,
    progressPercentage: 0,
    executionStatus: 'No Iniciado',
    isExtrapresupuestario: false,
    bitacora: [],
  },
  {
    id: 'proj-8',
    code: 'TIC-TAL-2026-008',
    title: 'Enlace Dedicado de Respaldo e Interconexión de Sedes (Talca - Santiago)',
    area: 'Salas Especiales',
    responsible: 'Esteban',
    estimatedStartMonth: 1, // Enero
    justification: 'Contrato de transporte de datos punto a punto para redundancia de sistemas críticos ERP y plataformas de docencia.',
    reviewStatus: 'Aprobado',
    directorNotes: 'Aprobado corporativamente.',
    items: [
      {
        id: 'item-8-1',
        description: 'Enlace MPLS Redundante 1Gbps simétrico anual',
        quantity: 12,
        unitPriceCLP: 890000,
        totalPriceCLP: 10680000,
        accountCode: '4140500', // Serv. Informático / Telecomunicaciones
      },
    ],
    requestedBudgetCLP: 10680000,
    approvedCeilingCLP: 10680000,
    executedBudgetCLP: 4450000,
    progressPercentage: 42,
    executionStatus: 'En Plazo',
    isExtrapresupuestario: false,
    bitacora: [],
  },
  {
    id: 'proj-9',
    code: 'TIC-TAL-2026-EXTRA-01',
    title: 'Reemplazo de Emergencia Switch de Distribución Piso 1 Edificio Ciencias',
    area: 'Redes',
    responsible: 'Cristian',
    estimatedStartMonth: 3, // Marzo
    justification: 'Falla catastrófica de fuente de poder interna por descarga eléctrica en temporal de marzo. No programado en formulación inicial.',
    reviewStatus: 'Aprobado',
    directorNotes: 'Aprobado con carácter de urgencia con cargo al remanente de contingencia de Sede.',
    items: [
      {
        id: 'item-extra-1',
        description: 'Switch Gigabit PoE+ de emergencia con reemplazo inmediato en 24h',
        quantity: 1,
        unitPriceCLP: 1650000,
        totalPriceCLP: 1650000,
        accountCode: '1203104', // Equipos de Comunicaciones
      },
    ],
    requestedBudgetCLP: 1650000,
    approvedCeilingCLP: 1650000,
    executedBudgetCLP: 1650000,
    progressPercentage: 100,
    executionStatus: 'Completado',
    isExtrapresupuestario: true,
    bitacora: [],
  },
];
