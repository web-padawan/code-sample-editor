import { AcceptableExtensions } from './types';
import * as monaco from 'monaco-editor';
import * as Comlink from 'comlink';

(require as any).config({ paths: { 'vs': 'https://unpkg.com/monaco-editor@0.17.0/min/vs' }});
(window as any).MonacoEnvironment = {
  getWorkerUrl: function() {
    return `data:text/javascript;charset=utf-8,${encodeURIComponent(
      `self.MonacoEnvironment = {
        baseUrl: 'https://unpkg.com/monaco-editor@0.17.0/min/'
      };
      importScripts('https://unpkg.com/monaco-editor@0.17.0/min/vs/base/worker/workerMain.js');`
      .replace(/\s/g, '')
    )}`;
  }
};

(window as any).require(["vs/editor/editor.main"], function () {
  main();
});

const main = () => {
  window.addEventListener('resize', onResize, {passive: true});
  Comlink.expose(MonacoIframe, Comlink.windowEndpoint(window.parent));
}
let editor: monaco.editor.IStandaloneCodeEditor | null = null;

const onResize = () => {
  if (editor) {
    editor.layout();
  }
}

export class MonacoIframe {
  static getValue(): string {
    return editor ? editor.getValue() : '';
  };

  static setValue (newValue: string, extension: AcceptableExtensions) {
    const container = document.querySelector('#container') as HTMLDivElement;
    let language: string = extension;
    switch(extension) {
      case 'html':
        language = 'html';
        break;
      case 'js':
        language = 'javascript';
        break;
      case 'ts':
        language = 'typescript'
          break;
      default:
        break;
    }

    editor = ((window as any).monaco as typeof monaco)
      .editor.create(container, {value: newValue, language})
  }
}