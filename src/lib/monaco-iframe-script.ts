import { Message, MESSAGE_TYPES } from './types';
import { establishMessageChannelHandshake } from './util';
import * as monacoImport from 'monaco-editor';

// (self as any).MonacoEnvironment = {
//   getWorkerUrl: function(moduleId: any, label: any) {
//     if (label === 'json') {
//       return '../monaco_build/json.worker.js';
//     }
//     if (label === 'css') {
//       return '../monaco_build/css.worker.js';
//     }
//     if (label === 'html') {
//       return '../monaco_build/html.worker.js';
//     }
//     if (label === 'typescript' || label === 'javascript') {
//       return '../monaco_build/ts.worker.js';
//     }
//     return '../monaco_build/editor.worker.js';
//   },
// };

let editor: monacoImport.editor.IStandaloneCodeEditor | null = null;

const onResize = () => {
  if (editor) {
    editor.layout();
  }
}

const onGetValue = (port: MessagePort) => {
  const message = {
    type: 'VALUE_RESPONSE',
    message: null
  }

  if (editor) {
    (message as any).message = editor.getValue();
  }
  port.postMessage(message);
};

const onSetValue = (data: any) => {
  const extension = data.message.extension;
  const value = data.message.content;
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

    editor = ((window as any).monaco as typeof monacoImport).editor.create(container, {value, language})
}

const onMessage = (port:MessagePort) => {
  return (e: MessageEvent) => {
    const data: Message = e.data;

    switch (data.type as string) {
      case 'GET_VALUE':
        onGetValue(port);
        break;
      case 'SET_VALUE':
        onSetValue(data);
        break;
      default:
        break;
    }
  }
}

window.addEventListener('resize', onResize, {passive: true});
establishMessageChannelHandshake(window).then(port => {
  port.addEventListener('message', onMessage(port));
});
