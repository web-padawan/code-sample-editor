import { fixture, TestFixture } from './utils/karma-dom-helpers';
import { html } from 'lit-element';

suite('Fixture', () => {
  let fixt = {} as TestFixture;

  setup(async () => {
    fixt = fixture(
      html`
        <div id="asdf">Hello World</div>
        <my-element></my-element>
      `,
      {
        shouldAttachContents: false
      }
    );
  });
  teardown(() => {
    fixt.remove();
  });
});
