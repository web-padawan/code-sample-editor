import { customElement, LitElement, html, property, query, css } from 'lit-element';
import { AcceptableExtensions } from './types';

import {EditorState} from "codemirror/state/src"
import {styles, EditorView} from "codemirror/view/src/editorview"
import {keymap} from "codemirror/keymap/src/keymap"
import {history, redo, redoSelection, undo, undoSelection} from "codemirror/history/src/history"
import {lineNumbers} from "codemirror/gutter/src/index"
import {baseKeymap, indentSelection} from "codemirror/commands/src/commands"
import {legacyMode} from "codemirror/legacy-modes/src/index"
import {matchBrackets} from "codemirror/matchbrackets/src/matchbrackets"
import javascript from "codemirror/legacy-modes/src/javascript"
import {specialChars} from "codemirror/special-chars/src/special-chars"
import {multipleSelections} from "codemirror/multiple-selections/src/multiple-selections"

@customElement('code-sample-editor-editor')
export class CodeSampleEditorEditor extends LitElement {
  @query('#container')
  private containerElement?: HTMLDivElement;

  @property({type: String})
  value = '';

  @property({type: String})
  name = '';

  @property({type: String})
  extension: AcceptableExtensions = 'js';

  private editorView?: EditorView;

  getValue():string {
    if (this.editorView) {
      console.log(this.editorView)
      return this.editorView.state.doc.toString();
    }

    return '';
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }

      #container {
        width: 100%;
        height: 100%;
      }
    `;
  }

  render() {
    return html`
      <link rel="stylesheet" href="../node_modules/codemirror/legacy-modes/style/codemirror.css">
      <div id="container"></div>
    `;
  }

  firstUpdated() {
    let mode = legacyMode({mode: javascript({indentUnit: 2}, {}) as any})

    let isMac = /Mac/.test(navigator.platform)
    let state = EditorState.create({doc: this.value, extensions: [
      lineNumbers(),
      history(),
      specialChars(),
      multipleSelections(),
      mode,
      matchBrackets(),
      keymap({
        "Mod-z": undo,
        "Mod-Shift-z": redo,
        "Mod-u": view => undoSelection(view) || true,
        [isMac ? "Mod-Shift-u" : "Alt-u"]: redoSelection,
        "Ctrl-y": isMac ? undefined : redo,
        "Shift-Tab": indentSelection
      }),
      keymap(baseKeymap),
    ]})

    const root = this.shadowRoot ? this.shadowRoot : document;
    let view = this.editorView = (window as any).view = new EditorView({state, root })


    if (this.containerElement) {
      this.containerElement.appendChild(view.dom);
    }
  }
}