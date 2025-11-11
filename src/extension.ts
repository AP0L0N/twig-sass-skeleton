// src/extension.ts
import * as vscode from 'vscode';
import * as cheerio from 'cheerio';

console.log('TWIG SASS EXTENSION LOADED!');

let panel: vscode.WebviewPanel | undefined;
let updateTimeout: NodeJS.Timeout;

function generateSassStructure(content: string): string {
  try {
    const $ = cheerio.load(content, { xmlMode: false });
    let sass = '';

    const BOOTSTRAP_REGEXES: RegExp[] = [
      /^container(-fluid)?$/,
      /^row$/,
      /^col(-(auto|\d+|sm|md|lg|xl|xxl)(-\d+)?)?$/,
      /^g[xy]?-\d+$/,
      /^(m|p)[trblxy]?-\d+$/,
      /^(mt|mb|ms|me|mx|my|pt|pb|ps|pe|px|py)-\d+$/,
      /^(text|bg|border|rounded|shadow|fw|fst|lh|user-select|pe|ps|d|float|position|top|start|end|bottom|align|justify|order|flex|gap|z|w|h|min-vw|min-vh|max-vw|max-vh|overflow|opacity)-/,
      /^btn(-[a-z0-9-]+)?$/,
      /^nav(-[a-z0-9-]+)?$/,
      /^navbar(-[a-z0-9-]+)?$/,
      /^dropdown(-[a-z0-9-]+)?$/,
      /^breadcrumb(-[a-z0-9-]+)?$/,
      /^alert(-[a-z0-9-]+)?$/
    ];

    function isBootstrapClass(className: string): boolean {
      return BOOTSTRAP_REGEXES.some(rx => rx.test(className));
    }

    function getBemBase(className: string): string {
      const idxDoubleUnderscore = className.indexOf('__');
      const idxDoubleDash = className.indexOf('--');
      const idx = [idxDoubleUnderscore, idxDoubleDash].filter(i => i >= 0).sort((a, b) => a - b)[0];
      return idx >= 0 ? className.slice(0, idx) : className;
    }

    function indent(depth: number): string {
      return '  '.repeat(depth);
    }

    function formatSelector(cls: string, parentBlockClass?: string): string {
      if (!parentBlockClass) return `.${cls}`;
      if (cls.startsWith(`${parentBlockClass}__`)) {
        return `&__${cls.slice(parentBlockClass.length + 2)}`;
      }
      if (cls.startsWith(`${parentBlockClass}--`)) {
        return `&--${cls.slice(parentBlockClass.length + 2)}`;
      }
      if (cls.startsWith(`${parentBlockClass}-`)) {
        return `&-${cls.slice(parentBlockClass.length + 1)}`;
      }
      return `.${cls}`;
    }

    function traverse(el: cheerio.Element, parentSelector = '', parentBlockClass?: string, depth = 0): string {
      let localSass = '';
      const $el = $(el);
      const classes = ($el.attr('class') || '')
        .split(/\s+/)
        .map(c => c.trim())
        .filter(Boolean)
        .filter(c => !isBootstrapClass(c));

      if (classes.length > 0) {
        // Use a Set to avoid duplicating identical class blocks on the same element
        const uniqueClasses = Array.from(new Set(classes));
        uniqueClasses.forEach(cls => {
          const selector = formatSelector(cls, parentBlockClass);
          localSass += `${indent(depth)}${selector} {\n`;

          // Recurse into children with this class as the new parent block context
          $el.children().each((_, child) => {
            localSass += traverse(
              child,
              parentSelector ? `${parentSelector} .${cls}` : `.${cls}`,
              getBemBase(cls),
              depth + 1
            );
          });

          localSass += `${indent(depth)}}\n\n`;
        });
      } else {
        // No relevant class? Continue traversal to find classed descendants
        $el.children().each((_, child) => {
          localSass += traverse(child, parentSelector, parentBlockClass, depth);
        });
      }

      return localSass;
    }

    // Start from body or first element
    const root = $('body')[0] || $('html')[0] || $.root()[0];
    if (root) {
      $(root).children().each((_, child) => {
        sass += traverse(child);
      });
    }

    // Clean up trailing whitespace/newlines
    sass = sass.replace(/\n{3,}/g, '\n\n');

    return sass || '/* No classes found (after filtering Bootstrap classes) */\n';
  } catch (err) {
    return `/* Error parsing: ${(err as Error).message} */\n`;
  }
}

function getWebviewContent(sass: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: var(--vscode-font-family, sans-serif); padding: 16px; background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); }
          pre { background: var(--vscode-textCodeBlock-background); padding: 12px; border-radius: 6px; overflow-x: auto; white-space: pre; margin: 12px 0; }
          button { 
            background: var(--vscode-button-background); 
            color: var(--vscode-button-foreground); 
            border: none; 
            padding: 8px 16px; 
            border-radius: 4px; 
            cursor: pointer; 
            font-weight: 600;
          }
          button:hover { background: var(--vscode-button-hoverBackground); }
          h3 { margin-top: 0; }
        </style>
      </head>
      <body>
        <h3>SASS Skeleton (Live)</h3>
        <pre id="sass-output">${sass.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        <button onclick="copySass()">Copy to Clipboard</button>
        <script>
          function copySass() {
            const text = document.getElementById('sass-output').innerText;
            navigator.clipboard.writeText(text).then(() => {
              const btn = document.querySelector('button');
              const original = btn.innerText;
              btn.innerText = 'Copied!';
              setTimeout(() => btn.innerText = original, 1500);
            });
          }
        </script>
      </body>
    </html>
  `;
}

export function activate(context: vscode.ExtensionContext) {
  console.log('TWIG SASS EXTENSION ACTIVATED!');
  vscode.window.showInformationMessage('Twig SASS: Activated!');

  // Register command to open sidebar
  const command = vscode.commands.registerCommand('twig-sass-skeleton.showSidebar', () => {
	if (panel) {
      panel.reveal(vscode.ViewColumn.Beside);
      updateContent();
      return;
    }

    panel = vscode.window.createWebviewPanel(
      'sassSkeleton',
      'SASS Skeleton',
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    panel.onDidDispose(() => { panel = undefined; }, null, context.subscriptions);
    updateContent();
  });

  context.subscriptions.push(command);

  // Auto-update when active editor changes
  const editorChange = vscode.window.onDidChangeActiveTextEditor(() => {
    if (panel) updateContent();
  });
  context.subscriptions.push(editorChange);

  // Auto-update on text changes (debounced)
  const textChange = vscode.workspace.onDidChangeTextDocument((e) => {
    if (!panel) return;
    const editor = vscode.window.activeTextEditor;
    if (editor && e.document === editor.document) {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(updateContent, 400);
    }
  });
  context.subscriptions.push(textChange);
}

function updateContent() {
  if (!panel) return;

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    panel.webview.html = getWebviewContent('/* Open a .twig or .html file */');
    return;
  }

  const lang = editor.document.languageId;
  if (!['html', 'twig', 'php', 'blade', 'plaintext'].includes(lang)) {
    panel.webview.html = getWebviewContent('/* Only works in HTML/Twig files */');
    return;
  }

  const content = editor.document.getText();
  const sass = generateSassStructure(content);
  panel.webview.html = getWebviewContent(sass);
}

export function deactivate() {
  if (panel) panel.dispose();
}