/**
 * Textos en español. Es el diccionario de referencia: su forma define el tipo
 * que tiene que cumplir cualquier otro idioma, así que no se anota a mano.
 *
 * Los marcadores `{clave}` los rellena `fmt`. Los `placeholder` de los campos
 * numéricos («1-3, 5, 9-») viven en el registro: no se traducen.
 */
export const es = {
  meta: {
    lang: 'es',
    description:
      'Herramientas PDF que se ejecutan por completo en tu navegador. Tus documentos nunca se suben a ningún servidor.',
  },

  brand: {
    tagline: 'Tus PDF, en el sofá. Sin moverse de tu casa.',
    claim: [
      'Las herramientas PDF que se quedan ',
      { bold: 'en la pestaña de tu navegador' },
      '. Ni suben, ni viajan, ni hacen cola en un servidor ajeno.',
    ],
  },

  header: {
    home: '{app}, inicio',
    badge: 'Se ejecuta en tu dispositivo',
    howItWorks: 'Cómo funciona',
    tools: 'Herramientas',
  },

  kofi: 'Invítame a un café',

  footer: {
    line: '© {year} {name}. Sin servidores de archivos, sin cuentas, sin rastreo individual.',
    link: 'Cómo comprobar que no subimos nada',
    contact: 'Contactar o reportar un problema',
  },

  locale: {
    label: 'Idioma',
    names: { es: 'español', en: 'inglés' },
    switchTo: 'Cambiar a {name}',
  },

  theme: {
    label: 'Tema',
    options: { light: 'Claro', dark: 'Oscuro' },
    toLight: 'Cambiar a tema claro',
    toDark: 'Cambiar a tema oscuro',
  },

  hero: {
    badge: 'Tus documentos no salen de tu dispositivo',
    tools: 'Ver las herramientas',
    verify: 'Compruébalo tú mismo',
  },

  privacyPoints: {
    noUpload: {
      title: 'Sin subidas',
      body: 'No hay servidor de archivos. El documento se abre con la API File del navegador y vive solo en la memoria de la pestaña.',
    },
    offline: {
      title: 'Funciona sin internet',
      body: 'Corta el WiFi y sigue funcionando. Es la prueba más simple de que el procesamiento es local.',
    },
    noTracking: {
      title: 'Sin cuentas ni rastreo individual',
      body: 'No hay registro, cookies de sesión, publicidad ni rastreo individual. Usamos Cloudflare Web Analytics para medir el rendimiento de forma agregada y sin venderte nada.',
    },
    private: {
      title: '100% privado',
      body: 'El documento no se copia a ningún disco ni servidor: solo vive en la memoria de la pestaña hasta que la cierras.',
    },
  },

  categories: {
    paginas: {
      name: 'Organizar páginas',
      short: 'Organizar',
      blurb: 'Reordena, inserta, elimina y ajusta páginas del PDF.',
    },
    edicion: {
      name: 'Editar y anotar',
      short: 'Editar',
      blurb: 'Añade contenido, anotaciones y firmas al PDF.',
    },
    conversiones: {
      name: 'Convertir y extraer',
      short: 'Convertir',
      blurb: 'Cambia de formato o extrae contenido del documento.',
    },
    optimizacion: {
      name: 'Optimizar y reparar',
      short: 'Optimizar',
      blurb: 'Reduce, aplana, transforma o repara el PDF.',
    },
    metadatos: {
      name: 'Información del documento',
      short: 'Información',
      blurb: 'Compara, consulta y edita la información del PDF.',
    },
    seguridad: {
      name: 'Seguridad y privacidad',
      short: 'Seguridad',
      blurb: 'Contraseñas y contenido sensible.',
    },
  },

  tabs: {
    all: 'Todo',
  },

  workflow: {
    badge: 'Workflows',
    badgeBody: 'Aplica varias acciones seguidas a un mismo PDF.',
    title: 'Crear un workflow',
    description: 'Elige un PDF y encadena acciones. Cada paso recibe el PDF generado por el anterior.',
    inputTitle: 'Documento de entrada',
    stepsTitle: 'Pasos',
    addStep: 'Añadir acción',
    chooseStep: 'Elige una acción',
    moveUp: 'Subir paso',
    moveDown: 'Bajar paso',
    remove: 'Quitar paso',
    run: 'Ejecutar workflow',
    running: 'Ejecutando paso {current} de {total}…',
    empty: 'Añade al menos una acción.',
    noSteps: 'Todavía no hay acciones. Añade la primera para empezar.',
    limitationTitle: 'Qué acciones se pueden encadenar',
    limitationBody: 'Los workflows usan acciones PDF→PDF que producen un único documento. Unir, dividir, comparar y las exportaciones a imágenes o texto quedan fuera: generan varios resultados, necesitan varios documentos o cambian de formato.',
    done: 'Workflow terminado',
    output: 'Resultado final',
    reset: 'Empezar de nuevo',
    invalidOutput: 'Esta acción no devuelve un único PDF y no se puede usar en este workflow.',
    protectLast: 'Proteger con contraseña debe ser el último paso del workflow.',
    unlockFirst: 'Quitar contraseña debe ser el primer paso del workflow.',
  },

  accept: {
    pdf: 'PDF',
    image: 'JPG o PNG',
    html: 'HTML',
  },

  dropzone: {
    dragOne: 'Arrastra tu archivo {accept} aquí',
    dragMany: 'Arrastra tus archivos {accept} aquí',
    pickOne: 'Seleccionar archivo',
    pickMany: 'Seleccionar archivos',
    hint: 'El archivo se abre en memoria. No se envía a ninguna parte.',
    up: 'Subir',
    down: 'Bajar',
    remove: 'Quitar {name}',
  },

  options: {
    title: 'Opciones',
    on: 'Activado',
    off: 'Desactivado',
  },

  run: {
    back: 'Todas las herramientas',
    processing: 'Procesando…',
    reset: 'Empezar de nuevo',
    needOne: 'Añade un archivo para empezar.',
    needMany: 'Añade al menos {n} archivos.',
    working: 'Trabajando en tu navegador…',
    failed: 'Algo ha fallado al procesar el archivo.',
    doneOne: 'Listo, 1 archivo',
    doneMany: 'Listo, {n} archivos',
    zip: 'Descargar todo (.zip)',
    download: 'Descargar',
    preview: 'Vista previa',
    textPreview: 'Vista previa del informe',
    close: 'Cerrar',
    loading: 'Cargando…',
    ephemeral: 'Los resultados están en la memoria de esta pestaña. Al cerrarla desaparecen.',
    support: {
      title: '¿Cuánto dirías que vale esta herramienta para ti?',
      body: 'Si te ha resultado útil, puedes apoyar su mantenimiento con una donación.',
      donate: 'Hacer una donación',
      later: 'Otra vez será',
    },
  },

  card: {
    soon: 'Pronto',
  },

  notFound: {
    kicker: 'Aquí no hay nada',
    title: 'Esta herramienta no existe todavía',
    body: 'Puede que esté en camino o que el enlace esté mal escrito.',
    cta: 'Volver al inicio',
  },

  privacy: {
    title: 'Cómo funciona, y cómo comprobarlo',
    intro:
      'La mayoría de las herramientas PDF online suben tu documento a un servidor, lo procesan allí y prometen borrarlo al cabo de unas horas. {app} no tiene servidor al que subir nada.',
    steps: {
      pick: {
        title: '1. Eliges un archivo',
        body: 'El navegador te pide permiso y entrega el contenido a la pestaña mediante la API File. Ese contenido vive en la memoria RAM de la pestaña; no se copia a ningún disco ni a ningún servidor.',
      },
      process: {
        title: '2. Se procesa aquí',
        body: 'Las librerías que manipulan el PDF se descargaron con la página y se ejecutan en tu CPU. El trabajo pesado va en un Web Worker para no bloquear la interfaz.',
      },
      download: {
        title: '3. Descargas el resultado',
        body: 'El archivo de salida se genera en memoria y se te ofrece como descarga local. Al cerrar la pestaña, todo lo anterior desaparece.',
      },
    },
    verifyTitle: 'No te fíes: verifícalo',
    verifyBody:
      'Cualquier web puede escribir «no guardamos tus archivos». Estas tres comprobaciones las puedes hacer tú en un minuto.',
    checks: {
      offline: {
        title: 'Desconéctate de internet',
        body: 'Carga la página, activa el modo avión o desactiva el WiFi, y usa cualquier herramienta. Si funciona sin red, no hay nada al otro lado.',
      },
      devtools: {
        title: 'Mira la pestaña Red de las DevTools',
        body: 'Abre las herramientas de desarrollo (F12), ve a Red y procesa un documento. Puede aparecer una petición de Cloudflare Web Analytics con métricas técnicas, pero no hay ningún POST con tu archivo ni con datos derivados de él.',
      },
      source: {
        title: 'Lee el código',
        body: 'Es una aplicación estática: HTML, CSS y JavaScript. Puedes leer el fuente servido y comprobar que no existe ningún endpoint de subida.',
      },
    },
    limitsTitle: 'Lo que sí ocurre',
    limitsIntro: 'Ser honestos con los límites es parte del trato:',
    limits: {
      ip: {
        strong: 'Servir la web deja huella.',
        body: 'Al cargar la página, el servidor que la aloja ve tu IP y tu navegador, como cualquier otra web. Cloudflare Web Analytics recibe únicamente métricas técnicas de rendimiento y no usa cookies, almacenamiento local ni huellas digitales para seguirte. Lo que nunca ve es tu documento.',
      },
      theme: {
        strong: 'Se guardan algunos ajustes.',
        body: 'El navegador puede recordar el tema, el idioma y si has pospuesto el aviso de donación. Nada de esto contiene documentos ni datos derivados de ellos.',
      },
      order: {
        strong: 'Se recuerda qué herramientas usas.',
        body: 'El navegador guarda un contador anónimo de cuántas veces has terminado cada herramienta, para reordenar el listado por las que más usas. No contiene documentos, ni nombres de archivo, ni nada que se pueda asociar contigo fuera de esta pestaña.',
      },
      power: {
        strong: 'Tu equipo pone la potencia.',
        body: 'Un documento muy grande puede tardar o agotar la memoria de la pestaña. Ese es el precio de no delegar el trabajo en un servidor ajeno.',
      },
    },
    analytics: {
      title: 'Analítica ética, sin venderte nada',
      body: 'Usaremos Cloudflare Web Analytics para saber qué páginas funcionan y detectar problemas de rendimiento. No crea perfiles, no usa cookies ni rastrea a las personas entre visitas o sitios. Solo recoge métricas técnicas de la carga de la página; nunca recibe tus documentos ni datos derivados de ellos.',
      link: 'Más información sobre la privacidad de Cloudflare Web Analytics',
    },
  },

  errors: {
    badRange: 'No entiendo "{part}". Usa formatos como 1-3, 5 o 9-.',
    reversedRange: 'Rango invertido en "{part}".',
    emptySelection: 'La selección de páginas está vacía.',
    invalidMaxSize: 'El límite debe ser un número entre 0,1 y 500 MB.',
    pageTooLarge: 'La página {page} ocupa {size} MB y supera el límite de {max} MB.',
    noPage: 'La página {page} no existe.',
    noPageOf: 'La página {page} no existe: el documento tiene {total}.',
    invalidCopies: 'El número de copias debe ser un entero entre 2 y 100.',
    exportPage: 'No se pudo exportar la página {page}.',
    noImages: 'No se pudo leer ninguna imagen.',
    emptyPassword: 'Escribe una contraseña.',
    passwordMismatch: 'Las dos contraseñas no coinciden.',
    passwordReservedChar: 'La contraseña no puede empezar por «-» ni por «@».',
    passwordTooLong:
      'La contraseña ocupa {bytes} bytes y el cifrado admite {max} (las tildes y los emoji ocupan varios).',
    alreadyEncrypted: 'Este PDF ya está cifrado: quítale primero la contraseña actual.',
    notEncrypted: 'Este PDF no está cifrado: no hay contraseña que quitar.',
    wrongPassword: 'La contraseña no abre este documento.',
    encryptFailed: 'No se pudo cifrar el documento.',
    repairFailed: 'No se pudo reparar: el daño supera lo que se puede reconstruir.',
    signatureEmpty: 'Crea una firma antes de firmar el documento.',
    repairEncrypted:
      'El documento está cifrado: quítale la contraseña con Desbloquear PDF y vuelve a intentarlo.',
    organizeEmpty: 'No queda ninguna página: añade al menos una antes de exportar.',
    cropEmpty: 'El recorte deja la página vacía: reduce algún margen.',
    redactEmpty: 'Dibuja al menos un rectángulo sobre el texto que quieres censurar.',
    redactFailed: 'No se pudo renderizar la página para censurar.',
    ocrFailed: 'No se pudo reconocer el texto de la página {n}.',
    compareNeedTwo: 'Sube dos PDFs para comparar.',
    compareFailed: 'No se pudo comparar las páginas.',
    blankPagesAll: 'El documento solo contiene páginas en blanco.',
    blankPagesFailed: 'No se pudieron detectar las páginas en blanco.',
    flattenFailed: 'No se pudieron aplanar los campos del formulario.',
    editEmpty: 'Añade al menos un elemento antes de exportar.',
    bookmarksEmpty: 'Añade al menos un marcador antes de exportar.',
    bookmarkTitle: 'Cada marcador necesita un título.',
    bookmarkPage: 'La página {page} no existe: el documento tiene {total}.',
    headerFooterEmpty: 'Escribe un texto para el encabezado o el pie.',
  },

  /** Trozos de nombre de fichero: sin acentos ni espacios, van al disco. */
  filenames: {
    merged: 'combinado',
    images: 'imagenes',
    extractedImages: 'imagenes-extraidas',
    selection: 'seleccion',
    sizePart: 'parte',
    numbered: 'numerado',
    compressed: 'comprimido',
    grayscale: 'escala-grises',
    flattened: 'aplanado',
    rotated: 'rotado',
    inserted: 'insertado',
    duplicated: 'duplicado',
    repaired: 'reparado',
    protected: 'protegido',
    unlocked: 'sin-contraseña',
    watermark: 'marca-de-agua',
    signed: 'firmado',
    organized: 'organizado',
    nUp: 'varias-por-hoja',
    blankPagesRemoved: 'sin-paginas-en-blanco',
    cropped: 'recortado',
    redacted: 'censurado',
    ocr: 'ocr',
    compared: 'comparado',
    edited: 'editado',
    metadata: 'metadatos',
    report: 'informe-tecnico',
    bookmarks: 'marcadores',
    headerFooter: 'encabezado-pie',
  },

  progress: {
    page: 'Página {n}',
    document: 'Documento {n} de {total}',
    reading: 'Leyendo {name}',
    readingPdf: 'Leyendo el PDF',
    compressingImages: 'Comprimiendo imágenes',
    grayscalingImages: 'Convirtiendo imágenes a escala de grises',
    extractingImages: 'Extrayendo imágenes',
    writingPdf: 'Escribiendo el PDF',
    repairing: 'Reconstruyendo la estructura',
    rebuildingObjects: 'Recuperando los objetos',
    salvaging: 'Rescatando lo que queda',
    encrypting: 'Cifrando el documento',
    decrypting: 'Descifrando el documento',
    flattening: 'Aplanando los campos del formulario',
    removingBlankPages: 'Eliminando páginas en blanco',
    sheet: 'Componiendo hoja {n} de {total}',
    done: 'Listo',
  },

  report: {
    title: 'Informe técnico del PDF',
    file: 'Archivo',
    size: 'Tamaño',
    pages: 'Páginas',
    page: 'Página',
    dimensions: 'Tamaño de página',
    fonts: 'Fuentes detectadas',
    images: 'Imágenes detectadas',
    forms: 'Formularios',
    fields: 'Campos de formulario',
    encryption: 'Cifrado',
    metadata: 'Metadatos',
    titleField: 'Título',
    author: 'Autor',
    subject: 'Asunto',
    keywords: 'Palabras clave',
    yes: 'Sí',
    no: 'No',
    detected: 'Detectado',
    none: 'Ninguno detectado',
    unavailable: 'No se puede analizar',
    unavailableDetails: 'No se puede analizar con seguridad en este documento',
    encrypted: 'Sí, el contenido está cifrado',
    plain: 'No',
    unknown: 'No se pudo determinar',
    embeddingUnknown: 'No se puede determinar si las fuentes están incrustadas.',
    encryptedContent: 'El documento está cifrado; páginas, fuentes, imágenes y formularios no se pueden analizar sin la contraseña.',
    pageError: 'No se pudo analizar esta página.',
    footer: 'Generado localmente en el navegador. El documento y este informe no se han enviado a ningún servidor.',
    pageDetails: 'Detalle de páginas',
  },

    tools: {
    merge: {
      name: 'Unir PDF',
      short: 'Combina varios documentos en uno solo, en el orden que elijas.',
      description:
        'Junta varios PDF en un único documento. El orden de la lista es el orden final; puedes reordenarla antes de procesar.',
      action: 'Unir PDF',
    },
    split: {
      name: 'Dividir PDF',
      short: 'Sepáralo por rangos o extrae solo las páginas que necesitas.',
      description:
        'Divide un PDF en varios documentos por rangos de páginas, uno por página, o extrae una selección concreta a un único fichero.',
      action: 'Dividir PDF',
      options: {
        mode: {
          label: 'Modo',
          choices: {
            ranges: 'Un PDF por cada rango',
            extract: 'Extraer la selección a un solo PDF',
            each: 'Un PDF por cada página',
            size: 'Dividir por tamaño máximo',
          },
        },
        ranges: {
          label: 'Páginas',
          help: 'Rangos separados por comas. Deja "1-" para todo el documento.',
        },
        maxSize: { label: 'Tamaño máximo (MB)' },
      },
      note: 'En el modo de tamaño se conserva el orden de las páginas. Si una página por sí sola supera el límite, se muestra un aviso y no se modifica.',
    },
    insert: {
      name: 'Añadir páginas en blanco',
      short: 'Inserta una o varias páginas en blanco donde quieras.',
      description:
        'Añade páginas nuevas antes o después de las páginas que indiques, con el tamaño y la orientación que elijas.',
      action: 'Añadir páginas',
      options: {
        pages: {
          label: 'Páginas de referencia',
          help: 'Escribe una o varias páginas separadas por comas, por ejemplo: 2, 5, 8.',
        },
        position: {
          label: 'Insertar',
          choices: { before: 'Antes de cada página', after: 'Después de cada página' },
        },
        pageSize: {
          label: 'Tamaño de la página',
          choices: { a4: 'A4', letter: 'Carta' },
        },
        orientation: {
          label: 'Orientación',
          choices: { portrait: 'Vertical', landscape: 'Horizontal' },
        },
      },
    },
    duplicate: {
      name: 'Duplicar páginas',
      short: 'Repite las páginas que elijas dentro del mismo PDF.',
      description:
        'Duplica una selección de páginas tantas veces como indiques. El resto del documento conserva su orden, tamaño y orientación.',
      action: 'Duplicar páginas',
      options: {
        pages: {
          label: 'Páginas',
          help: 'Usa rangos separados por comas, por ejemplo: 1-3, 5, 9-.',
        },
        copies: { label: 'Número de copias' },
      },
    },
    rotate: {
      name: 'Rotar PDF',
      short: 'Gira todas las páginas o solo las que indiques.',
      description:
        'Aplica un giro de 90, 180 o 270 grados. La rotación se suma a la que ya tuviera cada página.',
      action: 'Rotar PDF',
      options: {
        angle: {
          label: 'Giro',
          choices: {
            '90': '90° a la derecha',
            '180': '180°',
            '270': '90° a la izquierda',
          },
        },
        pages: {
          label: 'Páginas',
          help: 'Deja "1-" para rotar el documento entero.',
        },
      },
    },
    organize: {
      name: 'Organizar páginas',
      short: 'Reordena, duplica y elimina páginas de uno o varios PDF con vista previa.',
      description:
        'Vista de miniaturas para reordenar, duplicar o borrar páginas de uno o varios PDF antes de exportar. Los documentos se concatenan en el orden de la lista.',
      action: 'Organizar',
      note: 'El orden de la lista es el orden final. Arrastra para reordenar o usa los botones. Con varios PDF se concatenan en el orden en que aparecen.',
      preview: {
        title: 'Páginas',
        hint: 'Arrastra las miniaturas para reordenar. Cada página conserva su documento y número original a la derecha.',
        position: 'Posición',
        original: 'Original {n}',
        docAndPage: 'Doc {file} · p. {page}',
        moveUp: 'Subir',
        moveDown: 'Bajar',
        duplicate: 'Duplicar',
        remove: 'Quitar',
        reset: 'Restablecer orden',
        empty: 'No queda ninguna página. Duplica alguna para empezar.',
        count: '{n} páginas',
      },
    },
    'n-up': {
      name: 'Varias páginas por hoja',
      short: 'Coloca 2, 4, 6 u 8 páginas en cada hoja.',
      description: 'Crea un PDF listo para imprimir con varias páginas por hoja, ajustadas sin deformarlas y procesadas por completo en el navegador.',
      action: 'Componer hojas',
      options: {
        pagesPerSheet: { label: 'Páginas por hoja', choices: { '2': '2 páginas', '4': '4 páginas', '6': '6 páginas', '8': '8 páginas' } },
        orientation: { label: 'Orientación', choices: { portrait: 'Vertical', landscape: 'Horizontal' } },
        margin: { label: 'Margen (pt)' },
        order: { label: 'Orden de lectura', choices: { rows: 'Por filas', columns: 'Por columnas' } },
        lines: { label: 'Líneas de separación' },
      },
    },
    'remove-blank-pages': {
      name: 'Eliminar páginas en blanco',
      short: 'Detecta y elimina las páginas visualmente vacías del PDF.',
      description:
        'Analiza cada página en el navegador y elimina las que solo contienen fondo blanco. El resto del contenido se conserva sin rasterizarlo.',
      action: 'Eliminar páginas en blanco',
      note: 'La detección se basa en el aspecto visible: páginas con marcas casi blancas pueden considerarse en blanco.',
    },

    'jpg-to-pdf': {
      name: 'Imágenes a PDF',
      short: 'Convierte JPG y PNG en un PDF, una imagen por página.',
      description:
        'Crea un PDF a partir de imágenes. Puedes ajustarlas a A4 o Carta con margen, o dejar que cada página adopte el tamaño exacto de su imagen.',
      action: 'Crear PDF',
      options: {
        pageSize: {
          label: 'Tamaño de página',
          choices: { a4: 'A4', letter: 'Carta', fit: 'Ajustar a la imagen' },
        },
        landscape: { label: 'Horizontal' },
        margin: { label: 'Margen (pt)' },
      },
    },
    'pdf-to-jpg': {
      name: 'PDF a imágenes',
      short: 'Exporta las páginas como JPG o PNG a la resolución que quieras.',
      description:
        'Rasteriza cada página con el mismo motor de render que usa el visor del navegador y la exporta como imagen.',
      action: 'Exportar imágenes',
      note: 'Rasterizar convierte el texto en píxeles: el resultado deja de ser seleccionable o buscable.',
      options: {
        pages: { label: 'Páginas' },
        format: {
          label: 'Formato',
          choices: { jpeg: 'JPG', png: 'PNG (sin pérdida)' },
        },
        scale: {
          label: 'Resolución',
          choices: {
            '1': '72 ppp (pantalla)',
            '2': '144 ppp (recomendado)',
            '4': '288 ppp (impresión)',
          },
        },
        quality: { label: 'Calidad JPG' },
      },
    },
    'extract-images': {
      name: 'Extraer imágenes',
      short: 'Saca las imágenes incrustadas del PDF como archivos independientes.',
      description:
        'Lee los objetos de imagen que contiene el PDF y los exporta como PNG, sin rasterizar las páginas ni tocar el texto.',
      action: 'Extraer imágenes',
      note: 'Las imágenes repetidas en varias páginas se entregan una sola vez. Las máscaras y gráficos vectoriales no se consideran imágenes incrustadas.',
    },
    'pdf-to-text': {
      name: 'PDF a texto',
      short: 'Extrae el texto ya presente en el documento.',
      description: 'Vuelca a texto plano el contenido textual del PDF, sin OCR.',
      action: 'Extraer texto',
      note: 'Solo extrae el texto que ya está embebido en el PDF. Para documentos escaneados usa la herramienta de OCR.',
    },
    ocr: {
      name: 'OCR',
      short: 'Reconoce texto en documentos escaneados y lo hace buscable.',
      description:
        'Pasa reconocimiento óptico sobre las páginas escaneadas y añade una capa de texto invisible para poder buscar y copiar.',
      action: 'Reconocer texto',
      note: 'El modelo de idioma se sirve desde el propio origen (~2-4 MB por idioma, se cachea). Las páginas nunca salen del navegador.',
      options: {
        language: {
          label: 'Idioma del documento',
          choices: { spa: 'Español', eng: 'Inglés' },
        },
      },
    },

    number: {
      name: 'Numerar páginas',
      short: 'Añade numeración con la posición y el formato que elijas.',
      description:
        'Escribe el número de página sobre el documento usando una de las fuentes base del formato PDF, así que no engorda el fichero.',
      action: 'Numerar páginas',
      options: {
        position: {
          label: 'Posición',
          choices: {
            'bottom-center': 'Abajo centro',
            'bottom-right': 'Abajo derecha',
            'bottom-left': 'Abajo izquierda',
            'top-center': 'Arriba centro',
            'top-right': 'Arriba derecha',
            'top-left': 'Arriba izquierda',
          },
        },
        start: { label: 'Empezar en' },
        size: { label: 'Tamaño (pt)' },
        margin: { label: 'Margen (pt)' },
        withTotal: { label: 'Mostrar "n / total"' },
        skipFirst: { label: 'No numerar la portada' },
      },
    },
    'header-footer': {
      name: 'Encabezado y pie',
      short: 'Añade texto configurable arriba o abajo de las páginas.',
      description:
        'Escribe un encabezado, un pie o ambos. Puedes insertar el número de página, el total, el nombre del archivo y la fecha local.',
      action: 'Añadir encabezado y pie',
      options: {
        header: {
          label: 'Encabezado',
          help: 'Variables: {page}, {total}, {file}, {date}. Se admite texto vacío.',
        },
        footer: {
          label: 'Pie de página',
          help: 'Variables: {page}, {total}, {file}, {date}. Se admite texto vacío.',
        },
        size: { label: 'Tamaño (pt)' },
        margin: { label: 'Margen (pt)' },
        pages: { label: 'Páginas', help: 'Deja "1-" para aplicar a todo el documento.' },
      },
    },
    watermark: {
      name: 'Marca de agua',
      short: 'Superpón un texto o un logotipo en todas las páginas.',
      description: 'Añade una marca de agua con control de opacidad, giro y posición.',
      action: 'Aplicar marca de agua',
      options: {
        text: { label: 'Texto' },
        position: {
          label: 'Posición',
          choices: {
            center: 'Centro (en diagonal)',
            'top-left': 'Arriba izquierda',
            'top-center': 'Arriba centro',
            'top-right': 'Arriba derecha',
            'bottom-left': 'Abajo izquierda',
            'bottom-center': 'Abajo centro',
            'bottom-right': 'Abajo derecha',
          },
        },
        color: {
          label: 'Color',
          choices: { gray: 'Gris', red: 'Rojo', blue: 'Azul', black: 'Negro' },
        },
        opacity: { label: 'Opacidad (%)' },
        size: { label: 'Tamaño (pt)' },
        rotation: { label: 'Giro (°)' },
        pages: {
          label: 'Páginas',
          help: 'Deja "1-" para marcar el documento entero.',
        },
      },
    },
    crop: {
      name: 'Recortar',
      short: 'Ajusta los márgenes visibles de las páginas.',
      description: 'Cambia el área visible del documento sin tocar su contenido.',
      action: 'Recortar',
      note: 'El recorte solo cambia la caja visible: el contenido fuera de ella sigue ahí, solo no se muestra.',
      options: {
        applyTo: {
          label: 'Aplicar a',
          choices: { all: 'Todas las páginas', one: 'Solo esta página' },
        },
      },
      preview: {
        title: 'Área visible',
        hint: 'Haz clic y arrastra sobre la página para crear el recorte. Después muévelo o redimensiónalo desde las esquinas.',
        reset: 'Restablecer',
        newCrop: 'Nuevo recorte',
        pageOf: 'Página {n} de {total}',
        prevPage: 'Página anterior',
        nextPage: 'Página siguiente',
      },
    },
    compare: {
      name: 'Comparar PDF',
      short: 'Enfrenta dos versiones y resalta lo que cambió.',
      description: 'Compara dos PDFs página a página: rojo en A = lo que se eliminó, verde en B = lo que se añadió.',
      action: 'Comparar',
      note: 'Las páginas se emparejan por índice. Si un PDF tiene más páginas que el otro, las sobrantes aparecen tal cual.',
      options: {
        tolerance: {
          label: 'Tolerancia de diferencia',
          help: 'De 0 (cualquier cambio) a 255 (solo diferencias muy grandes). 30 es un valor razonable para la mayoría de documentos.',
        },
      },
    },

    compress: {
      name: 'Comprimir PDF',
      short: 'Reduce el peso del PDF sin subirlo a ningún servidor.',
      description:
        'Comprime las imágenes incrustadas y limpia la estructura interna del documento. El texto sigue siendo texto: no se modificará.',
      action: 'Comprimir PDF',
      options: {
        level: {
          label: 'Nivel',
          choices: {
            light: 'Ligero (menos reducción)',
            balanced: 'Equilibrado',
            max: 'Máximo (más reducción)',
          },
        },
      },
    },
    grayscale: {
      name: 'Escala de grises',
      short: 'Convierte el PDF a blanco y negro para imprimir o reducir su peso.',
      description:
        'Convierte los colores de texto y gráficos a luminancia y re-encodea las imágenes JPEG en escala de grises. El texto sigue siendo texto y no se rasteriza.',
      action: 'Convertir a escala de grises',
      note: 'Las transparencias, perfiles de color y formatos de imagen distintos de JPEG pueden conservar parte de su comportamiento o color original.',
    },
    flatten: {
      name: 'Aplanar PDF',
      short: 'Convierte los campos rellenables en contenido fijo.',
      description:
        'Integra los valores visibles de los formularios en las páginas y elimina sus campos editables, sin rasterizar el texto ni los gráficos.',
      action: 'Aplanar PDF',
      note: 'Aplana los campos de formulario AcroForm. Después no se podrán editar ni rellenar.',
    },
    repair: {
      name: 'Reparar PDF',
      short: 'Recupera documentos con la estructura dañada.',
      description: 'Reescribe la tabla de referencias del PDF para rescatar ficheros que no abren.',
      action: 'Reparar',
      note: 'Se prueban varias estrategias, de la más fiel a la más agresiva. Lo que se perdió no vuelve: de un fichero truncado se rescata hasta el último objeto completo.',
    },

    protect: {
      name: 'Proteger con contraseña',
      short: 'Cifra el documento con AES en tu propio equipo.',
      description:
        'Aplica cifrado AES-256 al PDF con una contraseña. La contraseña nunca se transmite porque no hay nada a lo que transmitirla.',
      action: 'Proteger',
      options: {
        password: { label: 'Contraseña' },
        confirm: { label: 'Repite la contraseña' },
      },
    },
    unlock: {
      name: 'Quitar contraseña',
      short: 'Elimina el cifrado de un PDF cuya contraseña conoces.',
      description: 'Descifra el documento y guarda una copia sin protección.',
      action: 'Quitar contraseña',
      note: 'Hace falta la contraseña. Esto no rompe cifrado ajeno.',
      options: {
        password: {
          label: 'Contraseña',
          help: 'Si el documento se abre sin pedirla, déjala vacía.',
        },
      },
    },
    sign: {
      name: 'Firmar PDF',
      short: 'Coloca tu firma sobre el documento.',
      description: 'Escribe, dibuja o sube tu firma y colócala donde quieras con una vista previa de la página.',
      action: 'Firmar',
      note: 'La firma es visual: se estampa como una imagen. No genera una firma criptográfica.',
      options: {
        applyTo: {
          label: 'Aplicar a',
          choices: { one: 'Solo esta página', all: 'Todas las páginas' },
        },
      },
      preview: {
        source: 'Origen de la firma',
        modes: { text: 'Texto', draw: 'Dibujar', image: 'Imagen' },
        textPlaceholder: 'Tu nombre',
        textHint: 'Se redibuja en cada cambio con el estilo elegido.',
        textStyle: 'Estilo',
        textColor: 'Color',
        textSize: 'Tamaño',
        styles: { script: 'Script', serif: 'Serif', sans: 'Sans' },
        colors: { black: 'Negro', blue: 'Azul', gray: 'Gris' },
        drawHint: 'Dibuja con el ratón o el dedo.',
        drawClear: 'Limpiar',
        imageHint: 'Sube una imagen. Lo ideal es PNG con fondo transparente.',
        imageChange: 'Cambiar imagen',
        noImage: 'Aún no has subido ninguna imagen.',
        position: 'Posición',
        positionHint: 'Haz clic o arrastra sobre la página para colocar la firma.',
        widthLabel: 'Ancho en la página (pt)',
        pageOf: 'Página {n} de {total}',
        prevPage: 'Página anterior',
        nextPage: 'Página siguiente',
        empty: 'Crea o sube una firma para ver la vista previa.',
      },
    },
    edit: {
      name: 'Editar PDF',
      short: 'Añade texto, imágenes, dibujos y formas sobre tus páginas.',
      description: 'Edita visualmente un PDF en el navegador con herramientas para texto, imágenes, lápiz y formas.',
      action: 'Exportar PDF editado',
      note: 'Los elementos se colocan como contenido nuevo sobre la página. El texto original del PDF no se modifica.',
      preview: {
        title: 'Editor PDF', hint: 'Elige una herramienta y dibuja sobre la página. Usa la mano para seleccionar y mover elementos.',
        hand: 'Seleccionar y mover', organizeLabel: 'Organizar', bringForward: 'Traer adelante', sendBackward: 'Enviar atrás', alignHorizontal: 'Centrar horizontalmente', alignVertical: 'Centrar verticalmente', text: 'Añadir texto', image: 'Añadir imagen', pencil: 'Dibujar con lápiz', shape: 'Añadir forma', highlight: 'Resaltar texto', underlineText: 'Subrayar texto', strikeText: 'Tachar texto',
        color: 'Texto / trazo', borderColor: 'Color del borde', strokeWidth: 'Grosor', alignment: 'Alineación', background: 'Fondo', transparent: 'Transparente', opacity: 'Opacidad', style: 'Estilo', content: 'Texto', font: 'Fuente', size: 'Tamaño',
        rectangle: 'Rectángulo', ellipse: 'Elipse', triangle: 'Triángulo', alignLeft: 'Izquierda', alignCenter: 'Centro', alignRight: 'Derecha',
        delete: 'Eliminar', rotate: 'Rotar', resize: 'Cambiar tamaño', undo: 'Deshacer', redo: 'Rehacer', pageNumber: 'Número de página', boldMark: 'B', italicMark: 'I', underlineMark: 'U', defaultText: 'Escribe aquí', pageOf: 'Página {n} de {total}', prevPage: 'Página anterior', nextPage: 'Página siguiente',
      },
    },
    redact: {
      name: 'Censurar',
      short: 'Elimina texto del PDF de forma irreversible.',
      description: 'Dibuja rectángulos sobre el texto que quieres quitar. El texto se borra del documento, no se tapa con un rectángulo.',
      action: 'Censurar',
      note: 'El texto seleccionado se elimina del PDF: la página entera se convierte en imagen y el texto deja de ser texto. No es reversible.',
      preview: {
        title: 'Zonas a censurar',
        hint: 'Arrastra sobre la página para dibujar un rectángulo. Clic en uno existente para borrarlo.',
        clearPage: 'Borrar página',
        removeRegion: 'Borrar este rectángulo',
        pageOf: 'Página {n} de {total}',
        prevPage: 'Página anterior',
        nextPage: 'Página siguiente',
      },
    },
    metadata: {
      name: 'Editar metadatos',
      short: 'Cambia el título, autor, asunto y palabras clave del PDF.',
      description:
        'Edita los campos del diccionario de información del PDF (Título, Autor, Asunto, Palabras clave). Se rellenan con los valores actuales al cargar el documento.',
      action: 'Aplicar metadatos',
      note: 'Para compartir sin dejar rastro, deja todos los campos vacíos. La fecha de modificación la actualiza la propia librería al guardar.',
      options: {
        title: { label: 'Título' },
        author: { label: 'Autor' },
        subject: { label: 'Asunto' },
        keywords: {
          label: 'Palabras clave',
          placeholder: 'informe, 2026, facturación',
        },
      },
      preview: {
        statusLoading: 'Leyendo los metadatos del PDF…',
        statusLoaded: 'Valores actuales del PDF cargados.',
        statusEmpty: 'El PDF no tiene metadatos.',
        statusError: 'No se pudieron leer los metadatos.',
        clearAll: 'Limpiar todos los campos',
      },
    },
    report: {
      name: 'Informe técnico del PDF',
      short: 'Consulta y descarga un resumen técnico del documento.',
      description: 'Analiza localmente la estructura visible del PDF y genera un informe técnico descargable.',
      action: 'Generar informe',
      note: 'El informe distingue los datos detectados de los aspectos que PDF.js no puede analizar con seguridad.',
    },
    bookmarks: {
      name: 'Crear marcadores',
      short: 'Añade una navegación jerárquica a tu PDF.',
      description: 'Crea marcadores PDF con títulos, páginas de destino y niveles anidados.',
      action: 'Crear marcadores',
      note: 'Los marcadores existentes se sustituyen por los que definas aquí y aparecerán en el visor PDF. No se modifica ni se añade ninguna página al documento.',
      preview: {
        title: 'Marcadores del PDF',
        hint: 'Escribe una entrada por fila. El nivel 1 es principal; los niveles siguientes quedan anidados bajo la entrada anterior compatible.',
        entryTitle: 'Título',
        entryTitlePlaceholder: 'Por ejemplo, Introducción',
        page: 'Página',
        level: 'Nivel',
        add: 'Añadir marcador',
        remove: 'Eliminar marcador {n}',
      },
    },
  },
}
