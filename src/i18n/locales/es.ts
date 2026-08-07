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
    tagline: 'Herramientas PDF que nunca ven tus documentos.',
    claim:
      'Todo se ejecuta dentro de tu navegador. Tus archivos no se suben, no se copian y no salen de este dispositivo.',
  },

  header: {
    home: '{app}, inicio',
    badge: 'Se ejecuta en tu dispositivo',
    howItWorks: 'Cómo funciona',
    tools: 'Herramientas',
  },

  kofi: 'Invítame a un café',

  footer: {
    line: '© {year} {name}. Sin servidores, sin cuentas, sin analítica.',
    link: 'Cómo comprobar que no subimos nada',
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
      title: 'Sin cuentas ni rastreo',
      body: 'No hay registro, cookies de sesión, analítica, publicidad ni fuentes o scripts de terceros. Nada que asociar contigo.',
    },
    private: {
      title: '100% privado',
      body: 'El documento no se copia a ningún disco ni servidor: solo vive en la memoria de la pestaña hasta que la cierras.',
    },
  },

  categories: {
    paginas: { name: 'Organizar y gestionar', blurb: 'Reorganiza, anota y ajusta el contenido de las páginas.' },
    conversiones: { name: 'Conversiones', blurb: 'Cambia de formato, reduce peso o repara el documento.' },
    seguridad: { name: 'Seguridad', blurb: 'Contraseñas, firmas y contenido sensible.' },
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
    close: 'Cerrar',
    loading: 'Cargando…',
    ephemeral: 'Los resultados están en la memoria de esta pestaña. Al cerrarla desaparecen.',
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
        body: 'Abre las herramientas de desarrollo (F12), ve a Red y procesa un documento. Verás peticiones para cargar la propia aplicación y ninguna después. No hay ningún POST con tu archivo.',
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
        body: 'Al cargar la página, el servidor que la aloja ve tu IP y tu navegador, como cualquier otra web. Lo que nunca ve es tu documento.',
      },
      theme: {
        strong: 'Se guardan dos preferencias.',
        body: 'El tema y el idioma se recuerdan en el almacenamiento local del navegador, con las claves «theme» y «lang». Nada más: son ajustes de la interfaz y no dicen nada de tus documentos. El idioma, si no lo has elegido, sale del que tenga tu sistema.',
      },
      power: {
        strong: 'Tu equipo pone la potencia.',
        body: 'Un documento muy grande puede tardar o agotar la memoria de la pestaña. Ese es el precio de no delegar el trabajo en un servidor ajeno.',
      },
    },
  },

  errors: {
    badRange: 'No entiendo "{part}". Usa formatos como 1-3, 5 o 9-.',
    reversedRange: 'Rango invertido en "{part}".',
    emptySelection: 'La selección de páginas está vacía.',
    noPage: 'La página {page} no existe.',
    noPageOf: 'La página {page} no existe: el documento tiene {total}.',
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
  },

  /** Trozos de nombre de fichero: sin acentos ni espacios, van al disco. */
  filenames: {
    merged: 'combinado',
    images: 'imagenes',
    selection: 'seleccion',
    numbered: 'numerado',
    compressed: 'comprimido',
    rotated: 'rotado',
    repaired: 'reparado',
    protected: 'protegido',
    unlocked: 'sin-contraseña',
    watermark: 'marca-de-agua',
    signed: 'firmado',
    organized: 'organizado',
    cropped: 'recortado',
  },

  progress: {
    page: 'Página {n}',
    document: 'Documento {n} de {total}',
    reading: 'Leyendo {name}',
    readingPdf: 'Leyendo el PDF',
    compressingImages: 'Comprimiendo imágenes',
    writingPdf: 'Escribiendo el PDF',
    repairing: 'Reconstruyendo la estructura',
    rebuildingObjects: 'Recuperando los objetos',
    salvaging: 'Rescatando lo que queda',
    encrypting: 'Cifrando el documento',
    decrypting: 'Descifrando el documento',
    done: 'Listo',
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
          },
        },
        ranges: {
          label: 'Páginas',
          help: 'Rangos separados por comas. Deja "1-" para todo el documento.',
        },
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
      short: 'Reordena, duplica y elimina páginas con vista previa.',
      description:
        'Vista de miniaturas para reordenar, duplicar o borrar páginas antes de exportar.',
      action: 'Organizar',
      note: 'El orden de la lista es el orden final. Arrastra para reordenar o usa los botones.',
      preview: {
        title: 'Páginas',
        hint: 'Arrastra las miniaturas para reordenar. Cada página conserva su número original a la derecha.',
        position: 'Posición',
        original: 'Original',
        moveUp: 'Subir',
        moveDown: 'Bajar',
        duplicate: 'Duplicar',
        remove: 'Quitar',
        reset: 'Restablecer orden',
        empty: 'No queda ninguna página. Duplica alguna para empezar.',
        count: '{n} páginas',
      },
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
    'pdf-to-text': {
      name: 'PDF a texto',
      short: 'Extrae el texto ya presente en el documento.',
      description: 'Vuelca a texto plano el contenido textual del PDF, sin OCR.',
      action: 'Extraer texto',
    },
    ocr: {
      name: 'OCR',
      short: 'Reconoce texto en documentos escaneados y lo hace buscable.',
      description:
        'Pasa reconocimiento óptico sobre las páginas escaneadas y añade una capa de texto invisible para poder buscar y copiar.',
      action: 'Reconocer texto',
      note: 'El modelo de idioma se descarga una vez y se queda en caché. Las páginas nunca salen del navegador.',
    },
    'html-to-pdf': {
      name: 'Web a PDF',
      short: 'Guarda una página HTML local como PDF.',
      description: 'Convierte un fichero HTML de tu disco en un PDF paginado.',
      action: 'Convertir',
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
      description: 'Compara el texto de dos documentos y marca añadidos y eliminados.',
      action: 'Comparar',
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
    repair: {
      name: 'Reparar PDF',
      short: 'Recupera documentos con la estructura dañada.',
      description: 'Reescribe la tabla de referencias del PDF para rescatar ficheros que no abren.',
      action: 'Reparar',
      note: 'Se prueban varias estrategias, de la más fiel a la más agresiva. Lo que se perdió no vuelve: de un fichero truncado se rescata hasta el último objeto completo.',
    },
    pdfa: {
      name: 'Convertir a PDF/A',
      short: 'Formato de archivo a largo plazo.',
      description: 'Convierte el documento al perfil PDF/A para conservación y trámites oficiales.',
      action: 'Convertir',
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
    redact: {
      name: 'Redactar',
      short: 'Elimina información sensible de verdad, no solo tapada.',
      description:
        'Borra el contenido seleccionado del documento en lugar de cubrirlo con un rectángulo.',
      action: 'Redactar',
      note: 'Tapar con un rectángulo negro no borra nada: el texto se sigue pudiendo copiar. Aquí se elimina de verdad.',
    },
  },
}
