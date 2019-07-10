import { TemplateResult } from 'lit-html';
import { customElement, LitElement, property, html } from 'lit-element';

@customElement('test-fixture')
export class TestFixture extends LitElement {
  @property({ type: Boolean })
  shouldAttachContents = true;

  @property({ type: Object })
  template: TemplateResult = html``;

  remove(): boolean {
    const parent = this.parentNode;
    if (parent) {
      parent.removeChild(this);
      return true;
    }

    return false;
  }

  get root(): ShadowRoot {
    return this.shadowRoot!;
  }

  attachContents() {
    this.shouldAttachContents = true;
    return this.requestUpdate();
  }

  detachContents() {
    this.shouldAttachContents = false;
    return this.requestUpdate();
  }

  render() {
    return html`
      ${this.shouldAttachContents ? this.template : ''}
    `;
  }
}

const defaultOpts = {
  shouldAttachContents: true,
  document: document
};

interface FixtureOptions {
  shouldAttachContents: boolean;
  document: Document;
}

export const fixture = (
  template: TemplateResult,
  options?: Partial<FixtureOptions>
) => {
  const opts: FixtureOptions = { ...defaultOpts, ...options };
  const tf = opts.document.createElement('test-fixture') as TestFixture;
  tf.shouldAttachContents = opts.shouldAttachContents;
  tf.template = template;

  opts.document.body.appendChild(tf);

  return tf;
};
