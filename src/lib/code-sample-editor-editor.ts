import { customElement, LitElement, html, query, PropertyValues, property, css } from 'lit-element';
// import monacoStyles from '../monaco_build/monaco.css.js';
import { AcceptableExtensions, Message } from './types';
import { editor } from '../../monaco/monaco'
import { recieveMessageChannelHandshake } from './util';


(window.self as any)['MonacoEnvironment'] = {
  getWorkerUrl: function (moduleId:any, label:any) {
    if (label === 'json') {
      return '../monaco_build/json.worker.js';
    }
    if (label === 'css') {
      return '../monaco_build/css.worker.js';
    }
    if (label === 'html') {
      return '../monaco_build/html.worker.js';
    }
    if (label === 'typescript' || label === 'javascript') {
      return '../monaco_build/ts.worker.js';
    }
    return '../monaco_build/editor.worker.js';
  }
}

@customElement('code-sample-editor-editor')
export class CodeSampleEditorEditor extends LitElement {

  @property({type: String})
  initValue: string | null = null;

  @property({type: String})
  extension: AcceptableExtensions = 'js';

  @property({type: String})
  name = '';

  @property({attribute: 'selected', type: Boolean})
  selected = false;

  @property({type: String})
  srcDoc: string | null = null;

  @query('#monacoIframe')
  monacoIframe?: HTMLIFrameElement;

  private monacoMessagePortEstablished: Promise<null|MessagePort> = Promise.resolve(null);

  private generateSrcDoc(): string | null {
    if (this.initValue === null) {
      return null;
    }

    return `
      <html>
        <head>
          <script src="https://unpkg.com/monaco-editor@0.17.0/min/vs/loader.js"></script>
          <script type="module">
          require.config({ paths: { 'vs': 'https://unpkg.com/monaco-editor@0.17.0/min/vs' }});
          window.MonacoEnvironment = {
            getWorkerUrl: function(workerId, label) {
              return \`data:text/javascript;charset=utf-8,${encodeURIComponent(`
                self.MonacoEnvironment = {
                  baseUrl: 'https://unpkg.com/monaco-editor@0.17.0/min/'
                };
                importScripts('https://unpkg.com/monaco-editor@0.17.0/min/vs/base/worker/workerMain.js');`
                .replace(/\s/g, '')
              )}\`;
            }
          };

          require(["vs/editor/editor.main"], function () {
            import("../src/monaco-iframe-script.js")
          });

          </script>
          <style>
            body {
              height: 100vh;
              margin: 0;
            }
            #container {
              height: 100%;
            }
          </style>
        </head>
        <body>
          <div id="container"></div>
        </body>
      </html>
    `;
  }

  private editor: editor.IStandaloneCodeEditor|null = null;

  static get styles() {
    return css`
      ::slotted(div), #container, iframe {
        height: 100%;
        width: 100%;
        border: none;
      }
    `;
  }

  async getValue(): Promise<string> {
    const port = await this.monacoMessagePortEstablished;

    if (port) {
      const messageReceived: string|null = await new Promise(res => {
        const onMonacoMessage = (e: MessageEvent) => {
          const data: Message = e.data;
          if (data.type as string === 'VALUE_RESPONSE') {
            res((data as any).message);
            port.removeEventListener('message', onMonacoMessage);
          }
        }

        port.addEventListener('message', onMonacoMessage);

        const message = {
          type: 'GET_VALUE'
        }
        port.postMessage(message);
      });

      return messageReceived ? messageReceived : '';
    } else {
      return '';
    }
  }

  onIframeLoad = async () => {
    const iframe = this.monacoIframe!;
    const iframeWindow = iframe.contentWindow!;
    this.monacoMessagePortEstablished = recieveMessageChannelHandshake(iframeWindow);
    const port = await this.monacoMessagePortEstablished;
    if (!port || this.initValue === null) {
      return;
    }

    const message = {
      type: 'SET_VALUE',
      message: {
        extension: this.extension,
        content: this.initValue
      }
    }

    port.postMessage(message)
  }

  render() {
    if (this.editor) {
      this.editor.layout();
    }

    if (this.initValue !== null && this.srcDoc === null) {
      this.srcDoc = this.generateSrcDoc();
    }

    return html`
      ${this.srcDoc !== null ? html`<iframe id="monacoIframe" srcdoc=${this.srcDoc} @load=${this.onIframeLoad}></iframe>` : ``}
    `;
  }
}