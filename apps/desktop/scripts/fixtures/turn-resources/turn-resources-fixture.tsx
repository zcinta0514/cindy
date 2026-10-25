import { mountPage } from '../../ui-page/harness';
import { AssistantMessage } from '../../../src/renderer/components/chat/AssistantMessage';
import type { TurnResourceReceipt } from '@cindy/maker-shared/turn-resources';

void mountPage({
  route: '/cc-agent/usage-preview',
  cases: ['default', 'long-names', 'empty', 'streaming', 'intermediate'],
  render: (ctx) => {
    const resources: TurnResourceReceipt[] = [
      { kind: 'workflow', id: 'tr_000000000000000000000003', name: '内容发布' },
      { kind: 'skill', id: 'tr_000000000000000000000002', name: ctx.case === 'long-names'
        ? '一个用于检验长名称自然换行的工作方法abcdefghijklmnopqrstuvwxyzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz' : 'issue 核查' },
      { kind: 'plugin', id: 'tr_000000000000000000000001', name: 'GitHub' },
    ];
    return <main className="mx-auto max-w-2xl p-5" data-ui-page-subject>
      <AssistantMessage
        workingDir="/fixture"
        content="内容已整理完成。这里是任务结果正文。"
        showActionBar={ctx.case !== 'intermediate'}
        isStreaming={ctx.case === 'streaming'}
        turnResources={ctx.case === 'empty' ? [] : resources}
      />
    </main>;
  },
});
