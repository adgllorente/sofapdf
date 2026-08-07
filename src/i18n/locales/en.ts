import type { es } from './es'

/** El tipo lo impone el español: si falta una clave, esto no compila. */
export const en: typeof es = {
  meta: {
    lang: 'en',
    description:
      'PDF tools that run entirely inside your browser. Your documents are never uploaded to any server.',
  },

  brand: {
    tagline: 'PDF tools that never see your documents.',
    claim:
      'Everything runs inside your browser. Your files are not uploaded, not copied, and never leave this device.',
  },

  header: {
    home: '{app}, home',
    badge: 'Runs on your device',
    howItWorks: 'How it works',
  },

  kofi: 'Buy me a coffee',

  footer: {
    line: '© {year} {name}. No servers, no accounts, no analytics.',
    link: 'How to check that we upload nothing',
  },

  locale: {
    names: { es: 'Spanish', en: 'English' },
    switchTo: 'Switch to {name}',
  },

  theme: {
    toLight: 'Switch to light theme',
    toDark: 'Switch to dark theme',
  },

  hero: {
    badge: 'Your documents never leave this device',
    tools: 'See the tools',
    verify: 'Check it yourself',
  },

  privacyPoints: {
    noUpload: {
      title: 'No uploads',
      body: 'There is no file server. The document is opened with the browser File API and lives only in this tab’s memory.',
    },
    offline: {
      title: 'Works offline',
      body: 'Cut the WiFi and it keeps working. That is the simplest proof that the processing is local.',
    },
    noTracking: {
      title: 'No accounts, tracking or ads',
      body: 'No sign-up, no session cookies, no analytics, no ads, no third-party fonts or scripts. Nothing to tie back to you.',
    },
  },

  categories: {
    organizar: { name: 'Organise', blurb: 'Merge, split and reorder pages.' },
    convertir: { name: 'Convert', blurb: 'Into and out of the PDF format.' },
    editar: { name: 'Edit', blurb: 'Add things to the document, or take them out.' },
    optimizar: { name: 'Optimise', blurb: 'Cut file size and fix damaged files.' },
    seguridad: { name: 'Security', blurb: 'Passwords, signatures and sensitive content.' },
  },

  accept: {
    pdf: 'PDF',
    image: 'JPG or PNG',
    html: 'HTML',
  },

  dropzone: {
    dragOne: 'Drop your {accept} file here',
    dragMany: 'Drop your {accept} files here',
    pickOne: 'Choose file',
    pickMany: 'Choose files',
    hint: 'The file is opened in memory. It is not sent anywhere.',
    up: 'Move up',
    down: 'Move down',
    remove: 'Remove {name}',
  },

  options: {
    title: 'Options',
    on: 'On',
    off: 'Off',
  },

  run: {
    back: 'All tools',
    processing: 'Working…',
    reset: 'Start over',
    needOne: 'Add a file to begin.',
    needMany: 'Add at least {n} files.',
    working: 'Working in your browser…',
    failed: 'Something went wrong while processing the file.',
    doneOne: 'Done, 1 file',
    doneMany: 'Done, {n} files',
    zip: 'Download all (.zip)',
    download: 'Download',
    ephemeral: 'The results live in this tab’s memory. Closing it discards them.',
  },

  card: {
    soon: 'Soon',
  },

  notFound: {
    kicker: 'Nothing here',
    title: 'This tool does not exist yet',
    body: 'It may be on the way, or the link may be misspelled.',
    cta: 'Back to the start',
  },

  privacy: {
    title: 'How it works, and how to check it',
    intro:
      'Most online PDF tools upload your document to a server, process it there and promise to delete it a few hours later. {app} has no server to upload anything to.',
    steps: {
      pick: {
        title: '1. You pick a file',
        body: 'The browser asks your permission and hands the contents to the tab through the File API. Those contents live in the tab’s RAM; they are not copied to any disk or any server.',
      },
      process: {
        title: '2. It is processed here',
        body: 'The libraries that manipulate the PDF were downloaded with the page and run on your CPU. The heavy work happens in a Web Worker so the interface stays responsive.',
      },
      download: {
        title: '3. You download the result',
        body: 'The output file is built in memory and offered to you as a local download. Close the tab and all of the above is gone.',
      },
    },
    verifyTitle: 'Don’t trust us: verify it',
    verifyBody:
      'Any website can write “we don’t keep your files”. These three checks take you a minute.',
    checks: {
      offline: {
        title: 'Disconnect from the internet',
        body: 'Load the page, turn on airplane mode or switch off the WiFi, then use any tool. If it works with no network, there is nothing on the other side.',
      },
      devtools: {
        title: 'Watch the Network tab in DevTools',
        body: 'Open the developer tools (F12), go to Network and process a document. You will see requests that load the app itself and none afterwards. There is no POST carrying your file.',
      },
      source: {
        title: 'Read the code',
        body: 'This is a static app: HTML, CSS and JavaScript. You can read the served source and confirm that no upload endpoint exists.',
      },
    },
    limitsTitle: 'What does happen',
    limitsIntro: 'Being honest about the limits is part of the deal:',
    limits: {
      ip: {
        strong: 'Serving the site leaves a trace.',
        body: 'When the page loads, the server that hosts it sees your IP and your browser, like any other website. What it never sees is your document.',
      },
      theme: {
        strong: 'Two preferences are stored.',
        body: 'The theme and the language are remembered in the browser’s local storage, under the keys “theme” and “lang”. Nothing else: they are interface settings and say nothing about your documents. If you never picked a language, it comes from your system.',
      },
      power: {
        strong: 'Your machine does the work.',
        body: 'A very large document may be slow or exhaust the tab’s memory. That is the price of not handing the job to someone else’s server.',
      },
    },
  },

  errors: {
    badRange: 'I don’t understand "{part}". Use formats like 1-3, 5 or 9-.',
    reversedRange: 'Reversed range in "{part}".',
    emptySelection: 'The page selection is empty.',
    noPage: 'Page {page} does not exist.',
    noPageOf: 'Page {page} does not exist: the document has {total}.',
    exportPage: 'Page {page} could not be exported.',
    noImages: 'No image could be read.',
    emptyPassword: 'Enter a password.',
    passwordMismatch: 'The two passwords do not match.',
    passwordReservedChar: 'The password cannot start with “-” or “@”.',
    passwordTooLong:
      'The password takes {bytes} bytes and the encryption allows {max} (accents and emoji take several).',
    alreadyEncrypted: 'This PDF is already encrypted: remove the current password first.',
    notEncrypted: 'This PDF is not encrypted: there is no password to remove.',
    wrongPassword: 'The password does not open this document.',
    encryptFailed: 'The document could not be encrypted.',
    repairFailed: 'Could not repair it: the damage is beyond what can be rebuilt.',
    repairEncrypted:
      'The document is encrypted: remove the password with Unlock PDF and try again.',
  },

  filenames: {
    merged: 'merged',
    images: 'images',
    selection: 'selection',
    numbered: 'numbered',
    compressed: 'compressed',
    rotated: 'rotated',
    repaired: 'repaired',
    protected: 'protected',
    unlocked: 'unlocked',
  },

  progress: {
    page: 'Page {n}',
    document: 'Document {n} of {total}',
    reading: 'Reading {name}',
    readingPdf: 'Reading the PDF',
    compressingImages: 'Compressing images',
    writingPdf: 'Writing the PDF',
    repairing: 'Rebuilding the structure',
    rebuildingObjects: 'Recovering the objects',
    salvaging: 'Salvaging what is left',
    encrypting: 'Encrypting the document',
    decrypting: 'Decrypting the document',
    done: 'Done',
  },

  tools: {
    unir: {
      name: 'Merge PDF',
      short: 'Combine several documents into one, in the order you choose.',
      description:
        'Joins several PDFs into a single document. The list order is the final order; you can rearrange it before processing.',
      action: 'Merge PDF',
    },
    dividir: {
      name: 'Split PDF',
      short: 'Break it up by ranges, or pull out just the pages you need.',
      description:
        'Splits a PDF into several documents by page ranges, one per page, or extracts a specific selection into a single file.',
      action: 'Split PDF',
      options: {
        mode: {
          label: 'Mode',
          choices: {
            ranges: 'One PDF per range',
            extract: 'Extract the selection into one PDF',
            each: 'One PDF per page',
          },
        },
        ranges: {
          label: 'Pages',
          help: 'Comma-separated ranges. Leave "1-" for the whole document.',
        },
      },
    },
    rotar: {
      name: 'Rotate PDF',
      short: 'Turn every page, or only the ones you name.',
      description:
        'Applies a 90, 180 or 270 degree turn. The rotation adds to whatever each page already had.',
      action: 'Rotate PDF',
      options: {
        angle: {
          label: 'Turn',
          choices: {
            '90': '90° clockwise',
            '180': '180°',
            '270': '90° counter-clockwise',
          },
        },
        pages: {
          label: 'Pages',
          help: 'Leave "1-" to rotate the whole document.',
        },
      },
    },
    organizar: {
      name: 'Organise pages',
      short: 'Reorder, duplicate and delete pages with a preview.',
      description: 'Thumbnail view to reorder, duplicate or delete pages before exporting.',
      action: 'Organise',
    },

    'jpg-a-pdf': {
      name: 'Images to PDF',
      short: 'Turn JPG and PNG files into a PDF, one image per page.',
      description:
        'Builds a PDF from images. You can fit them to A4 or Letter with a margin, or let each page take the exact size of its image.',
      action: 'Create PDF',
      options: {
        pageSize: {
          label: 'Page size',
          choices: { a4: 'A4', letter: 'Letter', fit: 'Fit to image' },
        },
        landscape: { label: 'Landscape' },
        margin: { label: 'Margin (pt)' },
      },
    },
    'pdf-a-jpg': {
      name: 'PDF to images',
      short: 'Export the pages as JPG or PNG at the resolution you want.',
      description:
        'Rasterises each page with the same render engine the browser viewer uses and exports it as an image.',
      action: 'Export images',
      note: 'Rasterising turns text into pixels: the result is no longer selectable or searchable.',
      options: {
        pages: { label: 'Pages' },
        format: {
          label: 'Format',
          choices: { jpeg: 'JPG', png: 'PNG (lossless)' },
        },
        scale: {
          label: 'Resolution',
          choices: {
            '1': '72 dpi (screen)',
            '2': '144 dpi (recommended)',
            '4': '288 dpi (print)',
          },
        },
        quality: { label: 'JPG quality' },
      },
    },
    'pdf-a-texto': {
      name: 'PDF to text',
      short: 'Extract the text already present in the document.',
      description: 'Dumps the textual content of the PDF as plain text, without OCR.',
      action: 'Extract text',
    },
    ocr: {
      name: 'OCR',
      short: 'Recognise text in scanned documents and make it searchable.',
      description:
        'Runs optical recognition over the scanned pages and adds an invisible text layer so you can search and copy.',
      action: 'Recognise text',
      note: 'The language model is downloaded once and cached. The pages never leave the browser.',
    },
    'html-a-pdf': {
      name: 'Web to PDF',
      short: 'Save a local HTML page as a PDF.',
      description: 'Converts an HTML file from your disk into a paginated PDF.',
      action: 'Convert',
    },

    numerar: {
      name: 'Number pages',
      short: 'Add page numbers in the position and format you choose.',
      description:
        'Writes the page number onto the document using one of the PDF base fonts, so it does not grow the file.',
      action: 'Number pages',
      options: {
        position: {
          label: 'Position',
          choices: {
            'bottom-center': 'Bottom centre',
            'bottom-right': 'Bottom right',
            'bottom-left': 'Bottom left',
            'top-center': 'Top centre',
            'top-right': 'Top right',
            'top-left': 'Top left',
          },
        },
        start: { label: 'Start at' },
        size: { label: 'Size (pt)' },
        margin: { label: 'Margin (pt)' },
        withTotal: { label: 'Show "n / total"' },
        skipFirst: { label: 'Skip the cover page' },
      },
    },
    'marca-de-agua': {
      name: 'Watermark',
      short: 'Overlay text or a logo on every page.',
      description: 'Adds a watermark with control over opacity, rotation and position.',
      action: 'Apply watermark',
    },
    recortar: {
      name: 'Crop',
      short: 'Adjust the visible margins of the pages.',
      description: 'Changes the visible area of the document without touching its content.',
      action: 'Crop',
    },
    comparar: {
      name: 'Compare PDF',
      short: 'Put two versions side by side and highlight what changed.',
      description: 'Compares the text of two documents and marks additions and deletions.',
      action: 'Compare',
    },

    comprimir: {
      name: 'Compress PDF',
      short: 'Shrink the PDF without uploading it to any server.',
      description:
        'Compresses the embedded images and cleans up the internal structure of the document. Text stays text: it is left untouched.',
      action: 'Compress PDF',
      options: {
        level: {
          label: 'Level',
          choices: {
            light: 'Light (less reduction)',
            balanced: 'Balanced',
            max: 'Maximum (more reduction)',
          },
        },
      },
    },
    reparar: {
      name: 'Repair PDF',
      short: 'Recover documents with a damaged structure.',
      description: 'Rewrites the PDF cross-reference table to rescue files that will not open.',
      action: 'Repair',
      note: 'It tries several strategies, from the most faithful to the most aggressive. What was lost does not come back: from a truncated file it salvages up to the last complete object.',
    },
    'pdf-a': {
      name: 'Convert to PDF/A',
      short: 'Long-term archival format.',
      description:
        'Converts the document to the PDF/A profile for preservation and official paperwork.',
      action: 'Convert',
    },

    proteger: {
      name: 'Password-protect',
      short: 'Encrypt the document with AES on your own machine.',
      description:
        'Encrypts the PDF with AES-256 and a password. The password is never transmitted because there is nothing to transmit it to.',
      action: 'Protect',
      options: {
        password: { label: 'Password' },
        confirm: { label: 'Repeat the password' },
      },
    },
    desbloquear: {
      name: 'Remove password',
      short: 'Strip the encryption from a PDF whose password you know.',
      description: 'Decrypts the document and saves an unprotected copy.',
      action: 'Remove password',
      note: 'The password is required. This does not break someone else’s encryption.',
      options: {
        password: {
          label: 'Password',
          help: 'If the document opens without asking for one, leave it empty.',
        },
      },
    },
    firmar: {
      name: 'Sign PDF',
      short: 'Place your signature on the document.',
      description: 'Draw or upload your signature and position it on the page.',
      action: 'Sign',
    },
    redactar: {
      name: 'Redact',
      short: 'Actually remove sensitive information, not just cover it.',
      description:
        'Deletes the selected content from the document instead of covering it with a box.',
      action: 'Redact',
      note: 'Covering text with a black box deletes nothing: it can still be copied. Here it is really removed.',
    },
  },
}
