import { customElement, LitElement, property, html, css, query } from 'lit-element';
import { AcceptableExtensions } from './types';
import { CodeMirror } from 'codemirror/src/edit/main';
if (!(window as any).CodeMirror) {
  (window as any).CodeMirror = CodeMirror;
  import('codemirror/mode/javascript/javascript');
  import('codemirror/mode/xml/xml');
  import('codemirror/mode/htmlmixed/htmlmixed');
}

@customElement('code-sample-editor-editor')
export class CodeSampleEditorEditor extends LitElement {
  @property({type: String})
  name = '';

  @property({type: String})
  extension: AcceptableExtensions = 'js';

  @property({type: Boolean, attribute: 'selected'})
  private selected?: boolean;

  @query('#container')
  container?: HTMLDivElement;

  private internalVal = '';

  set value(value: string) {
    const oldValue = this.value;
    this.internalVal = value;

    if (this.editor) {
      this.editor.setValue(value);
    }

    this.requestUpdate('value', oldValue);
  }
  get value(): string {
    if (this.editor) {
      this.internalVal = this.editor.getValue();
      return this.editor.getValue();
    }

    return this.internalVal;
  }

  private editor: CodeMirror.Editor | null = null;

  static get styles() {
    return css`
      :host {
        display: block;
        height: 100%;
      }

      #container {
        height: 100%;
      }
    `;
  }

  render() {
    if (this.selected && this.editor) {
      this.editor.refresh();
    }

    return html`
      <link
          rel="stylesheet"
          href="../node_modules/codemirror/theme/monokai.css">
      <link
          rel="stylesheet"
          href="../node_modules/codemirror/lib/codemirror.css"
          @load=${this.upgradeContainer}>
      <div id="container"></div>
    `;
  }

  upgradeContainer() {
    if (this.container) {
      let mode = 'javascript';

      switch (this.extension) {
        case 'js':
          mode = 'javascript';
          break;
        case 'html':
          mode = 'htmlmixed';
          break;
        case 'ts':
          mode = 'typescript';
          break;
      }

      this.editor = CodeMirror(this.container, {
        value: this.value,
        lineNumbers: true,
        mode,
        theme: 'monokai',
        scrollbarStyle: 'null'
      });
    }
  }
}