import {
  LitElement,
  html,
  customElement,
  css,
  property,
  TemplateResult,
  query
} from 'lit-element';
import { unsafeHTML } from 'lit-html/directives/unsafe-html';
import { until } from 'lit-html/directives/until';
import { FileRecord, RemoteSw } from './types';
import { EMPTY_INDEX } from './constants';
import {
  endWithSlash,
  generateUniqueSessionId,
  fetchProject,
  connectToServiceWorker,
  clearSwContentsAndSave
} from './util';
import './code-sample-editor-layout';

import 'prismjs';
import 'prismjs/components/prism-js-templates';

// @ts-ignore
const { highlight, languages } = Prism;

import prismTheme from './prism-theme';

@customElement('code-sample-editor')
export class CodeSampleEditor extends LitElement {
  @property({ attribute: 'project-path', type: String })
  projectPath?: string;

  @property({ attribute: 'sandbox-scope', type: String })
  sandboxScope = 'modules';

  @query('#editorIframe')
  editorFrame?: HTMLIFrameElement;

  private lastProjectPath?: string;
  private lastSandboxScope: string | null = null;
  private projectContentsReady: Promise<FileRecord[]> = Promise.resolve([
    EMPTY_INDEX
  ]);
  private remoteSw: RemoteSw = Promise.resolve(null);
  private sessionId: string = generateUniqueSessionId();

  async disconnectedCallback() {
    super.disconnectedCallback();
    const sw = await this.remoteSw;
    if (sw) {
      sw.clearContents(this.sessionId);
    }
  }

  private async generateViewerDom(
    projectFetched: Promise<FileRecord[]>
  ): Promise<TemplateResult[]> {
    const fileRecords = await projectFetched;
    let firstEditor = true;
    let index = 0;

    const tabs: TemplateResult[] = fileRecords.map(fileRecord => {
      let grammar;

      switch (fileRecord.extension) {
        case 'js':
          grammar = languages.javascript;
          break;
        default:
          grammar = languages.markup;
      }

      const formatted = unsafeHTML(highlight(fileRecord.content, grammar, fileRecord.extension));

      const tResult = html`
        <span
          slot="tab"
          class=${'link-' + index.toString()}
          ?selected=${firstEditor}
        >
          ${fileRecord.name}.${fileRecord.extension}
        </span>
        <pre
          slot="editor"
          class=${'link-' + index.toString()}
          ?selected=${firstEditor}
          .name=${fileRecord.name}
          .extension=${fileRecord.extension}
          ><code>${formatted}</code></pre>
      `;

      firstEditor = false;
      index++;
      return tResult;
    });

    return tabs;
  }

  private async generateIframe(
    uiReady: Promise<any>,
    remoteSw: RemoteSw,
    sessionId: string
  ) {
    const [sw] = await Promise.all([remoteSw, uiReady]);
    if (!sw) {
      return html``;
    }

    const swScope = endWithSlash(await sw.scope);
    return html`
      <iframe id="editorIframe" src="${swScope}${sessionId}/index.html">
      </iframe>
    `;
  }

  static get styles() {
    return [
      prismTheme,
      css`
        :host {
          display: block;
          height: 350px;
        }

        #wrapper {
          display: flex;
          width: 100%;
          height: 100%;
        }

        code-sample-editor-layout {
          width: 50%;
        }

        iframe {
          height: 100%;
          width: 50%;
        }

        pre {
          margin: 0;
        }
      `
    ];
  }

  render() {
    const isNewScope = this.lastSandboxScope !== this.sandboxScope;

    if (isNewScope) {
      this.lastSandboxScope = this.sandboxScope;
      this.remoteSw = connectToServiceWorker(
        this.remoteSw,
        this.sessionId,
        this.sandboxScope
      );
    }

    const isNewProject =
      this.projectPath && this.lastProjectPath !== this.projectPath;

    if (isNewProject) {
      this.lastProjectPath = this.projectPath;
      this.projectContentsReady = fetchProject(this.projectPath!);
    }

    if (isNewScope || isNewProject) {
      this.projectContentsReady = clearSwContentsAndSave(
        this.projectContentsReady,
        this.remoteSw,
        this.sessionId
      );
    }

    const uiReady = this.projectContentsReady;

    return html`
      <div id="wrapper">
        <code-sample-editor-layout>
          ${until(this.generateViewerDom(this.projectContentsReady))}
        </code-sample-editor-layout>
        ${until(this.generateIframe(uiReady, this.remoteSw, this.sessionId))}
      </div>
    `;
  }
}
