import assert from 'node:assert/strict';
export default {
  name: 'turn-resources',
  entry: './turn-resources-fixture.tsx',
  viewport: { width: 800, height: 480 },
  real: 'AssistantMessage, TurnResourcesFooter and MessageActionBar',
  notCovered: 'Host collection, model execution, persistence and mobile; the displayed receipts are scenario data',
  stubs: {
    'src/renderer/components/chat/GhostToolCard': 'export const CARD_EXPAND_TOGGLE_EVENT = "xdt-card-expand-toggle"; export const GhostToolCard = () => null; export const MailCardEditor = () => null;',
  },
  cases: {
    default: { about: 'Completed reply shows the three actual-use categories' },
    'long-names': { about: 'Long names wrap in a narrow reply', viewport: { width: 360, height: 520 } },
    empty: { about: 'No resources leaves no empty footer' },
    streaming: { about: 'Streaming reply hides the footer' },
    intermediate: { about: 'Intermediate commentary hides the footer' },
  },
  async check(page, ui) {
    const footer = page.getByRole('region', { name: await ui.t('chat.turnResources.title'), exact: true });
    const visible = ui.case === 'default' || ui.case === 'long-names';
    assert.equal(await footer.count(), visible ? 1 : 0);
    if (!visible) return;
    const copy = page.getByRole('button', { name: await ui.t('chat.messageActionBar.copy'), exact: true });
    assert.equal(await copy.count(), 1);
    assert.equal(await footer.evaluate((node) => {
      const buttons = [...document.querySelectorAll('button')];
      const next = buttons.find(button => node.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING);
      return Boolean(next);
    }), true);
  },
};
